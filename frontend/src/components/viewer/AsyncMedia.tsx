// ====================================================================
// 📊 [OMD-CORE-AsyncMedia-0001] AsyncMedia.tsx ➔ 비동기 미디어(이미지·비디오) 로더
// 🎯 @KICK  : 로컬 파일(OPFS/VFS), Google Drive 클라우드 미디어, Electron 로컬 프로토콜(media-local://) 비동기 로딩 및 클립보드 복사 컨트롤 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 MarkdownViewer 대형 소스 모듈화 표준 준수
// 🚨 @PATCH : 2026-11-04 — [MarkdownViewer 모듈화 분리]: AsyncImage, AsyncVideo 독립 분리
// 🔗 @CALLS : getDriveMediaImageBlobUrl, idb, copyImageToClipboard
// ====================================================================
// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { idb } from '@/lib/indexedDbHelper';
import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import { getSavedDriveToken, getSavedWorkspaceInfo, getDriveMediaImageBlobUrl } from '@/lib/gdrive/googleDriveClient';
import { copyImageToClipboard } from '@/lib/mediaMarkup';

export const extractDataLine = (props: any, node?: any): number | undefined => {
  if (!props && !node) return undefined;
  const val = props?.['data-line'] || props?.dataLine || props?.['dataLine'] || node?.properties?.['data-line'] || node?.properties?.dataLine;
  if (val !== undefined && val !== null) {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export async function resolveFileHandleInDirectory(rootHandle: any, relativePath: string): Promise<any | null> {
  if (!rootHandle) return null;
  const clean = relativePath.replace(/^\.?\/+/, '').replace(/^media[/\\]/, '');
  const candidatePaths = [
    relativePath.replace(/^\.?\/+/, ''),
    clean,
    `media/${clean}`,
  ];
  const uniquePaths = Array.from(new Set(candidatePaths.filter(Boolean)));

  for (const cand of uniquePaths) {
    const parts = cand.split(/[/\\]/).filter(Boolean);
    if (parts.length === 0) continue;
    let currentDir = rootHandle;
    let failed = false;
    for (let i = 0; i < parts.length - 1; i++) {
      try {
        currentDir = await currentDir.getDirectoryHandle(parts[i]);
      } catch {
        failed = true;
        break;
      }
    }
    if (!failed) {
      try {
        const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1]);
        if (fileHandle) return fileHandle;
      } catch {}
    }
  }
  return null;
}

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

export const AsyncImage = ({ src, alt, absolutePath, rootFolder, resourceFolderHandle, resourceFolder, workspaceType, api, queryString, style, className, onImageLoaded, showCopyControl = true, ...props }: any) => {
  const revision = useResourceMediaRevision(src);
  const computeSyncInitialSrc = (): string => {
    try {
      if (!src || typeof src !== 'string') return '';
      if (/^(https?:|data:|blob:)/.test(src)) return src;
      const driveWorkspace = getResourceSettings()?.kind === 'drive';
      const mediaSource = src.split('?')[0].split('#')[0].replace(/\\/g, '/');
      if (driveWorkspace && /(?:^|\/)media\//.test(mediaSource)) return '';
      if (/(?:^|[\\/])media[\\/]/.test(src)) {
        try {
          requireResourceSettings();
        } catch {
          return '';
        }
      }
      if (api) {
        const pureSrcForApi = src.split('?')[0].split('#')[0];
        const isHelpAssetApi = pureSrcForApi.includes('help/assets') || pureSrcForApi.startsWith('/help/assets/') || pureSrcForApi.startsWith('./assets/') || pureSrcForApi.startsWith('assets/');
        if (isHelpAssetApi) {
          const fileName = pureSrcForApi.split('/').pop() || '';
          const webSrc = `/help/assets/${fileName}`;
          return queryString ? (webSrc.includes('?') ? webSrc + '&' + queryString.substring(1) : webSrc + queryString) : webSrc;
        }
        let targetAbsolutePath = absolutePath;
        if (src.startsWith('media://local/serve') || src.startsWith('media-local://')) {
          try {
            if (src.startsWith('media-local://')) {
              targetAbsolutePath = new URL(src).searchParams.get('url') || decodeURIComponent(src.replace('media-local://', ''));
              if (targetAbsolutePath.startsWith('/')) targetAbsolutePath = targetAbsolutePath.substring(1);
            } else {
              const parsedUrl = new URL(src);
              const extracted = parsedUrl.searchParams.get('url');
              if (extracted) targetAbsolutePath = extracted;
            }
          } catch (e) {
            const m = src.match(/[?&]url=([^&]+)/);
            if (m) targetAbsolutePath = decodeURIComponent(m[1]);
          }
        }
        if (targetAbsolutePath && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && (!src.startsWith('media://') || src.startsWith('media://local/serve'))) {
          return `media-local://serve?url=${encodeURIComponent(targetAbsolutePath.split('?')[0])}&v=${revision || ''}`;
        }
        return src;
      }
      return '';
    } catch {
      return '';
    }
  };

  const [imgSrc, setImgSrc] = useState<string>(computeSyncInitialSrc);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setErrorMsg('');

    const updateImage = (value: string) => { if (!cancelled) setImgSrc(value); };

    const loadLocalImage = async () => {
      try {
        const driveQuery = new URLSearchParams((queryString || src.split('?')[1] || '').replace(/^\?/, ''));
        const driveFileId = driveQuery.get('driveId');
        if (driveFileId) {
          const token = getSavedDriveToken();
          const info = getSavedWorkspaceInfo();
          if (!token || !info) throw new Error('구글 드라이브 연결이 필요합니다.');
          const targetMediaFolderId = getResourceSettings('cloud')?.mediaFolderId || info.mediaFolderId;
          const url = await getDriveMediaImageBlobUrl(token, targetMediaFolderId, src.split('?')[0] + '?' + driveQuery.toString());
          if (!url) throw new Error('드라이브에서 이미지를 찾을 수 없습니다.');
          updateImage(url);
          return;
        }

        const driveWorkspace = getResourceSettings()?.kind === 'drive';
        const mediaSource = src.split('?')[0].split('#')[0].replace(/\\/g, '/');
        if (driveWorkspace && /(?:^|\/)media\//.test(mediaSource)) {
          const token = getSavedDriveToken();
          const info = getSavedWorkspaceInfo();
          const folderId = getResourceSettings('cloud')?.mediaFolderId || info?.mediaFolderId;
          const fileName = mediaSource.split('/').pop() || '';
          const blobUrl = await getDriveMediaImageBlobUrl(token, folderId, fileName);
          if (blobUrl) {
            updateImage(blobUrl);
            return;
          }
        }

        if (api) {
          let targetAbsolutePath = absolutePath;
          if (src.startsWith('media://local/serve') || src.startsWith('media-local://')) {
            try {
              if (src.startsWith('media-local://')) {
                targetAbsolutePath = new URL(src).searchParams.get('url') || decodeURIComponent(src.replace('media-local://', ''));
                if (targetAbsolutePath.startsWith('/')) targetAbsolutePath = targetAbsolutePath.substring(1);
              } else {
                const parsedUrl = new URL(src);
                const extracted = parsedUrl.searchParams.get('url');
                if (extracted) targetAbsolutePath = extracted;
              }
            } catch (e) {
              const m = src.match(/[?&]url=([^&]+)/);
              if (m) targetAbsolutePath = decodeURIComponent(m[1]);
            }
          }
          if (targetAbsolutePath && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && (!src.startsWith('media://') || src.startsWith('media://local/serve'))) {
            updateImage(`media-local://serve?url=${encodeURIComponent(targetAbsolutePath.split('?')[0])}&v=${revision || driveQuery.get('v') || ''}`);
          } else {
            updateImage(src);
          }
        } else if ((workspaceType === 'browser' || workspaceType === 'local') && !src.startsWith('http') && !src.startsWith('data:')) {
          const pureSrc = src.split('?')[0].split('#')[0];
          const isHelpAsset = pureSrc.includes('help/assets') || pureSrc.startsWith('/help/assets/') || pureSrc.startsWith('./assets/') || pureSrc.startsWith('assets/');
          const isStaticAsset = (
            pureSrc.startsWith('/logo') ||
            pureSrc.startsWith('/icon') ||
            pureSrc.startsWith('/images/') ||
            pureSrc.startsWith('frontend/public/') ||
            pureSrc.startsWith('public/') ||
            isHelpAsset
          );
          if (isStaticAsset) {
            let webSrc = pureSrc;
            if (isHelpAsset) {
              const fileName = pureSrc.split('/').pop() || '';
              webSrc = `/help/assets/${fileName}`;
            } else if (webSrc.startsWith('frontend/public/')) webSrc = webSrc.replace('frontend/public/', '/');
            else if (webSrc.startsWith('public/')) webSrc = webSrc.replace('public/', '/');
            
            updateImage(queryString ? (webSrc.includes('?') ? webSrc + '&' + queryString.substring(1) : webSrc + queryString) : webSrc);
            return;
          }

          const isDriveEnv = getResourceSettings()?.kind === 'drive';
          if (isDriveEnv) {
            const token = getSavedDriveToken();
            const wsInfo = getSavedWorkspaceInfo();
            const targetMediaFolderId = getResourceSettings('cloud')?.mediaFolderId || wsInfo?.mediaFolderId;
            if (token && targetMediaFolderId) {
              const driveBlobUrl = await getDriveMediaImageBlobUrl(token, targetMediaFolderId, pureSrc);
              if (driveBlobUrl) {
                updateImage(driveBlobUrl);
                return;
              }
            }
          }

          const isMediaSrc = pureSrc.startsWith('./media/') || pureSrc.startsWith('media/') || pureSrc.startsWith('/media/') || pureSrc.includes('media/');

          let activeRFHandle = resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
          if (!activeRFHandle && typeof window !== 'undefined') {
            try {
              activeRFHandle = await idb.get('resourceFolderHandle');
              if (activeRFHandle) {
                (window as any).__resourceFolderHandle = activeRFHandle;
              }
            } catch {}
          }

          if (activeRFHandle) {
            try {
              const fileHandle = await resolveFileHandleInDirectory(activeRFHandle, pureSrc);
              if (fileHandle) {
                const file = await fileHandle.getFile();
                objectUrl = URL.createObjectURL(file);
                updateImage(objectUrl);
                return;
              }
            } catch (err: any) {
              console.warn('[AsyncImage] RF handle lookup failed:', err);
            }
          }

          if (isMediaSrc && !activeRFHandle && !rootFolder?.handle) {
            setErrorMsg(`[리소스 폴더 미지정] 환경설정에서 공통 자원 폴더를 지정해야 이미지가 표시됩니다.`);
            return;
          }

          if (rootFolder?.handle) {
            try {
              const fileHandle = await resolveFileHandleInDirectory(rootFolder.handle, pureSrc);
              if (fileHandle) {
                const file = await fileHandle.getFile();
                objectUrl = URL.createObjectURL(file);
                updateImage(objectUrl);
                return;
              }
            } catch (err: any) {
              console.warn('[AsyncImage] Root handle lookup failed:', err);
            }
          }

          updateImage(src);
        } else {
          updateImage(src);
        }
      } catch (err: any) {
        console.error('[AsyncImage] Error:', err);
        setErrorMsg(`이미지 로드 실패: ${err.message}`);
      }
    };

    loadLocalImage();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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

  if (!imgSrc) return <span data-export-state="loading" data-export-label="이미지" data-line={extractDataLine(props)} className="inline-block animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded w-full h-32" />;

  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.startsWith('blob:')) {
      setErrorMsg(`드라이브에서 받은 이미지 데이터를 표시하지 못했습니다: ${src}`);
      return;
    }
    if (img.dataset.fallbackAttempted) {
      setErrorMsg(`이미지를 불러오지 못했습니다: ${absolutePath || src}`);
      return;
    }
    img.dataset.fallbackAttempted = 'true';
    if (api && absolutePath) {
      img.src = `media://local/serve?url=${encodeURIComponent(absolutePath)}`;
    }
  };

  const handleImgLoad = () => {};

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const target = absolutePath || src || imgSrc;
      const ok = await copyImageToClipboard(target);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Image copy failed', err);
    }
  };

  return (
    <div ref={element => {
      if (!element) return;
      if (style?.width) element.style.setProperty('width', String(style.width), 'important');
      element.style.setProperty('height', 'auto', 'important');
      const image = element.querySelector('img');
      if (image) {
        if (style?.width) image.style.setProperty('width', '100%', 'important');
        if (style?.width || style?.height) image.style.setProperty('height', String(style?.height || 'auto'), 'important');
      }
    }} data-image-width={style?.width || undefined} data-image-height={style?.height || undefined} data-line={extractDataLine(props)} className={`relative group inline-flex flex-col onrivi-image-wrapper ${className || ''}`} style={{ ...style, height: 'auto' }}>
      <img ref={imgRef} src={imgSrc} alt={alt} className={className} onError={onImgError} onLoad={handleImgLoad} {...props} data-line={undefined} style={{ maxWidth: '100%', width: style?.width ? '100%' : undefined, height: style?.height || 'auto', objectFit: 'contain', flexShrink: 0 }} />
      {showCopyControl && <button
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
      </button>}
    </div>
  );
};

export const AsyncVideo = ({ src, absolutePath, rootFolder, resourceFolderHandle, workspaceType, api, queryString, style, className, ...props }: any) => {
  const revision = useResourceMediaRevision(src);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  useEffect(() => {
    let objectUrl = '';
    setErrorMsg('');
    const loadLocalVideo = async () => {
      try {
        const driveQuery = new URLSearchParams((queryString || src.split('?')[1] || '').replace(/^\?/, ''));
        if (driveQuery.get('driveId') || ((getResourceSettings()?.kind === 'drive') && /media\//.test(src))) {
          const token = getSavedDriveToken();
          const info = getSavedWorkspaceInfo();
          if (!token || !info) throw new Error('구글 드라이브 연결이 필요합니다.');
          const targetMediaFolderId = getResourceSettings('cloud')?.mediaFolderId || info.mediaFolderId;
          const url = await getDriveMediaImageBlobUrl(token, targetMediaFolderId, src.split('?')[0] + '?' + driveQuery.toString());
          if (!url) throw new Error('드라이브에서 동영상을 찾을 수 없습니다.');
          setVideoSrc(url);
          return;
        }
        if (api) {
          let targetAbsolutePath = absolutePath;
          if (src.startsWith('media://local/serve') || src.startsWith('media-local://')) {
            try {
              if (src.startsWith('media-local://')) {
                targetAbsolutePath = new URL(src).searchParams.get('url') || decodeURIComponent(src.replace('media-local://', ''));
                if (targetAbsolutePath.startsWith('/')) targetAbsolutePath = targetAbsolutePath.substring(1);
              } else {
                const parsedUrl = new URL(src);
                const extracted = parsedUrl.searchParams.get('url');
                if (extracted) targetAbsolutePath = extracted;
              }
            } catch (e) {
              const m = src.match(/[?&]url=([^&]+)/);
              if (m) targetAbsolutePath = decodeURIComponent(m[1]);
            }
          }
          if (targetAbsolutePath && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && (!src.startsWith('media://') || src.startsWith('media://local/serve'))) {
            setVideoSrc(`media-local://serve?url=${encodeURIComponent(targetAbsolutePath.split('?')[0])}&v=${revision || driveQuery.get('v') || ''}`);
          } else {
            setVideoSrc(src);
          }
        } else if ((workspaceType === 'browser' || workspaceType === 'local') && !src.startsWith('http') && !src.startsWith('data:')) {
          const pureSrc = src.split('?')[0].split('#')[0];
          
          const createTypedBlobUrl = (file: File, filename: string) => {
            const ext = filename.split('.').pop()?.toLowerCase();
            const mimeMap: Record<string, string> = {
              'mp4': 'video/mp4', 'webm': 'video/webm', 'ogg': 'video/ogg', 'mov': 'video/quicktime'
            };
            const type = mimeMap[ext || ''] || 'video/mp4';
            return URL.createObjectURL(new Blob([file], { type }));
          };

          let webTargetSrc = pureSrc;
          if (src.startsWith('media://local/serve') || src.startsWith('media-local://')) {
            try {
              let extractedPath = '';
              if (src.startsWith('media-local://')) {
                extractedPath = decodeURIComponent(src.replace('media-local://', ''));
                if (extractedPath.startsWith('/')) extractedPath = extractedPath.substring(1);
              } else {
                const parsedUrl = new URL(src);
                const extracted = parsedUrl.searchParams.get('url');
                if (extracted) extractedPath = extracted;
              }
              if (extractedPath) {
                if (rootFolder?.name && extractedPath.includes(rootFolder.name)) {
                  const parts = extractedPath.replace(/\\/g, '/').split('/');
                  const rootIdx = parts.indexOf(rootFolder.name);
                  if (rootIdx !== -1) {
                    webTargetSrc = '/' + parts.slice(rootIdx).join('/');
                  } else {
                    webTargetSrc = extractedPath;
                  }
                } else {
                  webTargetSrc = extractedPath;
                }
              }
            } catch (e) {}
          }

          let activeRFHandle = resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
          if (!activeRFHandle && typeof window !== 'undefined') {
            try {
              activeRFHandle = await idb.get('resourceFolderHandle');
              if (activeRFHandle) {
                (window as any).__resourceFolderHandle = activeRFHandle;
              }
            } catch {}
          }

          if (activeRFHandle) {
            try {
              const fileHandle = await resolveFileHandleInDirectory(activeRFHandle, webTargetSrc);
              if (fileHandle) {
                const file = await fileHandle.getFile();
                const fileName = webTargetSrc.split(/[/\\]/).filter(Boolean).pop() || 'video.mp4';
                objectUrl = createTypedBlobUrl(file, fileName);
                setVideoSrc(objectUrl);
                return;
              }
            } catch (e) {}
          }

          if (!activeRFHandle && !rootFolder?.handle && (webTargetSrc.startsWith('./media/') || webTargetSrc.startsWith('media/') || (webTargetSrc.startsWith('/media/') || webTargetSrc.startsWith('./media/')))) {
            setErrorMsg(`로컬 비디오를 보려면 좌측 하단의 '리소스 폴더 지정' 버튼을 클릭해 폴더를 연동해주세요.`);
            return;
          }

          if (rootFolder?.handle) {
            try {
              const fileHandle = await resolveFileHandleInDirectory(rootFolder.handle, webTargetSrc);
              if (fileHandle) {
                const file = await fileHandle.getFile();
                const fileName = webTargetSrc.split(/[/\\]/).filter(Boolean).pop() || 'video.mp4';
                objectUrl = createTypedBlobUrl(file, fileName);
                setVideoSrc(objectUrl);
                return;
              }
            } catch (e) {}
            setVideoSrc(src);
          } else {
            setVideoSrc(src);
          }
        } else {
          setVideoSrc(src);
        }
      } catch (e: any) {
        console.error(`[AsyncVideo] ERROR:`, e);
        setErrorMsg(`비디오 로드 실패: ${absolutePath} (${e.message})`);
        const fallbackSrc = `/api/view?filePath=${encodeURIComponent(absolutePath)}`;
        setVideoSrc(queryString ? (fallbackSrc.includes('?') ? fallbackSrc + '&' + queryString.substring(1) : fallbackSrc + queryString) : fallbackSrc);
      }
    };
    loadLocalVideo();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, absolutePath, rootFolder, resourceFolderHandle, workspaceType, api, queryString, revision]);

  if (errorMsg) {
    return (
      <div className="border border-red-500 bg-red-100 dark:bg-red-900/20 p-2 rounded text-xs text-red-600 dark:text-red-400 break-all my-2">
        <strong>비디오 렌더링 에러:</strong><br/>
        경로: {absolutePath}<br/>
        에러: {errorMsg}
      </div>
    );
  }
  if (!videoSrc) return <div className="animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded w-full h-48 flex items-center justify-center my-2 text-zinc-500 text-sm">비디오 불러오는 중...</div>;
  return (
    <video controls src={videoSrc} style={style} className={`rounded-lg shadow-sm border border-zinc-200/30 max-w-full outline-none bg-black ${className || ''}`} preload="metadata" {...props} />
  );
};
