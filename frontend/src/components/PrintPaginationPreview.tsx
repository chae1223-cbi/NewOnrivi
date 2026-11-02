'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type PrintBreakAnchor } from '@/lib/documentPaginationSettings';
import { ANCHOR_ATTRIBUTE } from '@/lib/printBreaks';

interface Props {
  html:string;
  editing:boolean;
  busy:boolean;
  onToggle:(anchor:PrintBreakAnchor,existingId?:string)=>void;
  onEscape:()=>void;
  expanded?:boolean;
  onExpand?:()=>void;
}
/** The parent owns all controls; no script execution permission is added to the iframe. */
export default function PrintPaginationPreview({html,editing,busy,onToggle,onEscape,expanded=false,onExpand}:Props){
  const frame=useRef<HTMLIFrameElement>(null),cleanup=useRef<()=>void>(()=>{});
  const [pageNumber,setPageNumber]=useState(1),[pageTexts,setPageTexts]=useState<string[]>([]);
  const currentPage=useRef(1);
  const lastDocument=useRef<Document|null>(null);
  const [zoom,setZoom]=useState<'page'|'width'|number>('page');
  const [actualZoom,setActualZoom]=useState(100);
  const goToPage=useCallback((number:number)=>{
    const pages=frame.current?.contentDocument?.querySelectorAll<HTMLElement>('.pagedjs_page');
    if(!pages?.length)return;
    const target=Math.max(1,Math.min(pages.length,number));currentPage.current=target;setPageNumber(target);
    pages[target-1].scrollIntoView({block:'start',inline:'nearest'});
  },[]);
  const setup=useCallback(()=>{
    cleanup.current();
    const doc=frame.current?.contentDocument,win=frame.current?.contentWindow;
    if(!doc?.body || !win)return;
    const pages=Array.from(doc.querySelectorAll<HTMLElement>('.pagedjs_page'));
    if(!pages.length)return;
    const sameDocument=lastDocument.current===doc;
    const oldTop=win.scrollY,oldLeft=win.scrollX;
    const oldScale=Number(win.getComputedStyle(doc.body).zoom)||1;
    // Print HTML uses overflow:visible and height:auto. Give the preview its
    // own viewport scrollbar without changing the HTML used for PDF output.
    doc.documentElement.style.setProperty('height','100%','important');
    doc.documentElement.style.setProperty('overflow-y','scroll','important');
    doc.documentElement.style.setProperty('overflow-x','auto','important');
    doc.documentElement.style.setProperty('overscroll-behavior','contain');
    doc.body.style.setProperty('height','auto','important');
    doc.body.style.setProperty('overflow','visible','important');
    const savedPage=Math.min(currentPage.current,pages.length);
    const naturalWidth=pages[0].offsetWidth,naturalHeight=pages[0].offsetHeight;
    const availableWidth=Math.max(100,(frame.current?.clientWidth||800)-48);
    const availableHeight=Math.max(100,(frame.current?.clientHeight||600)-40);
    const scale=typeof zoom==='number'?zoom/100:zoom==='width'?availableWidth/naturalWidth:Math.min(availableWidth/naturalWidth,availableHeight/naturalHeight);
    const requestedScale=Math.max(.1,Math.min(2,scale));
    // Export CSS resets .custom-preview-container to zoom:1!important.
    // The screen-only inline zoom must override it without changing export HTML.
    doc.body.style.setProperty('zoom',String(requestedScale),'important');
    const boundedScale=pages[0].getBoundingClientRect().height/naturalHeight || requestedScale;
    setActualZoom(Math.round(boundedScale*100));
    setPageTexts(previous=>{
      const next=pages.map(p=>(p.textContent||'').replace(/\s+/g,' ').trim().slice(0,120));
      return JSON.stringify(previous)===JSON.stringify(next)?previous:next;
    });
    doc.querySelectorAll('.onrivi-print-adjust-controls').forEach(el=>el.remove());
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onEscape();}};
    doc.addEventListener('keydown',escape);
    const layer=doc.createElement('div');layer.className='onrivi-print-adjust-controls';layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:10000';
    const candidates=Array.from(doc.querySelectorAll<HTMLElement>(`[${ANCHOR_ATTRIBUTE}]`));
    const ids=new Set<string>();
    const placed:Array<{x:number;y:number}>=[];
    if(editing && !busy)for(const element of candidates){
      let anchor:PrintBreakAnchor;
      try{anchor=JSON.parse(element.getAttribute(ANCHOR_ATTRIBUTE)||'');}catch{continue;}
      if(ids.has(anchor.id) || element.closest('thead'))continue;ids.add(anchor.id);
      const rect=element.getBoundingClientRect();if(!rect.width && !rect.height)continue;
      const existing=element.dataset.onriviBreakId;
      const button=doc.createElement('button');button.type='button';
      button.textContent=existing?'×':'+';
      const label=existing?'나누기 해제':`여기부터 다음 페이지: ${anchor.text.slice(0,50) || '빈 코드 줄'}`;
      button.setAttribute('aria-label',label);button.title=element.dataset.onriviBreakDisabled || label;
      button.disabled=Boolean(element.dataset.onriviBreakDisabled);
      // Whole-page fit compresses adjacent text lines. Keep controls clickable
      // by using separate gutter columns instead of stacking them on each other.
      let y=rect.top+win.scrollY-9;
      const left=rect.left+win.scrollX-22,right=rect.right+win.scrollX+4;
      const columns=[left,left-24,left-48,right,right+24,right+48].filter(x=>x>=0 && x+20<=(frame.current?.clientWidth||800)+win.scrollX);
      if(!columns.length)columns.push(Math.max(0,left));
      const free=(x:number)=>!placed.some(p=>Math.abs(p.x-x)<22 && Math.abs(p.y-y)<22);
      let x=columns.find(free);
      while(x===undefined){y+=22;x=columns.find(free);}
      placed.push({x,y});
      button.style.cssText=`position:absolute;pointer-events:auto;left:${x/boundedScale}px;top:${y/boundedScale}px;width:${20/boundedScale}px;height:${20/boundedScale}px;padding:0;border:${1/boundedScale}px solid ${existing?'#ea580c':'#2563eb'};border-radius:${4/boundedScale}px;background:${existing?'#fff7ed':'white'};color:${existing?'#c2410c':'#1d4ed8'};font:${16/boundedScale}px/${18/boundedScale}px system-ui;cursor:pointer;opacity:${button.disabled?'.4':'1'}`;
      button.onclick=event=>{event.preventDefault();event.stopPropagation();onToggle(anchor,existing);};
      button.onmouseenter=()=>{element.style.outline='1px dashed #2563eb';};
      button.onmouseleave=()=>{element.style.outline='';};
      layer.append(button);
    }
    doc.body.append(layer);
    const trackPage=()=>{
      const center=(frame.current?.clientHeight||500)/2;
      let closest=0,distance=Infinity;
      pages.forEach((page,index)=>{
        const rect=page.getBoundingClientRect();
        const next=rect.top<=center && rect.bottom>=center?0:Math.min(Math.abs(rect.top-center),Math.abs(rect.bottom-center));
        if(next<distance){distance=next;closest=index;}
      });
      currentPage.current=closest+1;setPageNumber(closest+1);
    };
    win.addEventListener('scroll',trackPage,{passive:true});
    if(sameDocument)win.scrollTo(oldLeft*boundedScale/oldScale,oldTop*boundedScale/oldScale);
    else pages[savedPage-1]?.scrollIntoView({block:'start',inline:'nearest'});
    lastDocument.current=doc;
    currentPage.current=savedPage;setPageNumber(savedPage);
    cleanup.current=()=>{doc.removeEventListener('keydown',escape);win.removeEventListener('scroll',trackPage);layer.remove();};
  },[editing,busy,onToggle,onEscape,zoom]);
  useEffect(()=>{setup();return()=>cleanup.current();},[setup,html]);
  useEffect(()=>{
    const element=frame.current;if(!element)return;
    const observer=new ResizeObserver(()=>setup());observer.observe(element);return()=>observer.disconnect();
  },[setup]);
  const total=pageTexts.length;
  return <div className="border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden" style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-zinc-800 text-xs" style={{flexShrink:0}} aria-label="미리보기 페이지 이동">
      <button type="button" aria-label="이전 페이지" disabled={pageNumber<=1} onClick={()=>goToPage(pageNumber-1)} className="border rounded px-2 py-1 disabled:opacity-40">이전</button>
      <label className="flex items-center gap-1">페이지 <input aria-label="이동할 페이지" type="number" min={1} max={total||1} value={pageNumber} onChange={event=>{const value=Number(event.target.value);if(value)goToPage(value);}} style={{width:56}} className="border rounded px-1 py-1 bg-transparent" /> / {total||'—'}</label>
      <button type="button" aria-label="다음 페이지" disabled={pageNumber>=total} onClick={()=>goToPage(pageNumber+1)} className="border rounded px-2 py-1 disabled:opacity-40">다음</button>
      <select aria-label="미리보기 배율" value={zoom} onChange={event=>{const value=event.target.value;setZoom(value==='page'||value==='width'?value:Number(value));}} className="border rounded px-2 py-1 bg-transparent">
        <option value="page">페이지 전체 맞춤</option><option value="width">너비 맞춤</option>
        {[50,75,100,125,150,200].map(value=><option key={value} value={value}>{value}%</option>)}
      </select><span>{actualZoom}%</span>
      {onExpand && <button type="button" onClick={onExpand} className="border rounded px-2 py-1 ml-auto">{expanded?'확대 화면 닫기':'미리보기 크게 보기'}</button>}
    </div>
    <div style={{display:'flex',flex:1,minHeight:0}}>
      <nav aria-label="전체 페이지 목록" className="bg-slate-100 dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-700" style={{width:100,flexShrink:0,overflowY:'auto',padding:8}}>
        {pageTexts.map((text,index)=><button key={index} type="button" aria-label={`${index+1}페이지로 이동`} aria-current={pageNumber===index+1?'page':undefined} onClick={()=>goToPage(index+1)}
          className={`block w-full rounded border p-2 mb-2 text-left ${pageNumber===index+1?'border-blue-600 bg-blue-50 text-blue-900':'border-slate-300 bg-white text-slate-600'}`}>
          <span className="block text-[11px] font-bold">{index+1}페이지</span><span aria-hidden="true" style={{display:'block',fontSize:7,lineHeight:'10px',height:50,overflow:'hidden',marginTop:4,wordBreak:'break-all'}}>{text}</span>
        </button>)}
      </nav>
      <iframe ref={frame} title="쪽 윤곽 미리보기" sandbox="allow-same-origin" scrolling="yes" tabIndex={0} srcDoc={html} onLoad={setup}
        style={{height:'100%',width:'100%',minWidth:0,flex:1,border:0,opacity:busy ? 0.4 : 1}} className="bg-slate-100 dark:bg-zinc-900" />
    </div>
  </div>;
}
