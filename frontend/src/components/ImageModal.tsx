// 🚨 @PATCH : **2026-10-25** — [이미지 수정 시 alt 내 stray bracket 방어 및 이스케이프 대괄호(\[그림 1\]) 역추출 복원]:
//             1) initialData.alt 역추출 시 불필요한 역슬래시 이스케이프(\[, \])를 선행 제거하여 대괄호([그림 1]) 포맷이 정확히 복원되도록 개선
//             2) alt가 stray bracket/backslash 단독 찌꺼기(/^[\\\[\]\s]+$/)인 경우 제목을 빈칸으로 리셋하여 상단 유령 기호("\\[") 노출 원천 차단
// 🚨 @PATCH : **2026-10-24** — [이미지 모달 탭 오더(Tab Order) 체계적 재선언 및 포커스 트랩 루프 보장]:
//             1) 소스 경로(1) -> 찾아보기(2) -> 클립보드 붙여넣기(3) -> 캡션 제목(4) -> 순번(5) -> 상단/하단(6,7) -> 포맷(8) -> 커스텀(9) -> 크기(10,11,12) -> 정렬(13,14,15) -> 취소(16) -> 삽입(17) -> 닫기(18) 순서로 명시적 tabIndex 부여
//             2) 모달 내 키보드 탭(Tab/Shift+Tab) 포커스 트랩을 적용하여 모달 외부(에디터/배경)로의 포커스 이탈 방지
//             3) 소스 파일 경로 입력창에서 Enter 키 입력 시 즉시 이미지 삽입(handleInsert) 연동
// 🚨 @PATCH : **2026-10-24** — [대체 텍스트 UI 입력란 제거 및 그림 제목+표현 구문 포맷 기반 자동 캡션 일원화]:
//             1) 사용자 혼선을 유발하던 별도의 '대체 텍스트(Alt)' 입력란을 제거하고, [그림 제목]과 선택된 [표현 구문 포맷(화살괄호/대괄호/표준 등)]으로 이미지 캡션(alt) 자동 생성
//             2) 제목 미입력 시 캡션 없는 순수 이미지(![]())로 단정하게 삽입
//             3) 기존 이미지 수정(initialData) 시 alt 텍스트로부터 순번(n), 제목(title), 포맷(format)을 스마트 역추출하여 모달 설정 완벽 복원
// 🚨 @PATCH : **2026-10-24** — [캡션 위치(상단/하단) URL 쿼리(caption=top|bottom) 저장 및 대체 텍스트 초기화/비우기 완전 지원]:
//             1) imagePathWithDimensions에 captionPosition을 연동하여 서식 위치가 문서보기 및 미리보기에 영구 보존되도록 개선
//             2) 대체 텍스트(Alt) 초기화 버튼(인라인 × 버튼 및 헤더 초기화 텍스트) 신설 및 비웠을 때 captionTitle로 강제 폴백되던 현상 제거
//             3) altTouched 상태를 도입하여 사용자가 명시적으로 대체 텍스트를 비운 후 제목 입력 시 강제 재동기화 방어 및 제목과 동기화 버튼 제공
// 🚨 @PATCH : **2026-10-24** — [별도 상단 중복 구문 생성 배제 및 순수 이미지 alt 설명 단일화]:
//             1) 이미지 설명 설정 시 별도의 텍스트 문단(**그림 N. ...**)을 생성하지 않고 순수 이미지 태그(![설명](경로))의 alt로 단일화하여 상단 중복 구문 완전 제거
//             2) 서식 프로필의 상단/하단 위치 설정에 따라 미리보기/문서보기에서 alt 설명이 이미지 상단(또는 하단)에 깔끔하게 렌더링되도록 연동
// 🚨 @PATCH : **2026-10-24** — [시스템 도움말 에셋(./assets/) 실시간 미리보기 및 캡션 마크다운 정돈]:
//             1) ./assets/, /help/assets/ 등 시스템 도움말 에셋 경로 자동 감지 및 웹(/help/assets/) 정적 경로 직결로 미리보기 실패(404) 완전 해결
//             2) 미리보기 패널 캡션 텍스트의 이스케이프 문자(\\[, \\]) 및 마크다운(**) 기호를 깔끔하게 정돈하여 렌더링
//             3) 상단뿐만 아니라 하단(captionPosition === 'bottom') 캡션 실시간 미리보기 표시기 추가 탑재
// 🚨 @PATCH : **2026-10-21** — [이미지 설명(캡션) 위치(상단/하단) 및 표현 구문(표준/대괄호/화살괄호/일반/제목만/커스텀) 설정 연동]:
//             1) MediaCaptionControl 위젯을 탑재하여 그림 제목, 순번, 상단/하단 위치, 표현 구문 선택 및 실시간 미리보기 제공
//             2) 서식 프로필의 mediaCaptionStructure 및 nextReportNumber(content, '그림') 기본값 자동 반영
//             3) 삽입 시 fullMarkdown 파라미터를 통해 선택된 위치와 표현 구문으로 완성된 마크다운 자동 생성
// 🚨 @PATCH : **2026-10-18** — [이미지 저장 안내 문구 안전 복사로 통일]:
//             1) 데스크톱/웹 이미지 저장 시 동일명 파일 덮어쓰기 방어 및 안전 보존 정책과 일치하도록 토스트 메시지 갱신
// 🚨 @PATCH : **2026-10-14** — [이미지 미리보기 실패 원인(임시 상대경로 주입/로드에러 영구고착/경로 해석 실패) 근본 해결 및 실시간 프리뷰 정상화]:
//             1) handlePasteEvent에서 이미지 텍스트/경로 붙여넣기 시 tempPreviewUrl에 상대경로(/media/...)가 들어가 404 및 로드 실패를 유발하던 버그 원천 제거 (Base64/Blob/외부URL만 tempPreviewUrl 허용)
//             2) 이미지 로드 실패 시 imageLoadError 상태가 영구 고착되던 문제 해결: cleanImagePath 또는 previewSrc 변경 시 에러 상태 자동 초기화(false)
//             3) 데스크톱(Electron) 환경에서 cleanImagePath 변경 시 api.readImageAsBase64를 통해 로컬 이미지를 Data URL로 비동기 선행 추출하여 CORS/샌드박스 없는 즉각적인 100% 무결점 미리보기 제공
//             4) previewSrc의 media://local/serve 경로 결합 시 media/ 하위폴더 중복 및 누락 방지 정규화 적용, 리소스 폴더 미존재 파일에 대한 친절한 안내 메시지 강화
// 🚨 @PATCH : **2026-10-14** — [e.clipboardData.getData 함수 부재로 인한 TypeError 방어 및 클립보드 텍스트 안전 추출]: handlePasteEvent 호출 시 합성 이벤트 객체에 getData 함수가 없는 경우 발생하는 런타임 오류를 원천 방어하고, getSafeClipboardText 헬퍼를 통해 e.clipboardData 및 navigator.clipboard.readText를 안전하게 2중 폴백 추출하도록 개선
// 🚨 @PATCH : **2026-10-14** — [클립보드 이미지/주소/마크다운 태그 붙여넣기 인식 고도화]: 클립보드 내 실제 이미지 바이너리뿐만 아니라 이미지 주소, 마크다운 이미지(![...]), 로컬 파일 경로, 웹 URL 붙여넣기 시 자동으로 이미지를 해석·로드하여 ImageModal에 정상 반영되도록 구현
// 🚨 @PATCH : **2026-10-14** — [이미지 설명(Alt) 초기값 및 강제 폴백 제거]: 설명 입력란 초기값('이미지 설명')을 빈 값("")으로 변경하고, 내용 삭제 시 임의의 기본값으로 원복되지 않도록 개선
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더(참조파일 등) media 하위폴더 직결 바인딩]: 구글 드라이브 업로드 시 cloudSettings.mediaFolderId 우선 참조 및 부모 리소스 폴더 하위 탐색으로 환경설정에 지정된 리소스 폴더에 안전 저장
// 🚨 @PATCH : **2026-10-03** — [리소스 폴더 변경에 따른 전역 미디어 실시간 연동 강화]: getEffectiveResourceFolder 연동 및 구글 드라이브(OnriviAuthor/참조파일/media) 업로드 지원
"use client";
import { useModalEscape } from '@/hooks/useModalEscape';
import { pickResourceMedia } from '@/lib/resourceMediaPicker';
import { saveResourceMedia, importResourceMedia } from '@/lib/resourceMedia';
import { imageResourceName } from '@/lib/imageResourceName';
import { desktopClipboardImage } from '@/lib/desktopClipboard';

import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import { idb } from '@/lib/indexedDbHelper';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, Upload, Link as LinkIcon, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { loadSecureData } from '@/lib/secureStorage';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { getSavedDriveToken, getSavedWorkspaceInfo, uploadDriveImage, getDriveMediaImageBlobUrl } from '@/lib/gdrive/googleDriveClient';
import { MediaAlignmentControl, MediaSizeInputs, MediaCaptionControl, imagePathWithDimensions, type MediaAlign, type MediaCaptionFormat } from '@/components/MediaLayoutFields';
import { formatMediaCaption } from '@/lib/aiFriendlyReport';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (path: string, alt: string, range?: any, fullMarkdown?: string) => void;
  isDarkMode: boolean;
  initialData?: {
    alt: string;
    path: string;
    width: string;
    height: string;
    align: string;
    captionPos?: 'top' | 'bottom';
    range: any;
  } | null;
  targetFolder?: string;
  showToast?: (message: string, type: 'success' | 'error') => void;
  resourceFolderHandle?: any;
  workspaceType?: string;
  rootFolder?: any;
  resourceFolder?: string | null;
  captionConfig?: {
    position?: 'top' | 'bottom';
    format?: string;
    customTemplate?: string;
  };
  nextNumber?: number;
}

// ====================================================================
// 📊 [OMD-EDIT-ImageModal-0007] ImageModal ➔ ImageModal
// 🎯 @KICK  : 이미지 삽입 모달 - URL/파일/클립보드 이미지 경로 입력 및 크기/정렬 설정
// 🚨 @PATCH : **2026-10-14** — [이미지 설명(Alt) 초기값 및 강제 폴백 제거]: 설명 입력란 초기값('이미지 설명')을 빈 값("")으로 변경하고, 삭제 시 빈 값 유지
// 🚨 @PATCH : **2026-10-03** — [리소스 폴더 변경에 따른 미디어 저장 연동 동기화]: 구글 드라이브(OnriviAuthor/참조파일/media) 및 로컬/웹 환경에서 리소스 폴더 변경 시 최신 media 폴더로 이미지 자동 저장 및 연동
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-11** — 클립보드 스크린샷 캡처 이미지 붙여넣기 시 Electron api.readClipboardImage 네이티브 폴백 및 인라인 바이너리 변환 지원
//             2026-08-26 — 데스크탑 및 웹 환경에서 리소스 폴더 이미지를 찾아보기로 선택 시 미리보기가 노출되지 않는 버그 및 자동저장 시 상태가 blob으로 원복되는 문제를 해결하기 위해 useEffect의 의존성 배열에서 initialData를 제거하고, 데스크탑 환경은 readImageAsBase64 API를 활용해 웹 보안 샌드박스를 우회하도록 함; 미리보기 컨테이너 div에 onWheel preventDefault를 연동해 마우스 스크롤 전파를 차단함
// 🚨 @PATCH : 2026-07-20 — 이미지 모달 내 클립보드 붙여넣기 영역(슬림 붙여넣기 바) 클릭 시 윈도우 파일 탐색기가 뜨던 불편함 해소 (onClick 팝업 제거 및 focus 적용으로 순수 붙여넣기 대기 상태 전환)
// 🚨 @PATCH : 2026-07-15 — 2단 분할 레이아웃(좌:입력, 우:미리보기), 슬림 붙여넣기 바, 인코딩 정상화
// 🔗 @CALLS : handleInsert, handlePasteEvent, handleFileChange, cleanImagePath, previewSrc, createPortal
// ====================================================================

function cleanHumanReadablePath(raw: string): string {
  if (!raw) return '';
  try {
    const [base, query] = raw.split('?');
    return decodeURI(base) + (query ? '?' + query : '');
  } catch {
    return raw;
  }
}

export default function ImageModal({
  isOpen,
  onClose,
  onInsert,
  isDarkMode,
  initialData,
  targetFolder,
  showToast,
  resourceFolderHandle,
  workspaceType,
  rootFolder,
  resourceFolder,
  captionConfig,
  nextNumber = 1,
}: ImageModalProps) {
  useModalEscape(isOpen, onClose);
  const [saving, setSaving] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const [clipboardMessage, setClipboardMessage] = useState('');
  const [appliedPath, setAppliedPath] = useState("");
  const [captionTitle, setCaptionTitle] = useState("");
  const [captionNumber, setCaptionNumber] = useState(1);
  const [captionPosition, setCaptionPosition] = useState<'top' | 'bottom'>('top');
  const [captionFormat, setCaptionFormat] = useState<MediaCaptionFormat>('standard');
  const [customTemplate, setCustomTemplate] = useState('**{kind} {n}. {title}**');
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [imageAlign, setImageAlign] = useState<MediaAlign>('center');
  const [localBlobUrl, setLocalBlobUrl] = useState("");
  const [tempPreviewUrl, setTempPreviewUrl] = useState("");
  const [desktopPreviewUrl, setDesktopPreviewUrl] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);
  const formatCleanCaptionPreview = (text: string) => {
    return text.replace(/\*\*/g, '').replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  };

  const [mounted, setMounted] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  const handleTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (!modalContainerRef.current) return;

    const focusable = Array.from(
      modalContainerRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));

    if (focusable.length === 0) return;

    focusable.sort((a, b) => {
      const aIdx = a.tabIndex > 0 ? a.tabIndex : 9999;
      const bIdx = b.tabIndex > 0 ? b.tabIndex : 9999;
      return aIdx - bIdx;
    });

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const [browsingDrive,setBrowsingDrive]=useState(false);
  const guardResource=()=>{try {requireResourceSettings();return true;}catch(e:any){onClose();showToast?.(e.message,'error');return false;}};
  const browseSource=async()=>{
    if(browsingDrive)return;
    setBrowsingDrive(true);
    try {
      const file = await pickResourceMedia('image',workspaceType,resourceFolderHandle);
      if(!file)return;
      const path = await saveResourceMedia(file,file.name,resourceFolderHandle);
      const displayPath = cleanHumanReadablePath(path);
      setImagePath(displayPath);setAppliedPath(displayPath);setTempPreviewUrl('');setDesktopPreviewUrl('');setImageLoadError(false);
      showToast?.('선택한 사진을 현재 리소스 폴더에 복사했습니다.','success');
    }catch(e){showToast?.(e instanceof Error?e.message:'파일 선택 실패','error');}
    finally{setBrowsingDrive(false);}
  };


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const frame = requestAnimationFrame(() => sourceInputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, mounted]);

  useEffect(() => {
    if (isOpen) {
      setClipboardMessage('');
      setAppliedPath("");
      setTempPreviewUrl("");
      setDesktopPreviewUrl("");
      setImageLoadError(false);
      setCaptionNumber(nextNumber || 1);
      setCaptionPosition(captionConfig?.position || 'top');
      setCaptionFormat((captionConfig?.format as MediaCaptionFormat) || 'standard');
      setCustomTemplate(captionConfig?.customTemplate || '**{kind} {n}. {title}**');
      if (initialData) {
        setImagePath(cleanHumanReadablePath(initialData.path));
        setImageWidth(initialData.width);
        setImageHeight(initialData.height || "");
        setImageAlign((['left', 'center', 'right'].includes(initialData.align) ? initialData.align : 'center') as MediaAlign);
        const urlParams = new URLSearchParams(initialData.path.includes('?') ? initialData.path.slice(initialData.path.indexOf('?') + 1) : '');
        const urlCap = urlParams.get('caption');
        if (urlCap === 'top' || urlCap === 'bottom') {
          setCaptionPosition(urlCap);
        } else if (initialData.captionPos) {
          setCaptionPosition(initialData.captionPos);
        }

        // 기존 alt 속성으로부터 순번, 제목, 포맷 역추출 복원 (이스케이프 역슬래시 선행 정규화)
        const rawAlt = (initialData.alt ?? '').replace(/\*\*/g, '').trim();
        const unescapedAlt = rawAlt.replace(/\\([\\\[\]<>])/g, '$1').trim();
        if (unescapedAlt && !/^[\\\[\]\s]+$/.test(unescapedAlt)) {
          const angleMatch = unescapedAlt.match(/^<그림\s+(\d+)>\s*(.*)$/);
          const bracketMatch = unescapedAlt.match(/^\[그림\s+(\d+)\]\s*(.*)$/);
          const standardMatch = unescapedAlt.match(/^그림\s+(\d+)\.\s*(.*)$/);
          const plainMatch = unescapedAlt.match(/^그림\s+(\d+)\s+(.*)$/);

          if (angleMatch) {
            setCaptionNumber(Number(angleMatch[1]) || 1);
            setCaptionTitle(angleMatch[2] || '');
            setCaptionFormat('angle');
          } else if (bracketMatch) {
            setCaptionNumber(Number(bracketMatch[1]) || 1);
            setCaptionTitle(bracketMatch[2] || '');
            setCaptionFormat('bracket');
          } else if (standardMatch) {
            setCaptionNumber(Number(standardMatch[1]) || 1);
            setCaptionTitle(standardMatch[2] || '');
            setCaptionFormat('standard');
          } else if (plainMatch) {
            setCaptionNumber(Number(plainMatch[1]) || 1);
            setCaptionTitle(plainMatch[2] || '');
            setCaptionFormat('plain');
          } else {
            setCaptionTitle(unescapedAlt);
            setCaptionFormat('title-only');
            setCaptionNumber(nextNumber || 1);
          }
        } else {
          setCaptionTitle("");
          setCaptionNumber(nextNumber || 1);
        }
      } else {
        setImagePath("");
        setCaptionTitle("");
        setCaptionNumber(nextNumber || 1);
        setImageWidth("");
        setImageHeight("");
        setImageAlign("center");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, nextNumber, captionConfig]);

  // 🔄 [경로 변경 시 로드 에러 자동 초기화]
  useEffect(() => {
    setImageLoadError(false);
  }, [imagePath, tempPreviewUrl, desktopPreviewUrl]);

  const handleLocalImageSave = async (_base64Data: string, fileName: string, imageFile: File) => {
    try {
      const finalPath = await saveResourceMedia(imageFile,fileName,resourceFolderHandle);
      const displayPath = cleanHumanReadablePath(finalPath);
      setImagePath(displayPath); setAppliedPath(displayPath);
      showToast?.('현재 리소스 폴더에 안전하게 복사했습니다.', 'success');
      return finalPath;
    } catch(error) {
      setTempPreviewUrl(''); showToast?.(error instanceof Error ? error.message : '이미지 저장 실패','error'); return '';
    }
  };

  const getSafeClipboardText = async (e?: any): Promise<string> => {
    try {
      if (e?.clipboardData && typeof e.clipboardData.getData === 'function') {
        const t = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
        if (t) return t.trim();
      }
    } catch {}
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const t = await navigator.clipboard.readText();
        if (t) return t.trim();
      }
    } catch {}
    return '';
  };

  const resolveClipboardFile = async (e: React.ClipboardEvent<HTMLDivElement>): Promise<File | null> => {
    const items = e?.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) return file;
        }
      }
    }
    const files = e?.clipboardData?.files;
    if (files && files.length > 0 && files[0].type && files[0].type.startsWith('image/')) return files[0];
    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    try {
      if (api && api.readClipboardImage) {
        const dataUrl = await api.readClipboardImage();
        if (dataUrl) {
          const parts = dataUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          return new File([blob], `screenshot_${Date.now()}.png`, { type: mime });
        }
      }
    } catch {}
    try {
      if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
        const clipboardItems = await navigator.clipboard.read();
        for (const ci of clipboardItems) {
          for (const type of ci.types) {
            if (type.startsWith('image/')) {
              const blob = await ci.getType(type);
              return blob as File;
            }
          }
        }
      }
    } catch {}

    // 5) 클립보드 텍스트 분석 (이미지 경로/URL/마크다운 태그/DataURL 감지)
    try {
      const text = await getSafeClipboardText(e);
      if (text) {
        let extracted = text;
        const mdMatch = text.match(/!\[.*?\]\((.*?)\)/);
        if (mdMatch) extracted = mdMatch[1].trim();
        const htmlMatch = text.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (htmlMatch) extracted = htmlMatch[1].trim();
        const clean = extracted.trim().replace(/^<|>$/g, '').split('?')[0].trim();

        // Data URL
        if (clean.startsWith('data:image/')) {
          const parts = clean.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          return new File([new Blob([u8arr], { type: mime })], `pasted_${Date.now()}.png`, { type: mime });
        }

        // 이미지 확장자 또는 웹 URL
        const isImgExt = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(clean);
        if (isImgExt || clean.startsWith('http://') || clean.startsWith('https://')) {
          if (clean.startsWith('http://') || clean.startsWith('https://')) {
            try {
              if (api?.fetchExternalImage) {
                const res = await api.fetchExternalImage(clean);
                if (res?.success && res?.base64) {
                  const bstr = atob(res.base64);
                  let n = bstr.length;
                  const u8arr = new Uint8Array(n);
                  while (n--) u8arr[n] = bstr.charCodeAt(n);
                  return new File([new Blob([u8arr], { type: res.mimeType || 'image/png' })], `web_${Date.now()}.png`, { type: res.mimeType || 'image/png' });
                }
              }
              const resp = await fetch(clean);
              if (resp.ok) {
                const blob = await resp.blob();
                return new File([blob], `web_${Date.now()}.png`, { type: blob.type || 'image/png' });
              }
            } catch (_) {}
          } else if (api?.readImageAsBase64) {
            try {
              let target = clean;
              if (!/^[A-Za-z]:[\\/]/.test(clean)) {
                const folder = getEffectiveResourceFolder(resourceFolder);
                if (folder) {
                  const sep = folder.includes('\\') ? '\\' : '/';
                  const stripped = clean.replace(/^\.?[\/\\]/, '');
                  target = (stripped.startsWith('media/') || stripped.startsWith('media\\'))
                    ? (folder + sep + stripped)
                    : (folder + sep + 'media' + sep + stripped);
                }
              }
              const dataUrl = await api.readImageAsBase64(target).catch(() => api.readImageAsBase64(clean));
              if (dataUrl) {
                const parts = dataUrl.split(',');
                const mimeMatch = parts[0].match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                const bstr = atob(parts[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) u8arr[n] = bstr.charCodeAt(n);
                const fileName = clean.split(/[/\\]/).pop() || `local_${Date.now()}.png`;
                return new File([new Blob([u8arr], { type: mime })], fileName, { type: mime });
              }
            } catch (_) {}
          }
        }
      }
    } catch {}

    return null;
  };

  const handlePasteEvent = async (e: React.ClipboardEvent<HTMLDivElement>, reportEmpty = false) => {
    const directImage = Array.from(e?.clipboardData?.items || []).some(item => item.type && item.type.startsWith('image/'))
      || Array.from(e?.clipboardData?.files || []).some(file => file.type && file.type.startsWith('image/'));
    if (directImage && e && typeof e.preventDefault === 'function') { e.preventDefault(); e.stopPropagation(); }
    const imageFile = await resolveClipboardFile(e);
    if (!imageFile) {
      const text = await getSafeClipboardText(e);
      const mdMatch = text.match(/!\[.*?\]\((.*?)\)/);
      const cleanText = (mdMatch ? mdMatch[1] : text).split('?')[0].trim();
      if (/\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(cleanText) || cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        setImagePath(cleanText);
        setAppliedPath("");
        setImageLoadError(false);
        if (cleanText.startsWith('http://') || cleanText.startsWith('https://') || cleanText.startsWith('data:') || cleanText.startsWith('blob:')) {
          setTempPreviewUrl(cleanText);
        } else {
          setTempPreviewUrl('');
        }
        setClipboardMessage('이미지 주소를 불러왔습니다. 아래 이미지 삽입 버튼으로 적용해 주세요.');
        return;
      }
      if (reportEmpty) setClipboardMessage('클립보드에 이미지가 없습니다. 그림을 우클릭하여 ‘이미지 복사’하거나 캡처한 뒤 다시 눌러 주세요.');
      return;
    }
    setClipboardMessage('이미지를 읽고 저장하고 있습니다…');
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setTempPreviewUrl(result);
      setImageLoadError(false);
      const base64Data = result.split(',')[1];
      if (!base64Data) {
        if (showToast) showToast('이미지 데이터를 읽을 수 없습니다.', 'error');
        return;
      }
      const fileName = await imageResourceName(imageFile!, true);
      const saved = await handleLocalImageSave(base64Data, fileName, imageFile!);
      setClipboardMessage(saved ? '이미지를 불러왔습니다. 아래 이미지 삽입 버튼으로 적용해 주세요.' : '이미지 저장에 실패했습니다. 리소스 폴더 연결과 오류 알림을 확인해 주세요.');
    };
    reader.onerror = () => {
      setClipboardMessage('클립보드 이미지 데이터를 읽지 못했습니다. 이미지를 다시 복사해 주세요.');
      if (showToast) showToast('이미지 파일을 읽는데 실패했습니다.', 'error');
    };
    reader.readAsDataURL(imageFile);
  };

  const cleanImagePath = useMemo(() => {
    let raw = imagePath.trim();
    const srcMatch = raw.match(/src=["']([^"']+)["']/);
    const mdMatch = raw.match(/!\[[^\]]*\]\(([^)]*)\)/);
    let url = raw;
    if (srcMatch) url = srcMatch[1];
    else if (mdMatch) url = mdMatch[1];

    url = url.replace(/^[<("'\s]+|[>)"'\s]+$/g, '');
    const question = url.indexOf('?');
    if (question >= 0) {
      const hash = url.indexOf('#', question);
      const params = new URLSearchParams(url.slice(question + 1, hash >= 0 ? hash : undefined));
      ['width', 'height', 'w', 'h', 'align', 'caption', 'captionPos', 'captionPosition'].forEach(key => params.delete(key));
      const query = params.toString();
      url = url.slice(0, question) + (query ? '?' + query : '') + (hash >= 0 ? url.slice(hash) : '');
    }

    if (url.startsWith('media://')) {
      try {
        const parsedUrl = new URL(url);
        const extracted = parsedUrl.searchParams.get('url');
        if (extracted) url = extracted;
      } catch (e) {
        const m = url.match(/[?&]url=([^&]+)/);
        if (m) url = decodeURIComponent(m[1]);
      }
    }

    return url;
  }, [imagePath]);

  useEffect(() => {
    let active = true;
    let createdBlob = '';
    setLocalBlobUrl('');
    setDesktopPreviewUrl('');
    setImageLoadError(false);

    if (!cleanImagePath || /^(https?:|data:|blob:)/.test(cleanImagePath)) return;

    const pureSrc = cleanImagePath.split("?")[0];
    const isHelpAsset = pureSrc.includes("help/assets") || pureSrc.startsWith("/help/assets/") || pureSrc.startsWith("./assets/") || pureSrc.startsWith("assets/");
    if (isHelpAsset) {
      const fileName = pureSrc.split("/").pop()?.split("\\").pop() || "";
      setDesktopPreviewUrl("/help/assets/" + fileName);
      setImageLoadError(false);
      return;
    }

    const load = async () => {
      try {
        const settings = getResourceSettings();
        if (settings?.kind === 'drive') {
          const token = getSavedDriveToken();
          if (!token || !settings.mediaFolderId) throw new Error('드라이브 연결을 확인해 주세요.');
          const url = await getDriveMediaImageBlobUrl(token, settings.mediaFolderId, cleanImagePath);
          if (!url) throw new Error('리소스 폴더에서 이미지를 찾지 못했습니다.');
          if (active) setLocalBlobUrl(url);
          return;
        }

        const api = (window as any).electronAPI;
        if (api?.readImageAsBase64) {
          const folder = getEffectiveResourceFolder(resourceFolder);
          const relative = decodeURIComponent(cleanImagePath.split('?')[0]).replace(/^\.?[\\/]/, '');
          const sep = folder.includes('\\') ? '\\' : '/';
          const cleanFolder = folder.endsWith(sep) ? folder.slice(0, -1) : folder;
          let candidatePath = relative;
          if (!/^[A-Za-z]:[\\/]/.test(relative)) {
            if (!relative.startsWith('media/') && !relative.startsWith('media\\') && !cleanFolder.endsWith(`${sep}media`)) {
              candidatePath = cleanFolder + sep + 'media' + sep + relative;
            } else {
              candidatePath = cleanFolder + sep + relative;
            }
          }
          try {
            const dataUrl = await api.readImageAsBase64(candidatePath);
            if (active && dataUrl) {
              setDesktopPreviewUrl(dataUrl);
              return;
            }
          } catch {
            try {
              const dataUrl2 = await api.readImageAsBase64(cleanImagePath);
              if (active && dataUrl2) {
                setDesktopPreviewUrl(dataUrl2);
                return;
              }
            } catch {
              if (active) setImageLoadError(true);
            }
          }
          return;
        }

        if (resourceFolderHandle && settings?.path && resourceFolderHandle.name === settings.path) {
          const parts = decodeURIComponent(cleanImagePath.split('?')[0]).replace(/^\.?\//, '').split('/').filter(Boolean);
          let dir = resourceFolderHandle;
          for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
          const file = await (await dir.getFileHandle(parts[parts.length - 1])).getFile();
          createdBlob = URL.createObjectURL(file);
          if (active) setLocalBlobUrl(createdBlob);
        }
      } catch (error) {
        if (active) setImageLoadError(true);
      }
    };

    void load();
    return () => {
      active = false;
      if (createdBlob) URL.revokeObjectURL(createdBlob);
    };
  }, [cleanImagePath, resourceFolder, resourceFolderHandle]);

  const previewSrc = useMemo(() => {
    if (tempPreviewUrl) return tempPreviewUrl;
    if (desktopPreviewUrl) return desktopPreviewUrl;
    if (!cleanImagePath) return '';
    const pureSrc = cleanImagePath.split("?")[0];
    const isHelpAsset = pureSrc.includes("help/assets") || pureSrc.startsWith("/help/assets/") || pureSrc.startsWith("./assets/") || pureSrc.startsWith("assets/");
    if (isHelpAsset) {
      const fileName = pureSrc.split("/").pop()?.split("\\").pop() || "";
      return "/help/assets/" + fileName;
    }
    if (/^(https?:|data:|blob:|media:|media-local:)/.test(cleanImagePath)) return cleanImagePath;
    const settings = getResourceSettings();
    if (settings?.kind === 'drive') return localBlobUrl;
    if ((window as any).electronAPI) {
      const folder = getEffectiveResourceFolder(resourceFolder);
      const relative = decodeURIComponent(cleanImagePath.split('?')[0]).replace(/^\.?[\\/]/, '');
      const sep = folder.includes('\\') ? '\\' : '/';
      const cleanFolder = folder.endsWith(sep) ? folder.slice(0, -1) : folder;
      let absolute = relative;
      if (!/^[A-Za-z]:[\\/]/.test(relative)) {
        if (!relative.startsWith('media/') && !relative.startsWith('media\\') && !cleanFolder.endsWith(`${sep}media`)) {
          absolute = cleanFolder + sep + 'media' + sep + relative;
        } else {
          absolute = cleanFolder + sep + relative;
        }
      }
      return `media://local/serve?url=${encodeURIComponent(absolute)}`;
    }
    return localBlobUrl;
  }, [cleanImagePath, desktopPreviewUrl, localBlobUrl, resourceFolder, tempPreviewUrl]);

  const handleInsert = async () => {
    if (saving) return;
    if(!guardResource())return;
    const insertPath = appliedPath || cleanImagePath;
    if (insertPath) {
      setSaving(true);
      try {
      let finalPath = await importResourceMedia(insertPath,resourceFolderHandle);
      finalPath = imagePathWithDimensions(finalPath,imageWidth,imageHeight,imageAlign,captionPosition);

      // 별도 텍스트 문단 구문을 본문에 끼워넣지 않고, 선택한 표현 구문 포맷(화살괄호/대괄호/표준 등)을 이미지 설명(alt)에 자동 반영
      // 그림 제목이 비어있으면 캡션 없는 순수 이미지(![]())로 삽입
      const rawCaption = captionTitle.trim()
        ? formatMediaCaption('그림', captionNumber, captionTitle.trim(), captionFormat, customTemplate)
        : '';
      const rawAlt = rawCaption ? rawCaption.replace(/\*\*/g, '').trim() : '';
      const altText = /^[\\\[\]\s]+$/.test(rawAlt) ? '' : rawAlt;
      const fullMarkdown = undefined;

      finalPath = cleanHumanReadablePath(finalPath);
      onInsert(finalPath, altText, initialData?.range, fullMarkdown);
      setImagePath("");
      setAppliedPath("");
      setCaptionTitle("");
      setImageWidth("");
      setImageHeight("");
      setImageAlign("center");
      onClose();
      } catch(error) { showToast?.(error instanceof Error ? error.message : '이미지 복사 실패','error'); } finally { setSaving(false); }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if(!guardResource())return;
    const file = event.target.files?.[0];
    if (file) {
      const api = (window as any).electronAPI;
      
      // 💡 [데스크탑 환경] Web Security 샌드박스를 우회하고 파일 잠금 에러를 원천 방지하기 위해 media:// 프로토콜 활용
      if (api && (file as any).path && getResourceSettings()?.kind === 'local') {
        const filePath = (file as any).path;
        
        // 1. 즉시 media:// 주소로 미리보기 설정 (FileReader 호출 없음 -> ERR_UPLOAD_FILE_CHANGED 원천 예방)
        const localMediaUrl = `media://local/serve?url=${encodeURIComponent(filePath)}`;
        setTempPreviewUrl(localMediaUrl);

        await handleLocalImageSave('',file.name,file);
        return;
      }

      // 💡 [웹 환경] Web Security 샌드박스 내부이므로 기존 FileReader 방식으로 안전하게 획득
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        
        setTempPreviewUrl(result);

        const fileName = file.name ? file.name : `image_${Date.now()}.png`;
        await handleLocalImageSave(base64Data, fileName, file);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6"
      style={{ overflowY: "auto" }}
      onPaste={event => { void handlePasteEvent(event); }}
      onKeyDownCapture={event => {
        const file = desktopClipboardImage(event);
        if (file) {
          event.preventDefault();
          event.stopPropagation();
          void handlePasteEvent({ clipboardData:{ items:[], files:[file], getData:()=>'' }, preventDefault(){}, stopPropagation(){} } as any);
          return;
        }
        handleTabKey(event);
      }}
    >
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />

      {/* PREMIUM WIDE MODAL (SCR-014) */}
      <div
        ref={modalContainerRef}
        className={`relative w-full max-w-5xl max-h-[92vh] rounded-lg shadow-2xl overflow-hidden flex flex-col border animate-in zoom-in-95 duration-200 ${
          isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`flex justify-between items-center px-5 py-3 border-b shrink-0 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-[#EFEFEF] bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <ImageIcon size={18} />
            </div>
            <h2 className="text-base font-bold tracking-tight text-[#1d4ed8]">이미지 삽입</h2>
          </div>
          <button
            onClick={onClose}
            tabIndex={18}
            aria-label="닫기"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 transition-colors rounded-md active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: 2-column split */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* ─── LEFT PANEL ─── */}
          <div className={`flex flex-col gap-2.5 p-4 md:w-[50%] overflow-y-auto border-r ${
            isDarkMode ? 'border-zinc-800' : 'border-slate-200'
          }`}>

            {/* 소스 파일 */}
            <div className={`rounded-lg p-3 border ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 block">
                소스 파일 (원본)
              </label>
              <div className="flex gap-2">
                <input
                  ref={sourceInputRef}
                  type="text"
                  tabIndex={1}
                  value={imagePath}
                  onChange={(e) => {
                    setImagePath(e.target.value);
                    setAppliedPath("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (cleanImagePath && !saving) {
                        void handleInsert();
                      }
                    }
                  }}
                  onPaste={(e) => {
                    const hasImage = Array.from(e.clipboardData?.items || []).some(item => item.type.startsWith('image/'))
                      || Array.from(e.clipboardData?.files || []).some(file => file.type.startsWith('image/'));
                    if (hasImage) { void handlePasteEvent(e as any); return; }
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation?.();
                    const text = e.clipboardData?.getData('text') || '';
                    if (text) {
                      e.preventDefault();
                      setImagePath(text.trim());
                      setAppliedPath("");
                    }
                  }}
                  placeholder="https://example.com/image.png"
                  className={`w-full font-mono text-xs border rounded px-3 py-2.5 outline-none transition-all ${
                    isDarkMode
                      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30'
                      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                  }`}
                />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <button
                  onClick={browseSource}
                  tabIndex={2}
                  className={`px-4 py-2.5 border rounded font-bold text-xs transition-colors shrink-0 ${
                    isDarkMode
                      ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'
                  }`}
                >
                  찾아보기
                </button>
              </div>
              {(appliedPath || cleanImagePath) && (
                <div className={`mt-2 px-3 py-1.5 rounded text-[10px] font-mono flex items-center gap-1.5 ${
                  isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className="text-green-500">✓</span>
                  <span className="truncate">{appliedPath || cleanImagePath}</span>
                </div>
              )}
            </div>

            {/* 슬림 붙여넣기 바 */}
            <button
              type="button"
              tabIndex={3}
              onPaste={event => { void handlePasteEvent(event as any); }}
              onClick={() => { void handlePasteEvent({clipboardData:{items:[],files:[],getData:()=>''},preventDefault(){},stopPropagation(){}} as any, true); }}
              className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg border border-dashed cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-700 hover:border-indigo-500 hover:bg-zinc-800'
                  : 'bg-white border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30'
              }`}
            >
              <Upload className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" size={14} />
              <span className="font-bold text-xs text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                클립보드 이미지 붙여넣기 (클릭 또는 Ctrl+V)
              </span>
            </button>
            {clipboardMessage && <p role="status" className="text-xs text-indigo-700 dark:text-indigo-300">{clipboardMessage}</p>}

            {/* 🏷️ 그림 설명(캡션) 설정 */}
            <MediaCaptionControl
              kind="그림"
              tabIndexStart={4}
              title={captionTitle}
              onTitleChange={setCaptionTitle}
              number={captionNumber}
              onNumberChange={setCaptionNumber}
              position={captionPosition}
              onPositionChange={setCaptionPosition}
              format={captionFormat}
              onFormatChange={setCaptionFormat}
              customTemplate={customTemplate}
              onCustomTemplateChange={setCustomTemplate}
              isDarkMode={isDarkMode}
            />

            {/* 이미지 속성 */}
            <div className={`rounded-lg p-3 border ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3 block">
                이미지 크기
              </label>
              <MediaSizeInputs imageSizing tabIndexStart={10} width={imageWidth} height={imageHeight} onWidthChange={setImageWidth} onHeightChange={setImageHeight} isDarkMode={isDarkMode} />
            </div>

            {/* 정렬 */}
            <MediaAlignmentControl tabIndexStart={13} align={imageAlign} onChange={setImageAlign} isDarkMode={isDarkMode} />
          </div>

          {/* ─── RIGHT PANEL: Preview ─── */}
          <div className={`flex flex-col md:w-[50%] overflow-y-auto ${
            isDarkMode ? 'bg-zinc-900' : 'bg-white'
          }`}>
            <div className={`px-5 py-3 border-b flex items-center gap-2 ${
              isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
            }`}>
              <Eye size={12} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                미리보기
              </span>
              {previewSrc && (
                <span className="ml-auto text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                  ● LIVE
                </span>
              )}
            </div>

            <div className="flex-grow flex flex-col p-4 gap-2.5">
              {/* 이미지 캡션 상단 표시 */}
              {captionPosition === 'top' && captionFormat !== 'none' && captionTitle.trim() && (
                <div className="text-center font-bold text-xs text-zinc-800 dark:text-zinc-200 py-1.5 px-3 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  {formatCleanCaptionPreview(formatMediaCaption('그림', captionNumber, captionTitle.trim(), captionFormat, customTemplate))}
                </div>
              )}
              {/* 이미지 표시 영역 */}
              <div
                className={`relative flex-grow rounded-lg overflow-hidden border flex items-center justify-center ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-200'
                }`}
                style={{ minHeight: '200px' }}
                onWheel={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                {previewSrc ? (
                  <>
                    {!imageLoadError ? (
                      <img
                        src={previewSrc}
                        alt="미리보기"
                        className="object-contain"
                        style={{width:imageWidth ? (/^\d+(?:\.\d+)?$/.test(imageWidth)?imageWidth+'px':imageWidth) : '100%',height:imageHeight ? (/^\d+(?:\.\d+)?$/.test(imageHeight)?imageHeight+'px':imageHeight) : 'auto',maxWidth:'100%',maxHeight:'100%'}}
                        onError={() => setImageLoadError(true)}
                      />
                    ) : (
                      <div className="text-center p-8 text-slate-400 dark:text-zinc-500">
                        <ImageIcon size={28} className="mx-auto mb-2 opacity-50 text-amber-500" />
                        <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">이미지를 불러올 수 없습니다</p>
                        <p className="text-[11px] mt-1 text-slate-400 dark:text-zinc-500 leading-relaxed">
                          입력한 경로를 확인하거나,<br />리소스 폴더(media)에 실제 파일이 있는지 확인해 주세요.
                        </p>
                      </div>
                    )}
                    {/* 메타데이터 오버레이 */}
                    <div className={`absolute bottom-0 inset-x-0 px-4 py-2.5 border-t flex gap-4 items-center ${
                      isDarkMode ? 'bg-zinc-900/95 border-zinc-700' : 'bg-white/95 border-slate-200'
                    }`}>
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Format</div>
                        <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {(() => {
                            if (cleanImagePath.startsWith('data:image/')) {
                              return cleanImagePath.split(';')[0].split('/')[1]?.toUpperCase() || 'IMG';
                            }
                            if (cleanImagePath.startsWith('blob:')) {
                              if (appliedPath) return appliedPath.split('.').pop()?.toUpperCase() || 'IMG';
                              return 'BLOB';
                            }
                            const ext = cleanImagePath.split('.').pop()?.split('?')[0]?.toUpperCase();
                            return ext && ext.length <= 4 ? ext : 'IMG';
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Status</div>
                        <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {appliedPath ? 'SAVED' : 'LOCAL'}
                        </div>
                      </div>
                      {(imageWidth || imageHeight) && (
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Size</div>
                          <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {imageWidth || '—'} × {imageHeight || '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                      isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'
                    }`}>
                      <ImageIcon size={28} className="text-slate-400 dark:text-zinc-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 leading-relaxed">
                      {cleanImagePath.startsWith('blob:')
                        ? <>만료된 임시 미리보기 경로입니다.<br />찾아보기를 눌러 로컬 파일을 다시 선택해주세요.</>
                        : <>이미지 주소 입력 또는<br />파일을 선택하면<br />여기에 미리보기가 표시됩니다</>
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* 이미지 캡션 하단 표시 */}
              {captionPosition === 'bottom' && captionFormat !== 'none' && captionTitle.trim() && (
                <div className="text-center font-bold text-xs text-zinc-800 dark:text-zinc-200 py-1.5 px-3 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  {formatCleanCaptionPreview(formatMediaCaption('그림', captionNumber, captionTitle.trim(), captionFormat, customTemplate))}
                </div>
              )}

              
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-end gap-3 shrink-0 sticky bottom-0 z-10 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            tabIndex={16}
            className="font-bold text-xs text-slate-400 hover:text-[#1d4ed8] dark:hover:text-[#1d4ed8] transition-colors py-2 px-3"
          >
            취소
          </button>
          <button
            onClick={handleInsert}
            tabIndex={17}
            disabled={!cleanImagePath || saving}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] ${
              cleanImagePath
                ? 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-md shadow-[#1d4ed8]/25'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            <LinkIcon size={13} />
            이미지 삽입
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
