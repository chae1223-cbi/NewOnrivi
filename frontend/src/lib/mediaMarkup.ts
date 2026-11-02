// ====================================================================
// 📊 [OMD-LIB-mediaMarkup-0001] mediaMarkup.ts ➔ Media Markup & Clipboard Image Copy Engine
// 🎯 @KICK  : 미디어 태그 생성/파싱 및 클립보드 네이티브 비트맵 이미지 복사 지원
// 🛡️ @GUARD : Electron IPC (clipboard:writeImage) 및 웹 브라우저 ClipboardItem 2중화
// 🚨 @PATCH : **2026-10-14** — [클립보드 네이티브 이미지 복사 엔진(copyImageToClipboard) 탑재 및 copyMediaSource 지능형 연동]:
//             1) copyImageToClipboard를 신설하여 Electron 네이티브 IPC 및 브라우저 Canvas/ClipboardItem으로 OS 클립보드에 실제 비트맵 이미지 직접 기록
//             2) copyMediaSource에서 이미지 감지 시 텍스트 대신 이미지 비트맵을 우선 복사하여 외부 앱 및 에디터/ImageModal 붙여넣기 완벽 보장
// ====================================================================

export type MediaKind = 'video' | 'map';
const decode = (text: string) => text.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');

export function mediaDetails(source: string) {
  const tag = source.trim().match(/^<(video|iframe)\b([^>]*)>[\s\S]*<\/\1>\s*$/i);
  if (!tag) return null;
  const attrs: Record<string,string> = {};
  tag[2].replace(/([\w-]+)\s*=\s*(["'])(.*?)\2/g, (_all,key,_quote,value) => { attrs[key.toLowerCase()] = decode(value); return ''; });
  if (!attrs.src) return null;
  const style = attrs.style || '';
  const width = style.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i)?.[1]?.trim() || attrs.width || '';
  const height = style.match(/(?:^|;)\s*height\s*:\s*([^;]+)/i)?.[1]?.trim() || attrs.height || '';
  const kind: MediaKind = /https?:\/\/(?:maps\.google\.[^/]+|(?:www\.)?google\.[^/]+\/maps|(?:www\.)?openstreetmap\.org\/export)/i.test(attrs.src) ? 'map' : 'video';
  return { kind, element:tag[1].toLowerCase(), path:attrs.src, title:attrs.title || '', width, height, align:attrs['data-align'] || 'center' };
}

const escape = (text: string) => text.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function videoMarkup(path: string, width: string, height: string, align: string, title: string) {
  const id = path.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|watch\?v=))([\w-]{11})/)?.[1];
  const style = `width:${width}; height:${height}; border:0;`;
  return id
    ? `<iframe src="https://www.youtube.com/embed/${id}" title="${escape(title)}" style="${style}" allowfullscreen loading="lazy" data-align="${align}"></iframe>`
    : `<video src="${escape(path)}" title="${escape(title)}" controls style="${style}" data-align="${align}"></video>`;
}

async function fetchImageBlob(url: string): Promise<Blob | null> {
  if (url.startsWith('data:image/png;base64,')) {
    try {
      const b64 = url.split(',')[1];
      const byteChars = atob(b64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
    } catch {
      return null;
    }
  }

  return new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * 이미지 소스(경로, URL, DataURL, 마크다운 태그)를 OS 시스템 클립보드에 비트맵으로 직접 복사합니다.
 */
export async function copyImageToClipboard(source: string, renderedImage?: HTMLImageElement | null): Promise<boolean> {
  const cleanSource = renderedImage?.currentSrc || renderedImage?.src || source.trim();
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

  // 1) Electron 네이티브 IPC 호출
  if (api?.copyImageToClipboard) {
    try {
      const res = await api.copyImageToClipboard(cleanSource);
      if (res?.success) return true;
      if (res?.error) console.warn('[copyImageToClipboard] Electron IPC failure:', res.error);
    } catch (e) {
      console.warn('[copyImageToClipboard] Electron IPC error:', e);
    }
  }

  // 2) 웹 브라우저 ClipboardItem Fallback
  if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
    try {
      let targetUrl = cleanSource;
      const mdMatch = targetUrl.match(/^!\[.*?\]\((.*?)\)$/);
      if (mdMatch) targetUrl = mdMatch[1].trim();
      // Preserve Drive IDs and signed URL query parameters.
      targetUrl = targetUrl.replace(/^<|>$/g, '').trim();

      const blob = await fetchImageBlob(targetUrl);
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return true;
      }
    } catch (err) {
      console.warn('[copyImageToClipboard] Web ClipboardItem write failed:', err);
    }
  }

  // An image copy must never silently replace the clipboard with its address.
  return false;
}

export async function copyMediaSource(source: string) {
  const trimmed = source.trim();
  const isImage = /^!\[.*?\]\(.*?\)$/.test(trimmed) ||
    /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?[^\s]*)?$/i.test(trimmed) ||
    trimmed.startsWith('data:image/');

  if (isImage) {
    try {
      const ok = await copyImageToClipboard(trimmed);
      if (ok) return;
    } catch (_) {}
    throw new Error('이미지를 클립보드에 복사하지 못했습니다.');
  }

  const api = (window as any).electronAPI;
  if (api?.copyTextToClipboard) await api.copyTextToClipboard(trimmed);
  else await navigator.clipboard.writeText(trimmed);
}
