// ====================================================================
// 📊 [OMD-CORE-AsyncMedia-0001] AsyncMedia.tsx ➔ 비동기 미디어(이미지·비디오) 뷰어 컴포넌트
// 🎯 @KICK  : 미디어 리졸버(resolveMediaUrl)와 연동하여 이미지/비디오를 시각 렌더링하고 복사 컨트롤 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리: Core Presentation) 준수 - I/O 복잡도를 mediaResolver로 위임하여 렌더링에만 집중
// 🚨 @PATCH : 2026-11-11 — [Drive 이미지 복사]: 표시된 Blob과 원본 driveId 쿼리를 함께 전달해 비트맵 복사 대상을 유지한다.
// 🚨 @PATCH : 2026-11-08 — [AsyncImage 로드 실패 시 데스크톱 네이티브 프로토콜(media-local://) 자가 치유 폴백 및 api 전달 보강]:
//             1) api가 props로 전달되지 않은 경우에도 typeof window.electronAPI를 기본 주입하여 데스크톱 환경 누락 방어
//             2) <img onError> 핸들러를 추가하여 웹 오리진 404 실패 시 media-local://로 즉시 재시도하는 자가 치유(Self-Healing) 방어막 구축
// 🚨 @PATCH : 2026-11-08 — [AsyncMedia 다이어트 및 미디어 리졸버 분리]:
//             1) 비대했던 Google Drive/Electron/FSAA 분기 로직(200여 줄)을 mediaResolver.ts로 전면 위임
//             2) AsyncImage 및 AsyncVideo 코드를 60% 이상 다이어트하여 순수 React 렌더링과 클립보드 복사 인터랙션에 집중
//             3) resolveFileHandleInDirectory 하위 호환 re-export 유지
// 🚨 @PATCH : 2026-11-07 — [드라이브 이미지 404 차단 및 꺽쇠 정제]: computeSyncInitialSrc에서 driveId 존재 시 비동기 blob 로드 대기로 즉시 반환
// 🔗 @CALLS : resolveMediaUrl, copyImageToClipboard
// ====================================================================
// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { copyImageToClipboard } from '@/lib/mediaMarkup';
import { resolveMediaUrl, resolveFileHandleInDirectory } from '@/lib/mediaResolver';

export { resolveFileHandleInDirectory };

export const extractDataLine = (props: any, node?: any): number | undefined => {
  if (!props && !node) return undefined;
  const val = props?.['data-line'] || props?.dataLine || props?.['dataLine'] || node?.properties?.['data-line'] || node?.properties?.dataLine;
  if (val !== undefined && val !== null) {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export function useResourceMediaRevision(source: string) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = (event: Event) => {
      let path = source || '';
      try { if (/^media(?:-local)?:/.test(path)) path = new URL(path).searchParams.get('url') || path; } catch {}
      let name = path.split('?')[0].split(/[\\/]/).pop() || '';
      try { name = decodeURIComponent(name); } catch {}
      if (name.normalize('NFC') === (event as CustomEvent).detail?.name?.normalize('NFC')) setRevision(Date.now());
    };
    window.addEventListener('onrivi:media-updated', refresh);
    return () => window.removeEventListener('onrivi:media-updated', refresh);
  }, [source]);
  return revision;
}

export const AsyncImage = ({
  src,
  alt,
  absolutePath,
  rootFolder,
  resourceFolderHandle,
  resourceFolder,
  workspaceType,
  api,
  queryString,
  style,
  className,
  onImageLoaded,
  showCopyControl = true,
  ...props
}: any) => {
  const revision = useResourceMediaRevision(src);

  // 구글 드라이브(driveId) 이미지는 브라우저 404 방어를 위해 초기 동기 src를 비워둠
  const computeInitialSrc = (): string => {
    if (!src || typeof src !== 'string') return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    if (src.includes('driveId=') || (rootFolder?.type === 'GDRIVE' && /(?:^|\/)media\//.test(src))) return '';
    return '';
  };

  const [imgSrc, setImgSrc] = useState<string>(computeInitialSrc);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl = '';
    setErrorMsg('');

    const load = async () => {
      try {
        const result = await resolveMediaUrl({
          src,
          absolutePath,
          rootFolder,
          resourceFolderHandle,
          resourceFolder,
          workspaceType,
          api: api || (typeof window !== 'undefined' ? (window as any).electronAPI : null),
          queryString,
          revision,
        });

        if (cancelled) {
          if (result.isBlob) URL.revokeObjectURL(result.url);
          return;
        }

        if (result.isBlob) createdBlobUrl = result.url;
        setImgSrc(result.url);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[AsyncImage] 로드 실패:', err);
          setErrorMsg(err.message || '이미지를 불러오지 못했습니다.');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      // 🛡️ 글로벌 캐시(driveImageBlobCache) 및 세션 내 Blob URL은 탭 전환/리렌더 시 취소(revoke)하지 않고 보존
      // 언마운트 시 즉시 revoke하면 다중 탭 세션 및 후속 리렌더 시 net::ERR_FILE_NOT_FOUND 치명적 결함 발생
    };
  }, [src, absolutePath, rootFolder, resourceFolderHandle, resourceFolder, workspaceType, api, queryString, revision]);

  if (errorMsg) {
    return (
      <span data-export-state="error" data-export-label="이미지" className="inline-flex items-center gap-2 px-3.5 py-2 my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold shadow-xs select-none">
        <span className="text-sm">⚠️</span>
        <span>{errorMsg}</span>
      </span>
    );
  }

  if (!imgSrc) {
    return <span data-export-state="loading" data-export-label="이미지" data-line={extractDataLine(props)} className="inline-block animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded w-full h-32" />;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const target = queryString && !src.includes('?') ? `${src}${queryString}` : src || absolutePath || imgSrc;
      const ok = await copyImageToClipboard(target, imgRef.current);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Image copy failed', err);
    }
  };

  return (
    <div
      data-image-width={style?.width || undefined}
      data-image-height={style?.height || undefined}
      data-line={extractDataLine(props)}
      className={`relative group inline-flex flex-col onrivi-image-wrapper ${className || ''}`}
      style={{ ...style, height: 'auto', width: style?.width || undefined }}
    >
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className={className}
        onLoad={onImageLoaded}
        onError={() => {
          if (imgSrc && imgSrc.startsWith('blob:')) {
            // 🛡️ 죽은 Blob URL(ERR_FILE_NOT_FOUND) 감지 시 드라이브 캐시에서 제거하여 후속 요청 복구
            import('@/lib/gdrive/googleDriveClient').then(({ evictDriveMediaBlob }) => {
              evictDriveMediaBlob(imgSrc);
              evictDriveMediaBlob(src);
            }).catch(() => {});
          }
          const apiObj = api || (typeof window !== 'undefined' ? (window as any).electronAPI : null);
          if (apiObj && imgSrc && !imgSrc.startsWith('media-local://') && !imgSrc.startsWith('data:')) {
            const rawTarget = absolutePath || src || '';
            const cleanTarget = rawTarget.split('?')[0].trim();
            const fallbackUrl = `media-local://serve?url=${encodeURIComponent(cleanTarget)}`;
            if (imgSrc !== fallbackUrl) {
              setImgSrc(fallbackUrl);
            }
          }
        }}
        data-line={undefined}
        style={{
          maxWidth: '100%',
          width: style?.width ? '100%' : undefined,
          height: style?.height || 'auto',
          objectFit: 'contain',
          flexShrink: 0
        }}
        {...props}
      />
      {showCopyControl && (
        <button
          onClick={handleCopy}
          className="onrivi-media-control copy-button-hook absolute top-2 right-2 px-2.5 py-1.5 bg-black/60 dark:bg-white/20 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1.5 z-10 hover:bg-black/80 font-medium no-print"
          title="복사"
          style={{ userSelect: 'none' }}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span style={{ color: '#4ade80' }}>복사 완료</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>복사</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export const AsyncVideo = ({
  src,
  absolutePath,
  rootFolder,
  resourceFolderHandle,
  workspaceType,
  api,
  queryString,
  style,
  className,
  ...props
}: any) => {
  const revision = useResourceMediaRevision(src);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl = '';
    setErrorMsg('');

    const load = async () => {
      try {
        const result = await resolveMediaUrl({
          src,
          absolutePath,
          rootFolder,
          resourceFolderHandle,
          workspaceType,
          api,
          queryString,
          revision,
        });

        if (cancelled) {
          if (result.isBlob) URL.revokeObjectURL(result.url);
          return;
        }

        if (result.isBlob) createdBlobUrl = result.url;
        setVideoSrc(result.url);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[AsyncVideo] 로드 실패:', err);
          setErrorMsg(err.message || '비디오를 불러오지 못했습니다.');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [src, absolutePath, rootFolder, resourceFolderHandle, workspaceType, api, queryString, revision]);

  if (errorMsg) {
    return (
      <div className="border border-red-500 bg-red-100 dark:bg-red-900/20 p-2 rounded text-xs text-red-600 dark:text-red-400 break-all my-2">
        <strong>비디오 렌더링 에러:</strong><br />
        경로: {absolutePath || src}<br />
        에러: {errorMsg}
      </div>
    );
  }

  if (!videoSrc) {
    return <div className="animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded w-full h-48 flex items-center justify-center my-2 text-zinc-500 text-sm">비디오 불러오는 중...</div>;
  }

  return (
    <video
      controls
      src={videoSrc}
      style={style}
      className={`rounded-lg shadow-sm border border-zinc-200/30 max-w-full outline-none bg-black ${className || ''}`}
      preload="metadata"
      {...props}
    />
  );
};
