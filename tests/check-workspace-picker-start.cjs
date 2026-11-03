const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
function extract(file,name){const source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)===name)found=n.initializer.getText(tree);if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.getText(tree).replace('export ','');ts.forEachChild(n,visit);}visit(tree);assert.ok(found);return found;}
const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const calls=[],rootFolderRef={current:{type:'GDRIVE',id:'cloud-folder'}};
const values=new Map([['onrivi_last_local_root_folder',JSON.stringify({path:'D:/last-local'})]]);
const context={rootFolderRef,window:{},localStorage:{getItem:k=>values.get(k)||null},BROWSER_STORAGE_NAME:'browser-storage',isAbsolutePath:p=>/^[A-Z]:\//i.test(p),connectGoogleDrive:async choose=>calls.push(['cloud',choose]),showToast:()=>{}};
const select=Function(...Object.keys(context),compile('const select='+extract('frontend/src/hooks/useFileExplorer.ts','selectRootFolder')+';')+'return select;')(...Object.values(context));
(async()=>{
 await select();assert.deepEqual(calls.pop(),['cloud',true]);
 context.window.electronAPI={selectFolder:async start=>{calls.push(['local',start]);return {status:'canceled'};}};
 rootFolderRef.current={name:'D:/current',path:'D:/current'};
 await select();assert.deepEqual(calls.pop(),['local','D:/current']);
 await select('local','E:/explicit');assert.deepEqual(calls.pop(),['local','E:/explicit']);
 rootFolderRef.current={type:'GDRIVE',name:'cloud-display'};
 await select('local');assert.deepEqual(calls.pop(),['local','D:/last-local']);
 delete context.window.electronAPI;
 const handle={kind:'directory',name:'current-folder'};
 rootFolderRef.current={handle};
 context.window.showDirectoryPicker=async options=>{calls.push(options);throw Object.assign(Error('cancel'),{name:'AbortError'});};
 await select();assert.equal(calls.pop().startIn,handle);
 let attempts=0;
 context.window.showDirectoryPicker=async options=>{calls.push(options);throw Object.assign(Error('missing'),{name:++attempts===1?'NotFoundError':'AbortError'});};
 await select();assert.equal(attempts,2);assert.equal(calls.pop().startIn,undefined);assert.equal(calls.pop().startIn,handle);
 // Execute the actual cloud path restoration with a nested current workspace.
 const cloudSource=extract('frontend/src/lib/gdrive/googleDriveClient.ts','selectOnriviWorkspaceFolder');
 let opened;
 const deps={ensureDriveFolder:async(token,name)=>name==='OnriviAuthor'?'app':'workspace-root',getSavedWorkspaceInfo:()=>({workspaceFolderId:'nested',workspacePath:[{id:'workspace-root',name:'작업장'},{id:'parent',name:'상위'},{id:'nested',name:'현재'}]}),listDriveChildren:async(token,id)=>id==='workspace-root'?[{id:'parent',name:'상위',isFolder:true}]:[{id:'nested',name:'현재',isFolder:true}],require:()=>({pickAccessibleDriveFolder:async(token,path)=>{opened=path;return null;}})};
 const cloud=Function(...Object.keys(deps),compile(cloudSource)+';return selectOnriviWorkspaceFolder;')(...Object.values(deps));
 await cloud('current-account');assert.equal(opened.at(-1).id,'nested');
 console.log('PASS: current storage routing, current/explicit desktop paths, browser startIn and deleted-folder fallback, nested cloud folder restoration');
})().catch(error=>{console.error(error);process.exitCode=1;});
