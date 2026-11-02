/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : StyleManagerModal.tsx
 * 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 서식 생성·배지 지원 및 서식 관리 센터 사이드바 액션 일원화·본문 2단 카드 분리]:
 *             1) 좌측 사이드바 '+ 추가' 메뉴에 [📱 SNS 카드뉴스 (인스타·링크드인 1:1)] 생성 옵션을 추가하여 4종(일반문서 / 그림책 전체표지 / 그림책 오른쪽표지 / SNS 카드뉴스) 선택 생성 지원
 *             2) 좌측 사이드바 서식 목록 아이템에 'JSON 복사' 퀵 액션 추가(복제, 파일 내보내기, JSON 복사, 삭제 일원화) 및 본문 상단 중복 버튼 제거
 *             3) 본문 상단을 좌측 [이름 및 서식 설명 카드]와 우측 별도 [설명 상세 카드(글꼴, 크기/행간, 여백, 표 테두리, 불릿, 문서타입: 일반문서/그림책/SNS 카드뉴스)] 2단 카드로 분리 배치
 *             4) 우측 작업 영역 4-Tab 허브(① 가져오기 & 내보내기 / ② AI 서식 생성기 / ③ 서식 JSON 코드 보기 / ④ 최신 서식 생성 가이드) 및 다중 서식 가져오기·전체 백업 연동
 * 🚨 @PATCH : **2026-10-09** — [서식 관리 목록 최신 서식 우선 정렬 및 모달 진입 시 자동 실시간 재동기화]:
 *             1) 서식 관리 모달 오픈 시 onrivi:reload_profiles 자동 브로드캐스트로 userCssProfiles.json 최신 상태 즉각 하이드레이션
 *             2) 서식 목록(전체)에서 사용자 정의 서식을 최신 등록순으로 상단에 우선 배치하여 최근 작업 서식 즉시 식별 보장
 *             3) 로컬 vs 웹드라이브 서식 수 불일치 시 로컬 서식 원클릭 가져오기/병합 기능 및 수동 새로고침 지원
 * 🚨 @PATCH : **2026-10-07** — [구글 드라이브 내 서식 동기화 카드 및 원클릭 재연결 탑재]:
 *             1) '내 서식' 탭에서 서식이 비어있을 때 구글 드라이브 참조파일(userCssProfiles.json 70KB)과 즉시 연동할 수 있는 원클릭 재연결 카드 제공
 *             2) requestGoogleDriveAuth 및 saveDriveToken 호출로 새 토큰 발급 즉시 2개 사용자 서식(연습테스트, 소형책 출판 등) 실시간 자동 하이드레이션
 * 🚨 @PATCH : **2026-10-01** — [PDF/EPUB 내보내기 페이지 나누기 기준 기본값 'none' 동기화]: AI 서식 생성 프롬프트 예시 내 exportPageBreakLevel을 'none'으로 변경
 * 🚨 @PATCH : **2026-09-27** — 사용자 서식 읽기·수정·가져오기·AI 생성 저장소를 profiles/userCssProfiles.json 하나로 통일. 개별 CSS 생성 및 다른 저장소 폴백 제거.
 * 🚨 @PATCH : **2026-09-26** — [표 모든 테두리(Grid) 세로선 및 프리셋 가이드·AI 프롬프트 동기화]: tableStructure(outerBorderWidth, rowBorderWidth, colBorderWidth) 세로선(Grid: 1px, Horizontal: 0px) 명세 보강 및 th/td 레거시 border-left/right: none 주입 방지 지시 탑재
 * 🚨 @PATCH : **2026-09-25** — [Onrivi 한컴 테크 블로그 서식 시스템 제공 서식 탭 연동 및 조판 동기화]: 한컴 테크 블로그 프리미엄 서식(오렌지 포인트 H2 하단선, H3 좌측바, 1.8배 본문 줄간격 및 8px 문장 간격, 가로선 중심 비교표) 시스템 서식 목록 노출 및 조판 연동
 * 🚨 @PATCH : **2026-09-25** — [고급 레이아웃 표준 여백(상하 18mm, 좌우 12mm) AI 프롬프트 지시문 일원화]: AI 서식 생성 지시문의 pageStyle 여백을 상하 18mm, 좌우 12mm(marginTop/marginBottom: 18mm, marginLeft/marginRight: 12mm)로 전면 일원화
 * 🚨 @PATCH : **2026-09-25** — [시스템 제공 서식 개편 동기화]: 구버전 서식 2종 삭제 및 신규 시스템 제공 서식 5종(Onrivi 기술 표준 서식, Onrivi 법률·계약서 A4 공식 문서, Onrivi 네이버 블로그 감성 서식, Onrivi 일반 기술서적 표준 서식, Onrivi 공식 행사 및 가정통신문 안내장 서식) 🏛️ 시스템 제공 서식 탭 연동
 * 🚨 @PATCH : **2026-09-25** — [체크박스 및 체크리스트 글자색 본문 기본색(#2f2f2f) AI 프롬프트 지시]: AI 서식 생성 지시문에 체크박스 및 글자색을 본문과 동일한 #2f2f2f로 일치시키도록 명시
 * 🚨 @PATCH : **2026-09-25** — [체크리스트 완료 항목 스타일 '효과없음(none)' AI 프롬프트 강제 지시]: AI 서식 생성 지시문 및 checkboxStructure에 checkedEffect 'none'을 강제 지시하여 취소선/반투명 오염 방지
 * 🚨 @PATCH : **2026-09-24** — [새 서식 추가 Onrivi 기본서식 100% 완전체 정규화(normalizeCssProfile) 일원화]: handleCreateProfile에서 하드코딩된 폴백을 소거하고 normalizeCssProfile을 통해 DEFAULT_PROFILE의 7대 쇼케이스 태그 및 구조체를 100% 안전 복제하도록 개선
 * 🚨 @PATCH : **2026-09-24** — [AI 서식 생성 미디어(동영상·지도·이미지) 너비 100% 및 16:9 가로형 규격 강제 지시문 탑재]: AI 프롬프트 필수 요구사항에 미디어 객체(img, video, map)의 width: "100%", video height: "315px", map height: "400px" 명시적 규격을 탑재하여 기형적 폭 축소 방지
 * 🚨 @PATCH : **2026-09-24** — [기본 서식 명칭 'Onrivi 기본서식' 표준화]: 새 서식 추가 및 AI 프롬프트 지시문에서 기준 서식 명칭을 'Onrivi 기본서식'으로 확정
 * 🚨 @PATCH : **2026-09-24** — [기본 서식 'ChatGPT 스타일 콘텐츠' 전환 및 AI 프롬프트/새 서식 생성 동기화]: 새 서식 추가 시 DEFAULT_PROFILE 기반 100% 딥 클론 생성 및 AI 프롬프트 지시문 표준 여백(상하 22mm, 좌 19mm, 우 20mm), fontSize 16px, lineHeight 1.75 명시
 * 🚨 @PATCH : **2026-09-24** — [AI 서식 생성 모델 사용자 선택기 및 오류 발생 시 모델 변경·재시도 인터랙티브 UI 구축]:
 *             1) AIDraftModal과 동일한 사용자 주도 AI 모델 선택기(ONRIVI_AI_MODELS 연동) 탑재
 *             2) 503 과부하, 429 한도 초과 등 오류 발생 시 원인/해결책 상세 안내 및 원하는 모델(3.8/3.7/3.6 Flash 등)을 직접 선택하여 즉시 재시도할 수 있는 대화형 진단 카드 제공
 *             3) normalizeAIModelName 및 ensureDecryptedApiKey 연동으로 구버전/암호화 모델 및 키 무해 복호화 보장
 * 🚨 @PATCH : **2026-09-24** — [표준 여백(A4 세로, 상하 18mm, 좌우 12mm) 내보내기/가져오기/AI 프롬프트 생성 전면 동기화]:
 *             - AI 프롬프트 지시문에 pageStyle 표준 여백(marginTop: 18mm, marginBottom: 18mm, marginLeft: 12mm, marginRight: 12mm) 강제 규격 명시
 *             - 서식 히어로 헤더 및 안내 문구에 표준 여백 요약 정보 반영
 * 🚨 @PATCH : **2026-09-24** — [서식 관리 센터 Modern Technical Editorial 디자인 시스템 및 UI 전면 재구성]:
 *             1) [기본서식 기반 새로만들기]: 새 서식 추가 시 DEFAULT_PROFILE(ChatGPT 스타일 콘텐츠)의 pageStyle, rules, tableStructure, hrStructure, checkboxStructure를 100% 딥 클론하여 완전체로 즉시 생성 및 이름 입력 포커스 연동
 *             2) [표 테두리·행·열 두께(tableStructure) 전면 반영]: 내보내기/가져오기/붙여넣기/AI 프롬프트 생성 전 과정에 tableStructure(outerBorderWidth, rowBorderWidth, colBorderWidth) 완벽 연동 및 normalizeCssProfile 자동 하이드레이션
 *             3) [가져오기 & 붙여넣기 듀얼 허브]: 파일 업로드(.json) 및 JSON 텍스트 클립보드 붙여넣기 영역 전면 개편
 *             4) [내보내기 & 클립보드 복사 듀얼 지원]: 파일 다운로드 및 JSON 원클릭 클립보드 복사 동시 제공
 *             5) [LNB 사이드바 표준 디자인 적용]: 세로선 인디케이터 배제, 고대비 볼드 텍스트 및 코발트 라운드 배경 하이라이트 통일
 * 🚨 @PATCH : **2026-09-24** — [서식 내보내기 7대 쇼케이스 완전체 정규화(normalizeCssProfile) 및 안전 파일명 동기화]
 * 🚨 @PATCH : **2026-09-24** — [외부 서식 파일 올리기 및 JSON 붙여넣기 정제·선택 동기화 강화]
 * 🚨 @PATCH : **2026-09-24** — [프롬프트 AI 서식 생성 즉시 자동 적용 및 API 키 폴백 보강]
 * 🚨 @PATCH : **2026-09-12** — [모든 AI 질의 표준 재시도 적용]: 1회 실패 후 3초 대기 -> 2회 시도 후 3초 대기 -> 3회 시도 후 최종 실패 에러 표출 규칙 및 기본 모델 gemini-3.8-flash 통일 적용
 * -----------------------------------------------------------------------
 */
'use client';

import { useModalEscape } from '@/hooks/useModalEscape';
import { getResourceSettings, saveResourceSettings } from '@/lib/resourceSettings';
import { getProfileReadStatus, subscribeProfileReadStatus } from '@/lib/profileReadStatus';
import { reconnectLocalProfileFolder } from '@/lib/profileStorage';
import { requestGoogleDriveAuth, saveDriveToken, getSavedDriveToken } from '@/lib/gdrive/googleDriveClient';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X, Plus, Trash2, Check, Upload, Download, Sparkles, BookOpen,
  Copy, CheckCircle2, Search, FileCode2, AlertCircle, RefreshCw,
  Cpu, ClipboardPaste, Archive, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { CssProfile } from '@/types/cssProfile';
import { DEFAULT_BOOK_LAYOUT } from '@/lib/picturebook';
import { isSystemProfileId, DEFAULT_PROFILE, sanitizeAndParseCssProfileJson, normalizeCssProfile } from '@/constants/cssProfile';
import {
  CSS_PROFILE_GUIDE_MD,
  AI_STANDARD_PRESETS,
  AI_MASTER_PROMPT_TEMPLATE,
  STYLE_15_CATEGORY_SPECS
} from '@/constants/cssProfileGuide';
import { headingMarker, headingFormat, outlineMarker } from '@/lib/headingNumbering';
import { resolveCaptionConfig, formatMediaCaption } from '@/lib/aiFriendlyReport';
import ConfirmModal from './ConfirmModal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ensureDecryptedApiKey,
  normalizeAIModelName,
  formatUserFriendlyAIError,
  FormattedAIError,
  DEFAULT_AI_MODEL,
  ONRIVI_AI_MODELS
} from '@/lib/gemini';

interface StyleManagerModalProps {
  profiles: CssProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (profile: CssProfile) => void;
  onAddProfile?: () => void;
  onDeleteProfile?: (id: string) => void;
  onImportProfile?: (profile: CssProfile) => void;
  onClose: () => void;
  isDarkMode?: boolean;
  geminiApiKey?: string;
  aiModelName?: string;
}

type HubTabType = 'import-export' | 'ai-generator' | 'json-viewer' | 'guide';

/**
 * 단일 서식 객체({ ... })뿐만 아니라 다중 서식 백업 배열([ { ... }, ... ]) 또는
 * { profiles: [ ... ] } 형태의 JSON 문자열도 관대하게 파싱하여 유효한 서식 객체 배열로 반환합니다.
 */
function parseImportedProfilesPayload(rawText: string): any[] {
  if (!rawText || typeof rawText !== 'string') return [];
  let text = rawText.trim();

  // 1. 마크다운 ```json ... ``` 코드블록 벗기기
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  }

  const isValidProfileObj = (item: any) =>
    Boolean(item && typeof item === 'object' && !Array.isArray(item) && item.name && item.pageStyle && item.rules);

  const tryExtractList = (parsed: any): any[] => {
    if (!parsed) return [];
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidProfileObj);
    }
    if (typeof parsed === 'object') {
      if (Array.isArray(parsed.profiles)) {
        return parsed.profiles.filter(isValidProfileObj);
      }
      if (isValidProfileObj(parsed)) {
        return [parsed];
      }
    }
    return [];
  };

  // 2. 배열 형태('[')가 먼저 시작하는 경우 배열 슬라이스 파싱 시도
  const firstBracket = text.indexOf('[');
  const firstBrace = text.indexOf('{');
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = text.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      const arraySlice = text.substring(firstBracket, lastBracket + 1);
      try {
        const parsedArr = JSON.parse(arraySlice);
        const list = tryExtractList(parsedArr);
        if (list.length > 0) return list;
      } catch {
        try {
          const relaxed = arraySlice.replace(/\/\/[^\n\r]*/g, '').replace(/,\s*([\]}])/g, '$1');
          const parsedArr = JSON.parse(relaxed);
          const list = tryExtractList(parsedArr);
          if (list.length > 0) return list;
        } catch {}
      }
    }
  }

  // 3. 기존 단일 객체 정제 파서(sanitizeAndParseCssProfileJson) 활용
  const singleParsed = sanitizeAndParseCssProfileJson(rawText);
  const extracted = tryExtractList(singleParsed);
  if (extracted.length > 0) return extracted;

  return [];
}

/** 불릿 설정값을 실제 미니 프리뷰 기호 문자로 변환 */
function resolveBulletSymbol(levelType?: string, customChar?: string, fallback = '•'): string {
  if (!levelType) return fallback;
  if (levelType === 'custom') return customChar?.trim() || fallback;
  switch (levelType) {
    case 'disc': return '•';
    case 'circle': return '○';
    case 'square': return '▪';
    case 'hyphen': return '-';
    case 'check': return '✓';
    case 'diamond': return '◆';
    case 'arrow': return '▸';
    case 'none': return '';
    default: return fallback;
  }
}

export default function StyleManagerModal({
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onAddProfile,
  onDeleteProfile,
  onImportProfile,
  onClose,
  isDarkMode,
  geminiApiKey,
  aiModelName,
}: StyleManagerModalProps) {
  useModalEscape(true, onClose);
  const [selectedId, setSelectedId] = useState(activeProfileId);
  const [profileReadStatus, setProfileReadStatus] = useState(getProfileReadStatus);
  useEffect(() => subscribeProfileReadStatus(() => setProfileReadStatus(getProfileReadStatus())), []);

  // 🌟 모달 열릴 때 userCssProfiles.json 최신 상태 자동 재동기화
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('onrivi:reload_profiles'));
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshProfiles = async () => {
    setIsRefreshing(true);
    try {
      const success = await new Promise<boolean>(resolve => {
        const timeout = setTimeout(() => resolve(false), 15000);
        window.dispatchEvent(new CustomEvent('onrivi:reload_profiles', {
          detail: {
            resolve: (result: boolean) => { clearTimeout(timeout); resolve(result); },
          }
        }));
      });
      showToast(success ? '✅ 최신 서식 목록을 성공적으로 갱신했습니다.' : '⚠️ 서식 새로고침에 실패했습니다.');
    } catch {
      showToast('⚠️ 서식 새로고침 중 오류가 발생했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom' | 'picturebook'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showStorageDetail, setShowStorageDetail] = useState(false);
  const [showMiniPreview, setShowMiniPreview] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // 우측 메인 4-Tab 워크스페이스 허브 상태
  const [activeHubTab, setActiveHubTab] = useState<HubTabType>('import-export');

  // 가져오기 탭 / 텍스트 / 드래그앤드롭 상태
  const [importJsonText, setImportJsonText] = useState('');
  const [importTab, setImportTab] = useState<'file' | 'text'>('file');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // AI 프롬프트 생성기
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return normalizeAIModelName(
      aiModelName ||
      (typeof window !== 'undefined' ? (localStorage.getItem('onrivi_ai_model_name') || localStorage.getItem('aiModelName') || '') : '') ||
      DEFAULT_AI_MODEL
    );
  });
  const [aiError, setAiError] = useState<FormattedAIError | null>(null);

  useEffect(() => {
    if (aiModelName) {
      setSelectedModel(normalizeAIModelName(aiModelName));
    }
  }, [aiModelName]);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; isDanger?: boolean; onConfirm: () => void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isReconnectingDrive, setIsReconnectingDrive] = useState(false);
  const [isReconnectingLocal, setIsReconnectingLocal] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleReconnectLocal = async () => {
    setIsReconnectingLocal(true);
    try {
      await reconnectLocalProfileFolder();
      showToast('로컬 폴더에 다시 연결했습니다. 서식 파일을 읽는 중입니다.');
    } catch (error: any) {
      if (error.name !== 'AbortError') showToast(error.message || '로컬 폴더를 연결하지 못했습니다.');
    } finally {
      setIsReconnectingLocal(false);
    }
  };

  const handleReconnectDrive = async () => {
    setIsReconnectingDrive(true);
    try {
      if (!getSavedDriveToken()) {
        const token = await requestGoogleDriveAuth();
        if (!token) throw new Error('Drive 인증이 완료되지 않았습니다.');
        saveDriveToken(token);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const success = await new Promise<boolean>(resolve => {
        const timeout = setTimeout(() => resolve(false), 30000);
        window.dispatchEvent(new CustomEvent('onrivi:reload_profiles', {
          detail: {
            resolve: (result: boolean) => { clearTimeout(timeout); resolve(result); },
          }
        }));
      });
      showToast(success ? '✅ 선택한 리소스 폴더의 서식을 다시 읽었습니다.' : '⚠️ 서식을 읽지 못했습니다. 오류 안내와 환경설정의 리소스 폴더 위치를 확인해 주세요.');
    } catch (err: any) {
      console.error('[StyleManagerModal Reconnect Error]', err);
      showToast('⚠️ ' + (err.message || '인증이 취소되었습니다.'));
    } finally {
      setIsReconnectingDrive(false);
    }
  };

  // 로컬스토리지 API 키 자동 감지 및 복호화 보장
  const rawKey = geminiApiKey || (typeof window !== 'undefined' ? (localStorage.getItem('onrivi_gemini_api_key') || localStorage.getItem('geminiApiKey') || '') : '');
  const effectiveApiKey = ensureDecryptedApiKey(rawKey);
  const hasApiKey = !!effectiveApiKey;

  const selectedProfile = profiles.find(p => p.id === selectedId) || profiles[0] || DEFAULT_PROFILE;
  const isSystem = isSystemProfileId(selectedProfile?.id || '');

  useEffect(() => {
    setSelectedId(activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const dk = isDarkMode;

  /* ─── 이름 변경 ─── */
  const handleRenameStart = () => {
    if (isSystem) return;
    setTempName(selectedProfile.name);
    setIsEditingName(true);
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
      }
    }, 60);
  };

  const handleRenameSave = () => {
    if (!tempName.trim()) return;
    onUpdateProfile({ ...selectedProfile, name: tempName.trim() });
    setIsEditingName(false);
    showToast(`서식 이름이 '${tempName.trim()}'(으)로 변경되었습니다.`);
  };

  /* ─── 사이드바 추가(+) 메뉴에서 서식 타입별(일반문서 / 그림책 전체표지 / 그림책 오른쪽표지 / SNS 카드뉴스) 생성 ─── */
  const handleCreateProfileByType = (createType: 'general' | 'picturebook-full' | 'picturebook-right' | 'sns-card') => {
    setAiPromptInput('');
    setImportJsonText('');
    setSearchTerm('');
    setShowAddMenu(false);

    const newId =
      createType === 'general'
        ? `profile-${Date.now()}`
        : createType === 'sns-card'
        ? `profile-sns-${Date.now()}`
        : `profile-book-${Date.now()}`;
    const count = profiles.filter(p => !isSystemProfileId(p.id)).length + 1;

    const initialName =
      createType === 'picturebook-full'
        ? `그림책(전체표지) ${count}`
        : createType === 'picturebook-right'
        ? `그림책(오른쪽표지) ${count}`
        : createType === 'sns-card'
        ? `SNS 카드뉴스 ${count}`
        : `새 서식 ${count}`;

    const initialDesc =
      createType === 'picturebook-full'
        ? '그림책(스토리북 · 전체 표지) 레이아웃으로 생성된 사용자 정의 서식입니다.'
        : createType === 'picturebook-right'
        ? '그림책(스토리북 · 오른쪽 표지) 레이아웃으로 생성된 사용자 정의 서식입니다.'
        : createType === 'sns-card'
        ? '인스타그램·쓰레드·링크드인 공유용 1:1 정사각형(1080×1080) SNS 카드뉴스 사용자 정의 서식입니다.'
        : '일반문서 조판용으로 Onrivi 기본서식을 기반으로 생성된 사용자 정의 서식입니다.';

    const snsSystemTemplate = profiles.find(p => p.id === 'sns-card-news');
    const baseTemplate = createType === 'sns-card' && snsSystemTemplate ? snsSystemTemplate : DEFAULT_PROFILE;

    const rawNew: CssProfile = {
      ...structuredClone(baseTemplate),
      id: newId,
      name: initialName,
      description: initialDesc,
      ...(createType === 'picturebook-full'
        ? { layout: { ...DEFAULT_BOOK_LAYOUT, cover: 'full-image' as const } }
        : createType === 'picturebook-right'
        ? { layout: { ...DEFAULT_BOOK_LAYOUT, cover: 'image-right' as const } }
        : createType === 'sns-card'
        ? {
            pageStyle: {
              ...baseTemplate.pageStyle,
              paperSize: 'sns_square',
              fontSize: '13pt',
              lineHeight: '1.65',
              backgroundColor: '#f8fafc',
              marginTop: '16mm',
              marginBottom: '16mm',
              marginLeft: '16mm',
              marginRight: '16mm',
              exportPageBreakLevel: 'h1',
            },
          }
        : {}),
    };

    const newProfile: CssProfile = normalizeCssProfile(rawNew, profiles);

    if (onImportProfile) {
      onImportProfile(newProfile);
    } else if (onAddProfile) {
      onAddProfile();
    }
    setSelectedId(newId);
    onSelectProfile(newId);

    setTempName(initialName);
    setIsEditingName(true);

    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
      }
    }, 80);

    showToast(`✨ '${initialName}' 서식이 생성되었습니다.`);
  };

  /* ─── 특정 서식 복제 ─── */
  const handleDuplicateProfile = (targetProfile: CssProfile = selectedProfile) => {
    const copy = normalizeCssProfile({
      ...structuredClone(targetProfile),
      id: `profile-copy-${Date.now()}`,
      name: `${targetProfile.name} 복사`,
    }, profiles);
    onImportProfile?.(copy);
    setSelectedId(copy.id);
    onSelectProfile(copy.id);
    showToast(`'${targetProfile.name}' 서식이 복제되었습니다.`);
  };

  /* ─── 서식 삭제 ─── */
  const handleDeleteClick = (targetProfile: CssProfile = selectedProfile) => {
    if (isSystemProfileId(targetProfile.id) || !onDeleteProfile) return;
    setConfirmConfig({
      isOpen: true,
      title: '서식 삭제',
      message: `서식 "${targetProfile.name}"을(를) 정말로 삭제하시겠습니까?`,
      isDanger: true,
      onConfirm: () => {
        onDeleteProfile(targetProfile.id);
        const remaining = profiles.filter(p => p.id !== targetProfile.id);
        if (remaining.length > 0) {
          setSelectedId(remaining[0].id);
          onSelectProfile(remaining[0].id);
        }
        setConfirmConfig(null);
        showToast('서식이 안전하게 삭제되었습니다.');
      },
    });
  };

  /* ─── 내보내기 (단일 서식 JSON 파일 다운로드) ─── */
  const handleExportProfile = (targetProfile: CssProfile = selectedProfile) => {
    const exportData = normalizeCssProfile(targetProfile, profiles);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (exportData.name || 'onrivi_theme').trim().replace(/[/\\?%*:|"<>]/g, '_');
    a.download = `${safeName}_theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`서식 파일('${exportData.name}')이 다운로드되었습니다.`);
  };

  /* ─── 내 서식 전체 일괄 백업 내보내기 (.json) ─── */
  const handleExportAllCustomProfiles = () => {
    const customList = profiles.filter(p => !isSystemProfileId(p.id) && p.id !== 'default');
    if (customList.length === 0) {
      showToast('백업할 사용자 정의 서식(내 서식)이 없습니다.');
      return;
    }
    const normalizedList = customList.map(p => ({
      ...normalizeCssProfile(p, profiles),
      id: p.id,
      name: p.name,
    }));
    const json = JSON.stringify(normalizedList, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `Onrivi_내서식_백업_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📦 내 서식 전체(${normalizedList.length}개)가 백업 파일로 다운로드되었습니다.`);
  };

  /* ─── 클립보드로 JSON 복사 ─── */
  const handleCopyJson = async (targetProfile: CssProfile = selectedProfile) => {
    try {
      const exportData = normalizeCssProfile(targetProfile, profiles);
      const json = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(json);
      showToast(`'${targetProfile.name}' 서식 JSON이 클립보드에 복사되었습니다.`);
    } catch {
      showToast('클립보드 복사에 실패했습니다.');
    }
  };

  /* ─── 공통 다중/단일 서식 JSON 텍스트 가져오기 처리기 ─── */
  const importProfilesFromRawText = (rawText: string, clearTextState = false): boolean => {
    const rawItems = parseImportedProfilesPayload(rawText);
    if (rawItems.length === 0) {
      showToast('올바른 Onrivi 서식 양식이 아닙니다. name, pageStyle, rules 속성이 필수입니다.');
      return false;
    }

    const accumulated = [...profiles];
    let lastImported: CssProfile | null = null;
    const baseTime = Date.now();

    rawItems.forEach((rawItem, idx) => {
      // 다중 일괄 임포트 시 타임스탬프 충돌 방지
      const itemWithUniqueFallback = {
        ...rawItem,
        id: rawItem.id && !accumulated.some(p => p.id === rawItem.id) && !isSystemProfileId(rawItem.id)
          ? rawItem.id
          : `profile-${baseTime + idx}`,
      };
      const normalized = normalizeCssProfile(itemWithUniqueFallback, accumulated);
      accumulated.push(normalized);
      onImportProfile?.(normalized);
      lastImported = normalized;
    });

    if (lastImported) {
      const finalProfile = lastImported as CssProfile;
      setSelectedId(finalProfile.id);
      onSelectProfile(finalProfile.id);
      if (clearTextState) setImportJsonText('');
      if (rawItems.length === 1) {
        showToast(`✅ 서식 '${finalProfile.name}'을(를) 성공적으로 가져왔습니다.`);
      } else {
        showToast(`✅ 총 ${rawItems.length}개의 서식을 일괄 가져왔습니다. ('${finalProfile.name}' 선택됨)`);
      }
      return true;
    }
    return false;
  };

  /* ─── 로컬 파일(input / Drag&Drop) 읽기 ─── */
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        importProfilesFromRawText(text);
      } catch {
        showToast('JSON 문법 오류! 파일을 확인해 주세요.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
    e.target.value = '';
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  /* ─── 가져오기 (JSON 텍스트 붙여넣기) ─── */
  const handleJsonImport = () => {
    if (!importJsonText.trim()) {
      showToast('가져올 JSON 텍스트를 먼저 입력창에 붙여넣어 주세요.');
      return;
    }
    importProfilesFromRawText(importJsonText, true);
  };

  /* ─── 클립보드에서 바로 읽어와 입력창에 채우기 ─── */
  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        showToast('클립보드가 비어 있습니다.');
        return;
      }
      setImportJsonText(clipText);
      setImportTab('text');
      const detected = parseImportedProfilesPayload(clipText);
      if (detected.length > 0) {
        showToast(`📋 클립보드에서 ${detected.length}개 서식(${detected.map(d => d.name).join(', ')})을 감지했습니다.`);
      } else {
        showToast('📋 클립보드 텍스트를 붙여넣었습니다.');
      }
    } catch {
      showToast('클립보드 읽기 권한이 없거나 지원되지 않습니다. Ctrl+V로 직접 붙여넣어 주세요.');
    }
  };

  // JSON 텍스트 실시간 유효성 사전 검증
  const previewParsedImport = useMemo(() => {
    if (!importJsonText.trim()) return null;
    const list = parseImportedProfilesPayload(importJsonText);
    if (list.length === 0) return { valid: false, count: 0, names: [] as string[] };
    return {
      valid: true,
      count: list.length,
      names: list.map(item => String(item.name || '이름 없음')),
    };
  }, [importJsonText]);

  /* ─── AI 서식 생성 (프롬프트로 만들기) ─── */
  const handleAiGenerate = async (overrideModel?: string) => {
    if (!aiPromptInput.trim()) {
      showToast('원하는 서식 스타일을 먼저 설명해 주세요.');
      return;
    }
    if (!hasApiKey) {
      showToast('⚠️ AI 연동을 위해 환경설정에서 Gemini API Key를 등록해 주세요.');
      return;
    }

    const targetModel = normalizeAIModelName(overrideModel || selectedModel || DEFAULT_AI_MODEL);
    if (overrideModel && overrideModel !== selectedModel) {
      setSelectedModel(targetModel);
    }

    setIsAiGenerating(true);
    setAiError(null);

    try {
      let guideContent = '';
      try {
        const res = await fetch('/CSS_PROFILE_GUIDE.md');
        if (res.ok) guideContent = await res.text();
      } catch {}

      const promptText = `당신은 최고급 출판/웹 조판 전문 CSS 디자이너입니다. 사용자가 요청한 스타일에 부합하는 완성도 높은 Onrivi Author 최신 서식 프로필(JSON)을 설계해 주세요.

[사용자 요청 스타일]:
"${aiPromptInput}"

[필수 요구사항]:
1. 7대 서식 쇼케이스(본문, 제목 h1~h6, 목록 및 체크박스, 표, 인용구, 코드블록, 미디어/수식/각주)를 빠짐없이 조화롭게 구성하세요.
2. 용지 규격 및 표준 여백(pageStyle)을 반드시 A4 규격(세로, 그림책 요청 시 가로 landscape)과 상하 18mm, 좌우 12mm로 지정하세요:
   "pageStyle": {
     "paperSize": "a4",
     "orientation": "portrait",
     "marginTop": "18mm",
     "marginBottom": "18mm",
     "marginLeft": "12mm",
     "marginRight": "12mm",
     "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Noto Sans', Arial, sans-serif",
     "fontSize": "16px",
     "lineHeight": "1.75",
     "letterSpacing": "-0.01em",
     "backgroundColor": "#ffffff",
     "headingSizeOffset": "3pt",
     "tabSize": "2",
     "exportPageBreakLevel": "none"
   }
3. 표(tableStructure) 구조체를 반드시 포함하여 외곽 테두리 및 행/열 두께를 명확히 지정하세요:
   "tableStructure": {
     "outerBorderWidth": "1px",  // 표 외곽 테두리 두께 (예: "1px", "2px", "0px")
     "rowBorderWidth": "1px",    // 표 행(가로선) 구분선 두께 (예: "1px", "2px", "0px")
     "colBorderWidth": "0px"     // 표 열(세로선) 구분선 두께 (모든 테두리 격자형은 "1px", 가로선 강조형/논문형은 "0px")
   }
   표 셀(th, td)에 'border-left: none' 또는 'border-right: none' 같은 레거시 방향별 테두리를 절대 개별 선언하지 마세요.
4. 구분선(hrStructure - 28px/1px/solid/100%), 체크박스(checkboxStructure - boxSize: "16px", checkedEffect: "none", textGap: "9px", color: 본문색과 동일), 글머리 기호 1~3단계 계층(bulletStructure - level1/level2/level3, 필요시 custom1~3), 미디어·표 캡션 구조체(mediaCaptionStructure - position: "top"|"bottom", format: "standard"|"bracket"|"angle"|"plain"|"custom", 필요시 kindOverrides), 제목 번호 체계(headingNumbering - 요청 시 decimal-outline, 장절 체계, 개조식 기호 등 설정)를 포함하세요.
5. 미디어 객체(rules.img, rules.video, rules.map)는 너비를 100%("width": "100%")로 설정하고, video는 "height": "315px", map은 "height": "400px"으로 지정하세요.
6. 설명이나 마크다운 코드블록(\`\`\`) 없이 오직 유효한 단일 JSON 객체({ ... })만 출력하세요.

--- 공식 가이드라인 참조 ---
${guideContent || CSS_PROFILE_GUIDE_MD}
---------------------------`;

      const cleanKey = ensureDecryptedApiKey(effectiveApiKey);
      const genAI = new GoogleGenerativeAI(cleanKey);
      const model = genAI.getGenerativeModel({
        model: targetModel,
        systemInstruction: '당신은 CSS 서식 JSON 생성 전문가입니다. 오직 순수한 JSON 객체만 출력하십시오.',
      });

      let attempts = 0;
      const maxAttempts = 3;
      let resultText = '';

      while (attempts < maxAttempts) {
        try {
          attempts++;
          const result = await model.generateContent(promptText);
          resultText = result.response.text().trim();
          break;
        } catch (callErr: any) {
          console.warn(`[StyleManagerModal] '${targetModel}' AI 서식 생성 ${attempts}회 실패:`, callErr);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          throw callErr;
        }
      }

      let cleanedText = resultText;
      const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
      const match = cleanedText.match(jsonBlockRegex);
      if (match && match[1]) cleanedText = match[1].trim();

      const startIdx = cleanedText.indexOf('{');
      if (startIdx !== -1) {
        let braceCount = 0, inString = false, escape = false;
        for (let i = startIdx; i < cleanedText.length; i++) {
          const char = cleanedText[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') {
              braceCount--;
              if (braceCount === 0) { cleanedText = cleanedText.substring(startIdx, i + 1); break; }
            }
          }
        }
      }

      const parsedData = JSON.parse(cleanedText);
      if (!parsedData.name) {
        parsedData.name = aiPromptInput.trim().slice(0, 16) || 'AI 맞춤 서식';
      }

      const normalizedData = normalizeCssProfile(parsedData, profiles);

      if (onImportProfile) {
        onImportProfile(normalizedData);
      }
      setSelectedId(normalizedData.id);
      onSelectProfile(normalizedData.id);
      setAiPromptInput('');
      setIsEditingName(false);
      setAiError(null);
      showToast(`✨ '${normalizedData.name}' 서식이 AI(${targetModel})로 생성되어 즉시 반영되었습니다!`);
    } catch (err: any) {
      console.error('[StyleManagerModal] AI 서식 생성 최종 에러:', err);
      const friendly = formatUserFriendlyAIError(err, targetModel);
      setAiError(friendly);
      showToast(`⚠️ [${friendly.title}] ${friendly.solution || friendly.description}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  /* ─── CSS 가이드 다운로드 ─── */
  const handleDownloadGuide = () => {
    const blob = new Blob([CSS_PROFILE_GUIDE_MD], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Onrivi_CSS_Profile_명세서.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('최신 서식 생성 가이드(.md)가 다운로드되었습니다.');
  };

  /* ─── 만능 AI 마스터 프롬프트 복사 ─── */
  const handleCopyMasterPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_MASTER_PROMPT_TEMPLATE);
      showToast('📋 외부 AI용 만능 서식 생성 마스터 프롬프트가 복사되었습니다!');
    } catch {
      showToast('클립보드 복사에 실패했습니다.');
    }
  };

  // Modern Technical Editorial 디자인 시스템 테마 토큰 (AGENTS.md Rule 6 & Rule 8 준수)
  const surfaceBase = dk ? 'bg-[#090D16]' : 'bg-[#F8FAFC]';
  const hairline = dk ? 'border-slate-800' : 'border-slate-200/90';
  const cardSurface = dk ? 'bg-[#0F172A]/90 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs';
  const textTitle = dk ? 'text-zinc-100 font-bold' : 'text-slate-900 font-bold';
  const textBody = dk ? 'text-zinc-300' : 'text-slate-700';

  // 🌟 필터링 및 최신순 정렬 프로필 목록 (사용자 서식 최신순 우선 배치)
  const userProfiles = profiles.filter(p => !isSystemProfileId(p.id));
  const systemProfiles = profiles.filter(p => isSystemProfileId(p.id));
  const reversedUserProfiles = [...userProfiles].reverse();

  const filteredProfiles = (
    filterType === 'system'
      ? systemProfiles
      : filterType === 'custom'
      ? reversedUserProfiles
      : [...reversedUserProfiles, ...systemProfiles]
  ).filter(p => (filterType !== 'picturebook' || p.layout?.type === 'picturebook') && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // 선택된 서식의 정규화 데이터 및 상세 요약 계산
  const normalizedSelected = useMemo(
    () => ({ ...normalizeCssProfile(selectedProfile, profiles), id: selectedProfile.id, name: selectedProfile.name }),
    [selectedProfile, profiles]
  );

  const currentTable = normalizedSelected.tableStructure || {
    outerBorderWidth: '1px', rowBorderWidth: '1px', colBorderWidth: '0px'
  };
  const currentBullets = normalizedSelected.bulletStructure || {
    level1: 'disc', level2: 'circle', level3: 'square'
  };
  const bullet1Char = resolveBulletSymbol(currentBullets.level1, currentBullets.custom1, '•');
  const bullet2Char = resolveBulletSymbol(currentBullets.level2, currentBullets.custom2, '○');
  const bullet3Char = resolveBulletSymbol(currentBullets.level3, currentBullets.custom3, '▪');

  // 제목 번호 미니 프리뷰 계산
  const headingFormats = useMemo(() => normalizedSelected.headingNumbering || [], [normalizedSelected.headingNumbering]);
  const h1Prefix = useMemo(() => {
    const f0 = headingFormats[0];
    if (!f0 || headingFormat(f0) === 'none') return '';
    const m = headingFormat(f0) === 'decimal-outline'
      ? outlineMarker(headingFormats, [1, 1, 1, 1, 1, 1], 0)
      : headingMarker(f0, 1);
    return m ? `${m} ` : '';
  }, [headingFormats]);

  const h2Prefix = useMemo(() => {
    const f1 = headingFormats[1];
    if (!f1 || headingFormat(f1) === 'none') return '';
    const m = headingFormat(f1) === 'decimal-outline'
      ? outlineMarker(headingFormats, [1, 1, 1, 1, 1, 1], 1)
      : headingMarker(f1, 1);
    return m ? `${m} ` : '';
  }, [headingFormats]);

  // 캡션 미니 프리뷰 계산
  const tableCaptionCfg = resolveCaptionConfig(normalizedSelected.mediaCaptionStructure, 'table') || {
    position: 'top',
    format: 'standard',
    customTemplate: '**{kind} {n}. {title}**',
  };
  const imageCaptionCfg = resolveCaptionConfig(normalizedSelected.mediaCaptionStructure, 'image') || {
    position: 'top',
    format: 'standard',
    customTemplate: '**{kind} {n}. {title}**',
  };
  const sampleTableCaption = formatMediaCaption('표', 1, '분기별 핵심 성과 지표', tableCaptionCfg.format, tableCaptionCfg.customTemplate).replace(/\*\*/g, '');
  const sampleImageCaption = formatMediaCaption('그림', 1, '시스템 아키텍처 다이어그램', imageCaptionCfg.format, imageCaptionCfg.customTemplate).replace(/\*\*/g, '');

  return (
    <div className={`fixed inset-0 z-[210] flex flex-col font-sans ${surfaceBase}`}>

      {/* 🌟 1. 상단 글로벌 헤더 바 (Modern Technical Editorial) */}
      <header className={`min-h-16 py-3 gap-3 px-6 flex flex-wrap items-center justify-between border-b ${hairline} ${dk ? 'bg-[#090D16]/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'} shrink-0`}>
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-[#1d4ed8] border border-[#1d4ed8]/20 shadow-xs">
            <BookOpen className="w-5 h-5 text-[#1d4ed8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                서식 관리 센터
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold tracking-wide bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-[#1d4ed8] dark:text-blue-400 border border-[#1d4ed8]/20">
                전체 {profiles.length} · 내 서식 {userProfiles.length}
              </span>
            </div>
            <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              출판 서식 프로필 관리 · 원클릭 가져오기/내보내기 · AI 서식 생성 · 최신 서식 생성 가이드
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 최신 서식 수동 새로고침 버튼 */}
          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleRefreshProfiles}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-xl transition-all border ${hairline} ${
              dk ? 'bg-slate-900 hover:bg-slate-800 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            } disabled:opacity-50 cursor-pointer`}
            title="리소스 폴더(userCssProfiles.json)에서 최신 서식을 다시 읽어옵니다"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefreshing ? '갱신 중...' : '서식 새로고침'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-bold rounded-xl transition-colors border ${hairline} ${
              dk ? 'bg-slate-900 hover:bg-slate-800 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            } cursor-pointer`}
          >
            <span>서식 편집기로 돌아가기</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 🌟 2. 본문 2단 분할 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 좌측 LNB 사이드바 (.bg-sidebar-luxury 표준 준수) ── */}
        <aside className={`w-[320px] shrink-0 border-r ${hairline} bg-sidebar-luxury flex flex-col overflow-hidden`}>

          {/* 사이드바 상단 헤더 & 추가(+) 타입 선택 메뉴 */}
          <div className={`p-3.5 border-b ${hairline} space-y-2.5`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-zinc-700 dark:text-zinc-300">
                등록된 서식 목록 ({filteredProfiles.length})
              </span>
              <div className="flex items-center gap-2">
                {userProfiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportAllCustomProfiles}
                    className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="내 서식 전체를 하나의 JSON 백업 파일로 내보냅니다"
                  >
                    <Archive className="w-3 h-3" />
                    <span>전체 백업</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddMenu(prev => !prev)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-0.5 transition-colors cursor-pointer ${
                    showAddMenu
                      ? 'bg-[#1d4ed8] text-white'
                      : 'text-[#1d4ed8] dark:text-blue-400 hover:bg-[#1d4ed8]/10'
                  }`}
                  title="새 서식 추가 (일반문서 / 그림책 전체표지 / 그림책 오른쪽표지 선택)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>추가</span>
                  {showAddMenu ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* 사이드바 추가(+) 클릭 시 열리는 3종 문서 타입 선택 패널 */}
            {showAddMenu && (
              <div className={`p-2 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/95' : 'bg-white'} shadow-sm space-y-1 animate-in fade-in duration-150`}>
                <p className="text-[10.5px] font-extrabold text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5">
                  생성할 서식 문서 타입을 선택하세요:
                </p>
                <button
                  type="button"
                  onClick={() => handleCreateProfileByType('general')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    dk ? 'hover:bg-slate-800 text-zinc-100' : 'hover:bg-blue-50 text-slate-800'
                  }`}
                >
                  <span>📄 일반문서</span>
                  <span className="text-[10px] font-bold text-[#1d4ed8] dark:text-blue-400">기본서식 기반</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateProfileByType('picturebook-full')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    dk ? 'hover:bg-slate-800 text-zinc-100' : 'hover:bg-blue-50 text-slate-800'
                  }`}
                >
                  <span>📖 그림책(전체표지)</span>
                  <span className="text-[10px] font-bold text-[#0d9488] dark:text-teal-400">스토리북 · 전체표지</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateProfileByType('picturebook-right')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    dk ? 'hover:bg-slate-800 text-zinc-100' : 'hover:bg-blue-50 text-slate-800'
                  }`}
                >
                  <span>📖 그림책(오른쪽표지)</span>
                  <span className="text-[10px] font-bold text-[#0d9488] dark:text-teal-400">스토리북 · 오른쪽표지</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateProfileByType('sns-card')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    dk ? 'hover:bg-slate-800 text-zinc-100' : 'hover:bg-pink-50 text-slate-800'
                  }`}
                >
                  <span>📱 SNS 카드뉴스</span>
                  <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400">인스타·링크드인 1:1</span>
                </button>
              </div>
            )}

            {/* 실시간 검색창 */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400" />
              <input
                type="text"
                placeholder="서식 이름 검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-7 py-1.5 text-[12px] rounded-lg border ${hairline} ${
                  dk ? 'bg-slate-900/90 text-zinc-100 placeholder-zinc-500' : 'bg-white text-slate-800 placeholder-slate-400'
                } focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] font-medium`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 필터 탭 (전체 / 내 서식 / 시스템 / 그림책) */}
            <div className="flex p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-900/80 text-[11px] font-bold">
              {[
                { key: 'all', label: `전체 (${profiles.length})` },
                { key: 'custom', label: `내 서식 (${userProfiles.length})` },
                { key: 'system', label: '시스템' },
                { key: 'picturebook', label: '그림책' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterType(f.key as any)}
                  className={`flex-1 py-1 rounded-md transition-all duration-150 cursor-pointer ${
                    filterType === f.key
                      ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs font-extrabold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 콤팩트 고대비 저장소 상태 배너 (AGENTS.md Rule 8 고대비 준수) */}
          <div className={`mx-2.5 mt-2 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/90 text-zinc-200' : 'bg-white/90 text-zinc-800'} px-3 py-2 text-[11px] space-y-1 shadow-2xs`}>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-extrabold truncate">
                  저장소: {profileReadStatus?.environment === 'cloud' ? '☁️ 웹드라이브' : '💻 로컬 폴더'}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 font-bold shrink-0">
                  ({profileReadStatus?.state === 'loading'
                    ? '읽는 중'
                    : profileReadStatus?.state === 'success'
                    ? `내 서식 ${profileReadStatus.userCount ?? userProfiles.length}개`
                    : profileReadStatus?.state === 'error'
                    ? '오류'
                    : '대기'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowStorageDetail(prev => !prev)}
                className="text-[10.5px] font-bold text-[#1d4ed8] dark:text-blue-400 hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
              >
                <span>{showStorageDetail ? '접기' : '경로보기'}</span>
                {showStorageDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showStorageDetail && (
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1 text-[10.5px]">
                <p className="font-mono font-bold text-zinc-700 dark:text-zinc-300 break-all">
                  {profileReadStatus?.folder || '경로 확인 중'} / profiles / userCssProfiles.json
                </p>
                {profileReadStatus?.folderId && (
                  <p className="font-mono text-zinc-700 dark:text-zinc-300 break-all">
                    폴더 ID: {profileReadStatus.folderId}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={isRefreshing}
                    onClick={handleRefreshProfiles}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>최신 서식 즉시 새로고침</span>
                  </button>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">v2026.10.27</span>
                </div>
              </div>
            )}
          </div>

          {profileReadStatus?.environment === 'local' && getResourceSettings('cloud')?.folderId && (
            <div className="mx-2.5 mt-2 p-2.5 rounded-xl bg-blue-50 text-blue-900 dark:bg-blue-950/70 dark:text-blue-200 border border-blue-200 dark:border-blue-900 text-[11px] space-y-1">
              <p className="font-medium">현재 서식 저장소는 로컬입니다. 저장된 웹드라이브 리소스 폴더의 서식을 사용할 수 있습니다.</p>
              <button
                type="button"
                className="font-extrabold underline text-[#1d4ed8] dark:text-blue-300 cursor-pointer"
                onClick={() => {
                  const drive = getResourceSettings('cloud');
                  if (drive?.kind === 'drive' && drive.folderId) saveResourceSettings(drive, 'cloud');
                }}
              >
                웹드라이브 서식 사용
              </button>
            </div>
          )}

          {profileReadStatus?.state === 'error' && (
            <div role="alert" className="mx-2.5 mt-2 p-3 rounded-xl bg-red-50 text-red-900 dark:bg-red-950/80 dark:text-red-200 border border-red-200 dark:border-red-900 text-xs space-y-1.5">
              <p className="font-bold">서식 파일을 읽지 못했습니다.</p>
              <p>{profileReadStatus.error}</p>
              <p className="break-all font-mono font-bold text-zinc-700 dark:text-zinc-300">
                읽기 위치: {profileReadStatus.folder || '미설정'} / profiles / userCssProfiles.json
              </p>
              {profileReadStatus.folderId && <p className="break-all font-mono">Drive 폴더 ID: {profileReadStatus.folderId}</p>}
              {profileReadStatus.environment === 'local' && !(window as any).electronAPI && (
                <button
                  type="button"
                  disabled={isReconnectingLocal}
                  className="block font-bold underline disabled:opacity-50 cursor-pointer"
                  onClick={handleReconnectLocal}
                >
                  {isReconnectingLocal ? '로컬 폴더 연결 중...' : '로컬 리소스 폴더 다시 연결'}
                </button>
              )}
              <button
                type="button"
                className="font-bold underline cursor-pointer"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('onrivi:resource-settings'));
                }}
              >
                리소스 폴더 설정 확인
              </button>
            </div>
          )}

          {/* 서식 목록 아이템 영역 (AGENTS.md Rule 6: 세로선 금지, 고대비 볼드 + 코발트 음영 라운드 박스) */}
          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1 custom-scrollbar">
            {filteredProfiles.length === 0 ? (
              <div className="py-8 px-2 text-center text-zinc-700 dark:text-zinc-300 text-[12px] space-y-3">
                <p className="font-bold">일치하는 서식이 없습니다.</p>
                {filterType === 'custom' && !searchTerm.trim() && getResourceSettings()?.kind === 'drive' && (
                  <div className="p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-2 text-center shadow-xs">
                    <p className="text-[12px] font-bold text-blue-900 dark:text-blue-300">
                      ☁️ 웹드라이브 서식 다시 읽기
                    </p>
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                      선택한 리소스 폴더의 profiles/userCssProfiles.json을 다시 읽습니다. 연결된 상태에서는 재인증하지 않습니다.
                    </p>
                    <button
                      type="button"
                      disabled={isReconnectingDrive}
                      onClick={handleReconnectDrive}
                      className="w-full py-2 px-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-lg text-[11px] font-extrabold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReconnectingDrive ? 'animate-spin' : ''}`} />
                      <span>{isReconnectingDrive ? '서식 읽는 중...' : getSavedDriveToken() ? '서식 다시 읽기' : 'Drive 연결 후 서식 읽기'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredProfiles.map(p => {
                const isSys = isSystemProfileId(p.id);
                const isActive = p.id === selectedId;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      onSelectProfile(p.id);
                      setIsEditingName(false);
                    }}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 shadow-xs'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[14px] shrink-0">
                        {p.layout ? '📖' : p.pageStyle?.paperSize?.startsWith('sns_') || p.id === 'sns-card-news' ? '📱' : isSys ? '🏛️' : '🎨'}
                      </span>
                      <div className="min-w-0 text-left">
                        <p className={`text-[12.5px] truncate leading-tight ${
                          isActive
                            ? 'text-blue-700 dark:text-blue-400 font-extrabold'
                            : 'text-zinc-800 dark:text-zinc-200 font-semibold group-hover:text-slate-950 dark:group-hover:text-white'
                        }`}>
                          {p.name}
                        </p>
                        <p className="text-[10.5px] text-zinc-700 dark:text-zinc-300 truncate mt-0.5 font-medium">
                          {p.pageStyle?.fontSize || '15px'} · {p.pageStyle?.fontFamily?.split(',')[0].replace(/['"]/g, '') || '기본서체'}
                        </p>
                        {p.layout && (
                          <div className="flex gap-1 mt-1" aria-label="그림과 본문 배치">
                            <span className="w-6 h-4 rounded-sm bg-blue-200 border border-blue-300" />
                            <span className="w-6 h-4 rounded-sm border border-slate-300 text-[8px] leading-4 text-center font-bold text-zinc-700 dark:text-zinc-200">본문</span>
                            <span className="text-[9.5px] font-bold text-blue-600 dark:text-blue-400">
                              {p.layout.cover === 'full-image' ? '전체 표지' : '오른쪽 표지'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
                      {/* 호버 시 나타나는 퀵 액션 (복제 / 파일 내보내기 / JSON 복사 / 삭제) */}
                      <div className="hidden group-hover:flex items-center gap-0.5 mr-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateProfile(p);
                          }}
                          className="p-1 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-[#1d4ed8] transition-colors"
                          title="이 서식 복제"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportProfile(p);
                          }}
                          className="p-1 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-[#1d4ed8] transition-colors"
                          title="파일로 내보내기 (.json)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyJson(p);
                          }}
                          className="p-1 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-teal-100 dark:hover:bg-slate-700 hover:text-[#0d9488] transition-colors"
                          title="JSON 복사"
                        >
                          <FileCode2 className="w-3.5 h-3.5" />
                        </button>
                        {!isSys && onDeleteProfile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(p.id);
                              handleDeleteClick(p);
                            }}
                            className="p-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="서식 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${
                        isSys
                          ? 'bg-slate-200/80 dark:bg-slate-800 text-zinc-700 dark:text-zinc-300'
                          : 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      }`}>
                        {isSys ? '시스템' : '사용자'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── 우측 메인 디테일 & 4-Tab 워크스페이스 허브 패널 ── */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[880px] mx-auto space-y-6 pb-16">

            {/* 🌟 [A-1. 상단 2단 카드 분리: 좌측 '이름 및 서식 설명 카드' + 우측 별도 '설명 상세 카드'] */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

              {/* 좌측: 이름 카드 (서식 이름 + 일반문서/그림책 여부 포함 서식 설명 + 적용하기) */}
              <div className={`p-5 rounded-2xl border ${hairline} ${cardSurface} flex flex-col justify-between gap-3`}>
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                        isSystem
                          ? 'bg-slate-100 dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-slate-700'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-[#1d4ed8] dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {isSystem ? '🏛️ 시스템 기본 서식' : '🎨 사용자 정의 서식'}
                      </span>
                      <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-extrabold ${
                        selectedProfile.layout?.type === 'picturebook'
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-[#0d9488] dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                          : selectedProfile.pageStyle?.paperSize?.startsWith('sns_') || selectedProfile.id === 'sns-card-news'
                          ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {selectedProfile.layout?.type === 'picturebook'
                          ? `📖 그림책(스토리북 · ${selectedProfile.layout.cover === 'full-image' ? '전체표지' : '오른쪽표지'})`
                          : selectedProfile.pageStyle?.paperSize?.startsWith('sns_') || selectedProfile.id === 'sns-card-news'
                          ? `📱 SNS 카드뉴스 (${selectedProfile.pageStyle?.paperSize === 'sns_portrait' ? '4:5 세로형' : '1:1 정사각'})`
                          : '📄 일반문서'}
                      </span>
                      {selectedProfile.id === activeProfileId && (
                        <span className="text-[10.5px] px-2 py-0.5 rounded-full font-extrabold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ 현재 적용 중
                        </span>
                      )}
                    </div>
                  </div>

                  {isEditingName ? (
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSave();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        className={`flex-1 min-w-0 px-3 py-1.5 text-base font-bold rounded-lg border border-[#1d4ed8] ${
                          dk ? 'bg-slate-900 text-zinc-100' : 'bg-white text-slate-900'
                        } outline-none`}
                      />
                      <button
                        type="button"
                        onClick={handleRenameSave}
                        className="px-3 py-1.5 text-[12px] font-bold text-white bg-[#1d4ed8] rounded-lg cursor-pointer shrink-0"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="px-3 py-1.5 text-[12px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-zinc-700 dark:text-zinc-300 cursor-pointer shrink-0"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 truncate">
                        {selectedProfile?.name}
                      </h1>
                      {!isSystem && (
                        <button
                          type="button"
                          onClick={handleRenameStart}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                          title="이름 변경"
                        >
                          <img src="/icons/icon-rename.png" width={13} height={13} alt="이름 변경" className="opacity-90" />
                          <span>이름 변경</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* 서식 설명 (일반문서인지 그림책인지 SNS 카드뉴스인지 명시 포함) */}
                  <div className={`p-3 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'} text-[12px] font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed`}>
                    <span className="font-extrabold text-[#1d4ed8] dark:text-blue-400 mr-1.5">
                      [{selectedProfile.layout?.type === 'picturebook'
                        ? `그림책(스토리북 · ${selectedProfile.layout.cover === 'full-image' ? '전체표지' : '오른쪽표지'}) 서식`
                        : selectedProfile.pageStyle?.paperSize?.startsWith('sns_') || selectedProfile.id === 'sns-card-news'
                        ? 'SNS 카드뉴스 서식'
                        : '일반문서 서식'}]
                    </span>
                    <span>
                      {selectedProfile?.description ||
                        (selectedProfile.layout?.type === 'picturebook'
                          ? '페이지 단위로 그림과 본문이 나란히 배치되는 그림책(스토리북) 전용 서식입니다.'
                          : selectedProfile.pageStyle?.paperSize?.startsWith('sns_') || selectedProfile.id === 'sns-card-news'
                          ? '인스타그램·쓰레드·링크드인·블로그 공유에 최적화된 SNS 카드뉴스 전용 서식입니다.'
                          : '일반 보고서·출판 원고 작성을 위한 정갈한 텍스트 배치와 표준 용지 규격을 제공하는 일반문서 서식입니다.')}
                    </span>
                  </div>
                </div>

                {/* 하단 액션 바 (이 서식 적용하기 & 사용자 서식 삭제) */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {!isSystem && onDeleteProfile && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(selectedProfile)}
                      className="px-3 py-2 text-[12px] font-bold rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="이 사용자 서식 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onSelectProfile(selectedProfile.id);
                      onClose();
                    }}
                    className="px-4 py-2 text-[12.5px] font-extrabold text-white bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>이 서식 적용하기</span>
                  </button>
                </div>
              </div>

              {/* 우측 (이름 옆 별도 카드): 설명 상세 카드 (글꼴, 크기/행간, 여백, 표 테두리, 불릿, 문서타입) */}
              <div className={`p-5 rounded-2xl border ${hairline} ${cardSurface} flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                  <span className={`text-[13px] font-extrabold ${textTitle}`}>
                    📋 설명 상세 카드 (서식 규격 요약)
                  </span>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#1d4ed8]/10 text-[#1d4ed8] dark:text-blue-400">
                    6대 핵심 속성
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 flex-1 content-center">
                  <div className={`p-2.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'}`}>
                    <div className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300">글꼴</div>
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-zinc-100 truncate mt-0.5">
                      {selectedProfile.pageStyle?.fontFamily?.split(',')[0].replace(/['"]/g, '') || '기본서체'}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'}`}>
                    <div className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300">크기 / 행간</div>
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-zinc-100 mt-0.5">
                      {selectedProfile.pageStyle?.fontSize || '16px'} / {selectedProfile.pageStyle?.lineHeight || '1.75'}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'}`}>
                    <div className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300">여백</div>
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-zinc-100 mt-0.5">
                      상하 {selectedProfile.pageStyle?.marginTop || '18mm'} · 좌우 {selectedProfile.pageStyle?.marginLeft || '12mm'}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'}`}>
                    <div className="text-[10px] font-extrabold text-[#1d4ed8] dark:text-blue-400">표 테두리</div>
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-zinc-100 mt-0.5">
                      외곽 {currentTable.outerBorderWidth} · 행 {currentTable.rowBorderWidth} · 열 {currentTable.colBorderWidth}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'}`}>
                    <div className="text-[10px] font-extrabold text-[#0d9488] dark:text-teal-400">불릿</div>
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-zinc-100 mt-0.5">
                      {bullet1Char || '없음'} ➔ {bullet2Char || '없음'} ➔ {bullet3Char || '없음'}
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'}`}>
                    <div className="text-[10px] font-extrabold text-[#f97316] dark:text-amber-400">문서 타입</div>
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-zinc-100 mt-0.5">
                      {selectedProfile.layout?.type === 'picturebook'
                        ? `그림책(스토리북 · ${selectedProfile.layout.cover === 'full-image' ? '전체표지' : '오른쪽표지'})`
                        : selectedProfile.pageStyle?.paperSize?.startsWith('sns_') || selectedProfile.id === 'sns-card-news'
                        ? `SNS 카드뉴스 (${selectedProfile.pageStyle?.paperSize === 'sns_portrait' ? '4:5 세로형' : '1:1 정사각'})`
                        : '일반문서'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 🌟 [A-2. 실시간 미니 조판 미리보기 카드 (Live Mini-Preview)] */}
            <div className={`p-4 lg:p-5 rounded-2xl border ${hairline} ${cardSurface}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-zinc-700 dark:text-zinc-300">
                    <Eye className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    <span>실시간 미니 조판 미리보기</span>
                    <span className="text-[10.5px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                      (제목 번호 · 본문 · 다단계 불릿 · 인용구 · 표 테두리 · 캡션 위치 요약)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMiniPreview(prev => !prev)}
                    className="text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showMiniPreview ? '미리보기 접기' : '미리보기 펼치기'}</span>
                    {showMiniPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showMiniPreview && (
                  <div
                    className="rounded-xl border border-slate-300/80 dark:border-slate-700 p-4 transition-all overflow-hidden shadow-inner"
                    style={{
                      backgroundColor: normalizedSelected.pageStyle?.backgroundColor || '#ffffff',
                      fontFamily: normalizedSelected.pageStyle?.fontFamily || 'Pretendard, sans-serif',
                      color: normalizedSelected.rules?.p?.color || '#2f2f2f',
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {/* 좌측: 제목 + 본문 + 불릿 + 인용구 */}
                      <div className="space-y-2">
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: Number(normalizedSelected.rules?.h1?.['font-weight'] || 800),
                            color: normalizedSelected.rules?.h1?.color || '#111827',
                            borderBottom: normalizedSelected.rules?.h1?.['border-bottom'] || 'none',
                            borderLeft: normalizedSelected.rules?.h1?.['border-left'] || 'none',
                            paddingBottom: normalizedSelected.rules?.h1?.['border-bottom'] ? '4px' : '0px',
                            paddingLeft: normalizedSelected.rules?.h1?.['border-left'] && normalizedSelected.rules?.h1?.['border-left'] !== 'none' ? '8px' : '0px',
                            lineHeight: 1.35,
                          }}
                        >
                          {h1Prefix}대제목 H1 타이포그래피 샘플
                        </div>

                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: Number(normalizedSelected.rules?.h2?.['font-weight'] || 700),
                            color: normalizedSelected.rules?.h2?.color || '#1e293b',
                            borderBottom: normalizedSelected.rules?.h2?.['border-bottom'] || 'none',
                            borderLeft: normalizedSelected.rules?.h2?.['border-left'] || 'none',
                            paddingBottom: normalizedSelected.rules?.h2?.['border-bottom'] ? '3px' : '0px',
                            paddingLeft: normalizedSelected.rules?.h2?.['border-left'] && normalizedSelected.rules?.h2?.['border-left'] !== 'none' ? '8px' : '0px',
                            lineHeight: 1.4,
                          }}
                        >
                          {h2Prefix}중제목 H2 섹션 헤딩 스타일
                        </div>

                        <p
                          style={{
                            fontSize: '12px',
                            lineHeight: normalizedSelected.pageStyle?.lineHeight || '1.75',
                            color: normalizedSelected.rules?.p?.color || '#2f2f2f',
                            margin: 0,
                          }}
                        >
                          본문 문단(P)은 <b>{normalizedSelected.pageStyle?.fontSize || '16px'}</b> 크기와 <b>{normalizedSelected.pageStyle?.lineHeight || '1.75'}</b> 줄간격으로 조판됩니다.
                        </p>

                        {/* 1~3단계 불릿 계층 */}
                        <div className="text-[11.5px] space-y-0.5 pl-1" style={{ color: normalizedSelected.rules?.ul?.color || normalizedSelected.rules?.p?.color || '#2f2f2f' }}>
                          <div>{bullet1Char} 1단계 목록 기호 ({currentBullets.level1 === 'custom' ? `직접입력: ${bullet1Char}` : currentBullets.level1})</div>
                          <div className="pl-4">{bullet2Char} 2단계 하위 목록 기호 ({currentBullets.level2 === 'custom' ? `직접입력: ${bullet2Char}` : currentBullets.level2})</div>
                          <div className="pl-8">{bullet3Char} 3단계 세부 목록 기호 ({currentBullets.level3 === 'custom' ? `직접입력: ${bullet3Char}` : currentBullets.level3})</div>
                        </div>
                      </div>

                      {/* 우측: 인용구 + 표 테두리 & 캡션 프리뷰 */}
                      <div className="space-y-2.5">
                        {/* 인용구 미니 샘플 */}
                        <div
                          style={{
                            padding: '6px 10px',
                            fontSize: '11.5px',
                            backgroundColor: normalizedSelected.rules?.blockquote?.['background-color'] || '#f8fafc',
                            color: normalizedSelected.rules?.blockquote?.color || '#334155',
                            borderLeft: normalizedSelected.rules?.blockquote?.['border-left'] || '4px solid #1d4ed8',
                            border: normalizedSelected.rules?.blockquote?.border && normalizedSelected.rules?.blockquote?.border !== 'none'
                              ? normalizedSelected.rules.blockquote.border
                              : undefined,
                            borderRadius: normalizedSelected.rules?.blockquote?.['border-radius'] || '4px',
                          }}
                        >
                          ❝ 인용구(Blockquote) 및 핵심 요약 콜아웃 박스 스타일 미리보기입니다.
                        </div>

                        {/* 표 + 캡션 미니 샘플 */}
                        <div className="space-y-1">
                          {tableCaptionCfg.position === 'top' && (
                            <div className="text-[10.5px] font-bold" style={{ color: normalizedSelected.rules?.p?.color || '#334155' }}>
                              {sampleTableCaption} <span className="opacity-75">(표 상단 캡션)</span>
                            </div>
                          )}
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '11px',
                              borderStyle: 'solid',
                              borderWidth: currentTable.outerBorderWidth || '1px',
                              borderColor: normalizedSelected.rules?.table?.['border-color'] || '#cbd5e1',
                            }}
                          >
                            <thead>
                              <tr>
                                {['구분', '항목 설명', '규격'].map((label, idx) => (
                                  <th
                                    key={label}
                                    style={{
                                      backgroundColor: normalizedSelected.rules?.th?.['background-color'] || '#f1f5f9',
                                      color: normalizedSelected.rules?.th?.color || '#0f172a',
                                      padding: '4px 6px',
                                      fontWeight: 700,
                                      borderBottomStyle: 'solid',
                                      borderBottomWidth: currentTable.rowBorderWidth || '1px',
                                      borderBottomColor: normalizedSelected.rules?.th?.['border-color'] || '#cbd5e1',
                                      borderLeftStyle: idx > 0 ? 'solid' : 'none',
                                      borderLeftWidth: idx > 0 ? (currentTable.colBorderWidth || '0px') : '0px',
                                      borderLeftColor: normalizedSelected.rules?.th?.['border-color'] || '#cbd5e1',
                                    }}
                                  >
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {['표준 여백', '상하 18mm · 좌우 12mm', 'A4'].map((cell, idx) => (
                                  <td
                                    key={cell}
                                    style={{
                                      padding: '4px 6px',
                                      color: normalizedSelected.rules?.td?.color || '#334155',
                                      borderLeftStyle: idx > 0 ? 'solid' : 'none',
                                      borderLeftWidth: idx > 0 ? (currentTable.colBorderWidth || '0px') : '0px',
                                      borderLeftColor: normalizedSelected.rules?.td?.['border-color'] || '#cbd5e1',
                                    }}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                          {tableCaptionCfg.position === 'bottom' && (
                            <div className="text-[10.5px] font-bold" style={{ color: normalizedSelected.rules?.p?.color || '#334155' }}>
                              {sampleTableCaption} <span className="opacity-75">(표 하단 캡션)</span>
                            </div>
                          )}
                          <div className="text-[10px] pt-0.5 opacity-80" style={{ color: normalizedSelected.rules?.p?.color || '#475569' }}>
                            🖼️ 이미지 캡션: <b>{sampleImageCaption}</b> ({imageCaptionCfg.position === 'top' ? '상단 배치' : '하단 배치'})
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 🌟 [B. 우측 4-Tab 워크스페이스 네비게이션 바 (스크롤 없이 모든 핵심 기능 즉시 전환)] */}
            <div className={`flex flex-wrap p-1.5 rounded-2xl border ${hairline} ${dk ? 'bg-slate-900/90' : 'bg-slate-200/70'} gap-1`}>
              {[
                { id: 'import-export' as HubTabType, label: '📤 가져오기 & 내보내기 허브', icon: Upload },
                { id: 'ai-generator' as HubTabType, label: '✨ AI 프롬프트 서식 생성기', icon: Sparkles },
                { id: 'json-viewer' as HubTabType, label: '{} 서식 JSON 코드 보기', icon: FileCode2 },
                { id: 'guide' as HubTabType, label: '📖 최신 서식 생성 가이드', icon: BookOpen },
              ].map(tab => {
                const IconComp = tab.icon;
                const active = activeHubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveHubTab(tab.id)}
                    className={`flex-1 min-w-[165px] py-2.5 px-3 rounded-xl text-[12px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-[#1d4ed8] text-white shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ========================================================================
                TAB 1: 📤 가져오기 & 내보내기 허브 (Import & Export Hub)
               ======================================================================== */}
            {activeHubTab === 'import-export' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 1. 서식 가져오기 (파일 드래그앤드롭 / 내 PC / JSON 붙여넣기) */}
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#1d4ed8]" />
                      <h3 className={`text-[14px] font-extrabold tracking-tight ${textTitle}`}>
                        서식 가져오기 (파일 드래그 앤 드롭 · 내 PC 파일 · JSON 붙여넣기)
                      </h3>
                    </div>

                    <div className="flex p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-[11.5px] font-bold">
                      <button
                        type="button"
                        onClick={() => setImportTab('file')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          importTab === 'file'
                            ? 'bg-white dark:bg-slate-700 text-[#1d4ed8] dark:text-blue-400 shadow-xs font-extrabold'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        파일로 불러오기 (.json)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportTab('text')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          importTab === 'text'
                            ? 'bg-white dark:bg-slate-700 text-[#1d4ed8] dark:text-blue-400 shadow-xs font-extrabold'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        JSON 텍스트 붙여넣기
                      </button>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${hairline} ${cardSurface}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {importTab === 'file' ? (
                      <div
                        onDragOver={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingFile(false);
                        }}
                        onDrop={handleDropFile}
                        className={`border-2 border-dashed rounded-xl p-7 text-center transition-all ${
                          isDraggingFile
                            ? 'border-[#1d4ed8] bg-blue-50/70 dark:bg-blue-950/50 scale-[1.01]'
                            : `${hairline} hover:border-[#1d4ed8] ${dk ? 'bg-slate-900/40' : 'bg-slate-50/80'}`
                        }`}
                      >
                        <div className="w-12 h-12 mx-auto rounded-full bg-blue-100/70 dark:bg-blue-950/70 flex items-center justify-center text-[#1d4ed8] dark:text-blue-400 mb-3">
                          <Upload className="w-6 h-6 stroke-[2]" />
                        </div>
                        <p className={`text-[13.5px] font-extrabold ${textTitle}`}>
                          서식 파일(.json)을 이 영역에 마우스로 끌어다 놓거나 아래 버튼을 클릭하세요
                        </p>
                        <p className="text-[11.5px] text-zinc-700 dark:text-zinc-300 mt-1 font-medium">
                          단일 서식 파일(<code>*_theme.json</code>)뿐만 아니라 <b>내 서식 전체 백업 파일(다중 배열 JSON)</b>도 한 번에 자동 인식하여 등록합니다.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2.5 rounded-xl text-[12px] font-extrabold text-white bg-[#1d4ed8] hover:bg-blue-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Upload className="w-4 h-4" />
                            <span>내 PC에서 파일 선택 (.json)</span>
                          </button>

                          <button
                            type="button"
                            onClick={handlePasteFromClipboard}
                            className={`px-4 py-2.5 rounded-xl text-[12px] font-extrabold border ${hairline} ${
                              dk ? 'bg-slate-800 hover:bg-slate-700 text-zinc-100' : 'bg-white hover:bg-slate-100 text-slate-800'
                            } shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer`}
                          >
                            <ClipboardPaste className="w-4 h-4 text-[#f97316]" />
                            <span>클립보드 JSON 바로 불러오기</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* JSON 직접 붙여넣기 모드 */
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12px] text-zinc-700 dark:text-zinc-300 font-medium">
                            외부 AI(ChatGPT, Claude, Gemini)에서 생성했거나 복사한 서식 JSON을 붙여넣고 <b>[서식 등록하기]</b>를 눌러주세요.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handlePasteFromClipboard}
                              className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#1d4ed8] dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                            >
                              <ClipboardPaste className="w-3.5 h-3.5" />
                              <span>클립보드에서 바로 붙여넣기</span>
                            </button>
                            {importJsonText && (
                              <button
                                type="button"
                                onClick={() => setImportJsonText('')}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                비우기
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={importJsonText}
                          onChange={e => setImportJsonText(e.target.value)}
                          placeholder='{ "name": "가져올 서식 이름", "pageStyle": { ... }, "rules": { ... }, "tableStructure": { ... }, "bulletStructure": { ... }, "mediaCaptionStructure": { ... } }'
                          className={`w-full h-40 p-3.5 text-[12px] font-mono rounded-xl border ${hairline} ${
                            dk ? 'bg-slate-900 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 text-slate-900 placeholder-slate-400'
                          } outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 resize-y`}
                        />

                        {/* 실시간 JSON 유효성 사전 검증 배지 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div>
                            {previewParsedImport ? (
                              previewParsedImport.valid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11.5px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>
                                    유효한 서식 {previewParsedImport.count}개 감지됨: {previewParsedImport.names.slice(0, 3).join(', ')}
                                    {previewParsedImport.names.length > 3 ? ` 외 ${previewParsedImport.names.length - 3}개` : ''}
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11.5px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>유효한 서식 JSON 구조(name, pageStyle, rules)가 아직 감지되지 않았습니다.</span>
                                </span>
                              )
                            ) : (
                              <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                                💡 마크다운 코드블록(```json)이 포함되어 있어도 자동으로 정제하여 인식합니다.
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleJsonImport}
                            disabled={!importJsonText.trim()}
                            className="px-5 py-2.5 text-[12px] font-extrabold text-white bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {previewParsedImport?.valid && previewParsedImport.count > 1
                              ? `${previewParsedImport.count}개 서식 일괄 등록하기`
                              : '서식 등록하기'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 2. 서식 내보내기 & 전체 백업 (Export & Backup Hub) */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#1d4ed8]" />
                    <h3 className={`text-[14px] font-extrabold tracking-tight ${textTitle}`}>
                      서식 내보내기 & 내 서식 일괄 백업
                    </h3>
                  </div>

                  <div className={`p-6 rounded-2xl border ${hairline} ${cardSurface}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 카드 1: 현재 선택 서식 파일 다운로드 */}
                      <div
                        onClick={() => handleExportProfile(selectedProfile)}
                        className={`p-4 rounded-xl border ${hairline} ${
                          dk ? 'bg-slate-900/50 hover:bg-slate-900/90' : 'bg-slate-50 hover:bg-blue-50/50'
                        } cursor-pointer transition-all flex items-start gap-3.5 group`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-950/70 flex items-center justify-center text-[#1d4ed8] dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                          <Download className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-[13px] font-extrabold ${textTitle}`}>선택 서식 파일 저장 (.json)</h4>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed font-medium">
                            현재 선택된 <b>‘{selectedProfile.name}’</b> 서식을 완전체 JSON 파일로 다운로드합니다.
                          </p>
                        </div>
                      </div>

                      {/* 카드 2: 클립보드 JSON 복사 */}
                      <div
                        onClick={() => handleCopyJson(selectedProfile)}
                        className={`p-4 rounded-xl border ${hairline} ${
                          dk ? 'bg-slate-900/50 hover:bg-slate-900/90' : 'bg-slate-50 hover:bg-blue-50/50'
                        } cursor-pointer transition-all flex items-start gap-3.5 group`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-teal-100/80 dark:bg-teal-950/70 flex items-center justify-center text-[#0d9488] dark:text-teal-400 shrink-0 group-hover:scale-105 transition-transform">
                          <Copy className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-[13px] font-extrabold ${textTitle}`}>클립보드로 JSON 복사</h4>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed font-medium">
                            <b>‘{selectedProfile.name}’</b>의 JSON 코드를 복사하여 팀원이나 다른 기기에 즉시 공유합니다.
                          </p>
                        </div>
                      </div>

                      {/* 카드 3: 내 서식 전체 일괄 백업 */}
                      <div
                        onClick={handleExportAllCustomProfiles}
                        className={`p-4 rounded-xl border ${hairline} ${
                          dk ? 'bg-slate-900/50 hover:bg-slate-900/90' : 'bg-slate-50 hover:bg-blue-50/50'
                        } cursor-pointer transition-all flex items-start gap-3.5 group`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-100/80 dark:bg-amber-950/70 flex items-center justify-center text-[#f97316] dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                          <Archive className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-[13px] font-extrabold ${textTitle}`}>
                            내 서식 전체 백업 ({userProfiles.length}개)
                          </h4>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed font-medium">
                            내가 만든 모든 사용자 서식을 단일 백업 파일로 내보내고 언제든 일괄 복원합니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ========================================================================
                TAB 2: ✨ AI 프롬프트 서식 생성기 (AI Generator)
               ======================================================================== */}
            {activeHubTab === 'ai-generator' && (
              <section className="space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1d4ed8]" />
                    <h3 className={`text-[14px] font-extrabold tracking-tight ${textTitle}`}>
                      프롬프트로 서식 만들기 (내장 AI 서식 제너레이터)
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#1d4ed8]/10 text-[#1d4ed8] dark:text-blue-400">
                    최신 스키마(제목번호 · 불릿계층 · 표/그림 캡션 · 표 구조체) 완벽 지원
                  </span>
                </div>

                <div className={`p-6 rounded-2xl border ${hairline} ${cardSurface} relative overflow-hidden space-y-4`}>
                  <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#1d4ed8]/10 to-transparent rounded-bl-full pointer-events-none" />

                  <div className="relative z-10 space-y-3.5">
                    <p className="text-[12px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                      원하는 문서의 톤앤매너, 글꼴, 색상, <b>제목 자동 번호(십진분류/장절/개조식)</b>, <b>글머리 기호(1~3단계)</b>, <b>표 테두리(격자/가로선/미니멀)</b>, <b>캡션 위치(표 상단·그림 하단 등)</b>를 선택하거나 자연어로 입력하면 맞춤 서식을 즉시 생성합니다.
                    </p>

                    {/* 5대 국가·기업 표준 스타일 프리셋 칩 */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300">
                        ⚡ 원클릭 추천 표준 프리셋 (클릭하면 아래 프롬프트 입력창에 자동 입력됩니다):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {AI_STANDARD_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setAiPromptInput(preset.prompt)}
                            disabled={isAiGenerating}
                            className="p-2.5 text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all disabled:opacity-50 cursor-pointer group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-extrabold text-slate-900 dark:text-zinc-100 group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400">
                                {preset.label}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100/80 dark:bg-blue-900/50 text-[#1d4ed8] dark:text-blue-300 shrink-0">
                                {preset.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-1 font-medium">
                              {preset.summary}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI 모델 선택 셀렉터 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-[#1d4ed8]" />
                        <span className="text-[11.5px] font-bold text-zinc-700 dark:text-zinc-300">
                          적용 AI 모델:
                        </span>
                        <select
                          value={selectedModel}
                          onChange={e => {
                            setSelectedModel(e.target.value);
                            setAiError(null);
                          }}
                          disabled={isAiGenerating}
                          className={`text-[11.5px] font-bold py-1.5 px-2.5 rounded-lg border ${hairline} ${
                            dk ? 'bg-slate-900 text-zinc-100' : 'bg-white text-slate-800'
                          } focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 cursor-pointer shadow-2xs`}
                        >
                          {ONRIVI_AI_MODELS.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                        API 키 없이 외부 AI(ChatGPT 등)로 만들려면 우측 <b>[📖 최신 서식 생성 가이드]</b> 탭을 이용해 보세요.
                      </span>
                    </div>

                    {/* 프롬프트 텍스트 영역 */}
                    <textarea
                      placeholder={
                        !hasApiKey
                          ? 'AI 서식 생성을 위해 환경설정에서 Gemini API Key를 등록해 주세요.'
                          : '예: Pretendard 15.5px, 제목 번호는 1. ➔ 1.1 계층형 십진 분류, 표는 외곽선 2px에 가로선 1px·세로선 없는 논문형, 캡션은 표 상단·그림 하단으로 만들어줘...'
                      }
                      value={aiPromptInput}
                      onChange={e => setAiPromptInput(e.target.value)}
                      disabled={isAiGenerating || !hasApiKey}
                      className={`w-full h-28 p-3.5 text-[12.5px] rounded-xl border ${hairline} ${
                        dk ? 'bg-slate-900/90 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 text-slate-900 placeholder-slate-400'
                      } focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 resize-none font-medium leading-relaxed`}
                    />

                    {/* 실행 바 */}
                    <div className="flex items-center justify-between pt-1">
                      {!hasApiKey ? (
                        <span className="text-[11.5px] text-amber-600 dark:text-amber-400 font-bold">
                          ⚠️ 환경설정에서 Gemini API Key를 입력해야 활성화됩니다.
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-zinc-700 dark:text-zinc-300 font-medium">
                          선택된 모델: <b className="text-slate-900 dark:text-zinc-100">{ONRIVI_AI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}</b>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAiGenerate()}
                        disabled={isAiGenerating || !aiPromptInput.trim() || !hasApiKey}
                        className="px-5 py-2.5 text-[12.5px] font-extrabold text-white bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isAiGenerating ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            <span>AI 서식 생성 중...</span>
                          </>
                        ) : (
                          <>
                            <span>AI 서식 생성 실행</span>
                            <Sparkles className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* 🚨 AI 오류 발생 시 대화형 진단 카드 */}
                    {aiError && (
                      <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 space-y-3 mt-3 animate-in fade-in duration-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <div>
                              <h4 className="text-[13.5px] font-extrabold text-rose-700 dark:text-rose-300 leading-tight">
                                {aiError.title}
                              </h4>
                              <span className="text-[10.5px] font-mono font-bold text-rose-900 dark:text-rose-200 bg-rose-200/70 dark:bg-rose-900/50 px-2 py-0.5 rounded mt-0.5 inline-block">
                                발생 모델: {ONRIVI_AI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAiError(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-md transition cursor-pointer"
                            title="안내 닫기"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="bg-white/90 dark:bg-zinc-900/90 p-3 rounded-lg border border-rose-200/70 dark:border-rose-900/40 text-[12px] space-y-2">
                          <div>
                            <div className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 mb-0.5">발생 원인</div>
                            <div className="text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                              {aiError.description}
                            </div>
                          </div>
                          {aiError.solution && (
                            <div className="pt-2 border-t border-rose-100 dark:border-zinc-800">
                              <div className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">권장 조치 방법</div>
                              <div className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                                {aiError.solution}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                            원하시는 모델로 변경하거나 다시 실행할 수 있습니다:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'gemini-3.8-flash', label: '👑 Gemini 3.8 Flash' },
                              { id: 'gemini-3.7-flash', label: '⚡ Gemini 3.7 Flash' },
                              { id: 'gemini-3.6-flash', label: '🛡️ Gemini 3.6 Flash' },
                            ].map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  showToast(`AI 모델이 ${m.label}(으)로 변경되었습니다. 이제 다시 실행하실 수 있습니다.`);
                                }}
                                className={`py-2 px-2.5 rounded-xl text-[11.5px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                                  selectedModel === m.id
                                    ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                                }`}
                              >
                                <span>{m.label}로 변경</span>
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAiGenerate(selectedModel)}
                            disabled={isAiGenerating}
                            className="w-full py-2.5 px-4 rounded-xl text-[12.5px] font-bold text-white bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                            <span>선택된 모델({ONRIVI_AI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel})로 다시 실행</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================
                TAB 3: {} 서식 JSON 코드 보기 (JSON Inspector)
               ======================================================================== */}
            {activeHubTab === 'json-viewer' && (
              <section className="space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-[#1d4ed8]" />
                    <h3 className={`text-[14px] font-extrabold tracking-tight ${textTitle}`}>
                      현재 선택된 서식 JSON 구조 코드 ({selectedProfile.name})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyJson(selectedProfile)}
                      className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold bg-[#1d4ed8] text-white hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>전체 JSON 복사</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportProfile(selectedProfile)}
                      className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold border ${hairline} ${
                        dk ? 'bg-slate-800 text-zinc-100 hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-100'
                      } flex items-center gap-1.5 cursor-pointer`}
                    >
                      <Download className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      <span>.json 파일 다운로드</span>
                    </button>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${hairline} ${cardSurface} space-y-2.5`}>
                  <p className="text-[11.5px] text-zinc-700 dark:text-zinc-300 font-medium">
                    아래 코드는 <b>‘{selectedProfile.name}’</b> 서식의 최신 정규화(7대 쇼케이스 태그 및 <code>tableStructure</code>, <code>bulletStructure</code>, <code>mediaCaptionStructure</code>, <code>headingNumbering</code> 포함) JSON 원본입니다.
                  </p>
                  <pre className={`w-full max-h-[420px] overflow-auto p-4 rounded-xl border ${hairline} ${
                    dk ? 'bg-slate-950 text-zinc-200' : 'bg-slate-50 text-slate-800'
                  } text-[11.5px] font-mono leading-relaxed custom-scrollbar select-all`}>
                    {JSON.stringify(normalizedSelected, null, 2)}
                  </pre>
                </div>
              </section>
            )}

            {/* ========================================================================
                TAB 4: 📖 최신 서식 생성 가이드 (Latest CSS Profile Creation Guide)
               ======================================================================== */}
            {activeHubTab === 'guide' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 1. 외부 AI용 만능 마스터 프롬프트 원클릭 복사 카드 */}
                <section className={`p-6 rounded-2xl border ${hairline} ${cardSurface} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-[#1d4ed8]/10 text-[#1d4ed8] dark:text-blue-400">
                          v2026.10 최신 스키마 반영
                        </span>
                        <h3 className={`text-[15px] font-extrabold ${textTitle}`}>
                          🤖 외부 AI(ChatGPT · Claude · Gemini)용 만능 서식 생성 프롬프트
                        </h3>
                      </div>
                      <p className="text-[12px] text-zinc-700 dark:text-zinc-300 mt-1 font-medium">
                        API 키가 없어도 아래 <b>[만능 프롬프트 복사하기]</b>를 눌러 ChatGPT, Claude, Gemini에 붙여넣고 원하는 스타일만 적으면 완벽한 온리비 서식 JSON을 얻을 수 있습니다.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyMasterPrompt}
                        className="px-4 py-2.5 rounded-xl text-[12px] font-extrabold text-white bg-[#1d4ed8] hover:bg-blue-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        <span>만능 마스터 프롬프트 복사하기</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadGuide}
                        className={`px-3.5 py-2.5 rounded-xl text-[12px] font-extrabold border ${hairline} ${
                          dk ? 'bg-slate-800 hover:bg-slate-700 text-zinc-100' : 'bg-white hover:bg-slate-100 text-slate-800'
                        } flex items-center gap-1.5 transition-all cursor-pointer`}
                      >
                        <Download className="w-4 h-4 text-[#0d9488]" />
                        <span>전체 명세서 다운로드 (.md)</span>
                      </button>
                    </div>
                  </div>

                  {/* 3단계 사용 워크플로우 요약 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {[
                      {
                        step: 'STEP 1',
                        title: '마스터 프롬프트 복사',
                        desc: '위 [만능 마스터 프롬프트 복사하기] 또는 아래 5대 표준 프리셋 중 하나를 복사합니다.',
                      },
                      {
                        step: 'STEP 2',
                        title: 'AI에 붙여넣고 JSON 생성',
                        desc: 'ChatGPT, Claude, Gemini에 붙여넣고 원하는 글꼴·색상·표 스타일을 요청해 JSON을 받습니다.',
                      },
                      {
                        step: 'STEP 3',
                        title: '가져오기 탭에서 즉시 등록',
                        desc: '[📤 가져오기 & 내보내기] 탭에서 클립보드 붙여넣기 또는 파일 드롭으로 1초 만에 적용합니다.',
                      },
                    ].map(item => (
                      <div
                        key={item.step}
                        className={`p-3.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/60' : 'bg-slate-50/90'} space-y-1`}
                      >
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#1d4ed8]/10 text-[#1d4ed8] dark:text-blue-400">
                          {item.step}
                        </span>
                        <h4 className={`text-[12.5px] font-extrabold pt-0.5 ${textTitle}`}>{item.title}</h4>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 마스터 프롬프트 미리보기 박스 */}
                  <pre className={`w-full max-h-48 overflow-auto p-3.5 rounded-xl border ${hairline} ${
                    dk ? 'bg-slate-950 text-zinc-200' : 'bg-slate-50 text-slate-800'
                  } text-[11px] font-mono leading-relaxed custom-scrollbar`}>
                    {AI_MASTER_PROMPT_TEMPLATE}
                  </pre>
                </section>

                {/* 2. 최신 핵심 구조체 5종 요약 레퍼런스 */}
                <section className={`p-6 rounded-2xl border ${hairline} ${cardSurface} space-y-4`}>
                  <h3 className={`text-[14.5px] font-extrabold ${textTitle}`}>
                    📐 최신 온리비 서식 핵심 구조체 5종 요약 가이드
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[11.5px]">
                    <div className={`p-3.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/50' : 'bg-slate-50/80'} space-y-1`}>
                      <div className="font-extrabold text-[#1d4ed8] dark:text-blue-400">
                        1. 제목 자동 번호 체계 (headingNumbering)
                      </div>
                      <p className={`${textBody} font-medium leading-relaxed`}>
                        • <b>십진 분류(KS 표준)</b>: <code>[&quot;decimal-outline&quot;, &quot;decimal-outline&quot;, ...]</code> (1. ➔ 1.1 ➔ 1.1.1)<br />
                        • <b>학술 장절 체계(KDI)</b>: H1 <code>제1장</code>, H2 <code>제1절</code>, H3 <code>1.</code>, H4 <code>가.</code><br />
                        • <b>대기업 개조식</b>: 커스텀 불릿 기호 <code>□ ➔ ○ ➔ - ➔ ㆍ</code>
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/50' : 'bg-slate-50/80'} space-y-1`}>
                      <div className="font-extrabold text-[#0d9488] dark:text-teal-400">
                        2. 글머리 기호 1~3단계 계층 (bulletStructure)
                      </div>
                      <p className={`${textBody} font-medium leading-relaxed`}>
                        • <code>level1</code>, <code>level2</code>, <code>level3</code>에 <code>disc</code>(•), <code>circle</code>(○), <code>square</code>(▪), <code>hyphen</code>(-), <code>check</code>(✓), <code>diamond</code>(◆), <code>arrow</code>(▸) 지정<br />
                        • 직접 입력 기호는 <code>level1: &quot;custom&quot;</code> 및 <code>custom1: &quot;□&quot;</code> 형태로 설정
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/50' : 'bg-slate-50/80'} space-y-1`}>
                      <div className="font-extrabold text-[#f97316] dark:text-amber-400">
                        3. 미디어·표 캡션 구문 및 개별 오버라이드 (mediaCaptionStructure)
                      </div>
                      <p className={`${textBody} font-medium leading-relaxed`}>
                        • 공통 <code>position</code>(<code>top</code> 상단 / <code>bottom</code> 하단) 및 6종 <code>format</code>(<code>standard</code>, <code>bracket</code>, <code>angle</code>, <code>plain</code>, <code>title-only</code>, <code>custom</code>)<br />
                        • <code>kindOverrides</code>로 <b>표는 상단(&lt;표 1&gt;), 그림은 하단([그림 1])</b>처럼 종류별 분리 가능
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/50' : 'bg-slate-50/80'} space-y-1`}>
                      <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        4. 표 외곽·행·열 테두리 & 그림책 레이아웃 (tableStructure / layout)
                      </div>
                      <p className={`${textBody} font-medium leading-relaxed`}>
                        • <b>격자형 표</b>: <code>outer: 1px, row: 1px, col: 1px</code> / <b>논문·가로선형 표</b>: <code>outer: 2px, row: 1px, col: 0px</code><br />
                        • <b>그림책(layout)</b>: <code>type: &quot;picturebook&quot;</code>, <code>cover: &quot;full-image&quot; | &quot;image-right&quot;</code>
                      </p>
                    </div>
                  </div>
                </section>

                {/* 3. 5대 표준 서식별 맞춤 프롬프트 원클릭 복사 리스트 */}
                <section className={`p-6 rounded-2xl border ${hairline} ${cardSurface} space-y-3`}>
                  <h3 className={`text-[14.5px] font-extrabold ${textTitle}`}>
                    🏆 5대 국가·기업 표준 서식 프롬프트 템플릿 (클릭 시 복사 또는 AI 생성기로 이동)
                  </h3>
                  <div className="space-y-2.5">
                    {AI_STANDARD_PRESETS.map(preset => (
                      <div
                        key={preset.id}
                        className={`p-3.5 rounded-xl border ${hairline} ${dk ? 'bg-slate-900/50' : 'bg-slate-50/80'} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-extrabold text-slate-900 dark:text-zinc-100">
                              {preset.label}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100/80 dark:bg-blue-900/50 text-[#1d4ed8] dark:text-blue-300">
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-zinc-700 dark:text-zinc-300 font-medium">
                            {preset.prompt}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              const fullPrompt = AI_MASTER_PROMPT_TEMPLATE.replace(
                                /"여기에 원하는 분위기.*?"/,
                                `"${preset.prompt}"`
                              );
                              await navigator.clipboard.writeText(fullPrompt);
                              showToast(`📋 '${preset.label}' 완성형 AI 프롬프트가 클립보드에 복사되었습니다!`);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold border ${hairline} ${
                              dk ? 'bg-slate-800 hover:bg-slate-700 text-zinc-100' : 'bg-white hover:bg-slate-100 text-slate-800'
                            } flex items-center gap-1 cursor-pointer`}
                          >
                            <Copy className="w-3.5 h-3.5 text-[#1d4ed8]" />
                            <span>외부 AI용 복사</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAiPromptInput(preset.prompt);
                              setActiveHubTab('ai-generator');
                              showToast(`✨ '${preset.label}' 프롬프트가 AI 생성기에 입력되었습니다.`);
                            }}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold bg-[#1d4ed8] text-white hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>내장 AI로 생성</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. 15대 상세 서식 카테고리 전체 속성 사전 (100% 전수 명세표) */}
                <section className={`p-6 rounded-2xl border ${hairline} ${cardSurface} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className={`text-[14.5px] font-extrabold ${textTitle}`}>
                        📚 15대 서식 카테고리별 전체 속성 사전 (100% 전수 명세)
                      </h3>
                      <p className="text-[11.5px] text-zinc-700 dark:text-zinc-300 mt-0.5 font-medium">
                        서식 편집기의 15개 상세 탭(본문·여백, 제목, 표, 인용구, 코드블록, 인라인코드, 하이퍼링크, 각주, 목록·체크, 구분선, 이미지, 비디오, 지도, 수식, 고급 CSS)에 존재하는 모든 속성·프리셋 규격입니다.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      총 15개 카테고리 · 100% 수록 완료
                    </span>
                  </div>

                  <div className={`overflow-x-auto rounded-xl border ${hairline}`}>
                    <table className="w-full text-left border-collapse text-[11.5px]">
                      <thead>
                        <tr className={dk ? 'bg-slate-900 text-zinc-100' : 'bg-slate-100 text-slate-900'}>
                          <th className={`py-2.5 px-3 font-extrabold border-b ${hairline} w-12 text-center`}>No</th>
                          <th className={`py-2.5 px-3 font-extrabold border-b ${hairline} w-44`}>카테고리명</th>
                          <th className={`py-2.5 px-3 font-extrabold border-b ${hairline} w-48`}>대상 JSON 키</th>
                          <th className={`py-2.5 px-3 font-extrabold border-b ${hairline}`}>지원 속성 전체 목록</th>
                          <th className={`py-2.5 px-3 font-extrabold border-b ${hairline} w-72`}>프리셋 및 핵심 설계 규칙</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {STYLE_15_CATEGORY_SPECS.map(spec => (
                          <tr key={spec.no} className={dk ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50/80'}>
                            <td className="py-2.5 px-3 text-center font-extrabold text-[#1d4ed8] dark:text-blue-400">
                              {spec.no}
                            </td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-zinc-100">
                              {spec.category}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-[#0d9488] dark:text-teal-300">
                              {spec.targetKeys}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                              {spec.properties}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                              {spec.presetsAndNotes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 5. 전체 마크다운 가이드 원문 뷰어 */}
                <section className={`p-6 rounded-2xl border ${hairline} ${cardSurface} space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={`text-[14px] font-extrabold ${textTitle}`}>
                      📄 최신 서식 생성 가이드 전체 원문 (CSS_PROFILE_GUIDE.md)
                    </h3>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(CSS_PROFILE_GUIDE_MD);
                        showToast('📋 최신 서식 생성 가이드 전체 원문(.md)이 클립보드에 복사되었습니다!');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold border ${hairline} ${
                        dk ? 'bg-slate-800 hover:bg-slate-700 text-zinc-100' : 'bg-white hover:bg-slate-100 text-slate-800'
                      } flex items-center gap-1.5 cursor-pointer`}
                    >
                      <Copy className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      <span>가이드 전체 원문 복사</span>
                    </button>
                  </div>
                  <pre className={`w-full max-h-80 overflow-auto p-4 rounded-xl border ${hairline} ${
                    dk ? 'bg-slate-950 text-zinc-200' : 'bg-slate-50 text-slate-800'
                  } text-[11px] font-mono leading-relaxed custom-scrollbar whitespace-pre-wrap`}>
                    {CSS_PROFILE_GUIDE_MD}
                  </pre>
                </section>
              </div>
            )}

            {/* 🌟 [하단 공통 바로가기 링크] */}
            <div className={`pt-4 border-t ${hairline} flex flex-wrap items-center justify-between gap-2`}>
              <button
                type="button"
                onClick={handleDownloadGuide}
                className="flex items-center gap-2 text-[12px] font-bold text-zinc-700 dark:text-zinc-300 hover:text-[#1d4ed8] dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#1d4ed8]" />
                <span>Onrivi CSS 서식 프로필 최신 공식 명세서 다운로드 (.md)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHubTab('guide')}
                className="text-[12px] font-bold text-[#1d4ed8] dark:text-blue-400 hover:underline cursor-pointer"
              >
                📖 최신 서식 생성 가이드 & 만능 AI 프롬프트 보기 →
              </button>
            </div>

          </div>
        </main>
      </div>

      {/* Toast 알림 */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] px-5 py-2.5 bg-slate-900/95 dark:bg-zinc-100 text-white dark:text-slate-900 text-[12.5px] font-bold rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
}
