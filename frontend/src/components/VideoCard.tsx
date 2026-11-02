// ====================================================================
// 📊 [OMD-EDIT-VideoCard-0001] VideoCard ➔ VideoCard
// 🎯 @KICK  : YouTube 및 로컬 비디오 썸네일 카드 렌더링 및 에디터-미리보기 1:1 동기화(data-line) 지원
// 🛡️ @GUARD : 로컬 웹 환경 CORS 방어, 데스크탑 전용 썸네일 추출, 1초 시점 프레임 추출
// 🚨 @PATCH : **2026-09-16** — [데스크톱 비디오 카드 링크 외부 브라우저 오픈 연동]: <a> 태그에 handleClick을 바인딩하여 Electron 환경에서 동영상 카드 클릭 시 electronAPI.openExternal로 시스템 기본 웹브라우저 오픈 지원
// 🚨 @PATCH : 2026-09-05 - [미디어 스크롤 싱크 및 data-line 보완] outer <a> 태그에 data-line 속성 바인딩을 지원하여 동영상 줄 타이핑 및 커서 이동 시 위치 추종 지원
// 🔗 @CALLS : thumbnailCache, canvas.toDataURL
// ====================================================================
"use client";

import React, { useState, useRef, useEffect } from 'react';

const thumbnailCache = new Map<string, string>();

interface VideoCardProps {
  src: string;
  href: string;
  displayName: string;
  isYoutube?: boolean;
  youtubeId?: string;
  'data-line'?: number | string;
  dataLine?: number | string;
  [key: string]: any;
}

export default function VideoCard({ src, href, displayName, isYoutube, youtubeId, dataLine, 'data-line': dataLineProp, ...props }: VideoCardProps) {
  const cachedKey = isYoutube ? `yt:${youtubeId}` : src;
  const [thumbnail, setThumbnail] = useState<string | null>(() => thumbnailCache.get(cachedKey) || null);
  const [loading, setLoading] = useState(!thumbnailCache.has(cachedKey));
  const frameDoneRef = useRef(false);

  useEffect(() => {
    if (isYoutube && youtubeId) {
      if (navigator.onLine) {
        const ytUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
        thumbnailCache.set(cachedKey, ytUrl);
        setThumbnail(ytUrl);
      }
      setLoading(false);
      return;
    }
    if (!src || thumbnailCache.has(cachedKey)) { setLoading(false); return; }
    
    const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    // 사용자의 요청 정리:
    // 1. "데스크탑은 원래대로 하고": 데스크탑(Electron) 환경에서는 로컬/클라우드 상관없이 정상적으로 썸네일을 추출합니다.
    // 2. "로컬에서는 파일명으로 해줘": 로컬 웹 개발 서버(localhost:3100 등)에서는 외부/로컬 영상 로드 시 CORS 에러 방지를 위해 썸네일 추출을 모두 생략하고 파일명만 표시합니다.
    if (isLocalhost && !isDesktop) {
      setLoading(false);
      return;
    }

    if (frameDoneRef.current) return;
    frameDoneRef.current = true;
    let cancelled = false;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    const timeout = setTimeout(() => { if (!cancelled) { video.remove(); setLoading(false); } }, 5000);
    video.onloadedmetadata = () => {
      if (cancelled) return;
      // 검은 화면 방지를 위해 1초 시점(또는 매우 짧은 경우 중간 시점)으로 이동
      video.currentTime = Math.min(1, video.duration > 0 ? video.duration / 2 : 0.5);
    };
    video.onseeked = () => {
      if (cancelled) return;
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        thumbnailCache.set(cachedKey, dataUrl);
        if (!cancelled) setThumbnail(dataUrl);
      } catch {
        if (!cancelled) setThumbnail(null);
      }
      video.remove();
      setLoading(false);
    };
    video.onerror = () => { clearTimeout(timeout); if (!cancelled) { video.remove(); setLoading(false); } };
    video.src = src;
    video.load();
    return () => { cancelled = true; clearTimeout(timeout); video.remove(); };
  }, [src, isYoutube, youtubeId, cachedKey]);

  const handleClick = (e: React.MouseEvent) => {
    const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;
    if (isDesktop && href) {
      e.preventDefault();
      (window as any).electronAPI.openExternal(href);
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      data-line={dataLine || dataLineProp || (props as any)['data-line']}
      className="block no-underline my-2 group"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <span className={`block relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-colors ${
        isYoutube ? 'bg-zinc-950 hover:border-red-400 dark:hover:border-red-500' : 'bg-zinc-100 dark:bg-zinc-900 hover:border-blue-400 dark:hover:border-blue-500'
      }`}>
        <span className="aspect-video relative flex items-center justify-center bg-black/10 dark:bg-black/30 overflow-hidden">
          {loading ? (
            <span className="block w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
          ) : thumbnail ? (
            <img src={thumbnail} alt={displayName} className="absolute inset-0 w-full h-full object-cover"
              onError={() => setThumbnail(null)} />
          ) : null}
          {!loading && !thumbnail ? (
            <span className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-200/80 to-zinc-300/80 dark:from-zinc-800/60 dark:to-zinc-900/80">
              <span className="absolute w-full px-6 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate drop-shadow-sm" style={{ top: '70%' }}>
                {displayName}
              </span>
            </span>
          ) : null}
          <span className="relative w-16 h-16 rounded-full bg-black/60 dark:bg-black/50 flex items-center justify-center group-hover:bg-black/80 group-hover:scale-110 transition-all z-10">
            <svg width="28" height="28" viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current" style={{ marginLeft: 3 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </span>
    </a>
  );
}
