import {requireResourceSettings,getResourceSettings} from './resourceSettings';
import {idb} from './indexedDbHelper';
import {getSavedDriveToken,listDriveChildren} from './gdrive/googleDriveClient';
export interface WatermarkResource {name:string;reference:string;read:()=>Promise<Blob>}
export function watermarkResourceIdentity(){
 const s=requireResourceSettings();return JSON.stringify([s.kind,s.path,s.folderId||'',s.mediaFolderId||'']);
}
export function watermarkReferenceKey(reference:string){
 try{const u=new URL(reference,'https://resource.invalid');u.searchParams.delete('v');return u.href;}catch{return reference;}
}
export async function validateWatermarkImage(file:Blob){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('10MB 이하의 PNG·JPG·WebP 이미지를 선택해 주세요.');
 const image=await createImageBitmap(file);const size=image.width*image.height;image.close();if(size>40000000)throw Error('이미지 크기를 줄여 주세요. 최대 4천만 픽셀입니다.');
}
export async function listWatermarkResources():Promise<WatermarkResource[]>{
 const settings=getResourceSettings(),accepted=(name:string)=>/\.(png|jpe?g|webp)$/i.test(name);
 if(!settings)throw Error('환경설정에서 리소스 폴더를 연결해 주세요.');
 const api=(window as any).electronAPI;
 if(settings.kind==='drive'){
  const token=getSavedDriveToken();if(!token||!settings.mediaFolderId)throw Error('구글 드라이브 리소스 폴더를 다시 연결해 주세요.');
  const files=await listDriveChildren(token,settings.mediaFolderId);
  return files.filter(f=>!f.isFolder&&accepted(f.name)).map(f=>({name:f.name,reference:`/media/${encodeURIComponent(f.name)}?driveId=${encodeURIComponent(f.id)}`,read:async()=>{
   const fresh=getSavedDriveToken();if(!fresh)throw Error('구글 드라이브를 다시 연결해 주세요.');
   const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}?alt=media`,{headers:{Authorization:`Bearer ${fresh}`}});
   if(!response.ok)throw Error('워터마크 이미지를 읽지 못했습니다.');return response.blob();
  }}));
 }
 if(api){
  const directory=settings.path.replace(/[\\/]$/,'')+'/media';
  const files=await api.listDirectory(directory);
  return files.filter((f:any)=>f.kind==='file'&&accepted(f.name)).map((f:any)=>{
   const absolute=f.path||directory+'/'+f.name;
   return {name:f.name,reference:`media://local/serve?url=${encodeURIComponent(absolute)}`,read:async()=>{
    const bytes=await api.readTransferFile(absolute);
    return new Blob([new Uint8Array(bytes)],{type:/\.png$/i.test(f.name)?'image/png':/\.webp$/i.test(f.name)?'image/webp':'image/jpeg'});
   }};
  });
 }
 let handle=(window as any).__resourceFolderHandle;
 if(!handle||handle.name!==settings.path)handle=await idb.get('resourceFolderHandle');
 if(!handle||handle.name!==settings.path)throw Error('리소스 폴더를 다시 연결해 주세요.');
 let media;try{media=await handle.getDirectoryHandle('media');}catch(error:any){if(error.name==='NotFoundError')return [];throw error;}
 const files:WatermarkResource[]=[];
 for await(const [name,child]of media.entries())if(child.kind==='file'&&accepted(name))files.push({name,reference:`/media/${encodeURIComponent(name)}`,read:()=>child.getFile()});
 return files.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
