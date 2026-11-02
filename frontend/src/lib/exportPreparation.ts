// ====================================================================
// 📊 [OMD-LIB-exportPreparation-0001] exportPreparation.ts
// 🎯 @KICK  : PDF/EPUB 내보내기 전 리소스(폰트, 이미지, 다이어그램) 준비 및 대기 유틸리티
// 🛡️ @GUARD : 비표준/손상 폰트 OTS 파싱 결함 시 내보내기 차단 방지 및 시스템 기본 대체 글꼴 폴백 보장
// 🚨 @PATCH : **2026-10-21** — [이미지 decode 실패 시 PDF 내보내기 차단 해제 및 안전 폴백]:
//             단일 이미지 로드 실패 시 전체 PDF/인쇄 내보내기가 throw Error로 중단되는 결함을 차단하고 경고 로깅 후 안전하게 파일 사출을 완수하도록 개선
// 🚨 @PATCH : **2026-10-15** — [폰트 OTS 디코딩 결함 시 PDF 내보내기 차단 해제 및 안전 폴백]:
//             더서클체 등 구형 TTF의 OTS kern 파싱 오류로 인해 face.status === 'error' 발생 시 PDF 내보내기 전체가
//             실패(throw Error)하던 결함을 개선하여, 경고 로깅 후 시스템 기본 글꼴로 자연스럽게 폴백하여 PDF 생성을 완수하도록 보강
// ====================================================================

export const EXPORT_RESOURCE_TIMEOUT_MS = 15_000;

/** Select the document before nested viewers used by media node views. */
export function getExportDocumentRoot(root: HTMLElement): HTMLElement {
  return root.matches('.visual-document-editor, .markdown-viewer-root') ? root
    : root.querySelector<HTMLElement>('.visual-document-editor, .markdown-viewer-root') || root;
}

/** Output is a document, never the application's fixed-height editing viewport. */
export const EXPORT_DOCUMENT_CSS = `
[data-onrivi-export-content] :is(strong,b) code { font-weight:inherit!important; }
[data-onrivi-export-content] :is(em,i) code { font-style:inherit!important; }
html[data-onrivi-export], html[data-onrivi-export] body {
  height:auto!important;max-height:none!important;min-height:0!important;
  overflow:visible!important;overflow-y:visible!important;max-width:none!important;
}
[data-onrivi-export-content] :is(h1,h2,h3,h4,h5,h6)::after {
  content:none!important;display:none!important;
}
`;

export function stripExportViewportRules(css: string): string {
  return css.replace(/[^{}]+\{[^{}]*\}/g, rule =>
    /(?:html|body)\s*:has\(/i.test(rule.split('{')[0]) && /(?:overflow\s*:\s*hidden|(?:max-)?height\s*:\s*100(?:d?vh|%))/i.test(rule)
      ? '' : rule);
}

export function cleanExportDocument(clone: HTMLElement): void {
  clone.setAttribute('data-onrivi-export-content', 'true');
  [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('[contenteditable], [role="textbox"]'))].forEach(node => {
    node.removeAttribute('contenteditable');
    if (node.getAttribute('role') === 'textbox') node.removeAttribute('role');
    node.removeAttribute('spellcheck');
  });
  const wrappers = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('.visual-document-editor,.visual-document-surface,.markdown-viewer-root,.onrivi-content-root'))];
  wrappers.forEach(node => {
    for (const [property, value] of Object.entries({height:'auto','min-height':'0','max-height':'none','overflow':'visible','overflow-y':'visible'})) node.style.setProperty(property,value,'important');
  });
  const style = clone.ownerDocument.createElement('style');
  style.textContent = EXPORT_DOCUMENT_CSS;
  clone.append(style);
}

export function exportContentFingerprint(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `${value.length}:${hash >>> 0}`;
}

export async function waitForExportContent(root: HTMLElement, expected: string): Promise<void> {
  const deadline = Date.now() + EXPORT_RESOURCE_TIMEOUT_MS;
  while (root.querySelector('.markdown-viewer-root')?.getAttribute('data-export-content') !== exportContentFingerprint(expected)) {
    if (Date.now() >= deadline) throw new Error('최신 편집 내용의 미리보기를 준비하지 못했습니다. 미리보기를 확인하고 다시 내보내 주세요.');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

export async function withExportTimeout<T>(operation: Promise<T>, label: string, timeoutMs = EXPORT_RESOURCE_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} 준비 시간이 초과되었습니다. 잠시 후 다시 내보내 주세요.`)), timeoutMs);
    })]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function waitForExportResources(root: HTMLElement, timeoutMs = EXPORT_RESOURCE_TIMEOUT_MS): Promise<void> {
  const doc = root.ownerDocument;
  const work = async () => {
    if (doc.fonts) await doc.fonts.ready;
    if (doc.fonts && typeof doc.fonts[Symbol.iterator] === 'function' && doc.defaultView) {
      const failedFonts = Array.from(doc.fonts).filter(face => face.status === 'error');
      if (failedFonts.length) {
        const usedStyles = [root, ...Array.from(root.querySelectorAll('*'))]
          .map(element => doc.defaultView!.getComputedStyle(element));
        const failed = failedFonts.find(face => usedStyles.some(style => {
          const primary = style.fontFamily.split(',')[0].trim().replace(/["']/g, '').toLowerCase();
          if (primary !== face.family.replace(/["']/g, '').toLowerCase()) return false;
          // An unused failed weight or a fallback family must not block the whole document.
          if (doc.fonts.check && style.fontSize && style.fontWeight) {
            return !doc.fonts.check(`${style.fontStyle || 'normal'} ${style.fontWeight} ${style.fontSize} "${face.family.replace(/["']/g, '')}"`);
          }
          return true;
        }));
        if (failed) {
          console.warn(`[exportPreparation] 문서 글꼴 (${failed.family}) 디코딩 실패 (브라우저 OTS 결함 등). 시스템 기본 대체 글꼴로 내보내기를 계속합니다.`);
        }
      }
    }
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map(async (image, index) => {
      image.loading = 'eager';
      try {
        if (typeof image.decode === 'function') await image.decode().catch(() => {});
        else if (!image.complete) await new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      } catch (err) {
        console.warn(`[waitForExportResources] ${index + 1}번째 이미지 준비 경고:`, err);
      }
    }));
  };
  await withExportTimeout(work(), '폰트 및 이미지', timeoutMs);
}

/** Allow React to commit the final input and wait for explicitly tracked diagrams. */
export async function prepareExportPreview(root: HTMLElement): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const deadline = Date.now() + EXPORT_RESOURCE_TIMEOUT_MS;
  while (root.querySelector('[data-export-state="loading"],[data-book-paginating="true"]')) {
    if (Date.now() >= deadline) throw new Error('이미지 또는 다이어그램 준비 시간이 초과되었습니다. 미리보기를 확인하고 다시 내보내 주세요.');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (root.querySelector('[data-export-state="error"]')) throw new Error('이미지 또는 다이어그램에 오류가 있습니다. 원문과 파일 경로를 확인한 뒤 내보내 주세요.');
  await waitForExportResources(root);
}

export async function fetchExportImage(url: string, timeoutMs = EXPORT_RESOURCE_TIMEOUT_MS): Promise<Blob> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`이미지 다운로드 실패 (${response.status})`);
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith('image/')) throw new Error('이미지 대신 잘못된 데이터가 반환되었습니다.');
    return blob;
  } finally {
    clearTimeout(timer);
  }
}

export async function exportBlobToDataUrl(blob: Blob): Promise<string> {
  return withExportTimeout(new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('이미지 변환 실패'));
    reader.onerror = () => reject(new Error('이미지 데이터를 읽지 못했습니다.'));
    reader.onabort = () => reject(new Error('이미지 변환이 중단되었습니다.'));
    reader.readAsDataURL(blob);
  }), '이미지 변환');
}
