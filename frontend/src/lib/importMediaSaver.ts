import { idb } from '@/lib/indexedDbHelper';
/**
 * ====================================================================
 * 📊 [OMD-LIB-ImportMediaSaver-0001] importMediaSaver.ts ➔ 가져오기 미디어 저장기
 * 🎯 @KICK  : 외부 문서(PDF, DOCX, HWP 등)에서 추출된 이미지 base64 데이터를 구글 드라이브 / Electron / 브라우저 FSAA에 안전하게 저장하고 마크다운 경로 반환
 * 🛡️ @GUARD : Rule 9(임의 폴백 금지) 및 Rule 3(역할 기반 분리: I/O 모듈 격리) 준수
 * 🚨 @PATCH : 2026-11-08 — [브라우저 FSAA 및 가상 파일시스템(VFS) 이미지 저장 안정성 강화]:
 *             1) browser 모드에서 resourceFolderHandle 미전달 시 window.__resourceFolderHandle 및 idb 탐색
 *             2) FSAA 미연결 가상 파일시스템(VFS) 환경에서는 무조건 예외를 발생시키지 않고 base64 data URL로 안전 임베딩하여 사용자 데이터 보존
 * 🚨 @PATCH : 2026-11-08 — [useDocumentImporter 다이어트 및 미디어 저장기 분리]:
 *             1) useDocumentImporter 내부에 60줄 이상 하드코딩되어 있던 imageSaveCallback 로직을 단독 모듈로 분리
 *             2) 구글 드라이브(uploadDriveImage), 브라우저 FSAA(resourceFolderHandle), Electron(api.saveImage) 저장 흐름을 명확하게 표준화
 * 🔗 @CALLS : uploadDriveImage, requireResourceSettings, logError
 * ====================================================================
 */
// @ts-nocheck
import { requireResourceSettings } from '@/lib/resourceSettings';
import { logError } from '@/lib/errorDiagnostics';
import { uploadDriveImage } from '@/lib/gdrive/googleDriveClient';

export interface SaveImportedMediaOptions {
  base64Data: string;
  contentType: string;
  rootFolder?: any;
  resourceFolderHandle?: any;
  workspaceType?: string;
  driveToken?: string | null;
  driveMediaFolderId?: string | null;
}

/**
 * 🎯 추출된 이미지 데이터를 현재 워크스페이스(Drive/Browser/Electron)에 저장하고 마크다운 src 반환
 */
export async function saveImportedMedia(options: SaveImportedMediaOptions): Promise<string> {
  const {
    base64Data,
    contentType,
    rootFolder,
    resourceFolderHandle,
    workspaceType,
    driveToken,
    driveMediaFolderId,
  } = options;

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'png';
  const imgName = `img_${timestamp}_${randomSuffix}.${ext}`;

  // 1. 구글 드라이브 워크스페이스 저장
  if (rootFolder?.type === 'GDRIVE') {
    if (driveToken && driveMediaFolderId) {
      try {
        const res = await fetch(`data:${contentType};base64,${base64Data}`);
        const blob = await res.blob();
        const uploaded = await uploadDriveImage(driveToken, driveMediaFolderId, blob, imgName);
        if (uploaded?.id) {
          return `/media/${encodeURIComponent(uploaded.name)}?driveId=${encodeURIComponent(uploaded.id)}`;
        }
      } catch (gErr) {
        logError({
          file: 'frontend/src/lib/importMediaSaver.ts',
          func: 'saveImportedMedia',
          doing: '가져온 문서 이미지를 구글 드라이브 미디어 폴더에 업로드하는 작업',
          target: imgName,
          error: gErr,
        });
        throw new Error('가져온 이미지를 구글 드라이브에 저장하지 못했습니다. 드라이브 연결 상태를 확인해 주세요.');
      }
    }
    throw new Error('이미지 저장을 위한 구글 드라이브 연결 또는 미디어 폴더를 찾지 못했습니다.');
  }

  // 2. 브라우저 FSAA (File System Access API) 저장
  if (workspaceType === 'browser') {
    let activeHandle = resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
    if (!activeHandle && typeof window !== 'undefined') {
      try {
        activeHandle = await idb.get('resourceFolderHandle') || await idb.get('localResourceFolderHandle');
        if (activeHandle) (window as any).__resourceFolderHandle = activeHandle;
      } catch {}
    }
    if (!activeHandle && rootFolder?.handle) {
      activeHandle = rootFolder.handle;
    }

    if (activeHandle && typeof activeHandle.getDirectoryHandle === 'function') {
      try {
        const mediaDir = await activeHandle.getDirectoryHandle('media', { create: true });
        const fileHandle = await mediaDir.getFileHandle(imgName, { create: true });
        const writable = await fileHandle.createWritable();
        const res = await fetch(`data:${contentType};base64,${base64Data}`);
        const blob = await res.blob();
        await writable.write(blob);
        await writable.close();
        return `/media/${imgName}`;
      } catch (fsaaErr) {
        console.warn('[importMediaSaver] FSAA 저장 실패, 데이터 URL 폴백:', fsaaErr);
      }
    }
    // 가상 파일시스템(VFS) 또는 FSAA 권한 미보유 시 본문 보존을 위해 data URL 반환
    return `data:${contentType};base64,${base64Data}`;
  }

  // 3. Electron 데스크톱 네이티브 파일 저장
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  if (api && api.saveImage) {
    const folder = requireResourceSettings().path;
    const sep = folder.includes('\\') ? '\\' : '/';
    const targetFolder = folder + sep + 'media';
    const saveResult = await api.saveImage(targetFolder, base64Data, imgName);
    if (saveResult && saveResult.success) {
      if (saveResult.mediaPath) return saveResult.mediaPath;
      if (saveResult.absolutePath) return `media://local/serve?url=${encodeURIComponent(saveResult.absolutePath)}`;
    }
  }

  throw new Error('가져온 이미지 파일을 저장하지 못했습니다. 공통 자원 폴더를 확인해 주세요.');
}
