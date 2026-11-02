// 🚨 @PATCH : **2026-10-21** — [동영상 설명(캡션) 위치(상단/하단) 및 표현 구문(표준/대괄호/화살괄호/일반/제목만/커스텀) 설정 연동]:
//             1) MediaCaptionControl 위젯을 탑재하여 영상 제목, 순번, 상단/하단 위치, 표현 구문 선택 및 실시간 미리보기 제공
//             2) 서식 프로필의 mediaCaptionStructure 및 nextReportNumber(content, '영상') 기본값 자동 반영
//             3) 삽입 시 선택된 위치와 표현 구문으로 완성된 동영상 캡션 마크다운 자동 생성
// 🚨 @PATCH : **2026-10-18** — [동영상 저장 안내 문구 안전 복사로 통일]:
//             1) 데스크톱/웹 동영상 저장 시 동일명 파일 덮어쓰기 방어 및 안전 보존 정책과 일치하도록 토스트 메시지 갱신
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더(참조파일 등) 동영상 media 하위폴더 직결 바인딩]: 구글 드라이브 동영상 저장 시 cloudSettings.mediaFolderId 우선 참조 및 부모 리소스 폴더 하위 탐색으로 안전 업로드
// 🚨 @PATCH : **2026-10-03** — [리소스 폴더 변경에 따른 전역 미디어 실시간 연동 강화]: getEffectiveResourceFolder 연동 및 구글 드라이브(OnriviAuthor/참조파일/media) 업로드 지원
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import { pickResourceMedia } from '@/lib/resourceMediaPicker';
import { mediaDetails, videoMarkup } from '@/lib/mediaMarkup';
import { saveResourceMedia, importResourceMedia } from '@/lib/resourceMedia';
import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Video, Upload, ExternalLink, Play, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { loadSecureData } from '@/lib/secureStorage';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { getSavedDriveToken, getSavedWorkspaceInfo, uploadDriveImage, getDriveMediaImageBlobUrl } from '@/lib/gdrive/googleDriveClient';
import { pickDriveResourceFile } from '@/lib/gdrive/ResourceFilePicker';
import { MediaAlignmentControl, MediaSizeInputs, MediaCaptionControl, normalizeMediaDimension, type MediaAlign, type MediaCaptionFormat } from '@/components/MediaLayoutFields';
import { formatMediaCaption } from '@/lib/aiFriendlyReport';

interface YoutubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
  isDarkMode: boolean;
  targetFolder?: string;
  initialUrl?: string;
  initialSource?: string;
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
// 📊 [OMD-EDIT-YoutubeModal-0003] YoutubeModal ➔ YoutubeModal
// 🎯 @KICK  : 동영상 링크 삽입 모달 - YouTube/동영상 URL 및 파일 업로드, 썸네일 미리보기, 고급 테마 마크업
// 🛡️ @GUARD : isOpen/mounted false 시 null 반환
// 🚨 @PATCH : **2026-10-03** — [리소스 폴더 변경에 따른 미디어 저장 연동 동기화]: 구글 드라이브(OnriviAuthor/참조파일/media) 및 로컬/웹 환경에서 리소스 폴더 변경 시 최신 media 폴더로 동영상/미디어 자동 저장 및 연동
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-07-15 — 이미지 삽입 모달과 동일한 2단 분할 레이아웃(좌측 입력/우측 미리보기)으로 UI 전면 교체
// 🔗 @CALLS : uploadVideo, handleFileSelect, handleApplyUrl, handleInsert, createPortal
// ====================================================================
export default function YoutubeModal({
  isOpen,
  onClose,
  onInsert,
  isDarkMode,
  targetFolder,
  initialUrl, initialSource,
  resourceFolderHandle,
  workspaceType,
  rootFolder,
  resourceFolder,
  captionConfig,
  nextNumber = 1,
}: YoutubeModalProps) {
  useModalEscape(isOpen, onClose);
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const frame = requestAnimationFrame(() => sourceInputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, mounted]);

  const openResourceSettings = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('onrivi:resource-settings'));
  };
  const requireResourceFolder = () => {
    const folder=getEffectiveResourceFolder(resourceFolder);
    const drive=getResourceSettings()?.kind === 'drive';
    const info=getSavedWorkspaceInfo();
    const valid=drive ? !!(getSavedDriveToken() && info?.resourceFolderId && info?.mediaFolderId) : (window as any).electronAPI ? /^(?:[A-Za-z]:[\\/]|\\\\)/.test(folder) : !!resourceFolderHandle;
    if (!valid) {
      showToast(drive ? '드라이브 리소스 폴더 연결 정보를 확인할 수 없습니다. 환경설정에서 드라이브를 다시 연결해 주세요.' : '리소스 폴더를 먼저 설정해 주세요.','warning');
      openResourceSettings();
    }
    return valid;
  };
  const [drivePreview, setDrivePreview] = useState<{path:string;url:string}|null>(null);
  const [browsing,setBrowsing] = useState(false);
  const handleBrowse = async () => {
    if(browsing)return;
    setBrowsing(true);
    try {
      const file = await pickResourceMedia('video',workspaceType,resourceFolderHandle);
      if(!file)return;
      if(file.size > 100*1024*1024)throw new Error('동영상 크기는 100MB를 초과할 수 없습니다.');
      const path = await saveResourceMedia(file,file.name,resourceFolderHandle);
      setSourceUrl(path);setAppliedPath(path);setDrivePreview(null);
      showToast('선택한 동영상을 현재 리소스 폴더에 복사했습니다.','success');
    }catch(e:any){showToast(e.message || '파일 선택 실패','error');}
    finally{setBrowsing(false);}
  };
  const [saving, setSaving] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [appliedPath, setAppliedPath] = useState("");
  const [customDisplayName, setCustomDisplayName] = useState("");
  const [captionTitle, setCaptionTitle] = useState("");
  const [captionNumber, setCaptionNumber] = useState(1);
  const [captionPosition, setCaptionPosition] = useState<'top' | 'bottom'>('top');
  const [captionFormat, setCaptionFormat] = useState<MediaCaptionFormat>('standard');
  const [customTemplate, setCustomTemplate] = useState('**{kind} {n}. {title}**');
  const [videoWidth, setVideoWidth] = useState('600');
  const [videoHeight, setVideoHeight] = useState('340');
  const [videoAlign, setVideoAlign] = useState<MediaAlign>('center');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const details = initialSource ? mediaDetails(initialSource) : null;
      const url = details?.path || initialUrl || '';
      setSourceUrl(url); setAppliedPath(url);
      setVideoWidth(details?.width || '600'); setVideoHeight(details?.height || '340');
      setVideoAlign((['left','center','right'].includes(details?.align || '') ? details!.align : 'center') as MediaAlign);
      setCustomDisplayName(details?.title || '');
      setCaptionTitle(details?.title || '');
      setCaptionNumber(nextNumber || 1);
      setCaptionPosition(captionConfig?.position || 'top');
      setCaptionFormat((captionConfig?.format as MediaCaptionFormat) || 'standard');
      setCustomTemplate(captionConfig?.customTemplate || '**{kind} {n}. {title}**');
    } else if (!isOpen) {
      setSourceUrl("");
      setAppliedPath("");
      setCustomDisplayName("");
      setCaptionTitle("");
    }
  }, [isOpen, initialUrl, initialSource, nextNumber, captionConfig]);

  const uploadVideo = async (file: File, _base64Data: string) => {
    const finalPath = await saveResourceMedia(file,file.name,resourceFolderHandle);
    setSourceUrl(finalPath); setAppliedPath(finalPath);
    showToast('현재 리소스 폴더에 안전하게 복사했습니다.','success');
  };

  const readFile = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) { showToast('동영상 크기는 100MB를 초과할 수 없습니다.', 'error'); return; }
    try {
      await uploadVideo(file,'');
    } catch(e:any) { showToast(e.message || '동영상 저장 실패','error'); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleApplyUrl = () => {
    if (!requireResourceFolder()) return;
    const url = sourceUrl.trim();
    if (!url) {
      showToast('URL을 입력해주세요.', 'warning');
      return;
    }
    setAppliedPath(url);
    showToast('URL이 적용되었습니다.', 'success');
  };

  const cleanPath = useMemo(() => {
    let raw = sourceUrl.trim();
    const srcMatch = raw.match(/src=["']([^"']+)["']/);
    const mdMatch = raw.match(/!\[[^\]]*\]\(([^)]*)\)/);
    if (srcMatch) raw = srcMatch[1];
    else if (mdMatch) raw = mdMatch[1];
    raw = raw.replace(/^[\("'\s]+|[\)"'\s]+$/g, '');
    return raw;
  }, [sourceUrl]);

  const detectedVideoId = useMemo(() => {
    const url = cleanPath;
    if (!url) return "";
    if (url.includes("<iframe")) {
      const srcMatch = url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        const idMatch = srcMatch[1].match(/\/embed\/([^/?#]+)/);
        if (idMatch) return idMatch[1];
      }
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : "";
  }, [cleanPath]);

  const isYoutube = !!detectedVideoId;
  const originalFileName = useMemo(() => {
    if (appliedPath && (appliedPath.startsWith('/media/') || appliedPath.startsWith('./media/'))) {
      return appliedPath.split('/').pop()?.split('?')[0];
    }
    return null;
  }, [appliedPath]);
  const displayName = isYoutube ? 'YouTube 동영상' : (originalFileName || cleanPath.split('/').pop()?.split('?')[0] || '동영상');
  const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const insertCode = useMemo(() => {
    const url = appliedPath || cleanPath;
    if (!url) return '';
    const width = normalizeMediaDimension(videoWidth, '600px');
    const height = normalizeMediaDimension(videoHeight, '340px');
    const title = escapeAttribute(customDisplayName.trim() || displayName);
    if (isYoutube) {
      return `<iframe src="https://www.youtube.com/embed/${detectedVideoId}" title="${title}" style="width:${width}; height:${height}; border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" data-align="${videoAlign}"></iframe>`;
    }
    if (/\.(mp4|webm|ogg|mov)(?:[?#]|$)/i.test(url) || /^(\/media\/|\.\/media\/|\/assets\/|\.\/assets\/|media:|blob:|data:video\/)/i.test(url)) {
      return `<video src="${escapeAttribute(url)}" title="${title}" controls style="width:${width}; height:${height};" data-align="${videoAlign}"></video>`;
    }
    if (initialSource && mediaDetails(initialSource)?.element === 'iframe') {
      return `<iframe src="${escapeAttribute(url)}" title="${title}" style="width:${width}; height:${height}; border:0;" allowfullscreen loading="lazy" data-align="${videoAlign}"></iframe>`;
    }
    return `[${customDisplayName.trim() || displayName}](${url})`;
  }, [appliedPath, cleanPath, videoWidth, videoHeight, customDisplayName, displayName, isYoutube, detectedVideoId, videoAlign, initialSource]);

  useEffect(()=>{
    let active=true;
    const folder=getEffectiveResourceFolder(resourceFolder);
    const settings=getResourceSettings();
    if(!folder || settings?.kind!=='drive' || !/^(?:\.?\/)?media\//.test(sourceUrl))return;
    const token=getSavedDriveToken();if(!token || !settings.mediaFolderId)return;
    void getDriveMediaImageBlobUrl(token,settings.mediaFolderId,sourceUrl).then(url=>{if(active && url)setDrivePreview({path:sourceUrl,url});}).catch(error=>{if(active)showToast(error.message,'error');});
    return()=>{active=false;};
  },[sourceUrl,resourceFolder,showToast]);
  const previewSrc = useMemo(() => {
    if(drivePreview?.path===sourceUrl)return drivePreview.url;
    if(!sourceUrl)return '';
    if(/^(https?:|data:|blob:|media:|media-local:)/.test(sourceUrl))return sourceUrl;
    const settings=getResourceSettings();if(!settings || settings.kind==='drive')return '';
    if((window as any).electronAPI){
      const folder=getEffectiveResourceFolder(resourceFolder);
      const relative=decodeURIComponent(sourceUrl.split('?')[0]).replace(/^\.?[\\/]/,'');
      const absolute=/^[A-Za-z]:[\\/]/.test(relative)?relative:folder.replace(/[\\/]$/,'')+'/'+relative;
      return `media-local://serve?url=${encodeURIComponent(absolute)}`;
    }
    return sourceUrl;
  },[drivePreview,sourceUrl,resourceFolder]);

  const handleInsert = async () => {
    if (saving) return;
    if (!requireResourceFolder()) return;
    const url = appliedPath || cleanPath;
    if (!url) {
      showToast('동영상 URL을 입력하거나 파일을 선택해주세요.', 'warning');
      return;
    }
    setSaving(true);
    try {
    const copied = await importResourceMedia(url,resourceFolderHandle);
    const code = copied === url ? insertCode : videoMarkup(copied,normalizeMediaDimension(videoWidth,'600px'),normalizeMediaDimension(videoHeight,'340px'),videoAlign,customDisplayName || displayName);
    
    let finalCode = `\n${code}\n`;
    const titleToUse = captionTitle.trim() || customDisplayName || displayName || '';
    if (captionFormat !== 'none' && titleToUse) {
      const caption = formatMediaCaption('영상', captionNumber, titleToUse, captionFormat, customTemplate);
      if (captionPosition === 'top') {
        finalCode = `\n${caption}\n\n${code}\n`;
      } else {
        finalCode = `\n${code}\n\n${caption}\n`;
      }
    }
    
    onInsert(finalCode);
    setSourceUrl("");
    setAppliedPath("");
    setCustomDisplayName("");
    setCaptionTitle("");
    onClose();
    showToast("동영상을 적용했습니다.", "success");
    } catch(error:any) { showToast(error.message || "동영상 복사 실패", "error"); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  const hasContent = !!(appliedPath || cleanPath);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6" style={{ overflowY: "auto" }}>
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />

      {/* PREMIUM WIDE MODAL — 동영상 삽입 */}
      <div
        className={`relative w-full max-w-5xl rounded-lg shadow-2xl overflow-hidden flex flex-col border animate-in zoom-in-95 duration-200 ${
          isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`flex justify-between items-center px-6 py-4 border-b shrink-0 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-[#EFEFEF] bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m22 8-6 4 6 4V8Z" />
                <rect height="12" rx="2" width="14" x="2" y="6" />
              </svg>
            </div>
            <h2 className="text-base font-bold tracking-tight text-[#1d4ed8]">동영상 링크 삽입</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 transition-colors rounded-md active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: 2-column split */}
        <div className="flex flex-col md:flex-row min-h-0">

          {/* ─── LEFT PANEL ─── */}
          <div className={`flex flex-col gap-3 p-5 md:w-[52%] border-r ${
            isDarkMode ? 'border-zinc-800' : 'border-slate-200'
          }`}>

            {/* 동영상 URL / 파일 */}
            <div className={`rounded-lg p-4 border ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 block">
                동영상 URL 또는 파일
              </label>
              <div className="flex gap-2">
                <input
                  ref={sourceInputRef}
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => { setSourceUrl(e.target.value); setAppliedPath(""); }}
                  placeholder="YouTube URL, 동영상 URL, 또는 파일 선택"
                  className={`w-full font-mono text-xs border rounded px-3 py-2.5 outline-none transition-all ${
                    isDarkMode
                      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30'
                      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                  }`}
                />
                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileSelect} />
                <button
                  onClick={handleBrowse}
                  className={`px-4 py-2.5 border rounded font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 ${
                    isDarkMode
                      ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'
                  }`}
                >
                  <Upload size={12} />
                  찾아보기
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-2 leading-relaxed">
                YouTube URL 또는 MP4/WebM/Ogg 파일 (최대 100MB)
              </p>

              <button type="button" onClick={openResourceSettings} className="text-xs text-indigo-600 underline">리소스 폴더 설정 / 드라이브 다시 연결</button>

              {/* URL 적용 버튼 */}
              {sourceUrl.trim() && !appliedPath && (
                <button
                  onClick={handleApplyUrl}
                  className="mt-3 w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-100 dark:border-indigo-900/60"
                >
                  URL 적용
                </button>
              )}

              {/* 적용 완료 배지 */}
              {appliedPath && (
                <div className={`mt-2 px-3 py-1.5 rounded text-[10px] font-mono flex items-center gap-1.5 ${
                  isDarkMode ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <Check size={11} />
                  <span className="truncate">{appliedPath}</span>
                </div>
              )}
            </div>

            {/* 표시 이름 */}
            <div className={`rounded-lg p-4 border ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 block">
                표시 이름 <span className="normal-case font-normal text-slate-400">(선택사항)</span>
              </label>
              <input
                type="text"
                value={customDisplayName}
                onChange={(e) => setCustomDisplayName(e.target.value)}
                placeholder="표시할 이름 (미입력 시 자동 설정)"
                className={`w-full text-xs border rounded px-3 py-2.5 outline-none focus:ring-1 transition-all ${
                  isDarkMode
                    ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/30'
                    : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>

            <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3 block">동영상 속성</label>
              <MediaSizeInputs width={videoWidth} height={videoHeight} onWidthChange={setVideoWidth} onHeightChange={setVideoHeight} isDarkMode={isDarkMode} />
            </div>
            <MediaAlignmentControl align={videoAlign} onChange={setVideoAlign} isDarkMode={isDarkMode} />

            {/* 삽입 방식 안내 */}
            <div className={`rounded-lg p-4 border flex gap-3 ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <ExternalLink size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 leading-none mb-1">동영상을 본문에 삽입합니다</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal">
                  YouTube와 동영상 파일은 본문에서 재생됩니다. 그 외 URL은 링크로 삽입됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* ─── RIGHT PANEL: Preview ─── */}
          <div className={`flex flex-col md:w-[48%] ${
            isDarkMode ? 'bg-zinc-900' : 'bg-white'
          }`}>
            <div className={`px-5 py-3 border-b flex items-center gap-2 ${
              isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
            }`}>
              <Video size={12} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                미리보기
              </span>
              {hasContent && (
                <span className="ml-auto text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                  ● LIVE
                </span>
              )}
            </div>

            <div className="flex-grow flex flex-col p-5 gap-3">
              {/* 썸네일 / 동영상 미리보기 영역 */}
              <div className={`relative flex-grow rounded-lg overflow-hidden border flex items-center justify-center ${
                isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-200'
              }`} style={{ minHeight: '280px' }}>
                {hasContent ? (
                  <>
                    <div className="relative w-full h-full group">
                      <div className="aspect-video w-full bg-slate-900/90 flex items-center justify-center">
                        {isYoutube ? (
                          <img
                            src={`https://img.youtube.com/vi/${detectedVideoId}/maxresdefault.jpg`}
                            alt="Video Thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${detectedVideoId}/0.jpg`; }}
                          />
                        ) : (
                          <video 
                            src={previewSrc} 
                            controls 
                            className="w-full h-full object-contain"
                            preload="metadata"
                          />
                        )}
                        {/* 유튜브일 때만 커스텀 플레이 오버레이 표시 */}
                        {isYoutube && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                              <Play size={18} className="text-indigo-600 fill-indigo-600 ml-0.5" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 메타데이터 오버레이 */}
                    <div className={`absolute bottom-0 inset-x-0 px-4 py-2.5 border-t flex gap-4 items-center ${
                      isDarkMode ? 'bg-zinc-900/95 border-zinc-700' : 'bg-white/95 border-slate-200'
                    }`}>
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Source</div>
                        <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {isYoutube ? 'YOUTUBE' : 'LOCAL'}
                        </div>
                      </div>
                      {isYoutube && (
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Video ID</div>
                          <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {detectedVideoId}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Status</div>
                        <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {appliedPath ? 'APPLIED' : 'PREVIEW'}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                      isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'
                    }`}>
                      <Video size={28} className="text-slate-400 dark:text-zinc-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 leading-relaxed">
                      YouTube URL 또는<br />동영상 파일을 입력하면<br />여기에 미리보기가 표시됩니다
                    </p>
                  </div>
                )}
              </div>

              {/* 삽입 코드 미리보기 */}
              {hasContent && (
                <div className={`rounded-lg px-4 py-3 border ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="font-black uppercase text-[9px] tracking-widest text-slate-400 dark:text-zinc-500">삽입 코드 미리보기</span>
                  <div className={`mt-1.5 font-mono text-[10px] truncate ${
                    isDarkMode ? 'text-[#1d4ed8]' : 'text-[#1d4ed8]'
                  }`}>
                    {insertCode}
                  </div>
                </div>
              )}
            </div>
            {captionPosition === 'bottom' && captionFormat !== 'none' && (captionTitle.trim() || customDisplayName || displayName) && (
              <div className="text-center font-bold text-xs text-zinc-800 dark:text-zinc-200 py-1.5 px-3 rounded bg-zinc-100 dark:bg-zinc-800/80">
                {formatMediaCaption('영상', captionNumber, captionTitle.trim() || customDisplayName || displayName, captionFormat, customTemplate)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-[#EFEFEF] bg-slate-50'
        }`}>
          {/* 브랜드 인디케이터 */}
          <div className="flex items-center gap-3 font-mono text-[9px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] shrink-0" />
              ONRIVI AUTHOR
            </div>
            <span>ENGINE: LOCAL_FIRST_V3</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="font-bold text-xs text-slate-400 hover:text-[#1d4ed8] dark:hover:text-[#1d4ed8] transition-colors py-2 px-3"
            >
              취소
            </button>
            <button
              onClick={handleInsert}
              disabled={!hasContent || saving}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] ${
                hasContent
                  ? 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-md shadow-[#1d4ed8]/25'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
            >
              <LinkIcon size={13} />
              동영상 삽입
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
