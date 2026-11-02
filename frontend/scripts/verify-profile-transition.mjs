import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/components/MainEditorApp.tsx',import.meta.url),'utf8');
const start=source.indexOf('  useEffect(() => {',source.indexOf('const profileStorageRef ='));
const end=source.indexOf('\n  const [fileList',start);
const code=ts.transpileModule(source.slice(start,end).replace("await import('@/lib/gdrive/googleDriveClient')",'await Promise.resolve(mockDrive)'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let environment='local', profiles=[], cleanup;
const listeners=new Map();
const settings={local:{kind:'local',path:'D:/Assets'},cloud:{kind:'drive',path:'CloudAssets',folderId:'drive-assets'}};
const sandbox={mounted:true,resourceFolder:'D:/Assets',resourceFolderHandle:null,profileStorageRevision:0,workspaceType:'local',rootFolder:{name:'D:/Workspace'},
  profileStorageRef:{current:null},SYSTEM_PROFILES:[{id:'system-1'}],
  useEffect:fn=>{cleanup=fn();},getResourceEnvironment:()=>environment,getResourceSettings:env=>settings[env],getProfileResourceFolder:(_,env)=>settings[env].path,
  getSavedDriveToken:()=> 'test-token',mockDrive:{resolveDriveResourceFolderByName:()=>{throw Error('Existing selected folder must not be reconfigured');}},
  window:{electronAPI:{ensureLocalEnvironment:async()=>({success:true,resourcePath:'D:/Assets',workspacePath:'D:/Workspace'})},addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)},
  localStorage:{getItem:()=>null,setItem:()=>{}},saveResourceSettings:()=>{},setResourceFolder:()=>{},setRootFolder:()=>{},setWorkspaceType:()=>{},setIsProfilesLoaded:()=>{},setProfileReadStatus:()=>{},
  fetchUserProfiles:async(folder,handle,env)=>{assert.equal(folder,settings[env].path);return [{id:env+'-custom'}];},
  isSystemProfileId:id=>id==='system-1',normalizeCssProfile:p=>p,setProfiles:p=>{profiles=p;},showToast:()=>{},console,
};
vm.runInNewContext(code,sandbox);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
await flush();assert.equal(profiles[1].id,'local-custom');
for(const env of ['cloud','local','cloud','local']) {
  environment=env;
  listeners.get('onrivi:reload_profiles')({});
  await flush();
  assert.equal(profiles[1].id,env+'-custom');
}
cleanup();console.log('PASS: actual profile loader rereads current settings on local/Drive/local reloads without reactivating accounts');

