/**
 * 📊 [OMD-LIB-resourceMediaPicker-0001] resourceMediaPicker.ts
 * 🎯 @KICK  : 미디어 파일(이미지/비디오) 탐색기 — 웹드라이브(Google Drive) 및 OS 공통 다이얼로그 연동
 * 🚨 @PATCH : **2026-10-24** — [웹드라이브 연결 시 자동 드라이브 파일 탐색 및 로컬 공통 다이얼로그 지능형 폴백]:
 *             1) 웹드라이브(Google Drive) 연결 상태(token, cloud 모드 등) 감지 시 자동으로 pickDriveResourceFile을 띄워 드라이브 이미지 선택 지원
 *             2) 로컬 데스크톱에서는 윈도우 공통 다이얼로그(api.selectMediaFile), 브라우저에서는 showOpenFilePicker 및 input 폴백 지원
 */
import { getResourceSettings } from './resourceSettings';
import { idb } from './indexedDbHelper';
import { browserPickerStartIn } from './browserPickerStartIn';
import { getSavedDriveToken, getSavedWorkspaceInfo, hasValidDriveToken } from './gdrive/googleDriveClient';
import { pickDriveResourceFile, pickLocalResourceFile } from './gdrive/ResourceFilePicker';

export const mediaFileTypes = {
  image:{description:'사진',accept:{'image/*':['.png','.jpg','.jpeg','.gif','.webp','.svg','.bmp','.avif']}},
  video:{description:'동영상',accept:{'video/*':['.mp4','.webm','.mov','.ogg','.m4v','.avi','.mkv']}},
};

/** Browse the connected workspace, starting at that environment's resource folder. */
export async function pickResourceMedia(kind:'image'|'video', workspaceType?:string, browserHandle?:any): Promise<File|null> {
  const isDriveConnected = workspaceType === 'cloud' || workspaceType === 'gdrive' || hasValidDriveToken();
  const environment = isDriveConnected ? 'cloud' : workspaceType === 'local' || workspaceType === 'browser' ? 'local' : undefined;
  const settings = getResourceSettings(environment);
  const extensions = Object.values(mediaFileTypes[kind].accept)[0];
  const accepted = (name:string) => extensions.some(extension=>name.toLowerCase().endsWith(extension));

  // 1. 웹드라이브(Google Drive)가 연결되어 있는 경우: 자동으로 구글 드라이브 선택기 실행
  if (isDriveConnected) {
    const token = getSavedDriveToken();
    const info = getSavedWorkspaceInfo();
    if (token) {
      const rootId = settings?.folderId || settings?.mediaFolderId || info?.resourceFolderId || info?.mediaFolderId || info?.workspaceFolderId || 'root';
      const item = await pickDriveResourceFile(token, rootId, {
        title: `Google Drive ${mediaFileTypes[kind].description} 선택`,
        accept: file => accepted(file.name)
      });
      if (!item) return null;
      if (kind === 'video' && Number(item.size || 0) > 100*1024*1024) throw new Error('동영상 크기는 100MB를 초과할 수 없습니다.');
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.id)}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('선택한 Drive 파일을 읽지 못했습니다.');
      return new File([await response.blob()], item.name, { type: item.mimeType });
    }
  }

  // 2. 데스크톱(Electron) 환경: 윈도우 공통 다이얼로그(selectMediaFile) 호출
  const api = (window as any).electronAPI;
  if (api?.selectMediaFile) {
    const result = await api.selectMediaFile({ kind, defaultPath: settings?.path });
    if (!result || result.canceled) return null;
    if (!accepted(result.name)) throw new Error('지원하는 미디어 파일을 선택해 주세요.');
    return new File([new Uint8Array(result.bytes)], result.name, { type: result.mimeType });
  }

  // 3. 일반 웹 브라우저 환경: File System Access API 또는 파일 선택 창
  let handle = browserHandle || (window as any).__resourceFolderHandle;
  if (!handle && settings?.path) handle = await idb.get('resourceFolderHandle');
  try {
    if ((window as any).showOpenFilePicker) {
      const startIn = handle ? await browserPickerStartIn(handle) : undefined;
      const [selected] = await (window as any).showOpenFilePicker({
        id: `onrivi-${kind}`,
        startIn,
        multiple: false,
        excludeAcceptAllOption: true,
        types: [mediaFileTypes[kind]]
      });
      return selected ? selected.getFile() : null;
    }
    if (handle) {
      return await pickLocalResourceFile(handle, accepted);
    }
    // 폴더 핸들이 없는 일반 웹 폴백: 숨김 input[type=file] 실행
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = Object.keys(mediaFileTypes[kind].accept).join(',');
      input.onchange = () => {
        const file = input.files?.[0];
        input.remove();
        resolve(file || null);
      };
      input.oncancel = () => {
        input.remove();
        resolve(null);
      };
      input.style.display = 'none';
      document.body.appendChild(input);
      input.click();
    });
  } catch (error: any) {
    if (error.name === 'AbortError') return null;
    throw error;
  }
}
