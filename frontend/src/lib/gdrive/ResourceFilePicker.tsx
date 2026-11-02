'use client';
import React, {useEffect, useState} from 'react';
import {getResourceSettings,requireResourceSettings} from '../resourceSettings';
import {createRoot} from 'react-dom/client';
import {listDriveChildren, type GoogleDriveFileItem} from './googleDriveClient';

type PickerOptions = { foldersOnly?:boolean; title?: string; accept?: (file: GoogleDriveFileItem) => boolean };
function Picker({token,rootId,done,options}:{token:string;rootId:string;options:PickerOptions;done:(file:GoogleDriveFileItem|null)=>void}) {
  const [path,setPath]=useState([{id:rootId,name:rootId === 'root' ? '내 드라이브' : '리소스 폴더'}]);
  const [globalSearch,setGlobalSearch]=useState('');
  const [items,setItems]=useState<GoogleDriveFileItem[]>([]);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const id=path[path.length-1].id;
  useEffect(()=>{let active=true;setLoading(true);setError('');setItems([]);setQuery('');
    listDriveChildren(token,id,globalSearch).then(files=>{if(active)setItems(files)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[token,id,globalSearch]);
  return <div className="fixed inset-0 z-[99999999] bg-black/60 flex items-center justify-center p-4" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();done(null)}}}>
    <section role="dialog" aria-modal="true" aria-label={options.title || "구글 드라이브 파일 선택"} className="bg-white text-slate-900 rounded-xl shadow-xl p-6 w-full max-w-xl space-y-4">
      <h2 className="font-bold text-lg">{options.title || "구글 드라이브 파일 선택"}</h2>
      <div className="flex gap-3"><button className="border rounded px-3 py-1" onClick={()=>{setGlobalSearch('');setPath([{id:'root',name:'내 드라이브'}])}}>내 드라이브</button><button className="border rounded px-3 py-1" onClick={()=>{setGlobalSearch('');setPath([{id:rootId,name:'리소스 폴더'}])}}>리소스 폴더</button></div>
      <div className="flex flex-wrap gap-2">{path.map((p,i)=><button key={p.id} className="text-blue-700 underline" onClick={()=>{setGlobalSearch('');setPath(path.slice(0,i+1))}}>{p.name} /</button>)}{globalSearch&&<span>전체 검색: {globalSearch}</span>}</div>
      <input autoFocus aria-label="현재 폴더 파일 검색" placeholder="현재 폴더에서 이름 검색" className="border rounded p-2 w-full" value={query} onChange={e=>setQuery(e.target.value)}/>
      <button className="border rounded px-3 py-1 disabled:opacity-50" disabled={!query.trim()||loading} onClick={()=>setGlobalSearch(query.trim())}>드라이브 전체에서 검색</button>
      <div className="h-72 overflow-auto border rounded p-2">
        {loading?<p>불러오는 중...</p>:error?<p role="alert" className="text-red-700">{error}</p>:<>{items.filter(f=>(f.isFolder||(!options.foldersOnly && (options.accept ? options.accept(f) : true)))&&f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(f=><button key={f.id} className="block text-left w-full p-3 hover:bg-blue-50 rounded" onClick={()=>{if(f.isFolder){setGlobalSearch('');setPath(globalSearch?[{id:'root',name:'내 드라이브'},{id:f.id,name:f.name}]:[...path,{id:f.id,name:f.name}])}else done(f)}}>{f.isFolder?'📁':'🖼️'} {f.name}</button>)}<p className="text-xs text-slate-500 p-2">온리비에 접근 권한이 있는 폴더와 파일이 표시됩니다.</p></>}
      </div>
      <div className="text-right">{options.foldersOnly && <button disabled={loading || !!error || !!globalSearch || id==='root'} className="border rounded px-4 py-2 mr-2 disabled:opacity-50" onClick={()=>done({id,name:path[path.length-1].name,mimeType:'application/vnd.google-apps.folder',isFolder:true})}>이 폴더를 리소스 폴더로 선택</button>}<button className="border rounded px-4 py-2" onClick={()=>done(null)}>취소</button></div>
    </section>
  </div>;
}
export function pickDriveResourceFile(token:string,rootId:string,options:PickerOptions = {}):Promise<GoogleDriveFileItem|null> {
  return new Promise(resolve=>{const container=document.createElement('div');document.body.append(container);const root=createRoot(container);const previous=document.activeElement as HTMLElement|null;
    let settled=false;const done=(file:GoogleDriveFileItem|null)=>{if(settled)return;settled=true;root.unmount();container.remove();previous?.focus();resolve(file)};
    root.render(<Picker token={token} rootId={rootId} done={done} options={options}/>);
  });
}

export function pickDriveResourceImage(token:string,rootId:string) { return pickDriveResourceFile(token,rootId,{title:"구글 드라이브 이미지 선택",accept:f=>f.mimeType.startsWith("image/")}); }

export async function pickResourceTextFile(accept:string, rootId?:string, cloud?:boolean):Promise<{name:string;content:string;id?:string}|null> {
  const client = await import('./googleDriveClient');
  requireResourceSettings();
  const useDrive = getResourceSettings()?.kind === 'drive';
  if (useDrive) {
    const token = client.getSavedDriveToken(); const info = client.getSavedWorkspaceInfo();
    if (!token || !info) throw new Error('구글 드라이브를 먼저 연결해 주세요.');
    const file = await pickDriveResourceFile(token,rootId || info.resourceFolderId,{accept:f=>accept.split(',').some(ext=>f.name.toLowerCase().endsWith(ext.trim()))});
    if (!file) return null;
    return {name:file.name,id:file.id,content:await client.readDriveFileContent(token,file.id)};
  }
  return new Promise(resolve=>{
    const input=document.createElement('input'); input.type='file';input.accept=accept;
    input.onchange=async()=>{const file=input.files?.[0];try {resolve(file ? {name:file.name,content:await file.text()} : null);} finally {input.remove();}};
    input.addEventListener('cancel',()=>{input.remove();resolve(null);},{once:true});
    input.style.display='none';document.body.append(input);input.click();
  });
}

export function pickDriveResourceFolder(token:string) { return pickDriveResourceFile(token,"root",{title:"리소스 폴더 선택 — 선택한 폴더 안에 기본 파일을 생성합니다",foldersOnly:true}); }

function LocalPicker({rootHandle,accept,done}:{rootHandle:any;accept:(name:string)=>boolean;done:(file:File|null)=>void}) {
  const [folders,setFolders] = useState<any[]>([rootHandle]);
  const [entries,setEntries] = useState<any[]>([]);
  const [error,setError] = useState('');
  const current = folders[folders.length-1];
  useEffect(()=>{let active=true;setEntries([]);setError('');void (async()=>{
    const items=[];for await(const entry of current.values())if(entry.kind==='directory'||accept(entry.name))items.push(entry);
    if(active)setEntries(items.sort((a,b)=>a.kind===b.kind?a.name.localeCompare(b.name):a.kind==='directory'?-1:1));
  })().catch(e=>{if(active)setError(e.message);});return()=>{active=false};},[current,accept]);
  return <div className="fixed inset-0 z-[99999999] bg-black/60 flex items-center justify-center p-4" onKeyDown={e=>{if(e.key==='Escape')done(null)}}>
    <section role="dialog" aria-modal="true" aria-label="로컬 리소스 파일 선택" className="bg-white text-slate-900 rounded-xl p-6 w-full max-w-xl">
      <h2 className="font-bold">로컬 리소스 파일 선택</h2>
      <div className="flex gap-2 my-3">{folders.map((folder,index)=><button key={index} className="text-blue-700 underline" onClick={()=>setFolders(folders.slice(0,index+1))}>{folder.name} /</button>)}</div>
      {error && <p role="alert">{error}</p>}
      <div className="h-72 overflow-auto">{entries.map(entry=><button key={entry.name} className="block w-full p-3 text-left hover:bg-blue-50" onClick={()=>{if(entry.kind==='directory')setFolders([...folders,entry]);else void entry.getFile().then(done).catch((e:any)=>setError(e.message));}}>{entry.kind==='directory'?'📁':'📄'} {entry.name}</button>)}</div>
      <button className="border rounded px-3 py-2" onClick={()=>done(null)}>취소</button>
    </section>
  </div>;
}
export function pickLocalResourceFile(handle:any,accept:(name:string)=>boolean):Promise<File|null> {
  return new Promise(resolve=>{const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
    const previous=document.activeElement as HTMLElement|null;let settled=false;
    const done=(file:File|null)=>{if(settled)return;settled=true;root.unmount();container.remove();previous?.focus();resolve(file)};
    root.render(<LocalPicker rootHandle={handle} accept={accept} done={done}/>);
  });
}
