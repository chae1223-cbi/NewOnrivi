// 🚨 @PATCH : **2026-10-20** — [EPUB 워터마크 텍스트 ExtraBold(800) 두께 및 가독성 개선]: 전자책 워터마크 텍스트에 font-weight: 800, Pretendard 글꼴 및 letter-spacing: 0.04em 적용
// 🚨 @PATCH : **2026-10-19** — [EPUB 전자책 내보내기 워터마크(문자/이미지/위치/진하기/회전/너비/첫페이지제외) 레이어 주입 탑재]: generateEpub에 watermark 옵션 신설, 이미지 바이너리 OPF 자동 동봉 및 섹션별 고정 워터마크 레이어 사출
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 이전 페이지 이미지 우측 경계가 다음 페이지 좌측으로 누출되는 잔상 현상 완전 차단]: figure 및 .onrivi-image-wrapper에 overflow: hidden 및 box-sizing: border-box를 강제 주입하여 멀티컬럼/양면 보기 시 인접 페이지로 이미지 픽셀이 1px도 침범하지 않도록 완벽 격리
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 이미지 우측 쏠림 및 다음 컬럼 침범 버그 완전 해결]: 전자책 단말기 기본 스타일(figure margin-left 40px) 및 inline-flex 래퍼로 인해 이미지가 우측으로 밀리던 결함을 figure/wrapper margin:0 auto 및 display:block으로 전면 리셋하여 완벽 중앙 정렬
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 긴 Mermaid 다이어그램 리더기 페이지 높이 맞춤(max-height: 85vh) 및 잘림 방지]: .mermaid-svg-container, .mermaid-block-container 및 img에 break-inside: avoid 및 max-height: 85vh, object-fit: contain을 적용하여 세로로 긴 다이어그램이 전자책 단말기 화면에서 잘리지 않고 온전히 사출되도록 개선
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 코드블록 원본 서식(다크 테마/헤더 바/TEXT 라벨/복사 배지) 1:1 완벽 동기화]: .codeblock-header 및 언어 라벨을 온전히 보존하고 button을 표준 span 배지로 치환하며, 코드블록 테마 CSS(.codeblock-area, .codeblock-header, .codeblock-header-text, .copy-button-hook) 및 줄바꿈을 완벽 탑재
// 🚨 @PATCH : **2026-10-01** — [EPUB 기본 페이지 나누기 기준 폐지]: exportPageBreakLevel 기본값을 'none'으로 변경하여 제목별 인위적 챕터 분할 없이 자연스러운 흐름 유지
//             **2026-08-14** — EPUB 내보내기 시 제목1(h1), 제목2(h2) 태그를 만날 때마다 자동으로 페이지를 넘겨(단원 분할) 깔끔한 챕터 구분이 되도록 page-break-before: always 속성 추가 (단, 첫 번째 요소 제외). 또한, 긴 코드 블록, 인용문(blockquote), 표(table)가 통째로 다음 페이지로 넘어가 거대한 빈 공간을 만드는 현상을 방지하기 위해 래퍼 컨테이너들에 page-break-inside: auto 강제 주입.
//             **2026-06-25** — EPUB 내보내기 시 제목 배경색/글자색이 기본값(푸른색)으로만 고정되던 버그를 수정하고, 사용자가 CssStyleForm에서 커스텀한 h1~h6의 테두리(border), 둥근 모서리(border-radius), 그리고 본문 및 인용구 텍스트 정렬(text-align), 외부 여백(margin-top, bottom) 등 모든 커스텀 스타일이 완벽히 인젝션되도록 코드 생성 파이프라인 대폭 확장; clone.querySelector() 루틴을 유연하게 교체하여 모든 태그의 스타일 덮어쓰기 지원
//             **2026-06-19** — blobURL 처리 누락 해결, 이미지 다운로드 3회 재시도 및 blob 다운스트림 병합
//             **2026-06-03** — generateEpub 함수 구현, jszip 기반 epub3 생성 로직
// 🔗 @CALLS : JSZip, dom-to-image
// ====================================================================

import JSZip from 'jszip';
import { fetchExportImage } from './exportPreparation';
import { unwrapPrintTables } from './exportPagination';
import { msg } from './systemMessages';
import { DocumentPrintSettings, DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT } from './documentPrintSettings';

// [ONR-EXP-002] EPUB 규격 파일 어셈블링: 마크다운 렌더링된 XHTML 소스와 정적 스타일, OPF 메타데이터 파일을 JSZip을 통해 표준 e-book 구조로 빌드하고 내보내는 비동기 생성기입니다.
/** XML/EPUB에서 literal 텍스트를 XHTML에 안전하게 삽입하기 위한 XML 이스케이프 헬퍼 */
// ====================================================================
// 📊 [OMD-IO-epubGenerator-0001] epubGenerator.ts ➔ escapeXml
// 🎯 @KICK  : XML/EPUB용 literal 문자열 XHTML 안전 이스케이프
// 🛡️ @GUARD : &, <, >, ", ' 문자 변환
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * 파일 확장자 기반으로 올바른 이미지 MIME 타입을 결정해주는 헬퍼
 */
// ====================================================================
// 📊 [OMD-IO-epubGenerator-0002] epubGenerator.ts ➔ getMimeType
// 🎯 @KICK  : 파일 확장자 기반 MIME 타입 결정
// 🛡️ @GUARD : 소문자 변환, 미등록 확장자 fallback
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

/**
 * HTML content를 XHTML 규격에 맞추기 위해 self-closing 태그를 수정하고 
 * 엔티티를 이스케이프하거나 속성을 보정해주는 정교한 XHTML 변환 헬퍼입니다.
 * 추가적으로 외부/내부 하이퍼링크의 e-reader 규격 보정 및 보안 처리를 실시간으로 자동 가공합니다!
 */
// ====================================================================
// 📊 [OMD-IO-epubGenerator-0003] epubGenerator.ts ➔ sanitizeToXHTML
// 🎯 @KICK  : HTML 콘텐츠를 EPUB XHTML 규격으로 변환 — UI 요소 제거, 링크 보정, 앵커 삽입, 속성 정리
// 🛡️ @GUARD : window 부재, data- 속성 필터링, 스키마 없는 외부 링크 자동 교정
// 🚨 @PATCH : .md 내부 링크를 EPUB 앵커 해시로 재작성, 첫 헤더에 destination ID 강제 삽입
// 🔗 @CALLS : 없음
// ====================================================================
function sanitizeToXHTML(htmlString: string, currentDocTitle: string): string {
  if (typeof window === 'undefined') return htmlString;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // UI 제어 요소 중 button 태그를 XHTML 표준에 안전한 span 배지 태그로 치환 (외형 100% 보존)
  doc.querySelectorAll('button').forEach(btn => {
    const span = doc.createElement('span');
    Array.from(btn.attributes).forEach(attr => {
      if (attr.name !== 'type' && attr.name !== 'onclick') {
        span.setAttribute(attr.name, attr.value);
      }
    });
    span.innerHTML = btn.innerHTML;
    btn.parentNode?.replaceChild(span, btn);
  });

  // 코드블록 태그(pre, code, .onrivi-line) 가로 오버플로우 방지 및 자동 줄바꿈 강제
  doc.querySelectorAll('pre, code, .onrivi-line').forEach(el => {
    if (el instanceof HTMLElement) {
      el.classList.remove('w-max');
      el.style.whiteSpace = 'pre-wrap';
      el.style.wordBreak = 'break-all';
      el.style.overflowWrap = 'anywhere';
      el.style.maxWidth = '100%';
      el.style.boxSizing = 'border-box';
    }
  });

  doc.querySelectorAll('.codeblock-area, .codeblock-area div').forEach(div => {
    if (div instanceof HTMLElement) {
      div.classList.remove('w-max');
      div.style.maxWidth = '100%';
      div.style.boxSizing = 'border-box';
    }
  });

  // Mermaid 다이어그램 이미지 및 컨테이너 리더기 페이지 높이 자동 맞춤 및 잘림 방지
  doc.querySelectorAll('.mermaid-svg-container, .mermaid-block-container, .not-prose > div').forEach(box => {
    if (box instanceof HTMLElement) {
      box.style.pageBreakInside = 'avoid';
      box.style.breakInside = 'avoid';
      box.style.overflow = 'visible';
    }
  });
  doc.querySelectorAll('img[alt="Mermaid diagram"]').forEach(img => {
    if (img instanceof HTMLElement) {
      img.style.maxWidth = '100%';
      img.style.maxHeight = '85vh';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.objectFit = 'contain';
      img.style.pageBreakInside = 'avoid';
      img.style.breakInside = 'avoid';
    }
  });
  
  // 🖼️ 이미지 <figure> 및 .onrivi-image-wrapper 여백 초기화 및 중앙 정렬 (40px 우측 쏠림 및 컬럼 침범/잔상 방지)
  doc.querySelectorAll('figure, .onrivi-image-figure').forEach(fig => {
    if (fig instanceof HTMLElement) {
      fig.style.margin = '1.5em 0';
      fig.style.padding = '0';
      fig.style.textAlign = 'center';
      fig.style.width = '100%';
      fig.style.maxWidth = '100%';
      fig.style.boxSizing = 'border-box';
      fig.style.display = 'block';
      fig.style.overflow = 'hidden';
    }
  });
  doc.querySelectorAll('.onrivi-image-wrapper').forEach(wrap => {
    if (wrap instanceof HTMLElement) {
      wrap.style.display = 'block';
      wrap.style.margin = '0 auto';
      wrap.style.maxWidth = '100%';
      wrap.style.textAlign = 'center';
      wrap.style.boxSizing = 'border-box';
      wrap.style.overflow = 'hidden';
    }
  });
  doc.querySelectorAll('figcaption, .onrivi-image-figure figcaption').forEach(cap => {
    if (cap instanceof HTMLElement) {
      cap.style.textAlign = 'center';
      cap.style.display = 'block';
      cap.style.marginTop = '0.5em';
    }
  });

  // Preserve heading IDs and explicit local fragments; never invent destinations for another file.
  doc.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (/^(www\.)/i.test(href)) a.setAttribute('href', `https://${href}`);
    if (/^javascript:/i.test(href)) a.removeAttribute('href');
  });
  doc.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => { if (/^on/i.test(attr.name)) el.removeAttribute(attr.name); });
  });
  // Source line wrappers represent visible paragraph line boundaries.
  doc.querySelectorAll('p .onrivi-line').forEach(line => {
    if (line.previousElementSibling?.classList.contains('onrivi-line')) {
      line.before(doc.createElement('br'));
      if (line.firstChild?.nodeType === 3) line.firstChild.textContent = line.firstChild.textContent?.replace(/^\r?\n/, '') || '';
    }
  });
  doc.querySelectorAll('.onrivi-sentence-br').forEach(el => el.replaceWith(doc.createElement('br')));
  unwrapPrintTables(doc.body);
  // XML/XHTML에서 허용되지 않는 일부 속성이나 class 정돈
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && attr.name !== 'data-line') {
        el.removeAttribute(attr.name);
      }
    });
  });

  // XHTML 직렬화기 사용 (브라우저 내장 XMLSerializer 사용 시 100% 규격 보장 가능!)
  const serializer = new XMLSerializer();
  let xhtml = serializer.serializeToString(doc.body);
  
  xhtml = xhtml.replace(/^<body[^>]*>/, '').replace(/<\/body>$/, '');
  
  return xhtml;
}

interface EpubOptions {
  fixedLayout?: {width:number;height:number;css:string};
  title: string;
  creator?: string;
  language?: string;
  contentHtml: string;
  dynamicCssString?: string;
  fontFamily?: string;
  exportPageBreakLevel?: string;
  onProgress?: (percent: number) => void;
  watermark?: DocumentPrintSettings;
}

interface EmbeddedImage {
  id: string;
  href: string;
  mimeType: string;
}

// ====================================================================
// 📊 [OMD-IO-epubGenerator-0004] epubGenerator.ts ➔ generateEpub
// 🎯 @KICK  : EPUB 규격 파일 어셈블링 — XHTML/OPF/NCX/TOC/CSS 생성, 이미지 임베딩, 페이지 분할
// 🛡️ @GUARD : crypto.randomUUID 폴백, 이미지 fetch 5초 타임아웃, 빈 sections 방어 fallback
// 🚨 @PATCH : **2026-06-19** — EPUB 각주 렌더링 정상화 패치 및 수식(MathML/SVG) 지원을 위한 properties="math svg" 속성 추가; style.css 내부에 KaTeX 코어 CSS 및 미리보기 인라인 코드 스타일 병합; mimetype STORE 압축, 한글/공백 파일명을 영숫자로 정규화, EPUB2/3 하위호환
// 🔗 @CALLS : sanitizeToXHTML, escapeXml, getMimeType
// ====================================================================
export async function generateEpub({
  title,
  creator = 'Onrivi Author',
  language = 'ko',
  contentHtml,
  dynamicCssString,
  fontFamily,
  exportPageBreakLevel = 'none',
  onProgress
  ,fixedLayout,
  watermark
}: EpubOptions): Promise<Blob> {
  const zip = new JSZip();
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : 'onrivi-author-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    
  const modifiedTime = new Date().toISOString().split('.')[0] + 'Z';

  // 1. mimetype 파일 생성 (규격 상 반드시 첫 번째 파일이어야 하며, 압축되지 않아야(Stored) 합니다)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml 생성
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // 3. 🖼️ 본문 내 이미지 탐색, 다운로드 및 EPUB 동봉(Embedding) 파이프라인
  const embeddedImages: EmbeddedImage[] = [];
  // 3-1. 🖼️ 워터마크 이미지 바이너리 다운로드 및 EPUB 패키지 동봉
  let watermarkImgExt = 'png';
  if (watermark?.enabled && watermark.kind === 'image') {
    try {
      const srcUrl = watermark.image || DEFAULT_WATERMARK_IMAGE;
      if (srcUrl.startsWith('data:')) {
        const comma = srcUrl.indexOf(',');
        const meta = srcUrl.slice(0, comma);
        const base64Data = srcUrl.slice(comma + 1);
        const mimeMatch = meta.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) watermarkImgExt = 'jpg';
        else if (mimeType.includes('webp')) watermarkImgExt = 'webp';
        else watermarkImgExt = 'png';

        const binaryString = meta.includes(';base64') ? atob(base64Data) : new TextEncoder().encode(decodeURIComponent(base64Data));
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = typeof binaryString === 'string' ? binaryString.charCodeAt(i) : binaryString[i];
        }
        zip.file(`OEBPS/images/watermark.${watermarkImgExt}`, bytes.buffer, { compression: 'STORE' });
        embeddedImages.push({
          id: 'watermark_image',
          href: `images/watermark.${watermarkImgExt}`,
          mimeType
        });
      } else {
        const imageBlob = await fetchExportImage(srcUrl);
        const buffer = await imageBlob.arrayBuffer();
        let ext = srcUrl.substring(srcUrl.lastIndexOf('.') + 1).split('?')[0].split('#')[0].toLowerCase();
        if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) ext = 'png';
        watermarkImgExt = ext;
        const mimeType = imageBlob.type || getMimeType(`watermark.${ext}`);
        zip.file(`OEBPS/images/watermark.${ext}`, buffer, { compression: 'STORE' });
        embeddedImages.push({
          id: 'watermark_image',
          href: `images/watermark.${ext}`,
          mimeType
        });
      }
    } catch (err) {
      console.warn('[EPUB] 워터마크 이미지 임베딩 실패:', err);
    }
  }

  let processedHtml = contentHtml;

  if (typeof window !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, 'text/html');
    const images = doc.querySelectorAll('img');
    
    // 비동기 이미지 다운로드 일괄 처리
    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      const srcUrl = img.getAttribute('src');
      if (!srcUrl) throw new Error(`${idx + 1}번째 이미지 경로가 없습니다. EPUB 내보내기를 중단합니다.`);
      
      if (srcUrl) {
        try {
          // 💡 [Data URI 보완] Base64 인라인 이미지인 경우 fetch 없이 직접 디코딩하여 zip 동봉
          if (srcUrl.startsWith('data:')) {
            const comma = srcUrl.indexOf(',');
            const meta = srcUrl.slice(0, comma);
            const base64Data = srcUrl.slice(comma + 1);
            if (comma < 0 || !meta.startsWith('data:image/') || !base64Data) throw new Error('잘못된 이미지 데이터입니다.');
            
            if (base64Data) {
              const mimeMatch = meta.match(/data:([^;]+)/);
              const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
              
              let ext = 'png';
              if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
              else if (mimeType.includes('gif')) ext = 'gif';
              else if (mimeType.includes('svg')) ext = 'svg';
              else if (mimeType.includes('webp')) ext = 'webp';
              
              const filename = `image_${idx}.${ext}`;
              const epubImgPath = `OEBPS/images/${filename}`;
              
              const binaryString = meta.includes(';base64') ? atob(base64Data) : new TextEncoder().encode(decodeURIComponent(base64Data));
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = typeof binaryString === 'string' ? binaryString.charCodeAt(i) : binaryString[i];
              }
              const buffer = bytes.buffer;
              
              zip.file(epubImgPath, buffer, { compression: ext === 'svg' ? 'DEFLATE' : 'STORE' });
              embeddedImages.push({
                id: `img_${idx}`,
                href: `images/${filename}`,
                mimeType
              });
              img.setAttribute('src', `../images/${filename}`);
            }
            continue;
          }

          // 확장자 추출 (기본값 png)
          let ext = srcUrl.substring(srcUrl.lastIndexOf('.') + 1).split('?')[0].split('#')[0].toLowerCase();
          if (!['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
            ext = 'png';
          }
          
          // 🏆 마스터 아키텍트 가이드: 
          // 한글/공백 인코딩 깨짐 및 각 운영체제별 파일명 정규화(NFC/NFD) 버그를 원천 봉쇄하기 위해
          // 책 내부 보관용 파일명을 안전한 영숫자 규격 순차 ID(image_0.png)로 일치화하여 완벽하게 포장합니다!
          const filename = `image_${idx}.${ext}`;
          const epubImgPath = `OEBPS/images/${filename}`;
          
          // 브라우저 Fetch를 이용해 이미지 바이너리(ArrayBuffer) 획득 (5초 타임아웃)
          const imageBlob = await fetchExportImage(srcUrl);
          {
            const buffer = await imageBlob.arrayBuffer();
            
            // ZIP에 파일 직접 동봉
            zip.file(epubImgPath, buffer, { compression: ext === 'svg' ? 'DEFLATE' : 'STORE' });
            
            const mimeType = imageBlob.type || getMimeType(filename);
            embeddedImages.push({
              id: `img_${idx}`,
              href: `images/${filename}`,
              mimeType
            });
            
            // XHTML 본문 내부의 img src를 순차 영문 상대경로로 완벽 교체!
            img.setAttribute('src', `../images/${filename}`);
          }
        } catch (err) {
          throw new Error(`${idx + 1}번째 이미지를 EPUB에 포함하지 못했습니다. 이미지가 표시되는지 확인하고 다시 내보내 주세요.`);
        }
      }
    }
    // 💡 [XML 파편화 방지 래퍼 제거]
    // 만약 본문이 <div class="prose"> 처럼 단일 래퍼로 감싸져 있으면, 
    // 나중에 h1~h6 기준으로 문자열을 분리할 때 <div> </div> 쌍이 깨지게 됩니다.
    // 이를 방지하기 위해 단일 루트 컨테이너를 모두 벗겨내고 평탄화(Flatten) 시킵니다.
    let rootNode = doc.body;
    while (
      rootNode.children.length === 1 &&
      rootNode.firstElementChild?.tagName.toLowerCase() === 'div'
    ) {
      rootNode = rootNode.firstElementChild as HTMLElement;
    }
    
    // `.prose` 안에 여러 요소가 있더라도, 첫번째 자식이 .prose 라면 그것도 벗겨냅니다.
    // 보통 ReactMarkdown 렌더링 결과물이 <div class="prose">...</div> 안에 들어있기 때문입니다.
    if (rootNode.children.length > 0 && rootNode.firstElementChild?.classList.contains('prose') && rootNode.children.length === 1) {
      rootNode = rootNode.firstElementChild as HTMLElement;
    }

    processedHtml = rootNode.innerHTML;
  }

  // 4. XHTML 본문 데이터 변환 및 하이퍼링크 표준 조율
  let sanitizedBody = sanitizeToXHTML(processedHtml, title);

  // Split complete top-level nodes so nested markup cannot be cut into invalid XHTML fragments.
  const bodyDoc = new DOMParser().parseFromString(sanitizedBody, 'text/html');
  const sections: { id: string; html: string; title: string }[] = [];
  const levelNum = /^h[1-6]$/.test(exportPageBreakLevel) ? Number(exportPageBreakLevel.slice(1)) : 0;
  let buffer: Node[] = [];
  const serialize = (node: Node) => {
    if (node.nodeType === 1) {
      const element = node as Element;
      [element, ...Array.from(element.querySelectorAll('*'))].forEach(el => {
        if (el.namespaceURI === 'http://www.w3.org/1999/xhtml') el.removeAttribute('xmlns');
      });
    }
    return new XMLSerializer().serializeToString(node);
  };
  const flush = () => {
    if (!buffer.some(node => node.nodeType === 1 || node.textContent?.trim())) { buffer = []; return; }
    const firstHeading = buffer.find(node => node.nodeType === 1 && /^H[1-6]$/.test((node as Element).tagName));
    sections.push({ id: `section${sections.length + 1}`, html: buffer.map(serialize).join(''), title: firstHeading?.textContent?.trim() || title });
    buffer = [];
  };
  if (fixedLayout) {
    bodyDoc.querySelectorAll('.book-page').forEach(page=>sections.push({id:`section${sections.length+1}`,html:serialize(page),title:page.querySelector('h1,h2,h3')?.textContent?.trim() || `${title} ${sections.length+1}`}));
  }
  for (const node of fixedLayout ? [] : Array.from(bodyDoc.body.childNodes)) {
    const el = node as HTMLElement;
    const manual = el.classList?.contains('page-break');
    const heading = /^H[1-6]$/.test(el.tagName || '') && Number(el.tagName.slice(1)) <= levelNum;
    if (manual || heading) flush();
    if (!manual) buffer.push(node);
  }
  flush();
  if (!sections.length) sections.push({ id: 'section1', html: '<p></p>', title });

  const navigation: { href: string; title: string; level: number }[] = [];
  const destinations = new Map<string, string>();
  const sectionDocs = sections.map(sec => new DOMParser().parseFromString(sec.html, 'text/html'));
  const usedIds = new Set(sectionDocs.flatMap(doc => Array.from(doc.querySelectorAll('[id]')).map(el => el.id)));
  let headingNumber = 0;
  sectionDocs.forEach((doc, index) => {
    const sec = sections[index];
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading => {
      if (!heading.id) {
        let id: string;
        do { id = `epub-heading-${++headingNumber}`; } while (usedIds.has(id));
        heading.id = id; usedIds.add(id);
      }
      navigation.push({ href: `${sec.id}.xhtml#${encodeURIComponent(heading.id)}`, title: heading.textContent?.trim() || sec.title, level: Number(heading.tagName.slice(1)) });
    });
    doc.querySelectorAll('[id]').forEach(el => { if (!destinations.has(el.id)) destinations.set(el.id, sec.id); });
    if (!doc.querySelector('h1,h2,h3,h4,h5,h6')) navigation.push({ href: `${sec.id}.xhtml`, title: sec.title, level: 1 });
  });
  sectionDocs.forEach((doc, index) => {
    doc.querySelectorAll('a[href^="#"]').forEach(link => {
      let id = (link.getAttribute('href') || '').slice(1);
      try { id = decodeURIComponent(id); } catch {}
      const section = destinations.get(id);
      if (section) link.setAttribute('href', `${section}.xhtml#${encodeURIComponent(id)}`);
    });
    sections[index].html = Array.from(doc.body.childNodes).map(serialize).join('');
  });

  // 6. 각 분 분할된 챕터(XHTML) 파일 개별 생성 및 매니페스트/스파인 리스트 빌드
  const manifestSectionItems: string[] = [];
  const spineSectionItems: string[] = [];
  
  sections.forEach((sec, secIdx) => {
    const safeTitle = escapeXml(sec.title);
    let watermarkHtml = '';
    if (watermark?.enabled && !(watermark.excludeFirst && secIdx === 0)) {
      const x = watermark.position.endsWith('left') ? '5%' : watermark.position.endsWith('right') ? '95%' : '50%';
      const y = watermark.position.startsWith('top') ? '8%' : watermark.position.startsWith('bottom') ? '92%' : '50%';
      const tx = watermark.position.endsWith('left') ? '0' : watermark.position.endsWith('right') ? '-100%' : '-50%';
      const ty = watermark.position.startsWith('top') ? '0' : watermark.position.startsWith('bottom') ? '-100%' : '-50%';
      if (watermark.kind === 'image') {
        watermarkHtml = `\n    <div class="epub-watermark" aria-hidden="true" style="position: fixed; z-index: 1000; pointer-events: none; user-select: none; -webkit-user-select: none; left: ${x}; top: ${y}; opacity: ${watermark.opacity / 100}; transform: translate(${tx}, ${ty}) rotate(${watermark.rotation}deg); width: ${watermark.width}%; text-align: center;"><img src="../images/watermark.${watermarkImgExt}" alt="" style="width: 100%; height: auto; max-height: 70vh; object-fit: contain; pointer-events: none;" /></div>`;
      } else {
        watermarkHtml = `\n    <div class="epub-watermark" aria-hidden="true" style="position: fixed; z-index: 1000; pointer-events: none; user-select: none; -webkit-user-select: none; left: ${x}; top: ${y}; opacity: ${watermark.opacity / 100}; transform: translate(${tx}, ${ty}) rotate(${watermark.rotation}deg); width: ${watermark.width}%; text-align: center; color: #334155; font-family: 'Pretendard', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; font-weight: 800; letter-spacing: 0.04em; font-size: ${watermark.fontSize}px; line-height: 1.2; overflow-wrap: anywhere;">${escapeXml(watermark.text || DEFAULT_WATERMARK_TEXT)}</div>`;
      }
    }
    const sectionHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">
  <head>
    <meta charset="utf-8" />
    ${fixedLayout ? `<meta name="viewport" content="width=${fixedLayout.width}, height=${fixedLayout.height}"/>` : ''}
    <title>${safeTitle}</title>
    <link rel="stylesheet" type="text/css" href="../styles/style.css" />
  </head>
  <body>${watermarkHtml}
    <section class="custom-preview-container epub-body markdown-viewer-root prose" style="width: 100%; max-width: none; margin: 0 auto; padding: 0;">
      ${sec.html}
    </section>
  </body>
</html>`;
    zip.file(`OEBPS/text/${sec.id}.xhtml`, sectionHtml);
    
    manifestSectionItems.push(`<item id="${sec.id}" href="text/${sec.id}.xhtml" media-type="application/xhtml+xml"${/<math[\s>]/i.test(sec.html) || /<svg[\s>]/i.test(sec.html) ? ` properties="${[...(/<math[\s>]/i.test(sec.html) ? ['mathml'] : []), ...(/<svg[\s>]/i.test(sec.html) ? ['svg'] : [])].join(' ')}"` : ''}/>`);
    spineSectionItems.push(`<itemref idref="${sec.id}"/>`);
  });

  // 7. OEBPS/text/toc.xhtml (EPUB3 표준 네비게이션 목차 문서에 쪼개진 챕터 자동 매핑)
  const tocItems = navigation.map(entry => 
    `<li class="toc-level-${entry.level}"><a href="${escapeXml(entry.href)}">${escapeXml(entry.title)}</a></li>`
  ).join('\n        ');

  const tocHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">
  <head>
    <meta charset="utf-8" />
    <title>Table of Contents</title>
    <link rel="stylesheet" type="text/css" href="../styles/style.css" />
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1 class="toc-title">목차 (Table of Contents)</h1>
      <ol>
        ${tocItems}
      </ol>
    </nav>
  </body>
</html>`;
  zip.file('OEBPS/text/toc.xhtml', tocHtml);

  // 8. OEBPS/styles/style.css (EPUB 가독성 최적화 스타일 시트 + 사용자 CSS 프로필 반영)
  const bodyFontFamily = fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  
  // 🌟 구글 웹폰트 자동 연동 (미리보기/프로필의 한국어 폰트가 리더기 환경에서도 다운로드되어 동일하게 렌더링되도록 처리)
  let fontImports = '';
  if (bodyFontFamily) {
    const fontFamilyLower = bodyFontFamily.toLowerCase();
    if (fontFamilyLower.includes('nanum gothic coding') || fontFamilyLower.includes('nanumgothiccoding')) {
      fontImports += `@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic+Coding:wght@400;700&display=swap');\n`;
    } else if (fontFamilyLower.includes('nanum gothic') || fontFamilyLower.includes('nanumgothic')) {
      fontImports += `@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap');\n`;
    }
    if (fontFamilyLower.includes('nanum myeongjo') || fontFamilyLower.includes('nanummyeongjo')) {
      fontImports += `@import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap');\n`;
    }
    if (fontFamilyLower.includes('noto sans kr') || fontFamilyLower.includes('notosanskr')) {
      fontImports += `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');\n`;
    }
    if (fontFamilyLower.includes('noto serif kr') || fontFamilyLower.includes('notoserifkr')) {
      fontImports += `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap');\n`;
    }
  }

  let styleCss = `${fontImports}body {
  font-family: ${bodyFontFamily};
  line-height: 1.62;
  color: #333333;
  margin: 1.5em;
  padding: 0;
}
.epub-body {
  max-width: 100%;
}
h1 {
  font-size: 1.8em;
  font-weight: bold;
  color: #0058bc;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 0.3em;
  margin-top: 1.2em;
  margin-bottom: 0.6em;
}
h2 {
  font-size: 1.4em;
  font-weight: bold;
  color: #0058bc;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
}
h3 {
  font-size: 1.2em;
  font-weight: bold;
  color: #333333;
  margin-top: 1em;
  margin-bottom: 0.4em;
}
p {
  margin-top: 0;
  margin-bottom: 1em;
  text-align: justify;
}
blockquote {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid #0058bc;
  color: #555555;
  font-style: italic;
  background-color: #f9f9f9;
  padding-top: 0.5em;
  padding-bottom: 0.5em;
  page-break-inside: auto !important;
  break-inside: auto !important;
}
pre {
  background-color: #f6f8fa;
  border: 1px solid #eaeaea;
  border-radius: 6px;
  padding: 1em;
  overflow: visible; /* EPUB에서는 잘리지 않게 visible 처리 */
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
  page-break-inside: auto !important;
  break-inside: auto !important;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 0.9em;
  tab-size: 4;
  -moz-tab-size: 4;
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
}
.codeblock-area {
  background-color: #0f172a !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  overflow: hidden !important;
  margin: 1.2em 0 !important;
  page-break-inside: auto !important;
  break-inside: auto !important;
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
}
.codeblock-area div {
  page-break-inside: auto !important;
  break-inside: auto !important;
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
}
.codeblock-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background-color: #1e293b !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  padding: 6px 14px !important;
  min-height: 32px !important;
  box-sizing: border-box !important;
}
.codeblock-header-text {
  color: #94a3b8 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  font-family: inherit, monospace !important;
  display: inline-block !important;
}
.copy-button-hook, .copy-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 8px !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: #cbd5e1 !important;
  border-radius: 4px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  border: none !important;
  line-height: 1.4 !important;
}
.codeblock-area pre {
  background-color: transparent !important;
  border: none !important;
  border-radius: 0 0 8px 8px !important;
  padding: 14px 16px !important;
  margin: 0 !important;
  color: #f8fafc !important;
  font-family: "JetBrains Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace !important;
  font-size: 13.5px !important;
  line-height: 1.5 !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
}
.codeblock-area pre code {
  display: block !important;
  background-color: transparent !important;
  color: inherit !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
  padding: 0 !important;
  border: none !important;
  box-sizing: border-box !important;
  max-width: 100% !important;
}
.codeblock-area .onrivi-line,
.onrivi-line {
  display: block !important;
  color: inherit !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
}
code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Nanum Gothic Coding', 'D2Coding', '맑은 고딕', 'Malgun Gothic', monospace !important;
  background-color: rgba(27,31,35,0.05) !important;
  border-radius: 3px !important;
  font-size: 0.9em !important;
  padding: 1px 4.5px !important;
  display: inline-block !important;
  vertical-align: 0 !important;
  line-height: 1.35 !important;
  margin: 0 2px !important;
  tab-size: 4;
  -moz-tab-size: 4;
}
ul, ol {
  margin-top: 0;
  margin-bottom: 0.8em;
  padding-left: 1.5em;
}
li {
  margin-bottom: 0.2em;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 1.5em;
  margin-bottom: 1.5em;
  page-break-inside: auto !important;
  break-inside: auto !important;
}
th {
  text-align: center !important;
}
tr {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
.table-wrapper-area {
  page-break-inside: auto !important;
  break-inside: auto !important;
  overflow: visible !important;
}
th, td {
  border: 1px solid #eaeaea;
  padding: 0.6em 1em;
  text-align: left;
  vertical-align: middle;
  word-break: keep-all;
}
th {
  background-color: #f6f8fa;
  font-weight: bold;
}
.not-prose {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
.mermaid-svg-container,
.mermaid-block-container {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
  text-align: center !important;
  margin: 1.5em auto !important;
  overflow: visible !important;
}
.mermaid-svg-container img,
.mermaid-block-container img,
.not-prose img[alt="Mermaid diagram"] {
  max-width: 100% !important;
  max-height: 85vh !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
  display: block !important;
  margin: 0 auto !important;
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
figure,
.onrivi-image-figure {
  margin: 1.5em 0 !important;
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  text-align: center !important;
  display: block !important;
  clear: both !important;
  overflow: hidden !important;
}
.onrivi-image-wrapper {
  display: block !important;
  width: fit-content !important;
  max-width: 100% !important;
  margin: 0 auto !important;
  text-align: center !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}
figure img,
.onrivi-image-figure img,
.onrivi-image-wrapper img,
img {
  max-width: 100% !important;
  max-height: 85vh !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
  display: block !important;
  margin: 1.5em auto !important;
  border-radius: 6px !important;
  page-break-inside: avoid !important;
  break-inside: avoid !important;
  box-sizing: border-box !important;
}
figcaption,
.onrivi-image-figure figcaption {
  text-align: center !important;
  margin-top: 0.5em !important;
  font-size: 0.9em !important;
  color: #666666 !important;
  display: block !important;
}
a {
  color: #0058bc;
  text-decoration: underline;
}
a:hover {
  color: #003a80;
}
/* 인라인 강조: EPUB 리더기가 기본 스타일을 생략하는 경우 대비 명시적 선언 */
strong {
  font-weight: bold;
}
em {
  font-style: italic;
}
u {
  text-decoration: underline;
}
del {
  text-decoration: line-through;
}
.toc-title {
  font-size: 1.6em;
  border-bottom: 2px solid #0058bc;
  padding-bottom: 0.4em;
}
/* 🛡️ 각주 타이틀 및 영어 라벨 원천 차단 */
/* 🛡️ 각주 영역 구분선 */
.footnotes {
  border-top: 1px solid #e5e7eb !important;
  margin-top: 30px !important;
  padding-top: 10px !important;
}
.footnotes h2,
.footnotes #footnote-label,
.footnotes .sr-only {
  display: none !important;
}
/* 🛡️ 각주 리스트 정렬 보정: 번호와 내용이 한 줄에 조화롭게 나오도록 강제 */
.footnotes ol {
  list-style-type: decimal !important;
  padding-left: 1.5em !important;
  margin: 0 !important;
}
.footnotes li {
  margin-bottom: 0.5em !important;
  list-style-position: outside !important;
  display: list-item !important;
}
.footnotes li p {
  display: inline !important;
  margin: 0 !important;
}
.footnotes li::before {
  display: none !important;
  content: none !important;
}
.footnote-backref {
  text-decoration: none !important;
  margin-left: 4px !important;
}
/* EPUB 리더기 강제 페이징 속성 (추후 대체) */
  padding: 0 !important;
}`;

  // 사용자 CSS 프로필이 있으면 EPUB 스타일시트에 추가
  // (dynamicCssString의 .custom-preview-container 선택자를 EPUB용 body로 치환하여 전체 폰트 및 배경색 완벽 일치)
  if (dynamicCssString) {
    let epubCss = dynamicCssString
    ? dynamicCssString.replace(/\.custom-preview-container\s/g, 'body ').replace(/\.custom-preview-container/g, 'body')
    : '';

  // EPUB은 물리적 XHTML 파일 분할으로 챕터를 분리하므로 CSS page-break 불필요.
  // CSS page-break를 적용하면 동일 섹션 내부에서 헤딩이 또 나뉘어지는 부작용이 발생함.
  // (h1 다음 h2가 있는 쬫 섹션에서 h2에 page-break가 걸리면 h1만 따로 페이지가 됨)
  epubCss = epubCss.replace(/page-break-before\s*:\s*[^;]+;/gi, '').replace(/break-before\s*:\s*[^;]+;/gi, '');

  styleCss += `\n\n/* 사용자 지정 CSS 프로필 */\n${epubCss}`;
  }
  
  // 🌟 KaTeX 공식 CSS 코어 규칙 병합 탑재 (수식 정밀 렌더링용)
  styleCss += `\n\n/* KaTeX Core CSS */\n${KATEX_CSS}`;

  styleCss += `
/* Reflow overrides must follow the user's print-oriented profile. */
.epub-body .table-wrapper-area { display:block !important; overflow:visible !important; break-inside:auto !important; }
.epub-body table, .epub-body tbody { break-inside:auto !important; page-break-inside:auto !important; }
.epub-body tr { break-inside:avoid !important; }
.epub-body thead { display:table-header-group !important; }
.epub-body p .onrivi-line { display:inline !important; white-space:normal !important; margin:0 !important; }
.epub-body figure { overflow:visible !important; break-inside:avoid !important; }
.epub-body figure img { max-width:100% !important; max-height:70vh !important; height:auto !important; width:auto !important; margin:0 auto !important; }
#toc ol { list-style:none !important; padding-left:0 !important; }
#toc li { list-style:none !important; }
#toc .toc-level-1 { margin-left:0 !important; }
#toc .toc-level-2 { margin-left:1em !important; }
#toc .toc-level-3 { margin-left:2em !important; }
#toc .toc-level-4 { margin-left:3em !important; }
#toc .toc-level-5 { margin-left:4em !important; }
#toc .toc-level-6 { margin-left:5em !important; }
`;
  // Keep binary fonts out of the CSS: base64 inflates it and makes ZIP compression expensive.
  const packagedFonts = new Map<string, { path: string; mime: string }>();
  styleCss = styleCss.replace(/url\(["']?(data:[^;,)]+;base64,[A-Za-z0-9+/=]+)["']?\)/g, (original, data: string) => {
    let entry = packagedFonts.get(data);
    if (!entry) {
      const binary = atob(data.slice(data.indexOf(',') + 1));
      const signature = binary.slice(0, 4);
      const extension = signature === 'wOF2' ? 'woff2' : signature === 'wOFF' ? 'woff' : signature === 'OTTO' ? 'otf' : signature === '\u0000\u0001\u0000\u0000' ? 'ttf' : null;
      if (!extension) return original;
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      entry = { path: `fonts/font_${packagedFonts.size}.${extension}`, mime: `font/${extension}` };
      zip.file(`OEBPS/${entry.path}`, bytes, { compression: extension.startsWith('woff') ? 'STORE' : 'DEFLATE' });
      packagedFonts.set(data, entry);
    }
    return `url("../${entry.path}")`;
  });
  const fontManifestItems = Array.from(packagedFonts.values()).map((font, index) =>
    `<item id="font_${index}" href="${font.path}" media-type="${font.mime}"/>`).join('\n');
  if (fixedLayout) styleCss += '\n'+fixedLayout.css;
  styleCss += "\n/* 🌟 워터마크 레이어 규격 (반투명 및 클릭 방지) */\n.epub-watermark {\n  position: fixed !important;\n  pointer-events: none !important;\n  user-select: none !important;\n  -webkit-user-select: none !important;\n  z-index: 1000 !important;\n}\n";
  zip.file('OEBPS/styles/style.css', styleCss);

  // 8.5. OEBPS/toc.ncx (EPUB2 호환성 목차 파일 생성 - 교보문고, 예스24, 리디북스 등 국내외 이북 리더기 필수 하위 호환 규격)
  const ncxNavPoints = navigation.map((sec, idx) => `
    <navPoint id="num_${idx + 1}" playOrder="${idx + 1}">
      <navLabel>
        <text>${escapeXml(sec.title)}</text>
      </navLabel>
      <content src="text/${escapeXml(sec.href)}"/>
    </navPoint>`).join('');

  const tocNcx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <navMap>
    ${ncxNavPoints}
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx);

  // 9. OEBPS/content.opf (메타데이터 및 리소스 목록 매니페스트 동적 생성)
  const imageManifestItems = embeddedImages.map(img => 
    `<item id="${img.id}" href="${img.href}" media-type="${img.mimeType}"/>`
  ).join('\n    ');

  const sectionManifestItems = manifestSectionItems.join('\n    ');
  const sectionSpineItems = spineSectionItems.join('\n    ');

  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${language}</dc:language>
    <dc:creator id="creator">${escapeXml(creator)}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
    <meta property="dcterms:modified">${modifiedTime}</meta>
    ${fixedLayout ? '<meta property="rendition:layout">pre-paginated</meta><meta property="rendition:spread">none</meta><meta property="rendition:orientation">auto</meta>' : ''}
  </metadata>
  <manifest>
    <item id="toc" href="text/toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${sectionManifestItems}
    <item id="style" href="styles/style.css" media-type="text/css"/>
    ${imageManifestItems}
    ${fontManifestItems}
  </manifest>
  <spine toc="ncx">
    ${fixedLayout ? '' : '<itemref idref="toc"/>'}
    ${sectionSpineItems}
  </spine>
</package>`;
  zip.file('OEBPS/content.opf', contentOpf);

  // 10. ZIP 파일 생성 및 Blob 반환 (arraybuffer로 생성 후 Blob으로 수동 래핑하여 mimetype이 첫 바이트임을 보장)
  // mimetype은 압축하지 않고(STORE), 나머지 리소스는 표준대로 효율적으로 압축(DEFLATE) 처리합니다!
  let lastReported = -1;
  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 1 } }, metadata => {
    const percent = Math.floor(metadata.percent);
    if (percent !== lastReported) { lastReported = percent; onProgress?.(percent); }
  });
  return new Blob([arrayBuffer], { type: 'application/epub+zip' });
  return new Blob([arrayBuffer], { type: 'application/epub+zip' });
}

/**
 * 생성된 EPUB Blob을 다운로드 다이얼로그로 내보내는 유틸리티 함수
 */
// ====================================================================
// 📊 [OMD-IO-epubGenerator-0005] epubGenerator.ts ➔ downloadBlob
// 🎯 @KICK  : EPUB Blob을 브라우저 다운로드 다이얼로그로 내보내기
// 🛡️ @GUARD : Blob URL 생성/해제, DOM 정리
// 🚨 @PATCH : 100ms 지연 후 URL revoke로 메모리 누수 방지
// 🔗 @CALLS : 없음
// ====================================================================
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ====================================================================
// 📊 [OMD-IO-epubGenerator-0006] epubGenerator.ts ➔ KATEX_CSS (Constant)
// 🎯 @KICK  : KaTeX 렌더링 결과를 EPUB에서 정상 출력하기 위한 코어 CSS 상수
// ====================================================================
const KATEX_CSS = `@font-face{font-display:block;font-family:KaTeX_AMS;font-style:normal;font-weight:400;src:url(fonts/KaTeX_AMS-Regular.woff2) format("woff2"),url(fonts/KaTeX_AMS-Regular.woff) format("woff"),url(fonts/KaTeX_AMS-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Caligraphic;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Caligraphic-Bold.woff2) format("woff2"),url(fonts/KaTeX_Caligraphic-Bold.woff) format("woff"),url(fonts/KaTeX_Caligraphic-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Caligraphic;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Caligraphic-Regular.woff2) format("woff2"),url(fonts/KaTeX_Caligraphic-Regular.woff) format("woff"),url(fonts/KaTeX_Caligraphic-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Fraktur;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Fraktur-Bold.woff2) format("woff2"),url(fonts/KaTeX_Fraktur-Bold.woff) format("woff"),url(fonts/KaTeX_Fraktur-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Fraktur;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Fraktur-Regular.woff2) format("woff2"),url(fonts/KaTeX_Fraktur-Regular.woff) format("woff"),url(fonts/KaTeX_Fraktur-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:normal;font-weight:700;src:url(fonts/KaTeX_Main-Bold.woff2) format("woff2"),url(fonts/KaTeX_Main-Bold.woff) format("woff"),url(fonts/KaTeX_Main-Bold.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:italic;font-weight:700;src:url(fonts/KaTeX_Main-BoldItalic.woff2) format("woff2"),url(fonts/KaTeX_Main-BoldItalic.woff) format("woff"),url(fonts/KaTeX_Main-BoldItalic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:italic;font-weight:400;src:url(fonts/KaTeX_Main-Italic.woff2) format("woff2"),url(fonts/KaTeX_Main-Italic.woff) format("woff"),url(fonts/KaTeX_Main-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Main;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Main-Regular.woff2) format("woff2"),url(fonts/KaTeX_Main-Regular.woff) format("woff"),url(fonts/KaTeX_Main-Regular.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Math;font-style:italic;font-weight:700;src:url(fonts/KaTeX_Math-BoldItalic.woff2) format("woff2"),url(fonts/KaTeX_Math-BoldItalic.woff) format("woff"),url(fonts/KaTeX_Math-BoldItalic.ttf) format("truetype")}@font-face{font-display:block;font-family:KaTeX_Math;font-style:italic;font-weight:400;src:url(fonts/KaTeX_Math-Italic.woff2) format("woff2"),url(fonts/KaTeX_Math-Italic.woff) format("woff"),url(fonts/KaTeX_Math-Italic.ttf) format("truetype")}@font-face{font-display:block;font-family:\\"KaTeX_SansSerif\\";font-style:normal;font-weight:700;src:url(fonts/KaTeX_SansSerif-Bold.woff2) format(\\"woff2\\"),url(fonts/KaTeX_SansSerif-Bold.woff) format(\\"woff\\"),url(fonts/KaTeX_SansSerif-Bold.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:\\"KaTeX_SansSerif\\";font-style:italic;font-weight:400;src:url(fonts/KaTeX_SansSerif-Italic.woff2) format(\\"woff2\\"),url(fonts/KaTeX_SansSerif-Italic.woff) format(\\"woff\\"),url(fonts/KaTeX_SansSerif-Italic.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:\\"KaTeX_SansSerif\\";font-style:normal;font-weight:400;src:url(fonts/KaTeX_SansSerif-Regular.woff2) format(\\"woff2\\"),url(fonts/KaTeX_SansSerif-Regular.woff) format(\\"woff\\"),url(fonts/KaTeX_SansSerif-Regular.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:KaTeX_Script;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Script-Regular.woff2) format(\\"woff2\\"),url(fonts/KaTeX_Script-Regular.woff) format(\\"woff\\"),url(fonts/KaTeX_Script-Regular.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:KaTeX_Size1;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size1-Regular.woff2) format(\\"woff2\\"),url(fonts/KaTeX_Size1-Regular.woff) format(\\"woff\\"),url(fonts/KaTeX_Size1-Regular.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:KaTeX_Size2;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size2-Regular.woff2) format(\\"woff2\\"),url(fonts/KaTeX_Size2-Regular.woff) format(\\"woff\\"),url(fonts/KaTeX_Size2-Regular.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:KaTeX_Size3;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size3-Regular.woff2) format(\\"woff2\\"),url(fonts/KaTeX_Size3-Regular.woff) format(\\"woff\\"),url(fonts/KaTeX_Size3-Regular.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:KaTeX_Size4;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Size4-Regular.woff2) format(\\"woff2\\"),url(fonts/KaTeX_Size4-Regular.woff) format(\\"woff\\"),url(fonts/KaTeX_Size4-Regular.ttf) format(\\"truetype\\")}@font-face{font-display:block;font-family:KaTeX_Typewriter;font-style:normal;font-weight:400;src:url(fonts/KaTeX_Typewriter-Regular.woff2) format(\\"woff2\\"),url(fonts/KaTeX_Typewriter-Regular.woff) format(\\"woff\\"),url(fonts/KaTeX_Typewriter-Regular.ttf) format(\\"truetype\\")}.katex{font:normal 1.21em KaTeX_Main,Times New Roman,serif;line-height:1.2;position:relative;text-indent:0;text-rendering:auto}.katex *{-ms-high-contrast-adjust:none!important;border-color:currentColor}.katex .katex-version:after{content:\\"0.17.0\\"}.katex .katex-mathml{border:0;-webkit-clip-path:inset(50%);clip-path:inset(50%);height:1px;overflow:hidden;padding:0;position:absolute;width:1px}.katex .katex-html>.newline{display:block}.katex .base{position:relative;white-space:nowrap;width:-webkit-min-content;width:-moz-min-content;width:min-content}.katex .base,.katex .strut{display:inline-block}.katex .textbf{font-weight:700}.katex .textit{font-style:italic}.katex .textrm{font-family:KaTeX_Main}.katex .textsf{font-family:KaTeX_SansSerif}.katex .texttt{font-family:KaTeX_Typewriter}.katex .mathnormal{font-family:KaTeX_Math;font-style:italic}.katex .mathit{font-family:KaTeX_Main;font-style:italic}.katex .mathrm{font-style:normal}.katex .mathbf{font-family:KaTeX_Main;font-weight:700}.katex .boldsymbol{font-family:KaTeX_Math;font-style:italic;font-weight:700}.katex .amsrm,.katex .mathbb,.katex .textbb{font-family:KaTeX_AMS}.katex .mathcal{font-family:KaTeX_Caligraphic}.katex .mathfrak,.katex .textfrak{font-family:KaTeX_Fraktur}.katex .mathboldfrak,.katex .textboldfrak{font-family:KaTeX_Fraktur;font-weight:700}.katex .mathtt{font-family:KaTeX_Typewriter}.katex .mathscr,.katex .textscr{font-family:KaTeX_Script}.katex .mathsf,.katex .textsf{font-family:KaTeX_SansSerif}.katex .mathboldsf,.katex .textboldsf{font-family:KaTeX_SansSerif;font-weight:700}.katex .mathitsf,.katex .mathsfit,.katex .textitsf{font-family:KaTeX_SansSerif;font-style:italic}.katex .mainrm{font-family:KaTeX_Main;font-style:normal}.katex .vlist-t{border-collapse:collapse;display:inline-table;table-layout:fixed}.katex .vlist-r{display:table-row}.katex .vlist{display:table-cell;position:relative;vertical-align:bottom}.katex .vlist>span{display:block;height:0;position:relative}.katex .vlist>span>span{display:inline-block}.katex .vlist>span>.pstrut{overflow:hidden;width:0}.katex .vlist-t2{margin-right:-2px}.katex .vlist-s{display:table-cell;font-size:1px;min-width:2px;vertical-align:bottom;width:2px}.katex .vbox{align-items:baseline;display:inline-flex;flex-direction:column}.katex .hbox{width:100%}.katex .hbox,.katex .thinbox{display:inline-flex;flex-direction:row}.katex .thinbox{max-width:0;width:0}.katex .msupsub{text-align:left}.katex .mfrac>span>span{text-align:center}.katex .mfrac .frac-line{border-bottom-style:solid;display:inline-block;width:100%}.katex .hdashline,.katex .hline,.katex .mfrac .frac-line,.katex .overline .overline-line,.katex .rule,.katex .underline .underline-line{min-height:1px}.katex .mspace{display:inline-block}.katex .smash{display:inline;line-height:0}.katex .clap,.katex .llap,.katex .rlap{position:relative;width:0}.katex .clap>.inner,.katex .llap>.inner,.katex .rlap>.inner{position:absolute}.katex .clap>.fix,.katex .llap>.fix,.katex .rlap>.fix{display:inline-block}.katex .llap>.inner{right:0}.katex .clap>.inner,.katex .rlap>.inner{left:0}.katex .clap>.inner>span{margin-left:-50%;margin-right:50%}.katex .rule{border:0 solid;display:inline-block;position:relative}.katex .hline,.katex .overline .overline-line,.katex .underline .underline-line{border-bottom-style:solid;display:inline-block;width:100%}.katex .hdashline{border-bottom-style:dashed;display:inline-block;width:100%}.katex .sqrt>.root{margin-left:.2777777778em;margin-right:-.5555555556em}.katex .fontsize-ensurer.reset-size1.size1,.katex .sizing.reset-size1.size1{font-size:1em}.katex .fontsize-ensurer.reset-size1.size2,.katex .sizing.reset-size1.size2{font-size:1.2em}.katex .fontsize-ensurer.reset-size1.size3,.katex .sizing.reset-size1.size3{font-size:1.4em}.katex .fontsize-ensurer.reset-size1.size4,.katex .sizing.reset-size1.size4{font-size:1.6em}.katex .fontsize-ensurer.reset-size1.size5,.katex .sizing.reset-size1.size5{font-size:1.8em}.katex .fontsize-ensurer.reset-size1.size6,.katex .sizing.reset-size1.size6{font-size:2em}.katex .fontsize-ensurer.reset-size1.size7,.katex .sizing.reset-size1.size7{font-size:2.4em}.katex .fontsize-ensurer.reset-size1.size8,.katex .sizing.reset-size1.size8{font-size:2.88em}.katex .fontsize-ensurer.reset-size1.size9,.katex .sizing.reset-size1.size9{font-size:3.456em}.katex .fontsize-ensurer.reset-size1.size10,.katex .sizing.reset-size1.size10{font-size:4.148em}.katex .fontsize-ensurer.reset-size1.size11,.katex .sizing.reset-size1.size11{font-size:4.976em}.katex .fontsize-ensurer.reset-size2.size1,.katex .sizing.reset-size2.size1{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size2.size2,.katex .sizing.reset-size2.size2{font-size:1em}.katex .fontsize-ensurer.reset-size2.size3,.katex .sizing.reset-size2.size3{font-size:1.1666666667em}.katex .fontsize-ensurer.reset-size2.size4,.katex .sizing.reset-size2.size4{font-size:1.3333333333em}.katex .fontsize-ensurer.reset-size2.size5,.katex .sizing.reset-size2.size5{font-size:1.5em}.katex .fontsize-ensurer.reset-size2.size6,.katex .sizing.reset-size2.size6{font-size:1.6666666667em}.katex .fontsize-ensurer.reset-size2.size7,.katex .sizing.reset-size2.size7{font-size:2em}.katex .fontsize-ensurer.reset-size2.size8,.katex .sizing.reset-size2.size8{font-size:2.4em}.katex .fontsize-ensurer.reset-size2.size9,.katex .sizing.reset-size2.size9{font-size:2.88em}.katex .fontsize-ensurer.reset-size2.size10,.katex .sizing.reset-size2.size10{font-size:3.4566666667em}.katex .fontsize-ensurer.reset-size2.size11,.katex .sizing.reset-size2.size11{font-size:4.1466666667em}.katex .fontsize-ensurer.reset-size3.size1,.katex .sizing.reset-size3.size1{font-size:.7142857143em}.katex .fontsize-ensurer.reset-size3.size2,.katex .sizing.reset-size3.size2{font-size:.8571428571em}.katex .fontsize-ensurer.reset-size3.size3,.katex .sizing.reset-size3.size3{font-size:1em}.katex .fontsize-ensurer.reset-size3.size4,.katex .sizing.reset-size3.size4{font-size:1.1428571429em}.katex .fontsize-ensurer.reset-size3.size5,.katex .sizing.reset-size3.size5{font-size:1.2857142857em}.katex .fontsize-ensurer.reset-size3.size6,.katex .sizing.reset-size3.size6{font-size:1.4285714286em}.katex .fontsize-ensurer.reset-size3.size7,.katex .sizing.reset-size3.size7{font-size:1.7142857143em}.katex .fontsize-ensurer.reset-size3.size8,.katex .sizing.reset-size3.size8{font-size:2.0571428571em}.katex .fontsize-ensurer.reset-size3.size9,.katex .sizing.reset-size3.size9{font-size:2.4685714286em}.katex .fontsize-ensurer.reset-size3.size10,.katex .sizing.reset-size3.size10{font-size:2.9628571429em}.katex .fontsize-ensurer.reset-size3.size11,.katex .sizing.reset-size3.size11{font-size:3.5542857143em}.katex .fontsize-ensurer.reset-size4.size1,.katex .sizing.reset-size4.size1{font-size:.625em}.katex .fontsize-ensurer.reset-size4.size2,.katex .sizing.reset-size4.size2{font-size:.75em}.katex .fontsize-ensurer.reset-size4.size3,.katex .sizing.reset-size4.size3{font-size:.875em}.katex .fontsize-ensurer.reset-size4.size4,.katex .sizing.reset-size4.size4{font-size:1em}.katex .fontsize-ensurer.reset-size4.size5,.katex .sizing.reset-size4.size5{font-size:1.125em}.katex .fontsize-ensurer.reset-size4.size6,.katex .sizing.reset-size4.size6{font-size:1.25em}.katex .fontsize-ensurer.reset-size4.size7,.katex .sizing.reset-size4.size7{font-size:1.5em}.katex .fontsize-ensurer.reset-size4.size8,.katex .sizing.reset-size4.size8{font-size:1.8em}.katex .fontsize-ensurer.reset-size4.size9,.katex .sizing.reset-size4.size9{font-size:2.16em}.katex .fontsize-ensurer.reset-size4.size10,.katex .sizing.reset-size4.size10{font-size:2.5925em}.katex .fontsize-ensurer.reset-size4.size11,.katex .sizing.reset-size4.size11{font-size:3.11em}.katex .fontsize-ensurer.reset-size5.size1,.katex .sizing.reset-size5.size1{font-size:.5555555556em}.katex .fontsize-ensurer.reset-size5.size2,.katex .sizing.reset-size5.size2{font-size:.6666666667em}.katex .fontsize-ensurer.reset-size5.size3,.katex .sizing.reset-size5.size3{font-size:.7777777778em}.katex .fontsize-ensurer.reset-size5.size4,.katex .sizing.reset-size5.size4{font-size:.8888888889em}.katex .fontsize-ensurer.reset-size5.size5,.katex .sizing.reset-size5.size5{font-size:1em}.katex .fontsize-ensurer.reset-size5.size6,.katex .sizing.reset-size5.size6{font-size:1.1111111111em}.katex .fontsize-ensurer.reset-size5.size7,.katex .sizing.reset-size5.size7{font-size:1.3333333333em}.katex .fontsize-ensurer.reset-size5.size8,.katex .sizing.reset-size5.size8{font-size:1.6em}.katex .fontsize-ensurer.reset-size5.size9,.katex .sizing.reset-size5.size9{font-size:1.92em}.katex .fontsize-ensurer.reset-size5.size10,.katex .sizing.reset-size5.size10{font-size:2.3044444444em}.katex .fontsize-ensurer.reset-size5.size11,.katex .sizing.reset-size5.size11{font-size:2.7644444444em}.katex .fontsize-ensurer.reset-size6.size1,.katex .sizing.reset-size6.size1{font-size:.5em}.katex .fontsize-ensurer.reset-size6.size2,.katex .sizing.reset-size6.size2{font-size:.6em}.katex .fontsize-ensurer.reset-size6.size3,.katex .sizing.reset-size6.size3{font-size:.7em}.katex .fontsize-ensurer.reset-size6.size4,.katex .sizing.reset-size6.size4{font-size:.8em}.katex .fontsize-ensurer.reset-size6.size5,.katex .sizing.reset-size6.size5{font-size:.9em}.katex .fontsize-ensurer.reset-size6.size6,.katex .sizing.reset-size6.size6{font-size:1em}.katex .fontsize-ensurer.reset-size6.size7,.katex .sizing.reset-size6.size7{font-size:1.2em}.katex .fontsize-ensurer.reset-size6.size8,.katex .sizing.reset-size6.size8{font-size:1.44em}.katex .fontsize-ensurer.reset-size6.size9,.katex .sizing.reset-size6.size9{font-size:1.728em}.katex .fontsize-ensurer.reset-size6.size10,.katex .sizing.reset-size6.size10{font-size:2.074em}.katex .fontsize-ensurer.reset-size6.size11,.katex .sizing.reset-size6.size11{font-size:2.488em}.katex .fontsize-ensurer.reset-size7.size1,.katex .sizing.reset-size7.size1{font-size:.4166666667em}.katex .fontsize-ensurer.reset-size7.size2,.katex .sizing.reset-size7.size2{font-size:.5em}.katex .fontsize-ensurer.reset-size7.size3,.katex .sizing.reset-size7.size3{font-size:.5833333333em}.katex .fontsize-ensurer.reset-size7.size4,.katex .sizing.reset-size7.size4{font-size:.6666666667em}.katex .fontsize-ensurer.reset-size7.size5,.katex .sizing.reset-size7.size5{font-size:.75em}.katex .fontsize-ensurer.reset-size7.size6,.katex .sizing.reset-size7.size6{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size7.size7,.katex .sizing.reset-size7.size7{font-size:1em}.katex .fontsize-ensurer.reset-size7.size8,.katex .sizing.reset-size7.size8{font-size:1.2em}.katex .fontsize-ensurer.reset-size7.size9,.katex .sizing.reset-size7.size9{font-size:1.44em}.katex .fontsize-ensurer.reset-size7.size10,.katex .sizing.reset-size7.size10{font-size:1.7283333333em}.katex .fontsize-ensurer.reset-size7.size11,.katex .sizing.reset-size7.size11{font-size:2.0733333333em}.katex .fontsize-ensurer.reset-size8.size1,.katex .sizing.reset-size8.size1{font-size:.3472222222em}.katex .fontsize-ensurer.reset-size8.size2,.katex .sizing.reset-size8.size2{font-size:.4166666667em}.katex .fontsize-ensurer.reset-size8.size3,.katex .sizing.reset-size8.size3{font-size:.4861111111em}.katex .fontsize-ensurer.reset-size8.size4,.katex .sizing.reset-size8.size4{font-size:.5555555556em}.katex .fontsize-ensurer.reset-size8.size5,.katex .sizing.reset-size8.size5{font-size:.625em}.katex .fontsize-ensurer.reset-size8.size6,.katex .sizing.reset-size8.size6{font-size:.6944444444em}.katex .fontsize-ensurer.reset-size8.size7,.katex .sizing.reset-size8.size7{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size8.size8,.katex .sizing.reset-size8.size8{font-size:1em}.katex .fontsize-ensurer.reset-size8.size9,.katex .sizing.reset-size8.size9{font-size:1.2em}.katex .fontsize-ensurer.reset-size8.size10,.katex .sizing.reset-size8.size10{font-size:1.4402777778em}.katex .fontsize-ensurer.reset-size8.size11,.katex .sizing.reset-size8.size11{font-size:1.7277777778em}.katex .fontsize-ensurer.reset-size9.size1,.katex .sizing.reset-size9.size1{font-size:.2893518519em}.katex .fontsize-ensurer.reset-size9.size2,.katex .sizing.reset-size9.size2{font-size:.3472222222em}.katex .fontsize-ensurer.reset-size9.size3,.katex .sizing.reset-size9.size3{font-size:.4050925926em}.katex .fontsize-ensurer.reset-size9.size4,.katex .sizing.reset-size9.size4{font-size:.462962963em}.katex .fontsize-ensurer.reset-size9.size5,.katex .sizing.reset-size9.size5{font-size:.5208333333em}.katex .fontsize-ensurer.reset-size9.size6,.katex .sizing.reset-size9.size6{font-size:.5787037037em}.katex .fontsize-ensurer.reset-size9.size7,.katex .sizing.reset-size9.size7{font-size:.6944444444em}.katex .fontsize-ensurer.reset-size9.size8,.katex .sizing.reset-size9.size8{font-size:.8333333333em}.katex .fontsize-ensurer.reset-size9.size9,.katex .sizing.reset-size9.size9{font-size:1em}.katex .fontsize-ensurer.reset-size9.size10,.katex .sizing.reset-size9.size10{font-size:1.2002314815em}.katex .fontsize-ensurer.reset-size9.size11,.katex .sizing.reset-size9.size11{font-size:1.4398148148em}.katex .fontsize-ensurer.reset-size10.size1,.katex .sizing.reset-size10.size1{font-size:.2410800386em}.katex .fontsize-ensurer.reset-size10.size2,.katex .sizing.reset-size10.size2{font-size:.2892960463em}.katex .fontsize-ensurer.reset-size10.size3,.katex .sizing.reset-size10.size3{font-size:.337512054em}.katex .fontsize-ensurer.reset-size10.size4,.katex .sizing.reset-size10.size4{font-size:.3857280617em}.katex .fontsize-ensurer.reset-size10.size5,.katex .sizing.reset-size10.size5{font-size:.4339440694em}.katex .fontsize-ensurer.reset-size10.size6,.katex .sizing.reset-size10.size6{font-size:.4821600771em}.katex .fontsize-ensurer.reset-size10.size7,.katex .sizing.reset-size10.size7{font-size:.5785920926em}.katex .fontsize-ensurer.reset-size10.size8,.katex .sizing.reset-size10.size8{font-size:.6943105111em}.katex .fontsize-ensurer.reset-size10.size9,.katex .sizing.reset-size10.size9{font-size:.8331726133em}.katex .fontsize-ensurer.reset-size10.size10,.katex .sizing.reset-size10.size10{font-size:1em}.katex .fontsize-ensurer.reset-size10.size11,.katex .sizing.reset-size10.size11{font-size:1.1996142719em}.katex .fontsize-ensurer.reset-size11.size1,.katex .sizing.reset-size11.size1{font-size:.2009646302em}.katex .fontsize-ensurer.reset-size11.size2,.katex .sizing.reset-size11.size2{font-size:.2411575563em}.katex .fontsize-ensurer.reset-size11.size3,.katex .sizing.reset-size11.size3{font-size:.2813504823em}.katex .fontsize-ensurer.reset-size11.size4,.katex .sizing.reset-size11.size4{font-size:.3215434084em}.katex .fontsize-ensurer.reset-size11.size5,.katex .sizing.reset-size11.size5{font-size:.3617363344em}.katex .fontsize-ensurer.reset-size11.size6,.katex .sizing.reset-size11.size6{font-size:.4019292605em}.katex .fontsize-ensurer.reset-size11.size7,.katex .sizing.reset-size11.size7{font-size:.4823151125em}.katex .fontsize-ensurer.reset-size11.size8,.katex .sizing.reset-size11.size8{font-size:.578778135em}.katex .fontsize-ensurer.reset-size11.size9,.katex .sizing.reset-size11.size9{font-size:.6945337621em}.katex .fontsize-ensurer.reset-size11.size10,.katex .sizing.reset-size11.size10{font-size:.8336012862em}.katex .fontsize-ensurer.reset-size11.size11,.katex .sizing.reset-size11.size11{font-size:1em}.katex .delimsizing.size1{font-family:KaTeX_Size1}.katex .delimsizing.size2{font-family:KaTeX_Size2}.katex .delimsizing.size3{font-family:KaTeX_Size3}.katex .delimsizing.size4{font-family:KaTeX_Size4}.katex .delimsizing.mult .delim-size1>span{font-family:KaTeX_Size1}.katex .delimsizing.mult .delim-size4>span{font-family:KaTeX_Size4}.katex .nulldelimiter{display:inline-block;width:.12em}.katex .delimcenter,.katex .op-symbol{position:relative}.katex .op-symbol.small-op{font-family:KaTeX_Size1}.katex .op-symbol.large-op{font-family:KaTeX_Size2}.katex .accent>.vlist-t,.katex .op-limits>.vlist-t{text-align:center}.katex .accent .accent-body{position:relative}.katex .accent .accent-body:not(.accent-full){width:0}.katex .overlay{display:block}.katex .mtable .vertical-separator{display:inline-block;min-width:1px}.katex .mtable .arraycolsep{display:inline-block}.katex .mtable .col-align-c>.vlist-t{text-align:center}.katex .mtable .col-align-l>.vlist-t{text-align:left}.katex .mtable .col-align-r>.vlist-t{text-align:right}.katex .svg-align{text-align:left}.katex svg{fill:currentColor;stroke:currentColor;display:block;height:inherit;position:absolute;width:100%}.katex svg path{stroke:none}.katex svg{fill-rule:nonzero;fill-opacity:1;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1}.katex img{border-style:none;max-height:none;max-width:none;min-height:0;min-width:0}.katex .stretchy{display:block;overflow:hidden;position:relative;width:100%}.katex .stretchy:after,.katex .stretchy:before{content:""}.katex .hide-tail{overflow:hidden;position:relative;width:100%}.katex .halfarrow-left{left:0;overflow:hidden;position:absolute;width:50.2%}.katex .halfarrow-right{overflow:hidden;position:absolute;right:0;width:50.2%}.katex .brace-left{left:0;overflow:hidden;position:absolute;width:25.1%}.katex .brace-center{left:25%;overflow:hidden;position:absolute;width:50%}.katex .brace-right{overflow:hidden;position:absolute;right:0;width:25.1%}.katex .x-arrow-pad{padding:0 .5em}.katex .cd-arrow-pad{padding:0 .55556em 0 .27778em}.katex .mover,.katex .munder,.katex .x-arrow{text-align:center}.katex .boxpad{padding:0 .3em}.katex .fbox,.katex .fcolorbox{border:.04em solid;box-sizing:border-box}.katex .cancel-pad{padding:0 .2em}.katex .cancel-lap{margin-left:-.2em;margin-right:-.2em}.katex .sout{border-bottom-style:solid;border-bottom-width:.08em}.katex .angl{border-right:.049em solid;border-top:.049em solid;box-sizing:border-box;margin-right:.03889em}.katex .anglpad{padding:0 .03889em}.katex .eqn-num:before{content:"(" counter(katexEqnNo) ")";counter-increment:katexEqnNo}.katex .mml-eqn-num:before{content:"(" counter(mmlEqnNo) ")";counter-increment:mmlEqnNo}.katex .mtr-glue{width:50%}.katex .cd-vert-arrow{display:inline-block;position:relative}.katex .cd-label-left{display:inline-block;position:absolute;right:calc(50% + .3em);text-align:left}.katex .cd-label-right{display:inline-block;left:calc(50% + .3em);position:absolute;text-align:right}.katex-display{display:block;margin:1em 0;text-align:center}.katex-display>.katex{display:block;text-align:center;white-space:nowrap}.katex-display>.katex>.katex-html{display:block;position:relative}.katex-display>.katex>.katex-html>.tag{position:absolute;right:0}.katex-display.leqno>.katex>.katex-html>.tag{left:0;right:auto}.katex-display.fleqn>.katex{padding-left:2em;text-align:left}body{counter-reset:katexEqnNo mmlEqnNo}`;
