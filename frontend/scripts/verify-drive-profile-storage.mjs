import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const selected={kind:'drive',path:'사용자 선택 리소스',folderId:'selected-root',profilesFolderId:'stale-folder'};
const custom=[{id:'custom-one',name:'내 서식',rules:{}}];
const calls=[];
let content=JSON.stringify(custom), missing=false, fail=false, saved;
globalThis.window={};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.profileMocks={
 getResourceSettings:()=>selected,requireResourceSettings:()=>selected,
 getSavedDriveToken:()=> 'test-token',SYSTEM_PROFILES:[],isSystemProfileId:id=>id.startsWith('system-'),
 findDriveFolder:async(token,name,parent)=>{calls.push(['folder',parent]);if(fail)throw new Error('403 denied');return 'selected-profiles';},
 findDriveFile:async(token,name,parent)=>{calls.push(['file',parent]);return missing?null:'selected-file';},
 readDriveFileContent:async()=>content,
 ensureDriveTextFile:async(token,name,parent)=>{calls.push(['save',parent]);return 'selected-file';},
 saveDriveFileContent:async(token,id,text)=>{saved=JSON.parse(text);return true;},
};
let source=fs.readFileSync(new URL('../src/lib/profileStorage.ts',import.meta.url),'utf8').replace(/^import[\s\S]*?;\r?\n/gm,'');
source='const {'+Object.keys(globalThis.profileMocks).join(',')+'}=globalThis.profileMocks;\n'+source;
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {fetchUserProfiles,persistUserProfiles,getProfileResourceFolder}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(getProfileResourceFolder('D:/wrong','cloud'),selected.path);
assert.deepEqual(await fetchUserProfiles('D:/wrong',null,'cloud'),custom);
assert.deepEqual(calls,[['folder','selected-root'],['file','selected-profiles']]);
assert.equal(await persistUserProfiles(custom,null,null,'cloud'),true);
assert.deepEqual(saved,custom);assert(calls.some(c=>c[0]==='save'&&c[1]==='selected-profiles'));
content='[]';assert.deepEqual(await fetchUserProfiles(null,null,'cloud'),[]);
content='{broken';await assert.rejects(fetchUserProfiles(null,null,'cloud'),/JSON/);
missing=true;await assert.rejects(fetchUserProfiles(null,null,'cloud'),/찾지 못/);missing=false;
fail=true;await assert.rejects(fetchUserProfiles(null,null,'cloud'),/403/);
console.log('PASS: selected-root read/write, stale ID ignored, custom profiles retained, empty JSON valid, invalid/missing/denied reads visible');
if (process.argv[2]) {
  fail=false;
  content=fs.readFileSync(process.argv[2],'utf8');
  const constantsSource=fs.readFileSync(new URL('../src/constants/cssProfile.ts',import.meta.url),'utf8');
  const constantsCode=ts.transpileModule(constantsSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const constants=await import('data:text/javascript;base64,'+Buffer.from(constantsCode).toString('base64'));
  const loaded=await fetchUserProfiles(null,null,'cloud');
  const users=loaded.filter(p=>p && p.id!=='default' && !constants.isSystemProfileId(p.id)).map(p=>constants.normalizeCssProfile(p,constants.SYSTEM_PROFILES));
  assert.equal(loaded.length,JSON.parse(content).length);
  assert(users.every(p=>p.id && p.name && p.pageStyle && p.rules));
  console.log(JSON.stringify({total:loaded.length,system:loaded.length-users.length,users:users.map(p=>({id:p.id,name:p.name}))},null,2));
}
