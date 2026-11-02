/**
 * 프로그램명 : OnriviAuthor
 * 버전 정보 : 1.0.1
 * 🚨 @PATCH : **2026-10-20** — [수동 페이지 나누기 선택자 확장]:
 *             1) manualBreaks 수집 시 [data-onrivi-page-break] 뿐만 아니라 .onrivi-page-break, .page-break, hr.page-break까지 전면 포괄하여 마크다운/위지윅 화면의 페이지 분할 위치 100% 동기화
 * 🚨 @PATCH : **2026-10-19** — [물리적 인쇄 용지 규격 1:1 일치 페이지 분할 가이드 및 원자적 블록 스냅 탑재]:
 *             1) mmToPx(geometry.contentHeight) 기반 물리적 A4 본문 높이(261mm=986.45px) 절대 계산으로 화면 너비에 의한 가이드라인 왜곡 원천 차단
 *             2) 콜아웃, 표, 코드블록, 이미지, 수식 중간을 가로지를 경우 블록 상단 바로 앞으로 페이지 경계를 당기는 원자적 블록 스냅(Atomic Block Snapping) 적용
 *             3) surface.offsetLeft 및 offsetWidth를 추적하여 용지 시트 영역에만 정밀하게 점선 및 페이지 번호 뱃지 렌더링
 */
'use client';
import React,{useEffect,useState} from 'react';
import {resolvePageGeometry} from '@/lib/pageGeometry';

export default function DocumentPageGuides({host,style,source}:{host:React.RefObject<HTMLDivElement>;style:any;source:string}){
 const [lines,setLines]=useState<{top:number;manual:boolean;end?:boolean}[]>([]),[error,setError]=useState('');
 const [bounds,setBounds]=useState<{left:number;width:number}|null>(null);
 const styleKey = JSON.stringify(style);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  let timer:ReturnType<typeof setTimeout>;
  const measure=()=>{
   clearTimeout(timer);timer=setTimeout(()=>{
    if(root.querySelector('.ProseMirror')?.getAttribute('data-composing')==='true')return;
    try{
      const geometry=resolvePageGeometry(style),surface=root.querySelector<HTMLElement>('.visual-document-surface');if(!surface)return;
      const css=getComputedStyle(surface);
      const surfaceTop=surface.offsetTop;
      const surfaceLeft=surface.offsetLeft;
      const surfaceWidth=surface.offsetWidth;
      setBounds({left:surfaceLeft,width:surfaceWidth});

      const paddingTop=parseFloat(css.paddingTop)||0;
      const paddingBottom=parseFloat(css.paddingBottom)||0;
      const contentTop=surfaceTop+paddingTop;
      
      // 1mm = 96 / 25.4 px
      const mmToPx = (mm: number) => mm * (96 / 25.4);
      // 실제 물리적 1페이지 본문 높이 (A4 세로 기준 261mm = 약 986.45px)
      const pageHeight = mmToPx(geometry.contentHeight);
      
      const rect=surface.getBoundingClientRect(),scale=rect.width/surface.offsetWidth || 1;
      // Measure actual content, not the blank space used to complete the last sheet.
      const last=surface.lastElementChild as HTMLElement | null;
      const total=last ? Math.max(0,(last.getBoundingClientRect().bottom-rect.top)/scale-paddingTop+(parseFloat(getComputedStyle(last).marginBottom)||0)) : 0;
      
      // 수동 페이지 나누기 마커 위치 수집
      const manualBreaks=Array.from(surface.querySelectorAll<HTMLElement>('[data-onrivi-page-break], .onrivi-page-break, .page-break, hr.page-break'))
        .map(n=>(n.getBoundingClientRect().top-rect.top)/scale-paddingTop)
        .filter(y=>y>0&&y<total);

      // 쪼개지면 안 되는 원자적 블록 요소들 (콜아웃, 표, 코드블록, 이미지, 수식) 위치 수집
      const atomicBlocks = Array.from(surface.querySelectorAll<HTMLElement>('blockquote, [data-alert-type], table, pre, figure, .visual-code-block, .visual-source-block, .katex-display'))
        .map(el => {
          const r = el.getBoundingClientRect();
          const elStyle = getComputedStyle(el);
          const marginTop = parseFloat(elStyle.marginTop) || 0;
          const marginBottom = parseFloat(elStyle.marginBottom) || 0;
          const blockTop = (r.top - rect.top) / scale - paddingTop - marginTop;
          const blockBottom = (r.bottom - rect.top) / scale - paddingTop + marginBottom;
          return { top: blockTop, bottom: blockBottom, height: blockBottom - blockTop };
        })
        .filter(b => b.top >= 0 && b.bottom <= total && b.height < pageHeight); // 1페이지보다 작은 블록만 스냅

      const next: {top:number;manual:boolean;end?:boolean}[] = [];
      let currentTop = 0;

      // 수동 분할 및 자동 높이 계산
      const breakPoints = [...manualBreaks, total].sort((a, b) => a - b);
      for (const sectionEnd of breakPoints) {
        while (currentTop + pageHeight < sectionEnd && next.length < 500) {
          let candidate = currentTop + pageHeight;

          // 원자적 블록 중간을 가로지르는 경우 블록 시작점 직전으로 스냅 (Atomic Block Snapping)
          const colliding = atomicBlocks.find(b => b.top < candidate && b.bottom > candidate);
          if (colliding && colliding.top > currentTop + 40) {
            // 블록 상단 바로 앞으로 페이지 경계선 당김 (인쇄 시 블록이 통째로 다음 페이지로 넘어가므로)
            candidate = Math.max(currentTop, colliding.top);
          }

          next.push({top:contentTop + candidate,manual:false});
          currentTop = candidate;
        }

        if (sectionEnd < total) {
          next.push({top:contentTop + sectionEnd,manual:true});
          currentTop = sectionEnd;
        }
      }

      const lastPageEnd=currentTop+pageHeight;
      surface.style.setProperty('--onrivi-sheet-min-height', `${paddingTop+lastPageEnd+paddingBottom}px`);
      // Include the last sheet edge, rather than ending the guide at the last
      // content break and leaving an apparently arbitrary trailing sheet.
      next.push({top:surfaceTop+paddingTop+lastPageEnd+paddingBottom-1,manual:false,end:true});
      setLines(next);
      setError('');
    }catch(e:any){
      setError(e.message);
      setLines([]);
    }
   },200);
  };
  const resize=new ResizeObserver(measure);resize.observe(root);
  const mutations=new MutationObserver(measure);mutations.observe(root,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',measure);
  root.addEventListener('load',measure,true);measure();
  return()=>{root.querySelector<HTMLElement>('.visual-document-surface')?.style.removeProperty('--onrivi-sheet-min-height');clearTimeout(timer);resize.disconnect();mutations.disconnect();window.removeEventListener('resize',measure);root.removeEventListener('load',measure,true);};
 },[host,style,styleKey,source]);

 return <div className="onrivi-page-guides absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
  {error?<span className="bg-white text-red-700">{error}</span>:lines.map(({top,manual,end},index)=><div key={index} style={{top,left:bounds?`${bounds.left}px`:0,width:bounds?`${bounds.width}px`:'100%'}} className={`absolute border-t border-dashed pointer-events-none ${manual?'border-orange-500':'border-blue-500/80'}`}><span className={`float-right -mt-2.5 mr-2 dark:bg-zinc-800/95 text-[11px] font-semibold px-1.5 py-0.5 rounded shadow-xs border ${manual?'bg-orange-50/95 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800':'bg-blue-50/95 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900'}`}>{end?`${index+1}페이지 용지 끝`:manual?`${index+1}페이지 끝 (수동)`:`${index+1}페이지 끝 (예상)`}</span></div>)}
 </div>;
}
