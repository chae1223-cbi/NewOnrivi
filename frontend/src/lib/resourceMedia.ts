// ====================================================================
// 📊 [OMD-LIB-resourceMedia-0001] src/lib/resourceMedia.ts
// 🎯 @KICK  : 리소스 미디어 저장, 드롭 데이터 파싱(Data URL/SVG/바이너리 디코딩) 및 임포트 관리
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Base64 인라인 배제 및 리소스 폴더 바이너리 저장 무결성
// 🚨 @PATCH : **2026-10-24** — [한글 파일명 퍼센트 인코딩 제거 및 깨끗한 한글 원문 경로 반환]:
//             1) 구글 드라이브 및 로컬 리소스 저장 시 파일명을 encodeURIComponent로 강제 인코딩하지 않고 사람이 읽을 수 있는 한글 원문 경로(/media/파일명.png)로 반환
// 🚨 @PATCH : **2026-10-18** — [이미지 저장 완료 이벤트(onrivi:media-updated) 실제 저장 파일명(result.fileName) 동기화]:
//             1) 데스크톱 api.saveImage 호출 후 반환된 실제 고유 파일명(result.fileName)을 announce 이벤트로 전달하여 기존 동일명 이미지의 비정상 캐시 리로드 간섭 방어
// 🚨 @PATCH : **2026-10-14** — [구글 이미지 검색/외부 웹 이미지 드래그 앤 드롭 정규화(DroppedMediaItem) 및 CORS 우회 다운로드(fetchExternalImageFile) 탑재]:
//             1) 구글 이미지 검색(encrypted-tbn0.gstatic.com, imgurl 파라미터 등) 및 외부 웹 이미지 드롭 시 URL과 파일명을 정밀 추출하여 DroppedMediaItem으로 정규화
//             2) Electron net.fetch(net:fetchImageBlob) 및 브라우저 fetch를 통합한 fetchExternalImageFile을 탑재하여 CORS 제약 없이 원본 바이너리를 로컬 media 폴더에 파일로 안전 저장
//             3) 다운로드 불가 환경에서도 webUrl을 마크다운 이미지 링크로 직접 삽입하는 2중 안전 폴백 제공으로 드롭 실패 및 새 창 내비게이션 원천 차단
// 🚨 @PATCH : **2026-10-14** — [드롭 데이터(DataTransfer) 이미지·SVG·Base64 파싱 엔진(parseDroppedDataToBlob) 구현]:
//             1) 웹 브라우저/외부 페이지에서 드래그된 SVG 아이콘, Base64 Data URL, URL-encoded SVG, HTML <img>, <svg> 태그를 표준 바이너리 File 객체로 완벽 변환
//             2) Base64 패딩 공백 및 URI 인코딩 정제, raw SVG 텍스트의 Blob 변환 지원으로 드롭 실패 및 브라우저 새창 팝업 원천 차단
// ====================================================================
import { requireResourceSettings } from './resourceSettings';
import { idb } from './indexedDbHelper';
import { getSavedDriveToken, uploadDriveImage } from './gdrive/googleDriveClient';

const mime: Record<string,string> = { png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',ogg:'video/ogg' };

/** Copy selected bytes to the configured resource destination, replacing by name. */
export async function saveResourceMedia(file: Blob, name: string, browserHandle?: any): Promise<string> {
  const settings = requireResourceSettings();
  const filename = name.normalize('NFC').split(/[\\/]/).pop() || `media_${Date.now()}`;
  if (filename === '.' || filename === '..' || /[\r\n\0]/.test(filename)) throw new Error('파일 이름이 올바르지 않습니다.');
  const revision = Date.now();
  const announce = (savedName = filename) => window.dispatchEvent(new CustomEvent('onrivi:media-updated',{detail:{name:savedName}}));
  if (settings.kind === 'drive') {
    if (!settings.mediaFolderId) throw new Error('환경설정의 드라이브 media 폴더를 확인해 주세요.');
    const uploaded = await uploadDriveImage(getSavedDriveToken() || undefined,settings.mediaFolderId,file,filename);
    announce(uploaded.name);
    const cleanUploadedName = uploaded.name.replace(/</g, "%3C").replace(/>/g, "%3E");
    return `/media/${cleanUploadedName}?driveId=${encodeURIComponent(uploaded.id)}&v=${revision}`;
  }
  const api = (window as any).electronAPI;
  if (api) {
    const data = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('파일 읽기 실패')); reader.readAsDataURL(file); });
    const result = await api.saveImage(settings.path.replace(/[\\/]$/,'') + '/media',data,filename);
    if (!result?.success) throw new Error(result?.error || '리소스 파일 저장 실패');
    announce(result.fileName || filename);
    return result.mediaPath || `media://local/serve?url=${encodeURIComponent(result.absolutePath)}&v=${revision}`;
  }
  let handle = browserHandle || (window as any).__resourceFolderHandle;
  if (!handle || handle.name !== settings.path) handle = await idb.get('resourceFolderHandle');
  if (!handle || handle.name !== settings.path) throw new Error('환경설정의 로컬 리소스 폴더를 다시 연결해 주세요.');
  const options = {mode:'readwrite'};
  if (await handle.queryPermission(options) !== 'granted' && await handle.requestPermission(options) !== 'granted') throw new Error('리소스 폴더 쓰기 권한이 필요합니다.');
  const media = await handle.getDirectoryHandle('media',{create:true});
  const destination = await media.getFileHandle(filename,{create:true});
  const writable = await destination.createWritable();
  try { await writable.write(file); await writable.close(); } catch (error) { await writable.abort?.(); throw error; }
  announce();
  const cleanFilename = filename.replace(/</g, "%3C").replace(/>/g, "%3E");
  return `/media/${cleanFilename}?v=${revision}`;
}

/** Import absolute local paths or private Drive URLs; normal web embeds stay links. */
export async function importResourceMedia(source: string, browserHandle?: any): Promise<string> {
  let path = source.trim();
  const drive = /^https?:\/\/(?:drive|docs)\.google\.com\//i.test(path);
  if (drive) {
    const url = new URL(path), id = url.pathname.match(/\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
    const token = getSavedDriveToken();
    if (!id || !token) throw new Error('Google Drive 연결과 파일 주소를 확인해 주세요.');
    const headers = {Authorization:`Bearer ${token}`};
    const metadata = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=name,mimeType`,{headers});
    if (!metadata.ok) throw new Error('드라이브 파일 정보를 읽지 못했습니다.');
    const info = await metadata.json();
    if (!/^(image|video)\//.test(info.mimeType || '')) throw new Error('사진 또는 동영상 파일을 선택해 주세요.');
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers});
    if (!response.ok) throw new Error('드라이브 파일을 읽지 못했습니다.');
    return saveResourceMedia(await response.blob(),info.name,browserHandle);
  }
  if (/^media(?:-local)?:\/\//.test(path)) path = new URL(path).searchParams.get('url') || path;
  if (path.startsWith('file:')) path = decodeURIComponent(new URL(path).pathname).replace(/^\/([A-Za-z]:)/,'$1');
  if (/^(?:[A-Za-z]:[\\/]|\\\\)/.test(path)) {
    const api = (window as any).electronAPI;
    if (!api?.readTransferFile) throw new Error('로컬 파일은 찾아보기로 선택해 주세요.');
    const name = path.split(/[\\/]/).pop()!;
    const bytes = await api.readTransferFile(path);
    return saveResourceMedia(new Blob([new Uint8Array(bytes)],{type:mime[name.split('.').pop()!.toLowerCase()] || 'application/octet-stream'}),name,browserHandle);
  }
  return source;
}
export interface DroppedMediaItem {
  file?: File;
  webUrl?: string;
  localPath?: string;
  name: string;
}

/**
 * [OMD-LIB-resourceMedia-parseDroppedDataToBlob]
 * 브라우저 드래그 앤 드롭 DataTransfer 객체로부터 이미지 파일, 웹 URL, Base64 Data URL, SVG 등을
 * 안전한 바이너리 File 객체 또는 웹 이미지 링크로 정규화 추출하는 엔진
 */
export function parseDroppedDataToBlob(dt: DataTransfer): DroppedMediaItem | null {
  if (!dt) return null;

  // 1) OS 파일 드롭 (탐색기, 파인더 등)
  const files = Array.from(dt.files || []).filter(file =>
    file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(file.name)
  );
  if (files.length > 0) {
    return { file: files[0], name: files[0].name };
  }

  // 2) DataTransfer items 파일 인터페이스
  if (dt.items) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f && (f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(f.name))) {
          return { file: f, name: f.name };
        }
      }
    }
  }

  // 3) 웹 브라우저/외부 페이지 드래그 텍스트 데이터 파싱 (HTML, URI-List, Plain Text)
  const html = dt.getData('text/html') || '';
  const uriList = dt.getData('text/uri-list') || '';
  const plainText = dt.getData('text/plain') || '';

  let candidate = '';
  const imgMatch = html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    candidate = imgMatch[1].trim();
  }

  // HTML 내부의 직접적인 <svg>...</svg> 태그 검출
  if (!candidate) {
    const svgMatch = html.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch && svgMatch[0]) {
      const svgText = svgMatch[0];
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const name = `img_${Date.now()}.svg`;
      return { file: new File([blob], name, { type: 'image/svg+xml' }), name };
    }
  }

  // <a> 태그 내부 이미지/SVG 링크 검출
  if (!candidate) {
    const aMatch = html.match(/<a[^>]+href=["']([^"']*(?:\.(?:png|jpe?g|gif|webp|svg|avif)|data:image\/)[^"']*)["']/i);
    if (aMatch && aMatch[1]) {
      candidate = aMatch[1].trim();
    }
  }

  if (!candidate && uriList) {
    const first = uriList.split(/[\r\n]+/).map(s => s.trim()).find(s => s && !s.startsWith('#'));
    if (first) candidate = first;
  }

  if (!candidate && plainText) {
    const trimmed = plainText.trim();
    if (trimmed.startsWith('<svg') && trimmed.endsWith('</svg>')) {
      const blob = new Blob([trimmed], { type: 'image/svg+xml' });
      const name = `img_${Date.now()}.svg`;
      return { file: new File([blob], name, { type: 'image/svg+xml' }), name };
    }
    if (/^(https?:|data:image\/|blob:|file:\/\/\/|[a-zA-Z]:[/\\])/i.test(trimmed)) {
      candidate = trimmed;
    }
  }

  if (!candidate) return null;

  // Other Markdown/desktop editors often provide only <img src="file:...">
  // rather than an OS File. Never let the browser insert that unreadable URL.
  if (/^(?:file:|[A-Za-z]:[\\/]|\\\\)/i.test(candidate)) {
    return { localPath: candidate, name: candidate.split(/[\\/]/).pop() || 'image' };
  }
  if (imgMatch && !/^(?:https?:|data:|blob:)/i.test(candidate)) {
    return { localPath: candidate, name: candidate.split(/[\\/]/).pop() || 'image' };
  }

  // 구글 검색(Google Images)의 imgurl 파라미터가 있을 경우 원본 이미지 URL 추출
  if (candidate.includes('imgurl=')) {
    try {
      const u = new URL(candidate);
      const p = u.searchParams.get('imgurl');
      if (p) candidate = p;
    } catch (_) {
      const m = candidate.match(/[?&]imgurl=([^&]+)/);
      if (m) candidate = decodeURIComponent(m[1]);
    }
  }

  // 4) Data URL 처리 (data:image/svg+xml;base64, data:image/png 등)
  if (candidate.startsWith('data:image/')) {
    try {
      const commaIdx = candidate.indexOf(',');
      if (commaIdx !== -1) {
        const header = candidate.slice(0, commaIdx);
        const dataPart = candidate.slice(commaIdx + 1);
        const mimeType = header.match(/data:(image\/[^;]+)/)?.[1] || 'image/png';
        const isBase64 = header.includes(';base64');
        const ext = ({
          'image/jpeg': 'jpg',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/svg+xml': 'svg',
          'image/png': 'png'
        } as Record<string, string>)[mimeType] || 'png';
        const name = `img_${Date.now()}.${ext}`;

        if (isBase64) {
          let cleanB64 = dataPart.replace(/\s+/g, '');
          if (cleanB64.includes('%')) {
            try { cleanB64 = decodeURIComponent(cleanB64); } catch (_) {}
          }
          while (cleanB64.length % 4 !== 0) {
            cleanB64 += '=';
          }
          try {
            const binaryStr = atob(cleanB64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
            return { file: new File([bytes], name, { type: mimeType }), name };
          } catch (e) {
            try {
              const decoded = decodeURIComponent(dataPart);
              const blob = new Blob([decoded], { type: mimeType });
              return { file: new File([blob], name, { type: mimeType }), name };
            } catch (_) {}
          }
        } else {
          const decoded = decodeURIComponent(dataPart);
          const blob = new Blob([decoded], { type: mimeType });
          return { file: new File([blob], name, { type: mimeType }), name };
        }
      }
    } catch (err) {
      console.error('[parseDroppedDataToBlob] Data URL parsing failed:', err);
    }
  }

  // 5) 외부 웹 HTTP/HTTPS 이미지 URL (Google 검색 썸네일, 웹 이미지 등)
  if(candidate.startsWith('blob:'))return {webUrl:candidate,name:`img_${Date.now()}.png`};
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    let clean = candidate.split('?')[0];
    let extMatch = clean.match(/\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i);
    let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    let urlName = clean.split('/').pop() || '';
    if (!urlName || !/\.[a-z0-9]+$/i.test(urlName)) {
      urlName = `img_${Date.now()}.${ext}`;
    } else {
      try { urlName = decodeURIComponent(urlName); } catch (_) {}
    }
    return { webUrl: candidate, name: urlName };
  }

  return null;
}

/**
 * 외부 웹 이미지 URL을 Electron net.fetch 또는 브라우저 fetch를 통해 바이너리 File 객체로 다운로드
 */
export async function fetchExternalImageFile(url: string, suggestedName?: string): Promise<File | null> {
  const cleanUrl = url.trim();
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

  // 1) Electron 네이티브 IPC (net.fetch — CORS 완전 우회)
  if (api?.fetchExternalImage) {
    try {
      const res = await api.fetchExternalImage(cleanUrl);
      if (res && res.bytes) {
        const mimeType = res.contentType?.split(';')[0]?.trim() || 'image/jpeg';
        const ext = ({
          'image/jpeg': 'jpg',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/svg+xml': 'svg',
          'image/png': 'png'
        } as Record<string, string>)[mimeType] || 'jpg';
        const finalName = suggestedName && /\.[a-z0-9]+$/i.test(suggestedName)
          ? suggestedName
          : `img_${Date.now()}.${ext}`;
        return new File([new Uint8Array(res.bytes)], finalName, { type: mimeType });
      }
    } catch (err) {
      console.warn('[fetchExternalImageFile] Electron IPC fetch failed:', err);
    }
  }

  // 2) 브라우저 표준 fetch
  try {
    const resp = await fetch(cleanUrl);
    if (resp.ok) {
      const blob = await resp.blob();
      if (blob.type && !/^image\//i.test(blob.type) && !/^application\/octet-stream/i.test(blob.type)) return null;
      const mimeType = blob.type || 'image/jpeg';
      const ext = ({
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'image/png': 'png'
      } as Record<string, string>)[mimeType] || 'jpg';
      const finalName = suggestedName && /\.[a-z0-9]+$/i.test(suggestedName)
        ? suggestedName
        : `img_${Date.now()}.${ext}`;
      return new File([blob], finalName, { type: mimeType });
    }
  } catch (_) {
    // CORS 제약 등으로 실패 시 null 반환 (상위에서 webUrl 마크다운 직접 삽입으로 안전 폴백)
  }

  return null;
}
