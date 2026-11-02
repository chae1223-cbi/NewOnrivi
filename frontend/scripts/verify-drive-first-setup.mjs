import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/lib/gdrive/googleDriveClient.ts',import.meta.url),'utf8');
const start=source.indexOf('export async function createDefaultDriveFolders(');
const end=source.indexOf('export async function setupOnriviDriveWorkspace(',start);
const folders=new Map(),files=new Map();
globalThis.setupMocks={
 resolveAuthToken:t=>t,SYSTEM_PROFILES:[{id:'system-1',name:'기본서식'}],isSystemProfileId:id=>id==='system-1',
 ensureDriveFolder:async(t,name,parent)=>{const key=parent+'/'+name;if(!folders.has(key))folders.set(key,key);return folders.get(key);},
 ensureDriveTextFile:async(t,name,parent,content)=>{const id=parent+'/'+name;if(!files.has(id))files.set(id,content);return id;},
 findDriveFile:async(t,name,parent)=>parent+'/'+name,
 readDriveFileContent:async(t,id)=>files.get(id),
 saveDriveFileContent:async(t,id,content)=>{files.set(id,content);return true;},
};
const input='const {'+Object.keys(globalThis.setupMocks).join(',')+'}=globalThis.setupMocks;\n'+source.slice(start,end);
const code=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createDefaultDriveFolders,initializeDriveResourceFolder}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const initial=await createDefaultDriveFolders('token');
assert.equal(initial.workspace.id,'root/OnriviAuthor/작업장');
assert.equal(initial.resource.id,'root/OnriviAuthor/참조파일');
await initializeDriveResourceFolder('token',initial.resource.id);
assert.equal(folders.size,8);assert.equal(files.size,6);
const profileId=initial.resource.id+'/profiles/userCssProfiles.json';
files.set(profileId,JSON.stringify([{id:'system-1',name:'기본서식'},{id:'custom',name:'보존할 서식'}]));
await createDefaultDriveFolders('token');await initializeDriveResourceFolder('token',initial.resource.id);
assert.equal(folders.size,8);assert.equal(files.size,6);
assert.equal(JSON.parse(files.get(profileId))[1].name,'보존할 서식');
console.log('PASS: first setup creates root/workspace/resources, five subfolders and six files; repeat setup preserves custom profiles without duplicates');
