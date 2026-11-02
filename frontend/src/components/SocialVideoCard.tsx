// ====================================================================
// 📊 [OMD-EDIT-SocialVideoCard-0001] SocialVideoCard ➔ SocialVideoCard
// 🎯 @KICK  : SNS 동영상(TikTok, Instagram, Vimeo 등) 임베드 카드 렌더링 및 에디터-미리보기 1:1 동기화(data-line) 지원
// 🛡️ @GUARD : oEmbed 비동기 호출 및 취소 플래그 가드, 플랫폼별 브랜드 컬러 격리
// 🚨 @PATCH : **2026-09-16** — [데스크톱 SNS 동영상 카드 링크 외부 브라우저 오픈 연동]: <a> 태그에 handleClick을 바인딩하여 Electron 환경에서 카드 클릭 시 electronAPI.openExternal로 시스템 기본 웹브라우저 오픈 지원
// 🚨 @PATCH : 2026-09-05 - [미디어 스크롤 싱크 및 data-line 보완] outer <a> 태그에 data-line 속성 바인딩을 지원하여 SNS 동영상 링크 줄 타이핑 및 커서 이동 시 위치 추종 지원
// 🔗 @CALLS : fetch, oembedUrl
// ====================================================================
"use client";

import React, { useState, useEffect } from 'react';

interface SocialVideoCardProps {
  url: string;
  displayName: string;
  'data-line'?: number | string;
  dataLine?: number | string;
  [key: string]: any;
}

function detectPlatform(url: string): string | null {
  if (/tiktok\.com/.test(url)) return 'TikTok';
  if (/instagram\.com/.test(url)) return 'Instagram';
  if (/vimeo\.com/.test(url)) return 'Vimeo';
  if (/twitch\.tv/.test(url)) return 'Twitch';
  if (/dailymotion\.com/.test(url)) return 'Dailymotion';
  return null;
}

const platformColors: Record<string, string> = {
  TikTok: 'hover:border-purple-400 dark:hover:border-purple-500',
  Instagram: 'hover:border-pink-400 dark:hover:border-pink-500',
  Vimeo: 'hover:border-blue-400 dark:hover:border-blue-500',
  Twitch: 'hover:border-purple-500 dark:hover:border-purple-600',
  Dailymotion: 'hover:border-blue-400 dark:hover:border-blue-500',
};

export default function SocialVideoCard({ url, displayName, dataLine, 'data-line': dataLineProp, ...props }: SocialVideoCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const platform = detectPlatform(url);

  useEffect(() => {
    let cancelled = false;
    const oembedUrl = `https://onrivi.com/api/oembed?url=${encodeURIComponent(url)}`;

    fetch(oembedUrl)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.thumbnail_url) {
          setThumbnailUrl(data.thumbnail_url);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;
    if (isDesktop && url) {
      e.preventDefault();
      (window as any).electronAPI.openExternal(url);
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      data-line={dataLine || dataLineProp || (props as any)['data-line']}
      className="block no-underline my-2 group"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div className={`relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 transition-colors ${platformColors[platform || ''] || 'hover:border-blue-400 dark:hover:border-blue-500'}`}>
        <div className="aspect-video relative flex items-center justify-center bg-black/10 dark:bg-black/30 overflow-hidden">
          {loading ? (
            <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
          ) : thumbnailUrl ? (
            <img src={thumbnailUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover"
              onError={() => setThumbnailUrl(null)} />
          ) : null}
          {!loading && !thumbnailUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-200/80 to-zinc-300/80 dark:from-zinc-800/60 dark:to-zinc-900/80">
              <span className="absolute w-full px-6 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate drop-shadow-sm" style={{ top: '70%' }}>
                {displayName}
              </span>
            </div>
          ) : null}
          <div className="relative w-16 h-16 rounded-full bg-black/60 dark:bg-black/50 flex items-center justify-center group-hover:bg-black/80 group-hover:scale-110 transition-all z-10">
            <svg width="28" height="28" viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current" style={{ marginLeft: 3 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}
