// ====================================================================
// 📊 [OMD-LIB-PAGINATEDPRINT-0001] paginatedPrint.ts
// 🎯 @KICK  : 쪽 윤곽 및 인쇄 페이지 계산 PagedJS 엔진 연동
// 🚨 @PATCH : **2026-10-21** — [오프스크린 iframe rAF 스로틀링 해제 및 requestAnimationFrame 가속화]:
//             1) frame.style.cssText의 left: -30000px를 position: fixed; top: 0; left: 0; opacity: 0.001; z-index: -9999로 전환하여 Chromium 렌더링 엔진의 requestAnimationFrame 동결/스로틀링을 원천 해제
//             2) iframe 샌드박스 내부 win.requestAnimationFrame에 16ms setTimeout 폴백 가드를 탑재하여 Paged.js 페이지 계산이 0.5초 안에 즉각 완료되도록 극적 가속화
// 🚨 @PATCH : **2026-10-21** — [페이지 계산 프리즈 방어 및 이미지/글꼴 대기 타임아웃 현실화]:
//             1) engine() 로더에 다중 경로(상대/절대) 폴백 시도를 추가하여 Electron/웹 환경에서 paged.polyfill.js 404 차단
//             2) img.decode() 실패 시 단일 이미지 오류로 전체 쪽 윤곽이 크래시되지 않도록 개별 catch 처리 및 타임아웃 25s->5s 단축
//             3) doc.fonts.ready 타임아웃 25s->5s 단축 및 PagedPolyfill 계산 90s->20s 단축으로 무한 멈춤 현상 원천 차단
// 🚨 @PATCH : **2026-10-20** — [PDF 인쇄 시 화면 페이지 나누기 1:1 완벽 일치 및 선택자 확장]:
//             1) breaks 수집 대상을 [data-onrivi-page-break], .onrivi-page-break, .page-break, hr.page-break로 전면 확장하고 data-onrivi-page-break='true' 속성 정규화
//             2) 문서 첫 부분/끝 부분의 정당한 페이지 나누기가 emptyElement 가드로 인해 삭제되던 결함을 차단하고 오직 연속 중복 마커만 정돈
// 🚨 @PATCH : **2026-10-20** — [워터마크 텍스트 가독성 강화를 위한 ExtraBold(800) 글자 두께 및 자간 적용]:
//             1) 워터마크 문구가 표 및 본문 텍스트 뒤에서 흐리게 묻히는 현상을 해결하기 위해 font-weight: 800 (ExtraBold) 적용
//             2) font-family에 Pretendard, Plus Jakarta Sans를 전면 배치하고 letter-spacing: 0.04em 및 color: #334155 적용으로 시인성 극대화
// 🚨 @PATCH : **2026-10-19** — [PagedJS querySelectorAll 가상요소(::before) 파싱 오류 방어 및 인쇄 CSS 가드]:
//             1) iframe 샌드박스 내부 DocumentFragment/Element/Document의 querySelectorAll을 안전 래핑하여 ::before, ::after 등 유효하지 않은 선택자 파싱 시 DOMException 크래시 완전 방어
//             2) Tailwind Typography의 코드 백틱 생성 규칙(content: '`') 등 가상 요소 충돌 룰을 pageCss에서 content: none !important로 안전 무력화
// 🚨 @PATCH : **2026-10-19** — [워터마크 이미지/문구 미지정 시 기본 엠블럼 및 Onrivi Author 자동 폴백 적용]: 이미지 미등록 시 기본 엠블럼, 문구 미입력 시 Onrivi Author 자동 렌더링
// ====================================================================
import { resolvePageGeometry, PAGE_BREAK_CSS } from './pageGeometry';
import { DocumentPrintSettings, DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT } from './documentPrintSettings';
import { type DocumentPaginationSettings, emptyPagination, normalizePagination } from './documentPaginationSettings';
import { applyPrintBreaks } from './printBreaks';
import { stripExportViewportRules } from './exportPreparation';

let engineSource:Promise<string>|undefined;
async function engine(){
 if(!engineSource)engineSource=(async()=>{
  const candidatePaths = (window as any).electronAPI
    ? ['./pagedjs/paged.polyfill.js', '/pagedjs/paged.polyfill.js']
    : ['/pagedjs/paged.polyfill.js', './pagedjs/paged.polyfill.js'];
  let lastError: any;
  for (const p of candidatePaths) {
    try {
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
      let response:Response;
      try{response=await fetch(p,{signal:controller.signal});if(response.ok)return await response.text();}
      finally{clearTimeout(timer);}
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('페이지 분할 엔진을 불러오지 못했습니다.');
 })().catch(error=>{engineSource=undefined;throw error;});
 return engineSource;
}
function timeout<T>(promise:Promise<T>,ms:number,label:string):Promise<T>{
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`${label} 시간이 초과되었습니다.`)),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}
let lastPrint:{input:string;output:string}|undefined;
export async function paginatePrintHtml(html:string,style:any,watermark:DocumentPrintSettings,signal?:AbortSignal,pagination:DocumentPaginationSettings=emptyPagination(),onProgress?:(stage:string)=>void):Promise<string>{
 signal?.throwIfAborted();
 pagination=normalizePagination(pagination);
 const input=JSON.stringify([html,style,watermark,pagination]);
 if(lastPrint?.input===input)return lastPrint.output;
 const output=await renderPrintPages(html,style,watermark,signal,pagination,onProgress);
 signal?.throwIfAborted();lastPrint={input,output};return output;
}
async function renderPrintPages(html:string,style:any,watermark:DocumentPrintSettings,signal:AbortSignal|undefined,pagination:DocumentPaginationSettings,onProgress?:(stage:string)=>void):Promise<string>{
 signal?.throwIfAborted();
 onProgress?.('페이지 엔진 불러오는 중');
 const geometry=resolvePageGeometry(style),source=await engine();
 onProgress?.('페이지 본문과 서식 분석 중');
 const frame=document.createElement('iframe');
 frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;top:0;left:0;width:1200px;height:900px;opacity:0.001;pointer-events:none;z-index:-9999;border:0;';
 document.body.append(frame);
 const stopped=()=>frame.remove();signal?.addEventListener('abort',stopped,{once:true});
 const work=<T,>(promise:Promise<T>)=>new Promise<T>((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('취소되었습니다.','AbortError'));return;}
  const abort=()=>reject(new DOMException('취소되었습니다.','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  promise.then(value=>{signal?.removeEventListener('abort',abort);resolve(value);},error=>{signal?.removeEventListener('abort',abort);reject(error);});
 });
 try{
  const doc=frame.contentDocument!,win=frame.contentWindow! as any;
  doc.open();doc.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body></body></html>');doc.close();

   // 🚀 [PERF-ACCEL] Chromium 백그라운드/오프스크린 rAF 동결 완벽 방어: 16ms setTimeout 폴백으로 Paged.js 고속 연산 보장
   const origRaf = win.requestAnimationFrame?.bind(win);
   win.requestAnimationFrame = (cb: FrameRequestCallback) => {
     let called = false;
     const id = origRaf ? origRaf((t: number) => { if (!called) { called = true; cb(t); } }) : 0;
     setTimeout(() => { if (!called) { called = true; cb(performance.now()); } }, 16);
     return id;
   };

  // 🛡️ [DOM-GUARD] Paged.js가 Tailwind 가상 요소(::before, ::after)나 복잡한 의사 선택자를 쿼리할 때 발생하는 DOMException 크래시 원천 방어
  const safeWrapQSA = (proto: any) => {
    if (!proto || !proto.querySelectorAll) return;
    const orig = proto.querySelectorAll;
    proto.querySelectorAll = function(selector: string) {
      try {
        if (typeof selector === 'string') {
          // ::before, ::after, ::marker 등 가상 요소가 포함된 경우 정제
          if (selector.includes('::')) {
            const cleaned = selector.replace(/::[a-zA-Z_-]+/g, '').trim();
            if (!cleaned) return [];
            return orig.call(this, cleaned);
          }
        }
        return orig.call(this, selector);
      } catch {
        return [];
      }
    };
  };
  safeWrapQSA(win.DocumentFragment?.prototype);
  safeWrapQSA(win.Element?.prototype);
  safeWrapQSA(win.Document?.prototype);

  const parsed=new DOMParser().parseFromString(html,'text/html');
  parsed.querySelectorAll('script,iframe,object,embed').forEach(n=>n.remove());
  parsed.querySelectorAll('*').forEach(n=>Array.from(n.attributes).forEach(a=>{if(/^on/i.test(a.name)||/^javascript:/i.test(a.value))n.removeAttribute(a.name);}));
  const allCss=stripExportViewportRules(Array.from(parsed.querySelectorAll('style')).map(s=>s.textContent||'').join('\n'));
  // Embedded fonts can be many MB. The browser loads these directly; feeding
  // their base64 through PagedJS's CSS parser blocks the UI unnecessarily.
  const fontCss=(allCss.match(/@font-face\s*\{[^}]*\}/gi)||[]).join('\n');
  const css=allCss.replace(/@font-face\s*\{[^}]*\}/gi,'');
  if(fontCss){const fontStyle=doc.createElement('style');fontStyle.textContent=fontCss;doc.head.append(fontStyle);}
  parsed.querySelectorAll('style,link').forEach(n=>n.remove());
  doc.body.className=parsed.body.className;
  const content=doc.createElement('div');content.innerHTML=parsed.body.innerHTML;
  content.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
  // Screen sheet rules use :has(...) and !important, so stylesheet-level
  // resets lose to them. Clear physical sheet padding/min-height on the clone
  // with inline priority; @page alone owns paper size and margins in PDF.
  const printRootStyle='width:auto!important;max-width:none!important;height:auto!important;min-height:0!important;padding:0!important;margin:0!important;overflow:visible!important;transform:none!important;zoom:1!important;border:0!important;box-shadow:none!important';
  doc.body.style.cssText=printRootStyle;
  doc.documentElement.style.cssText=printRootStyle;
  content.querySelectorAll<HTMLElement>('.page-break-container,.custom-preview-container,.markdown-viewer-root,.visual-document-surface').forEach(node=>{
    const reset=doc.createElement('div');reset.style.cssText=printRootStyle;
    for(const property of Array.from(reset.style))node.style.setProperty(property,reset.style.getPropertyValue(property),'important');
  });
  // Use the innermost document content as the split root, not screen wrappers.
  const splitRoot=content.querySelector<HTMLElement>('.visual-document-surface') || content.querySelector<HTMLElement>('.prose') || content.querySelector<HTMLElement>('.markdown-viewer-root') || content;
  const {unresolved}=applyPrintBreaks(splitRoot,pagination);

  // Repeated/end breaks must not create accidental blank pages.
  const isBreakEl = (el: Element | null | undefined): el is HTMLElement =>
    Boolean(el && (el.matches('[data-onrivi-page-break], .onrivi-page-break, .page-break, hr.page-break')));

  const breaks = Array.from(content.querySelectorAll<HTMLElement>('[data-onrivi-page-break], .onrivi-page-break, .page-break, hr.page-break'));
  const emptyElement = (node: Element) =>
    !node.textContent?.trim() && !node.querySelector('img,svg,table,video,canvas,math') && !isBreakEl(node);

  breaks.forEach(marker => {
    if (!marker.parentNode) return;
    // Blank editor paragraphs beside an explicit break must not consume a page
    // before the break is applied. This only changes the print clone.
    let before = marker.previousElementSibling;
    while (before && emptyElement(before)) {
      const previous = before.previousElementSibling;
      before.remove();
      before = previous;
    }
    let after = marker.nextElementSibling;
    while (after && emptyElement(after)) {
      const next = after.nextElementSibling;
      after.remove();
      after = next;
    }
    if (after && !isBreakEl(after)) {
      // Attach the break to real content instead of a zero-height standalone
      // element, which can land on an automatic boundary and create a blank page.
      const target = after as HTMLElement;
      target.setAttribute('data-onrivi-forced-break', 'true');
      target.style.setProperty('break-before', 'page', 'important');
      target.style.setProperty('page-break-before', 'always', 'important');
    }
    marker.remove();
  });
  const staging=doc.createElement('div');staging.style.width=`${geometry.contentWidth}mm`;staging.append(content);doc.body.append(staging);
  const preloadStyle=doc.createElement('style');preloadStyle.textContent=css;doc.head.append(preloadStyle);
  onProgress?.('페이지 이미지와 글꼴 확인 중');
  await work(timeout(Promise.all(Array.from(content.querySelectorAll('img')).map(img=>img.decode().catch(()=>{/* 개별 이미지 디코딩 실패 시 전체 중단 방지 */}))),5000,'이미지 준비')).catch(()=>{});
  await work(timeout(doc.fonts.ready,5000,'글꼴 준비')).catch(()=>{});
  const oversized=Array.from(content.querySelectorAll<HTMLElement>('tr,figure,.visual-math-node')).filter(el=>el.getBoundingClientRect().height>geometry.contentHeight*96/25.4+2);
  const output=doc.createElement('div');doc.body.append(output);
  win.PagedConfig={auto:false};
  const script=doc.createElement('script');script.textContent=source;doc.head.append(script);
  const pageCss=`${css}\n${PAGE_BREAK_CSS}\n
  [data-onrivi-forced-break]{break-before:page!important;page-break-before:always!important}
  @page {size:${geometry.width}mm ${geometry.height}mm;margin:${geometry.top}mm ${geometry.right}mm ${geometry.bottom}mm ${geometry.left}mm;}
  html,body{height:auto!important;min-height:0!important;overflow:visible!important;padding:0!important;margin:0!important}
  .page-break-container,.custom-preview-container,.markdown-viewer-root,.visual-document-surface{width:auto!important;max-width:none!important;height:auto!important;min-height:0!important;padding:0!important;margin:0!important;overflow:visible!important;transform:none!important;zoom:1!important}
  .onrivi-page-guides,.onrivi-print-tools{display:none!important}
  h1,h2,h3,h4,h5,h6{break-after:avoid;page-break-after:avoid}
  h1+table,h2+table,h3+table,h4+table,h5+table,h6+table{break-before:avoid!important;page-break-before:avoid!important}
  img{max-width:100%!important;max-height:${geometry.contentHeight}mm!important;object-fit:contain} figure{break-inside:avoid}
  blockquote, [data-alert-type], .visual-readonly-callout, .callout-box { break-inside: avoid !important; page-break-inside: avoid !important; }
  table { break-inside: auto !important; page-break-inside: auto !important; }
  tr { break-inside: avoid !important; page-break-inside: avoid !important; }
  .prose :where(code):not(:where([class~="not-prose"] *))::before,
  .prose :where(code):not(:where([class~="not-prose"] *))::after,
  .prose code::before,
  .prose code::after { content: none !important; }
  `;
  const markup=content.innerHTML;staging.remove();preloadStyle.remove();
  onProgress?.('서식에 맞춰 페이지 분할 중');
  await work(timeout(win.PagedPolyfill.preview(markup,[{[new URL('/onrivi-print.css',location.href).href]:pageCss}],output),20000,'페이지 계산'));
  onProgress?.('완성된 페이지 정리 중');
  // PagedJS has already consumed these breaks. Native PDF printing must not
  // apply the inline !important rules a second time inside the generated pages.
  output.querySelectorAll<HTMLElement>('[data-onrivi-forced-break]').forEach(node => {
    node.style.setProperty('break-before', 'auto', 'important');
    node.style.setProperty('page-break-before', 'auto', 'important');
  });
  const pages=Array.from(output.querySelectorAll<HTMLElement>('.pagedjs_page'));
  if(!pages.length)throw new Error('페이지를 만들지 못했습니다.');
  for(let index=0;index<pages.length;index++){
   const page=pages[index];page.dataset.onriviPage=String(index+1);
   page.style.backgroundColor=style.backgroundColor || '#ffffff';
   if(!watermark.enabled || (watermark.excludeFirst&&index===0))continue;
   const layer=doc.createElement('div');layer.className='onrivi-watermark';layer.setAttribute('aria-hidden','true');
   const x=watermark.position.endsWith('left')?'5%':watermark.position.endsWith('right')?'95%':'50%';
   const y=watermark.position.startsWith('top')?'8%':watermark.position.startsWith('bottom')?'92%':'50%';
   const tx=watermark.position.endsWith('left')?'0':watermark.position.endsWith('right')?'-100%':'-50%';
   const ty=watermark.position.startsWith('top')?'0':watermark.position.startsWith('bottom')?'-100%':'-50%';
   layer.style.cssText=`position:absolute;z-index:1000;pointer-events:none;user-select:none;left:${x};top:${y};opacity:${watermark.opacity/100};transform:translate(${tx},${ty}) rotate(${watermark.rotation}deg);width:${watermark.width}%;text-align:center;color:#334155;font-family:'Pretendard', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;font-weight:800;letter-spacing:0.04em;font-size:${watermark.fontSize}px;line-height:1.2;overflow-wrap:anywhere`;
   if(watermark.kind==='image'){
    const imgSrc = watermark.image || DEFAULT_WATERMARK_IMAGE;
    const image=doc.createElement('img');image.src=imgSrc;image.style.cssText='width:100%;height:auto;max-height:80mm;object-fit:contain';layer.append(image);
   }else layer.textContent=watermark.text || DEFAULT_WATERMARK_TEXT;
   page.append(layer);
  }
  const finalCss=Array.from(doc.querySelectorAll('style')).map(s=>s.outerHTML).join('\n');
  return `<!doctype html><html lang="ko" data-onrivi-export><head><meta charset="utf-8"><title>쪽 윤곽 미리보기</title>${finalCss}<style>
  @page{size:${geometry.width}mm ${geometry.height}mm;margin:0!important}
  html,body{padding:0!important;margin:0!important;height:auto!important;overflow:visible!important}
  .pagedjs_pages{display:block!important}.pagedjs_page{position:relative!important;overflow:hidden!important;break-after:page!important;page-break-after:always!important;margin:0!important;box-shadow:none!important}.pagedjs_page:last-child{break-after:auto!important;page-break-after:auto!important}
  [data-onrivi-page-break]{break-before:auto!important;page-break-before:auto!important}
  @media screen{body,body.custom-preview-container{background:#e2e8f0!important;padding:20px!important}.pagedjs_page{margin:0 auto 28px!important;box-shadow:0 2px 10px #0003!important}.pagedjs_page::after{content:attr(data-onrivi-page);position:absolute;right:12px;bottom:4px;font:11px system-ui;color:#64748b}}
  @media print{
    .pagedjs_page::after{display:none}
    .pagedjs_page, .pagedjs_page *, .pagedjs_sheet, .pagedjs_area {
      box-shadow:none!important;text-shadow:none!important;
    }
    .pagedjs_page,.pagedjs_sheet{border:0!important;border-radius:0!important;filter:none!important}
  }
  </style></head><body class="${parsed.body.className.replace(/[^\w\s-]/g,'')}" data-onrivi-pages="${pages.length}" data-onrivi-unresolved-count="${unresolved.length}" data-onrivi-unresolved-ids="${unresolved.map(a=>a.id).join(',')}" data-onrivi-oversized-count="${oversized.length}" style="${printRootStyle}">${output.innerHTML}</body></html>`;
 }finally{signal?.removeEventListener('abort',stopped);frame.remove();}
}
