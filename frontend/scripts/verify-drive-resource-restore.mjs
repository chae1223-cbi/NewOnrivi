import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/gdrive/googleDriveClient.ts',import.meta.url),'utf8');
const start=source.indexOf('export async function resolveDriveResourceFolderByName(');
const end=source.indexOf('\n/**',start);
let status=200, trashed=false, saved, mimeType='application/vnd.google-apps.folder';
const calls=[];
let settings={kind:'drive',folderId:'chosen-id',path:'old-name'};
globalThis.restoreMocks={
 resolveAuthToken:t=>t,
 getResourceSettings:()=>settings,
 fetch:async url=>{calls.push(url);return {ok:status===200,status,json:async()=>({id:'chosen-id',name:'renamed-folder',mimeType,trashed})};},
 initializeDriveResourceFolder:async(t,id)=>{calls.push(['initialize',id]);return {profilesFolderId:id+'/profiles'};},
 saveResourceSettings:s=>{saved=s;},
 ensureDriveFolder:async(t,name,parent)=>{calls.push(['ensure',parent,name]);return parent+'/'+name;},
};
const input='const {'+Object.keys(globalThis.restoreMocks).join(',')+'}=globalThis.restoreMocks;\n'+source.slice(start,end);
const code=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {resolveDriveResourceFolderByName:resolve}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal((await resolve('token')).folderId,'chosen-id');
assert.equal(saved.path,'renamed-folder');
assert.equal(calls.length,2);assert(calls[0].includes('/chosen-id?'));
saved=null;status=403;await assert.rejects(resolve('token'),/HTTP 403/);assert.equal(saved,null);
status=404;assert.equal((await resolve('token')).folderId,'root/OnriviAuthor/old-name');
assert.equal(saved.profilesFolderId,'root/OnriviAuthor/old-name/profiles');
status=200;trashed=true;assert.equal((await resolve('token')).folderId,'root/OnriviAuthor/old-name');
trashed=false;mimeType='application/json';assert.equal((await resolve('token')).folderId,'root/OnriviAuthor/old-name');
settings=null;assert.equal((await resolve('token')).folderId,'root/OnriviAuthor/참조파일');
console.log('PASS: settings first, existing ID reused, missing/trashed/invalid resource recreated and initialized, unset resources created, permission errors preserved');
