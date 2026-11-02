'use client';
// 🚨 @PATCH : **2026-10-31** — [플로팅 서식 툴바 유지 보장]: execute 실행 시 onFloatingToolbar(false) 강제 호출을 제거하여 서식 적용 후에도 툴바가 닫히지 않고 유지되도록 개선

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { configuredHotkeyItem, TOOLBAR_ITEMS } from '@/lib/toolbarConfig';
import { visualCommandCatalog, filterVisualCommands } from '@/lib/visualCommandCatalog';
import { desktopClipboardImage } from '@/lib/desktopClipboard';

export interface PicturebookEditorOptions {
  documentId?: string;
  tabSize?: number;
  spellCheck?: boolean;
  customCommands?: Record<string,string>;
  customHotkeys?: Record<string,string>;
  commandRef?: React.MutableRefObject<((command:string)=>boolean)|null>;
  onImageFile?: (file:File)=>Promise<string|null>;
  onImageDialog?: (insert:(source:string)=>boolean, source?:string)=>void;
  onMediaDialog?: (kind:'video'|'map',insert:(source:string)=>boolean)=>void;
  onFormulaDialog?: (insert:(source:string)=>boolean)=>void;
  floatingToolbarVisible?: boolean;
  onFloatingToolbar?: (visible:boolean,position:{top:number,left:number})=>void;
  onAction?: (command:string)=>void;
  onCitation?: () => void;
  bibContent?: string;
}

/** Keep the browser's IME buffer intact; parsed scene text is not a live value. */
export default function PicturebookSceneInput({ value, label, onCommit, options = {} }: {
  value: string; label: string; onCommit: (value: string) => void;
  options?: PicturebookEditorOptions;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const committed = useRef(value);
  const selection=useRef({start:0,end:0});
  const alive=useRef(true);
  const [menu,setMenu]=useState<'slash'|'format'|null>(null);
  const [query,setQuery]=useState('');
  const [active,setActive]=useState(0);
  const [notice,setNotice]=useState('');
  const latest=useRef({onCommit,options});latest.current={onCommit,options};
  const slashRange=useRef<{start:number,end:number}|null>(null);
  const catalog=visualCommandCatalog(options.customCommands);
  const items=menu==='slash'?filterVisualCommands(catalog,query):catalog;
  useLayoutEffect(() => {
    const element = input.current;
    if (!element || composing.current || document.activeElement === element) return;
    element.value = value;
    committed.current = value;
  }, [value]);
  const commit = (text: string) => {
    if (text === committed.current) return;
    committed.current = text;
    latest.current.onCommit(text);
  };
  const remember=()=>{const el=input.current;if(el)selection.current={start:el.selectionStart,end:el.selectionEnd};};
  const insert=(text:string,range=selection.current)=>{
    const el=input.current;if(!el || !alive.current || composing.current)return false;
    el.focus();el.setSelectionRange(range.start,range.end);
    if(!text || !document.execCommand('insertText',false,text))el.setRangeText(text,range.start,range.end,'end');
    el.setSelectionRange(range.start+text.length,range.start+text.length);
    remember();commit(el.value);setMenu(null);return true;
  };
  const captureInsert=(asImage=false,target=selection.current)=>{
    const el=input.current,snapshot=el?.value,range={...target};
    return (text:string)=>{
      if(!alive.current)return false;
      if(!el || el.value!==snapshot){setNotice('입력 위치가 변경되었습니다. 다시 삽입해 주세요.');return false;}
      const before=asImage && range.start>0 && snapshot?.[range.start-1]!=='\n'?'\n':'';
      const after=asImage && range.end<(snapshot?.length||0) && snapshot?.[range.end]!=='\n'?'\n':'';
      return insert(before+text+after,range);
    };
  };
  const image=()=>{
    if(!latest.current.options.onImageDialog){setNotice('사진 삽입 도구가 연결되지 않았습니다.');return;}
    const el=input.current;if(!el)return;
    const start=el.value.lastIndexOf('\n',Math.max(0,selection.current.start-1))+1;
    const end=el.value.indexOf('\n',selection.current.end);
    const line=el.value.slice(start,end<0?el.value.length:end);
    const existing=/^\s*!\[[^\]]*\]\([^\n]+\)\s*$/.test(line);
    latest.current.options.onImageDialog(captureInsert(true,existing?{start,end:end<0?el.value.length:end}:selection.current),existing?line:undefined);
  };
  const upload=async(file:File)=>{
    if(composing.current){setNotice('한글 조합을 마친 뒤 사진을 넣어 주세요.');return;}
    // A picturebook has one representative image: paste/drop replaces that
    // reference instead of inserting another picture at the body caret.
    const el=input.current;
    const first=el?.value.match(/^[ \t]*!\[[^\n]*\]\([^\n]+\)[ \t]*$/m);
    const target=first && first.index!==undefined?{start:first.index,end:first.index+first[0].length}:{start:0,end:0};
    const apply=captureInsert(true,target);
    try {
      const save=latest.current.options.onImageFile;
      if(!save)throw new Error('사진 저장 도구가 연결되지 않았습니다.');
      const path=await save(file);if(!path)throw new Error('사진 저장에 실패했습니다.');
      const alt=file.name.replace(/[\[\]\r\n]/g,'');
      apply(`![${alt}](<${path}>)`);
    }catch(error){if(alive.current)setNotice(error instanceof Error?error.message:'사진 저장에 실패했습니다.');}
  };
  const execute=(id:string)=>{
    const el=input.current;if(!el || composing.current)return false;
    if(slashRange.current){insert('',slashRange.current);slashRange.current=null;}
    const tool=TOOLBAR_ITEMS.find(item=>item.id===id);if(!tool)return false;
    // latest.current.options.onFloatingToolbar?.(false,{top:0,left:0});
    const range={...selection.current},selected=el.value.slice(range.start,range.end);
    if(id==='image'){image();return true;}
    if(id==='youtube' || id==='map'){
      const open=latest.current.options.onMediaDialog;
      if(open)open(id==='map'?'map':'video',captureInsert());
      else setNotice('미디어 도구가 연결되지 않았습니다.');
      return true;
    }
    if(id==='math' && latest.current.options.onFormulaDialog){latest.current.options.onFormulaDialog(captureInsert());return true;}
    const wrapped:Record<string,[string,string]>={bold:['**','**'],italic:['*','*'],strikethrough:['~~','~~'],inlineCode:['`','`'],underline:['<u>','</u>']};
    if(wrapped[id])return insert(wrapped[id][0]+(selected||'내용')+wrapped[id][1],range);
    if(id.startsWith('quote') && id!=='quote'){
      return insert(tool.insertText+(selected?selected.split('\n').join('\n> '):'내용'),range);
    }
    if(/^h[1-6]$/.test(id) || ['list','orderedList','checklist','quote','clear'].includes(id)){
      const from=el.value.lastIndexOf('\n',range.start-1)+1;
      const stop=el.value.indexOf('\n',Math.max(range.start,range.end-1)),to=stop<0?el.value.length:stop;
      const lines=el.value.slice(from,to).split('\n').map((line,i)=>{
        const body=line.replace(/^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)/,'');
        const prefix=id==='clear'?'':/^h[1-6]$/.test(id)?'#'.repeat(Number(id[1]))+' ':id==='orderedList'?`${i+1}. `:id==='checklist'?'- [ ] ':id==='quote'?'> ':'- ';
        return prefix+body;
      });return insert(lines.join('\n'),{start:from,end:to});
    }
    if(id==='now')return insert(new Date().toLocaleDateString('sv-SE'));
    if(id==='footnote')return insert('[^1]\n\n[^1]: 각주 내용');
    if(['save','saveAs','undo','redo','find','replace','globalSearch','styleSettings','aiHelp','add_reference'].includes(id)){
      if(id==='undo' || id==='redo'){el.focus();document.execCommand(id);commit(el.value);remember();}
      else latest.current.options.onAction?.(({styleSettings:'TOGGLE_CSS_STYLE',aiHelp:'AI_DRAFT',add_reference:'ADD_REFERENCE'} as Record<string,string>)[id]||id.replace(/([A-Z])/g,'_$1').toUpperCase());
      setMenu(null);return true;
    }
    // Raw manuscript commands insert Markdown at the actual textarea selection.
    const template=tool.insertText || (id==='math'?'$$\nE=mc^2\n$$':id==='taglink'?'[문서명](<문서.md>)':'');
    if(!template){setNotice('이 명령은 본문 편집 도구에서 사용해 주세요.');return true;}
    return insert(selected?template.replace(/텍스트|제목|홈페이지명/,selected):template);
  };
  const bridge=(command:string)=>{
    if(['SAVE','SAVE_AS','FIND','REPLACE','GLOBAL_SEARCH','AI_DRAFT','ADD_REFERENCE','TOGGLE_CSS_STYLE'].includes(command))return false;
    if(command.startsWith('INSERT_TEXT:'))return insert(command.slice(12));
    if(command.startsWith('INSERT_SAVED_IMAGE:'))return insert(`![사진](<${command.slice(19)}>)`);
    if(command==='FOCUS'){input.current?.focus();return true;}
    if(command==='SLASH_COMMAND' || command==='TOGGLE_FLOATING_TOOLBAR'){
      if(command==='TOGGLE_FLOATING_TOOLBAR' && latest.current.options.onFloatingToolbar){
        const rect=input.current?.getBoundingClientRect();
        if(rect)latest.current.options.onFloatingToolbar(!latest.current.options.floatingToolbarVisible,{top:rect.top,left:rect.left});
        return true;
      }
      setQuery('');setActive(0);setMenu(command==='SLASH_COMMAND'?'slash':'format');return true;
    }
    const aliases:Record<string,string>={CODE:'codeblock',CODE_BLOCK:'codeblock',CHECK:'checklist',CHECKLIST:'checklist',REMOVE_PREFIX:'clear',HR:'divider',IMAGE:'image'};
    const tool=TOOLBAR_ITEMS.find(item=>item.id===(aliases[command]||'') || item.id.replace(/([A-Z])/g,'_$1').toUpperCase()===command);
    return tool?execute(tool.id):false;
  };
  const currentBridge=useRef(bridge);currentBridge.current=bridge;
  const registered=useRef<((command:string)=>boolean)|null>(null);
  const activate=()=>{
    if(!registered.current)registered.current=command=>currentBridge.current(command);
    if(latest.current.options.commandRef)latest.current.options.commandRef.current=registered.current;
  };
  useEffect(()=>{
    alive.current=true;
    return()=>{alive.current=false;const ref=latest.current.options.commandRef;if(ref?.current===registered.current)ref.current=null;};
  },[]);
  const updateMenu=()=>{
    remember();const el=input.current;if(!el || composing.current)return;
    const match=el.value.slice(0,el.selectionStart).match(/(?:^|\s)\/([^\s/]*)$/);
    if(match){slashRange.current={start:el.selectionStart-match[1].length-1,end:el.selectionStart};setQuery(match[1]);setActive(0);setMenu('slash');}
    else if(menu==='slash'){setMenu(null);slashRange.current=null;}
  };
  return <div className="picturebook-scene-input" data-editor-controls>
    <textarea ref={input} aria-label={label}
    className="block w-full border rounded p-2 mt-2 font-mono" rows={6} defaultValue={value}
    onFocus={()=>{activate();remember();}} onSelect={remember}
    onKeyDown={event=>{
      if(composing.current || event.nativeEvent.isComposing)return;
      const file=desktopClipboardImage(event);
      if(file){event.preventDefault();event.stopPropagation();void upload(file);return;}
      if(event.key==='Escape'){setMenu(null);slashRange.current=null;return;}
      if(menu && items.length && ['ArrowDown','ArrowUp','Enter','Tab'].includes(event.key)){
        event.preventDefault();event.stopPropagation();
        if(event.key==='ArrowDown')setActive((active+1)%items.length);
        else if(event.key==='ArrowUp')setActive((active+items.length-1)%items.length);
        else execute(items[active]?.id||items[0].id);return;
      }
      if((event.ctrlKey||event.metaKey) && event.code==='Space'){event.preventDefault();event.stopPropagation();bridge('TOGGLE_FLOATING_TOOLBAR');return;}
      const tool=configuredHotkeyItem(event.nativeEvent,latest.current.options.customHotkeys);
      if(tool){event.preventDefault();event.stopPropagation();execute(tool.id);return;}
      if(event.key==='Tab'){event.preventDefault();event.stopPropagation();insert(' '.repeat(latest.current.options.tabSize||4));}
    }}
    onPaste={event=>{
      const file=Array.from(event.clipboardData.files).find(file=>file.type.startsWith('image/'));
      if(file){event.preventDefault();event.stopPropagation();remember();void upload(file);}
    }}
    onDragOver={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='copy';}}}
    onDrop={event=>{
      const file=Array.from(event.dataTransfer.files).find(file=>file.type.startsWith('image/'));
      if(file){event.preventDefault();event.stopPropagation();remember();void upload(file);}
    }}
    onCompositionStart={() => { composing.current = true; }}
    onCompositionEnd={event => { composing.current = false; commit(event.currentTarget.value);updateMenu(); }}
    onChange={event => {
      if (!composing.current && !(event.nativeEvent as InputEvent).isComposing){commit(event.currentTarget.value);updateMenu();}
    }}
    onBlur={event => { if (!composing.current) commit(event.currentTarget.value); }}
  />
    {menu && <div role="menu" aria-label={menu==='slash'?'장면 슬래시 명령어':'장면 서식 도구'} className="flex flex-wrap gap-1 border rounded p-2 bg-white text-zinc-800 max-h-48 overflow-auto">
      {items.map((item,index)=><button type="button" role="menuitem" key={item.id} className={`border rounded px-2 py-1 ${index===active?'bg-blue-100':''}`} onMouseDown={e=>e.preventDefault()} onClick={()=>execute(item.id)}>{menu==='slash'?'/'+item.command:item.name}</button>)}
      {!items.length && <span>일치하는 명령어가 없습니다.</span>}
    </div>}
    {notice && <p role="status" className="text-amber-700 text-xs mt-1">{notice}</p>}
  </div>;
}
