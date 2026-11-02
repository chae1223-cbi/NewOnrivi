// ====================================================================
// 📊 [OMD-LIB-imageResourceName-0001] src/lib/imageResourceName.ts
// 🎯 @KICK  : 이미지 리소스 고유 파일명 생성(해시 기반 중복 회피 및 파일명 보존)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 범용 웹/OS 이미지명 해시 자동 치환 무결성 보장
// 🚨 @PATCH : **2026-10-18** — [웹/브라우저 범용 이미지 드래그 앤 드롭 시 동일 파일명 덮어쓰기 결함 완전 해결]:
//             1) 브라우저 및 OS 기본 이미지명(images.jpg, download, screenshot, 화면 캡처 등)을 generic 패턴으로 감지하여 SHA-256 해시 기반 고유 파일명(img_${hash}.${ext}) 자동 생성
//             2) 서로 다른 이미지를 연속 드롭할 때 이전 이미지가 덮어써져 동일 이미지가 복제 노출되는 버그 원천 차단
// ====================================================================

/** Preserve chosen file names; clipboard placeholders identify no real file. */
export async function imageResourceName(image: Blob, clipboard = false): Promise<string> {
  const name = image instanceof File ? image.name : '';
  const generic = /^(?:image|images|img|blob|clipboard(?:-image)?|download|downloads|untitled|screenshot|capture|제목[-_ ]?없음|스크린샷|화면[-_ ]?캡처|캡처|다운로드)(?:[-_ ]?\d+|\s*\(\d+\))?(?:\.[a-z0-9]+)?$/i.test(name);
  if (!clipboard && name && !generic && /\.[a-z0-9]+$/i.test(name)) return name;
  const extension = ({'image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg','image/avif':'avif','image/bmp':'bmp'} as Record<string,string>)[image.type] || 'png';
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', await image.arrayBuffer()));
  const hash = Array.from(bytes).map(byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,12);
  return `img_${hash}.${extension}`;
}

/** ImageModal supplies path/alt, while the raw scene editor inserts Markdown. */
export function picturebookImageReference(path: string, alt = '사진'): string {
  const text=(alt || '사진').replace(/\\/g,'\\\\').replace(/\[/g,'\\[').replace(/\]/g,'\\]').replace(/[\r\n]/g,' ');
  const target=path.replace(/</g,'%3C').replace(/>/g,'%3E').replace(/[\r\n]/g,'');
  return `![${text}](<${target}>)`;
}
