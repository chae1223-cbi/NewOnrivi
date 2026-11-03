const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const source=fs.readFileSync('frontend/src/components/MainEditorApp.tsx','utf8');
const tree=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='handleSaveToWebDrive')callback=node.initializer.arguments[0].getText(tree);ts.forEachChild(node,visit);}visit(tree);assert.ok(callback);
const compiled=ts.transpileModule('exports.run='+callback,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const writes=[],notices=[];let refreshes=0,existing=false;
const drive={getSavedDriveToken:()=> 'workspace-A',hasValidDriveToken:()=>true,ensureDriveFolder:async()=> 'folder-A',listDriveChildren:async(token,folder)=>{
 assert.equal(token,'account-B');assert.equal(folder,'folder-B');return existing?[{id:'file-B',name:'copy.md'}]:[];
},createDriveMarkdownFile:async(...args)=>writes.push(['create',...args]),saveDriveFileContent:async(...args)=>writes.push(['update',...args])};
const picker={pickAccessibleDriveFolder:async()=>({id:'folder-B',name:'Other folder',token:'account-B',userEmail:'b@example.test',fileName:'copy'})};
const context={transferBusyRef:{current:false},isRestrictedUser:false,isDuplicateInstance:false,isLicenseChecking:false,showToast:(...a)=>notices.push(a),editorRef:{current:{getValue:()=> '# content'}},contentRef:{current:''},currentFileName:'original.md',getSavedDriveToken:drive.getSavedDriveToken,hasValidDriveToken:drive.hasValidDriveToken,prepareGoogleDriveAuth:()=>{throw Error('valid account must not authenticate');},setTransferProgress:()=>{},rootFolder:{type:'GDRIVE',id:'folder-A'},refreshFileList:async()=>refreshes++,window:{confirm:()=>true}};
const result={};Function('exports','require',...Object.keys(context),compiled)(result,id=>id.includes('WorkspaceFolderPicker')?picker:drive,...Object.values(context));
(async()=>{
 await result.run();assert.deepEqual(writes[0],['create','account-B','folder-B','copy.md','# content']);
 existing=true;await result.run();assert.deepEqual(writes[1],['update','account-B','file-B','# content']);
 assert.equal(context.rootFolder.id,'folder-A');assert.equal(refreshes,0);assert.equal(context.transferBusyRef.current,false);
 const handlers=fs.readFileSync('frontend/src/hooks/useEditorHandlers.ts','utf8');
 const cloud=handlers.slice(handlers.indexOf('      if (isCloudWorkspace) {',handlers.indexOf('    saveAs: async')));
 assert.ok(cloud.slice(0,cloud.indexOf('      setSaveStatus')).includes("detail: 'upload'"));
 console.log('PASS: cloud Save As opens destination picker; selected account/folder used for create and overwrite; current workspace preserved');
})().catch(error=>{console.error(error);process.exitCode=1;});
