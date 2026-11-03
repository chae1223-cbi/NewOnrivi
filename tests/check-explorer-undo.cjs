const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function extract(file,name){const source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)===name)found=ts.isCallExpression(n.initializer)?n.initializer.arguments[0].getText(tree):n.initializer.getText(tree);if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.getText(tree);ts.forEachChild(n,visit);}visit(tree);assert.ok(found,name);return found;}
const build=(expression,context)=>Function(...Object.keys(context),compile('const handler='+expression+';')+'return handler;')(...Object.values(context));
const notices=[],events=[],requests=[],history=[],busy={current:false};let fail=false,pendingResolve,hold=false,account='a@example.test';
const window={dispatchEvent:event=>{events.push(event);if(event.type==='file:push-undo-action')history.push(event.detail);}};
const client={};
const names=['restoreDriveItem','trashDriveItem','moveDriveItem','moveDriveItemWithUndo'];
const moduleSource=names.map(name=>extract('frontend/src/lib/gdrive/googleDriveClient.ts',name)).join('\n');
const getInfo=()=>({userEmail:account});
Function('exports','resolveAuthToken','fetch','parseDriveError','window','getSavedWorkspaceInfo',compile(moduleSource))(client,t=>t,async(url,options)=>{
 requests.push({url,options});
 if(hold)await new Promise(resolve=>pendingResolve=resolve);
 if(fail)return new Response('{}',{status:403});
 return Response.json(options?.method==='PATCH'?{}:{parents:['original-parent']});
},async()=>Error('fixture API failure'),window,getInfo);
const helpers={};Function('exports',compile(fs.readFileSync('frontend/src/lib/explorerUndo.ts','utf8')))(helpers);
const undoContext={undoBusyRef:busy,isRestrictedUser:false,undoHistoryRef:{current:history},showToast:(...args)=>notices.push(args),setHasUndoableMove:()=>{},setLastUndoType:()=>{},window,workspaceType:'cloud',getSavedDriveToken:()=> 'fixture-token',getSavedWorkspaceInfo:getInfo,moveDriveItem:client.moveDriveItem,restoreDriveItem:client.restoreDriveItem,refreshFileList:async()=>{},dispatchMovedEvent:()=>{},localStorage:{getItem:()=>null,setItem:()=>{}},assertUndoNameAvailable:helpers.assertUndoNameAvailable};
const undo=build(extract('frontend/src/components/LeftSidebar.tsx','handleUndoMove'),undoContext);
const deleteItem={type:'delete',workspaceType:'cloud',driveId:'original-file-id',name:'book.md',accountEmail:'a@example.test',kind:'file'};
(async()=>{
 await client.moveDriveItemWithUndo('fixture-token','item','destination',undefined,{name:'book.md'});
 assert.equal(history.length,1);assert.equal(history[0].srcParentDriveId,'original-parent');
 await undo();assert.equal(history.length,0);
 const reverse=new URL(requests.at(-1).url);assert.equal(reverse.searchParams.get('addParents'),'original-parent');assert.equal(reverse.searchParams.get('removeParents'),'destination');
 history.push({...deleteItem});await undo();assert.equal(history.length,0);assert.deepEqual(JSON.parse(requests.at(-1).options.body),{trashed:false});
 assert.ok(requests.at(-1).url.includes('original-file-id'));
 history.push({...deleteItem});fail=true;await undo();assert.equal(history.length,1,'failed restore remains retryable');assert.equal(busy.current,false);fail=false;
 const before=requests.length;account='other@example.test';await undo();assert.equal(requests.length,before,'wrong account cannot restore');assert.equal(history.length,1);account='a@example.test';
 hold=true;const first=undo();await undo();assert.equal(requests.length,before+1,'repeated undo cannot start a second request');hold=false;pendingResolve();await first;assert.equal(history.length,0);
 // Actual delete handler must record only after a successful trash operation.
 let confirmation;
 const deleteContext={parentHandle:null,node:{name:'folder',kind:'directory',driveId:'drive-folder',path:'workspace/folder'},localChildren:[],workspaceType:'cloud',askConfirm:config=>confirmation=config,showToast:(...args)=>notices.push(args),getSavedDriveToken:()=> 'fixture-token',getSavedWorkspaceInfo:getInfo,trashDriveItem:client.trashDriveItem,readDriveFileContent:()=>{throw Error('Drive delete must not decode contents');},window,localStorage:{getItem:()=>null},refreshParent:()=>{}};
 const remove=build(extract('frontend/src/components/FileTreeItem.tsx','handleDelete'),deleteContext);
 await remove({stopPropagation(){}});fail=true;await confirmation.onConfirm();assert.equal(history.length,0,'failed deletion has no undo record');fail=false;
 await confirmation.onConfirm();assert.equal(history.length,1);assert.equal(history[0].driveId,'drive-folder');await undo();assert.equal(history.length,0);
 // Browser restoration must refuse a name conflict without overwriting it.
 await assert.rejects(helpers.assertUndoNameAvailable({getFileHandle:async()=>({})},'existing.md'),/이미/);
 const absent=async()=>{throw Object.assign(Error(),{name:'NotFoundError'});};
 await helpers.assertUndoNameAvailable({getFileHandle:absent,getDirectoryHandle:absent},'new.md');
 // Folder snapshots retain binary data and propagate read failures.
 const snapshotExpression=extract('frontend/src/components/FileTreeItem.tsx','snapshotFsaDirectory');
 const snapshot=Function(compile('const snapshotFsaDirectory='+snapshotExpression+';')+'return snapshotFsaDirectory;')();
 const binary=new File([new Uint8Array([0,255,127,80])],'image.png');
 const entries=await snapshot({async *entries(){yield ['image.png',{kind:'file',getFile:async()=>binary}];}});
 assert.deepEqual(new Uint8Array(await entries[0].content.arrayBuffer()),new Uint8Array([0,255,127,80]));
 await assert.rejects(snapshot({async *entries(){throw Error('permission denied');}}),/permission/);
 const blockedDelete=build(extract('frontend/src/components/FileTreeItem.tsx','handleDelete'),{...deleteContext,workspaceType:'browser',node:{name:'local-folder',kind:'directory',path:'local-folder',handle:{async *entries(){throw Error('permission denied');}}},snapshotFsaDirectory:snapshot});
 await blockedDelete({stopPropagation(){}});await confirmation.onConfirm();assert.equal(history.length,0,'failed snapshot must not delete or create undo history');
 window.electronAPI={restoreFolderFromUndo:async()=>({success:false,error:'backup missing'}),moveFile:async(from,to,options)=>{assert.equal(options.failIfExists,true);return {success:false,error:'name conflict'};}};
 history.push({type:'delete',workspaceType:'local',kind:'directory',name:'local-folder',path:'D:/local-folder',parentPath:'D:/',backupPath:'D:/backup'});
 await undo();assert.equal(history.length,1,'failed local folder restoration must remain in history');history.length=0;
 history.push({type:'move',workspaceType:'local',kind:'file',name:'local.md',srcPath:'D:/local.md',destPath:'D:/moved/local.md'});
 await undo();assert.equal(history.length,1,'failed local move remains retryable even while current workspace is cloud');history.length=0;
 console.log('PASS: Drive move/delete undo, original IDs, failed-delete history exclusion, retry, account isolation, concurrent undo guard, FSA name conflicts and lossless binary snapshots');
})().catch(error=>{console.error(error);process.exitCode=1;});
