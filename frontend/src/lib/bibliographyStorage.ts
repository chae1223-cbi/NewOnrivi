import { getResourceSettings } from './resourceSettings';
import { idb } from './indexedDbHelper';
import { getSavedDriveToken, getSavedWorkspaceInfo, listDriveChildren, readDriveFileContent } from './gdrive/googleDriveClient';
export type BibliographyFile={name:string;content:string;path?:string;handle?:any;driveId?:string};
export async function loadBibliographyFiles(resourceFolderHandle?:any):Promise<BibliographyFile[]>{
  const settings=getResourceSettings();if(!settings)return [];
  const api=(window as any).electronAPI;
  if(settings.kind==='drive'){
    const token=getSavedDriveToken();if(!token)throw Error('구글 드라이브를 다시 연결해 주세요.');
    let folder=settings.bibleFolderId||getSavedWorkspaceInfo()?.bibleFolderId;
    if(!folder){const parent=settings.folderId||getSavedWorkspaceInfo()?.resourceFolderId;if(parent)folder=(await listDriveChildren(token,parent)).find(f=>f.isFolder&&f.name==='bible')?.id;}
    if(!folder)throw Error('참고문헌 폴더 연결을 확인해 주세요.');
    const files=(await listDriveChildren(token,folder)).filter(f=>!f.isFolder&&/\.bib$/i.test(f.name));
    return Promise.all(files.map(async f=>({name:f.name,driveId:f.id,content:await readDriveFileContent(token,f.id)})));
  }
  if(api){
    const folder=settings.path.replace(/[\\/]$/,'')+'/bible';
    const files=await api.listDirectory(folder);
    return Promise.all(files.filter((f:any)=>f.kind==='file'&&/\.bib$/i.test(f.name)).map(async(f:any)=>({name:f.name,path:f.path,content:(await api.readFromPath(f.path))?.content||''})));
  }
  let handle=resourceFolderHandle;
  if(!handle || handle.name!==settings.path)handle=await idb.get('resourceFolderHandle');
  if(!handle || handle.name!==settings.path)throw Error('참고문헌 리소스 폴더를 다시 연결해 주세요.');
  let dir;try{dir=await handle.getDirectoryHandle('bible');}catch(e:any){if(e.name==='NotFoundError')return [];throw e;}
  const files:BibliographyFile[]=[];
  for await(const [name,h]of dir.entries())if(h.kind==='file'&&/\.bib$/i.test(name))files.push({name,handle:h,content:await(await h.getFile()).text()});
  return files;
}
