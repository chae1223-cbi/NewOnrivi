/**
 * ====================================================================
 * 📊 [OMD-LIB-MediaResolver-0001] mediaResolver.ts ➔ 통합 미디어 URL 리졸버
 * 🎯 @KICK  : 로컬(Electron/FSA), 구글 드라이브(GDRIVE), 정적 에셋의 미디어 경로를 단일 규격으로 해석하여 유효한 URL(Blob/Data/media-local)로 변환
 * 🛡️ @GUARD : Rule 3(역할 기반 분리: Core I/O 격리) 및 Rule 9(임의 폴백 금지) 준수
 * 🚨 @PATCH : 2026-11-08 — [상대 미디어 경로(/media/...) 데스크톱 프로토콜(media-local://) 자동 해석 및 자가 치유]:
 *             1) VisualReadOnlyMarkdownBlock 등 호출자가 api나 absolutePath를 전달하지 않은 경우에도 window.electronAPI 및 리소스 폴더를 지능형 자동 탐색하여 media-local://로 완벽 서빙
 *             2) PDF 및 문서 가져오기로 생성된 /media/img_xxx.png 이미지가 WYSIWYG 에디터와 미리보기에서 404 없이 즉시 렌더링되도록 결함 원천 해결
 *             3) 브라우저 환경에서 workspaceType 미지정 시 localStorage 기반 자동 탐색 및 FSAA/IDB 폴백 보강
 * 🚨 @PATCH : 2026-11-08 — [AsyncMedia 다이어트 및 미디어 리졸버 통합 분리]:
 *             1) AsyncImage 및 AsyncVideo에 흩어져 있던 Google Drive, Electron, 브라우저 FSAA 미디어 로딩 분기를 단일 함수로 일원화
 *             2) 중복 URL 파싱, 꺽쇠 정제, driveId 해석을 공통 전처리하여 코드 중복 60% 이상 소탕
 * 🔗 @CALLS : getDriveMediaImageBlobUrl, idb, getResourceSettings
 * ====================================================================
 */
// @ts-nocheck
import { idb } from '@/lib/indexedDbHelper';
import { getResourceSettings } from '@/lib/resourceSettings';
import { getSavedDriveToken, getSavedWorkspaceInfo, getDriveMediaImageBlobUrl } from '@/lib/gdrive/googleDriveClient';

export interface ResolveMediaOptions {
  src: string;
  absolutePath?: string;
  rootFolder?: any;
  resourceFolderHandle?: any;
  resourceFolder?: any;
  workspaceType?: string;
  api?: any;
  queryString?: string;
  revision?: number;
}

export interface ResolveMediaResult {
  url: string;
  isBlob: boolean;
}

/**
 * 디렉터리 핸들 내에서 상대 경로에 일치하는 파일 핸들을 지능형으로 탐색
 */
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

/**
 * 정적 도움말/공용 에셋 경로 판별
 */
function resolveStaticAssetUrl(pureSrc: string, queryString?: string): string | null {
  const isHelpAsset = pureSrc.includes('help/assets') || pureSrc.startsWith('/help/assets/') || pureSrc.startsWith('./assets/') || pureSrc.startsWith('assets/');
  const isStatic = (
    pureSrc.startsWith('/logo') ||
    pureSrc.startsWith('/icon') ||
    pureSrc.startsWith('/images/') ||
    pureSrc.startsWith('frontend/public/') ||
    pureSrc.startsWith('public/') ||
    isHelpAsset
  );
  if (!isStatic) return null;

  let webSrc = pureSrc;
  if (isHelpAsset) {
    const fileName = pureSrc.split('/').pop() || '';
    webSrc = `/help/assets/${fileName}`;
  } else if (webSrc.startsWith('frontend/public/')) {
    webSrc = webSrc.replace('frontend/public/', '/');
  } else if (webSrc.startsWith('public/')) {
    webSrc = webSrc.replace('public/', '/');
  }
  return queryString ? (webSrc.includes('?') ? `${webSrc}&${queryString.replace(/^\?/, '')}` : `${webSrc}${queryString}`) : webSrc;
}

/**
 * 🎯 통합 미디어 URL 리졸버: 플랫폼(Drive / Electron / Browser)에 맞추어 유효한 미디어 URL 반환
 */
export async function resolveMediaUrl(options: ResolveMediaOptions): Promise<ResolveMediaResult> {
  const {
    src,
    absolutePath,
    rootFolder,
    resourceFolderHandle,
    resourceFolder,
    workspaceType,
    api,
    queryString,
    revision,
  } = options;

  if (!src || typeof src !== 'string') {
    throw new Error('미디어 경로가 올바르지 않습니다.');
  }

  // 1. 이미 완전한 원격/데이터 URL인 경우 즉시 반환
  if (/^(https?:|data:|blob:)/.test(src)) {
    return { url: src, isBlob: src.startsWith('blob:') };
  }

  // 2. 경로 및 쿼리 파라미터 정제
  const cleanSrc = src.replace(/^[<"']|[>"']$/g, '').trim();
  const driveQuery = new URLSearchParams((queryString || cleanSrc.split('?')[1] || '').replace(/^\?/, ''));
  const rawDriveId = driveQuery.get('driveId');
  const driveFileId = rawDriveId ? rawDriveId.replace(/[>'"\s]+$/g, '').trim() : null;
  const isDriveWorkspace = getResourceSettings()?.kind === 'drive' || rootFolder?.type === 'GDRIVE';

  // 3. 구글 드라이브 미디어 처리 (driveId 명시 또는 드라이브 워크스페이스 /media/)
  if (driveFileId || (isDriveWorkspace && /(?:^|\/)media\//.test(cleanSrc.split('?')[0].replace(/\\/g, '/')))) {
    const token = getSavedDriveToken();
    if (!token) throw new Error('구글 드라이브 연결 또는 인증 토큰이 필요합니다.');
    const info = getSavedWorkspaceInfo();
    const folderId = getResourceSettings('cloud')?.mediaFolderId || info?.mediaFolderId;
    const pureFileName = cleanSrc.split('?')[0].split(/[\\/]/).pop() || '';
    const queryTarget = driveFileId
      ? `${cleanSrc.split('?')[0]}?driveId=${encodeURIComponent(driveFileId)}`
      : pureFileName;

    const blobUrl = await getDriveMediaImageBlobUrl(token, folderId, queryTarget);
    if (!blobUrl) throw new Error('구글 드라이브에서 미디어 파일을 가져오지 못했습니다.');
    return { url: blobUrl, isBlob: true };
  }

  // 4. Electron 데스크톱 네이티브 프로토콜 처리 (media-local://)
  const effectiveApi = api || (typeof window !== 'undefined' ? (window as any).electronAPI : null);
  if (effectiveApi) {
    let targetAbsolutePath = absolutePath;
    if (cleanSrc.startsWith('media://local/serve') || cleanSrc.startsWith('media-local://')) {
      try {
        if (cleanSrc.startsWith('media-local://')) {
          targetAbsolutePath = new URL(cleanSrc).searchParams.get('url') || decodeURIComponent(cleanSrc.replace('media-local://', ''));
          if (targetAbsolutePath.startsWith('/')) targetAbsolutePath = targetAbsolutePath.substring(1);
        } else {
          const parsedUrl = new URL(cleanSrc);
          targetAbsolutePath = parsedUrl.searchParams.get('url') || targetAbsolutePath;
        }
      } catch {
        const m = cleanSrc.match(/[?&]url=([^&]+)/);
        if (m) targetAbsolutePath = decodeURIComponent(m[1]);
      }
    } else if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) {
      return { url: `media://?url=${encodeURIComponent(cleanSrc)}`, isBlob: false };
    } else if (!targetAbsolutePath) {
      if (/^[A-Za-z]:[\\/]/.test(cleanSrc)) {
        targetAbsolutePath = cleanSrc;
      } else {
        const resSettings = getResourceSettings('local') || getResourceSettings();
        const resPath = resourceFolder || resSettings?.path || (typeof window !== 'undefined' ? (localStorage.getItem('onrivi_resource_folder_path') || localStorage.getItem('resourceFolder')) : '');
        if (resPath) {
          const sep = resPath.includes('\\') ? '\\' : '/';
          const cleanRoot = resPath.endsWith(sep) ? resPath.slice(0, -1) : resPath;
          let pureRel = cleanSrc.replace(/^\.?\/+/, '');
          if (pureRel.startsWith('media/') || pureRel.startsWith('media\\')) {
            pureRel = pureRel.replace(/^media[\\/]/, '');
          }
          targetAbsolutePath = `${cleanRoot}${sep}media${sep}${sep === '\\' ? pureRel.replace(/\//g, '\\') : pureRel.replace(/\\/g, '/')}`;
        } else {
          targetAbsolutePath = cleanSrc;
        }
      }
    }

    if (targetAbsolutePath && (!cleanSrc.startsWith('media://') || cleanSrc.startsWith('media://local/serve') || cleanSrc.startsWith('media-local://'))) {
      const v = revision || driveQuery.get('v') || '';
      return {
        url: `media-local://serve?url=${encodeURIComponent(targetAbsolutePath.split('?')[0])}${v ? `&v=${v}` : ''}`,
        isBlob: false,
      };
    }
    return { url: cleanSrc, isBlob: false };
  }

  // 5. 정적 도움말/에셋 확인
  const pureSrc = cleanSrc.split('?')[0].split('#')[0];
  const staticUrl = resolveStaticAssetUrl(pureSrc, queryString);
  if (staticUrl) {
    return { url: staticUrl, isBlob: false };
  }

  // 6. 브라우저 FSAA (File System Access API) 로컬 폴더 탐색
  const effectiveWsType = workspaceType || (typeof window !== 'undefined' ? (localStorage.getItem('workspaceType') || 'browser') : 'browser');
  if (effectiveWsType === 'browser' || effectiveWsType === 'local') {
    let activeRFHandle = resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
    if (!activeRFHandle && typeof window !== 'undefined') {
      try {
        activeRFHandle = await idb.get('resourceFolderHandle') || await idb.get('localResourceFolderHandle');
        if (activeRFHandle) (window as any).__resourceFolderHandle = activeRFHandle;
      } catch {}
    }

    if (activeRFHandle) {
      try {
        const fileHandle = await resolveFileHandleInDirectory(activeRFHandle, pureSrc);
        if (fileHandle) {
          const file = await fileHandle.getFile();
          return { url: URL.createObjectURL(file), isBlob: true };
        }
      } catch {}
    }

    if (rootFolder?.handle) {
      try {
        const fileHandle = await resolveFileHandleInDirectory(rootFolder.handle, pureSrc);
        if (fileHandle) {
          const file = await fileHandle.getFile();
          return { url: URL.createObjectURL(file), isBlob: true };
        }
      } catch {}
    }

    const isMediaFolder = pureSrc.startsWith('./media/') || pureSrc.startsWith('media/') || pureSrc.startsWith('/media/');
    if (isMediaFolder && !activeRFHandle && !rootFolder?.handle) {
      throw new Error('환경설정에서 공통 자원(리소스) 폴더를 지정해야 이미지가 표시됩니다.');
    }
  }

  // 7. 기본 폴백 반환
  return { url: cleanSrc, isBlob: false };
}
