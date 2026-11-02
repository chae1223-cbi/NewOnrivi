import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
let permission='granted',savedHandle,picks=0,requests=0;
let settings={kind:'browser',path:'Onrivi_Asset'};
const users=[{id:'local-one',name:'로컬 서식'}];
const handle={name:'Onrivi_Asset',queryPermission:async()=>permission,requestPermission:async()=>{requests++;return permission='granted';},getDirectoryHandle:async name=>{
 assert.equal(name,'profiles');return {getFileHandle:async name=>{assert.equal(name,'userCssProfiles.json');return {getFile:async()=>({text:async()=>JSON.stringify(users)})};}};
}};
savedHandle=handle;
globalThis.window={showDirectoryPicker:async()=>{picks++;return handle;}};
globalThis.localStorage={getItem:()=>null};
globalThis.localMocks={getResourceSettings:()=>settings,getSavedDriveToken:()=>null,
 idb:{get:async()=>savedHandle,set:async(k,v)=>{savedHandle=v;}},
 saveResourceSettings:value=>{settings=value;}};
let source=fs.readFileSync(new URL('../src/lib/profileStorage.ts',import.meta.url),'utf8').replace(/^import[\s\S]*?;\r?\n/gm,'');
source='const {'+Object.keys(globalThis.localMocks).join(',')+'}=globalThis.localMocks;\n'+source;
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {fetchUserProfiles,reconnectLocalProfileFolder,restoreLocalProfileFolder}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(await restoreLocalProfileFolder(),true);
assert.equal(window.__resourceFolderHandle,handle);
assert.deepEqual(await fetchUserProfiles(null,null,'local'),users);
permission='prompt';await assert.rejects(fetchUserProfiles(null,null,'local'),/권한/);
assert.equal(await restoreLocalProfileFolder(),false);assert.equal(picks,0);assert.equal(requests,0);
await reconnectLocalProfileFolder();assert.equal(requests,1);assert.equal(picks,0);
assert.deepEqual(await fetchUserProfiles(null,null,'local'),users);
savedHandle=null;delete window.__resourceFolderHandle;
await assert.rejects(fetchUserProfiles(null,null,'local'),/접근/);
await reconnectLocalProfileFolder();assert.equal(picks,1);
assert.deepEqual(await fetchUserProfiles(null,null,'local'),users);
console.log('PASS: saved local handle read, revoked permission recovery, missing handle picker recovery, existing JSON preserved');
