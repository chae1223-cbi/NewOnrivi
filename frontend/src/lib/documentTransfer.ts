import { idb } from '@/lib/indexedDbHelper';
import { browserPickerStartIn } from './browserPickerStartIn';
import { getResourceSettings, activateDriveAccount } from '@/lib/resourceSettings';
import { ensureDriveFolder, getSavedDriveToken, hasValidDriveToken, requestGoogleDriveAuth, fetchGoogleUserInfo, getSavedWorkspaceInfo, setupOnriviDriveWorkspace, listDriveChildren, uploadDriveImage, createDriveMarkdownFile, readDriveFileContent } from '@/lib/gdrive/googleDriveClient';

type LocalFolder = { path?: string; handle?: any };
type Reference = { url: string; category: string; name: string; relativePath: string; driveId?: string; nativePath?: string; positions: Array<{start:number;end:number}> };
const categories = ['media', 'profiles', 'prompt', 'bible', 'db'];

// 코드 예제는 제외하고 참조 정의와 HTML 속성도 확인한다.
export function findTransferReferences(markdown: string): Reference[] {
  const source = markdown.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, value=>' '.repeat(value.length)).replace(/`[^`\n]*`/g, value=>' '.repeat(value.length));
  const urls = new Map<string, Array<{start:number;end:number}>>();
  const patterns = [/!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g, /^ {0,3}\[[^\]\n]+\]:\s*<?([^\s>]+)>?/gm, /(?:src|href)=["']([^"']+)["']/g];
  for (const pattern of patterns) for (const match of Array.from(source.matchAll(pattern))) {
    const url = match[1].replace(/^<|>$/g, '');
    const afterLabel = pattern===patterns[0] ? match[0].indexOf('](')+2 : pattern===patterns[1] ? match[0].indexOf(']:')+2 : 0;
    const start = match.index! + match[0].indexOf(match[1],afterLabel) + (match[1].startsWith('<')?1:0);
    const positions = urls.get(url) || [];
    positions.push({start,end:start+url.length}); urls.set(url,positions);
  }
  const result: Reference[] = [];
  for (const [url,positions] of Array.from(urls)) {
    let decoded: string;
    try { decoded = decodeURIComponent(url); } catch { throw new Error(`참조 경로를 확인할 수 없습니다: ${url}`); }
    const local = url.startsWith('media://local/serve') ? new URL(url).searchParams.get('url') : null;
    const driveId = /[?&]driveId=([^&#]+)/.exec(url)?.[1];
    if (!local && !driveId && /^(?:https?:|#|mailto:)/i.test(url)) continue;
    if (/^(?:data:|blob:)/i.test(url)) throw new Error('내장 이미지를 사진 파일로 저장한 후 동기화해 주세요.');
    const normalized = (local || decoded).replace(/\\/g, '/');
    const category = categories.find(value => normalized.includes(`/${value}/`) || normalized.startsWith(`${value}/`));
    if (!local && !driveId && !category) {
      if (/\.(?:png|jpe?g|gif|webp|svg|avif|bmp|mp4|mp3|wav|pdf|zip)(?:[?#]|$)/i.test(normalized)) throw new Error(`참조 폴더 밖의 파일 경로를 확인해 주세요: ${url}`);
      continue;
    }
    const name = normalized.split('/').pop()?.split(/[?#]/)[0] || '';
    if (!name || /[\\/:*?"<>|]/.test(name) || name === '.' || name === '..') throw new Error('참조 파일 이름이 올바르지 않습니다.');
    const resourcePart = category ? normalized.slice(normalized.indexOf(`${category}/`)+category.length+1).split(/[?#]/)[0] : name;
    if (resourcePart.split('/').some(part=>!part || part==='.' || part==='..' || /[\\:*?"<>|]/.test(part))) throw new Error('참조 파일 경로가 올바르지 않습니다.');
    const isNative = /^[A-Za-z]:\//.test(normalized) || (normalized.startsWith('/') && !categories.some(value=>normalized.startsWith(`/${value}/`)));
    result.push({url, category: category || 'media', name, relativePath:resourcePart, positions, driveId: driveId && decodeURIComponent(driveId), nativePath: local || (isNative ? normalized : undefined)});
  }
  return result;
}

async function chooseLocalFolder(initial?: LocalFolder): Promise<LocalFolder | null> {
  const api = (window as any).electronAPI;
  if (api?.selectFolder) {
    const selected = await api.selectFolder(initial?.path);
    return selected?.status === 'success' ? {path: selected.path} : null;
  }
  if (!(window as any).showDirectoryPicker) throw new Error('내 컴퓨터 폴더 선택은 Chrome 또는 Edge에서 사용해 주세요.');
  const startIn = await browserPickerStartIn(initial?.handle);
  return {handle: await (window as any).showDirectoryPicker({mode:'readwrite', ...(startIn ? {startIn} : {})})};
}

async function writeLocalCopy(folder: LocalFolder, relativePath: string, blob: Blob) {
  if (folder.path) return (window as any).electronAPI.writeTransferCopy(folder.path, relativePath, new Uint8Array(await blob.arrayBuffer()));
  const parts = relativePath.split('/');
  let directory = folder.handle;
  for (const part of parts.slice(0,-1)) directory = await directory.getDirectoryHandle(part,{create:true});
  const name = parts[parts.length-1];
  const dot = name.lastIndexOf('.');
  for (let index=0; index<10000; index++) {
    const candidate = !index ? name : dot>0 ? `${name.slice(0,dot)}_${index}${name.slice(dot)}` : `${name}_${index}`;
    try {
      const existing = await directory.getFileHandle(candidate);
      const bytes = new Uint8Array(await (await existing.getFile()).arrayBuffer());
      const incoming = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length===incoming.length && bytes.every((value,i)=>value===incoming[i])) return {relativePath:[...parts.slice(0,-1),candidate].join('/'),reused:true};
      continue;
    } catch (error:any) { if (error.name!=='NotFoundError') throw error; }
    const handle = await directory.getFileHandle(candidate,{create:true});
    const writer = await handle.createWritable();
    await writer.write(blob); await writer.close();
    return {relativePath:[...parts.slice(0,-1),candidate].join('/'),reused:false};
  }
  throw new Error('동일 이름 파일이 너무 많습니다.');
}

async function readReference(ref: Reference, token: string | null, resource: LocalFolder): Promise<Blob> {
  if (ref.driveId) {
    if (!token) throw new Error('Google Drive 연결을 확인해 주세요.');
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(ref.driveId)}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});
    if (!response.ok) throw new Error(`Drive 참조 파일 읽기 실패 (HTTP ${response.status})`);
    return response.blob();
  }
  const api = (window as any).electronAPI;
  if (api?.readTransferFile && (ref.nativePath || resource.path)) return new Blob([await api.readTransferFile(ref.nativePath || `${resource.path}/${ref.category}/${ref.relativePath}`)]);
  if (!resource.handle) throw new Error('로컬 리소스 폴더의 접근 권한을 다시 설정해 주세요.');
  let dir = await resource.handle.getDirectoryHandle(ref.category);
  for (const part of ref.relativePath.split('/').slice(0,-1)) dir = await dir.getDirectoryHandle(part);
  return (await dir.getFileHandle(ref.name)).getFile();
}

export type SavedTransfer = {markdown:string;node:any;root:any;workspaceType:'cloud'|'local'|'browser';parentHandle?:any};
export async function transferDocument(options: { direction:'download'|'upload'; markdown:string; name:string; onProgress:(message:string)=>void; sourceKind?:'local'|'drive'; initialLocalFolder?:LocalFolder; initialDrivePath?:Array<{id:string;name:string}>; onSaved?:(saved:SavedTransfer)=>void }): Promise<string> {
  const {direction, markdown, onProgress} = options;
  const name = options.name.replace(/[\\/:*?"<>|]/g,'_');
  if (!name || !/\.md$/i.test(name)) throw new Error('먼저 Markdown 문서를 열어 주세요.');
  const sameStorage = options.sourceKind === (direction==='download'?'local':'drive');
  const references = sameStorage ? [] : findTransferReferences(markdown);
  let token = getSavedDriveToken();
  // Picker/auth must start in the click handler before resource reads.
  let localDestination: LocalFolder | null = null;
  let driveDestination: {id:string;name:string} | null = null;
  if (direction==='download') {
    onProgress('MD를 저장할 내 컴퓨터 폴더를 선택해 주세요.');
    localDestination = await chooseLocalFolder(options.initialLocalFolder);
    if (!localDestination) throw new DOMException('취소','AbortError');
    if (!sameStorage && (!token || !hasValidDriveToken())) token = await requestGoogleDriveAuth();
  } else {
    if (!token || !hasValidDriveToken()) {
      token = await requestGoogleDriveAuth();
      const user = await fetchGoogleUserInfo(token);
      activateDriveAccount(user.email);
    }
    const {pickAccessibleDriveFolder} = await import('@/lib/gdrive/WorkspaceFolderPicker');
    const rootId = await ensureDriveFolder(token!, 'OnriviAuthor', 'root');
    driveDestination = await pickAccessibleDriveFolder(token!,options.initialDrivePath?.length ? options.initialDrivePath : [{id:rootId,name:'OnriviAuthor'}]);
    if (!driveDestination) throw new DOMException('취소','AbortError');
  }
  const localSettings = getResourceSettings('local');
  const resourceHandle = await idb.get('resourceFolderHandle');
  let localResource: LocalFolder = localSettings?.kind==='local' ? {path:localSettings.path} : {handle:resourceHandle};
  if (references.length && !localResource.path && !localResource.handle) {
    if (direction==='upload') throw new Error('환경설정에서 로컬 리소스 폴더를 먼저 지정해 주세요.');
    onProgress('이미지·참조 자료를 저장할 로컬 리소스 폴더를 선택해 주세요.');
    const selected = await chooseLocalFolder();
    if (!selected) throw new DOMException('취소','AbortError');
    localResource = selected;
    const {saveResourceSettings} = await import('@/lib/resourceSettings');
    if (selected.handle) await idb.set('resourceFolderHandle',selected.handle);
    saveResourceSettings({kind:selected.path?'local':'browser',path:selected.path || selected.handle.name},'local',{silent:true});
  }
  let cloud = getResourceSettings('cloud');
  const info = getSavedWorkspaceInfo();
  if (direction==='upload' && references.length && !cloud?.folderId) {
    const workspace = await setupOnriviDriveWorkspace(token!);
    cloud = {kind:'drive',path:'참조폴더',folderId:workspace.resourceFolderId};
  }
  const edits: Array<{start:number;end:number;text:string}> = [];
  let reused = 0;
  for (let index=0; index<references.length; index++) {
    const ref = references[index];
    onProgress(`참조 자료 ${index+1}/${references.length}: ${ref.name}`);
    try {
      // Drive references without an ID are resolved inside the configured resource folder.
      if (direction==='download' && !ref.driveId && !ref.nativePath) {
        const root = cloud?.folderId || info?.resourceFolderId;
        if (!root) throw new Error('Drive 참조 폴더가 설정되지 않았습니다.');
        let directoryId = root;
        for (const part of [ref.category,...ref.relativePath.split('/').slice(0,-1)]) {
          const dirs = await listDriveChildren(token!,directoryId);
          const directory = dirs.find(item=>item.isFolder && item.name===part);
          if (!directory) throw new Error('Drive 참조 하위 폴더를 찾지 못했습니다.');
          directoryId = directory.id;
        }
        const files = await listDriveChildren(token!,directoryId);
        const file = files.find(item=>!item.isFolder && item.name===ref.name);
        if (!file) throw new Error('Drive 참조 파일을 찾지 못했습니다.');
        ref.driveId = file.id;
      }
      const blob = await readReference(ref,token,localResource);
      let replacement: string;
      if (direction==='download') {
        const result = await writeLocalCopy(localResource,`${ref.category}/${ref.relativePath}`,blob);
        if (result.reused) reused++;
        replacement = result.path ? `media://local/serve?url=${encodeURIComponent(result.path)}` : `/${result.relativePath.split('/').map(encodeURIComponent).join('/')}`;
      } else {
        const root = cloud?.folderId || info?.resourceFolderId;
        if (!root) throw new Error('Drive 참조 폴더가 설정되지 않았습니다.');
        let folderId = await ensureDriveFolder(token!,ref.category,root);
        for (const part of ref.relativePath.split('/').slice(0,-1)) folderId = await ensureDriveFolder(token!,part,folderId);
        const uploaded = await uploadDriveImage(token!,folderId,blob,ref.name);
        replacement = `/${ref.category}/${encodeURIComponent(uploaded.name)}?driveId=${encodeURIComponent(uploaded.id)}`;
      }
      for (const position of ref.positions) edits.push({...position,text:replacement});
    } catch(error:any) { throw new Error(`${ref.name}: ${error.message}\nMD 저장을 중단했습니다. 이미 복사된 자료는 유지되며 다시 실행할 수 있습니다.`); }
  }
  let converted = markdown;
  for (const edit of edits.sort((a,b)=>b.start-a.start)) converted = converted.slice(0,edit.start)+edit.text+converted.slice(edit.end);
  onProgress('참조 경로를 반영한 MD를 저장하고 있습니다.');
  if (direction==='download') {
    const result = await writeLocalCopy(localDestination!,name,new Blob([converted],{type:'text/markdown;charset=utf-8'}));
    const finalName = result.relativePath.split('/').pop()!;
    const handle = localDestination!.handle ? await localDestination!.handle.getFileHandle(finalName) : undefined;
    options.onSaved?.({markdown:converted,node:{name:finalName,kind:'file',path:result.path || `${localDestination!.handle.name}/${finalName}`,handle},root:localDestination!.path ? {name:localDestination!.path,path:localDestination!.path} : {name:localDestination!.handle.name,path:localDestination!.handle.name,handle:localDestination!.handle},workspaceType:localDestination!.path?'local':'browser',parentHandle:localDestination!.handle});
    return `${result.path || `${localDestination!.handle.name}/${result.relativePath}`} — 참조 자료 ${references.length}개 (${reused}개 재사용)`;
  }
  const siblings = await listDriveChildren(token!,driveDestination!.id);
  const same = siblings.find(item=>!item.isFolder && item.name===name);
  const finishDrive = (id:string,finalName:string) => options.onSaved?.({markdown:converted,node:{name:finalName,kind:'file',path:`GoogleDrive/${driveDestination!.name}/${finalName}`,id,driveId:id},root:{name:driveDestination!.name,type:'GDRIVE',id:driveDestination!.id,driveFolderId:driveDestination!.id,path:`GoogleDrive/${driveDestination!.name}`},workspaceType:'cloud'});
  if (same && await readDriveFileContent(token!,same.id)===converted) { finishDrive(same.id,name); return `${driveDestination!.name}/${name} — 동일한 MD 재사용, 참조 자료 ${references.length}개`; }
  let finalName=name;
  for(let index=1; siblings.some(item=>item.name===finalName);index++) finalName=name.replace(/\.md$/i,`_${index}.md`);
  const created = await createDriveMarkdownFile(token!,driveDestination!.id,finalName,converted);
  if (options.onSaved && !created?.id) throw new Error('저장된 Drive 파일 ID를 확인할 수 없습니다.');
  finishDrive(created?.id,finalName);
  return `${driveDestination!.name}/${finalName} — 참조 자료 ${references.length}개`;
}
