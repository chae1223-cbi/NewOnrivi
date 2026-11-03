const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function extract(file,name){const source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let result;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)===name)result=ts.isCallExpression(n.initializer)?n.initializer.arguments[0].getText(tree):n.initializer.getText(tree);if(ts.isFunctionDeclaration(n)&&n.name?.text===name)result=n.getText(tree).replace('export ','');ts.forEachChild(n,visit);}visit(tree);assert.ok(result,name);return result;}
function runExpression(expression,context){return Function(...Object.keys(context),compile('const fn='+expression+';')+'return fn;')(...Object.values(context));}
const format={};Function('exports',compile(fs.readFileSync('frontend/src/lib/importFormats.ts','utf8')))(format);
const startApi={};Function('exports',compile(fs.readFileSync('frontend/src/lib/importStartFolder.ts','utf8')))(startApi);
const selectedFiles=[],pickerOptions=[],sourceVisibility=[],writes=[],opened=[],toasts=[];
const localFile=new File(['제 1 장\n로컬 본문'],'local.txt');
const driveFile=new File(['# 드라이브 본문'],'remote.md');
const context={isRestrictedUser:false,isImporting:false,selectingImportRef:{current:false},setShowImportSource:v=>sourceVisibility.push(v),getSavedDriveToken:()=> 'workspace-token',hasValidDriveToken:()=>true,prepareGoogleDriveAuth:()=>{throw Error('unexpected authentication');},getSavedWorkspaceInfo:()=>({workspacePath:[{id:'current-drive-folder',name:'현재 작업장'}]}),readDriveImportFile:async(token,file)=>{assert.equal(token,'other-account-token');assert.equal(file.id,'remote');return driveFile;},chooseImportDestination:file=>selectedFiles.push(file),showToast:(...args)=>toasts.push(args),window:{showOpenFilePicker:async options=>{pickerOptions.push(options);return [{getFile:async()=>localFile}];}},IMPORT_PICKER_OPTIONS:format.IMPORT_PICKER_OPTIONS,rootFolder:{handle:{kind:'directory',name:'local-folder'}},importFileInputRef:{current:{click:()=>{}}},isSupportedImportFile:format.isSupportedImportFile,require:()=>({pickAccessibleDriveFolder:async(token,path,options)=>{
 assert.equal(token,'workspace-token');assert.equal(path[0].id,'current-drive-folder');assert.equal(options.selectFile,true);
 for(const ext of format.IMPORT_EXTENSIONS)assert.equal(options.acceptFile({name:'document.'+ext,mimeType:'application/octet-stream'}),true);
 assert.equal(options.acceptFile({name:'image.png',mimeType:'image/png'}),false);
 return {id:'remote',name:'remote.md',token:'other-account-token'};
}})};
Object.assign(context,{importStartFolder:startApi.importStartFolder,targetImportNodeRef:{current:null},targetImportParentHandleRef:{current:null},fileList:[]});
const picker=runExpression(extract('frontend/src/components/LeftSidebar.tsx','openImportPicker'),context);
(async()=>{
 await picker();assert.deepEqual(sourceVisibility,[true]);
 await picker('local');assert.equal(selectedFiles.pop(),localFile);assert.equal(pickerOptions[0].startIn,context.rootFolder.handle);
 await picker('drive');assert.equal(selectedFiles.pop(),driveFile);assert.equal(context.selectingImportRef.current,false);
 const plain=extract('frontend/src/lib/fileImporter.ts','importPlainTextToMarkdown');
 const convert=Function('isSupportedImportFile',compile(plain+'\n'+extract('frontend/src/lib/fileImporter.ts','convertFileToMarkdown'))+';return convertFileToMarkdown;')(format.isSupportedImportFile);
 const storage=new Map([['local.md','# existing']]);
 const dir={async *entries(){yield* storage.entries();},getFileHandle:async(name)=>({createWritable:async()=>({write:async text=>storage.set(name,text),close:async()=>{}})})};
 const importContext={isImporting:false,isSupportedImportFile:format.isSupportedImportFile,setIsImporting:()=>{},showToast:(...args)=>toasts.push(args),requireResourceSettings:()=>({}),getResourceSettings:()=>({}),targetImportNodeRef:{current:{path:'chosen-folder',handle:dir}},targetImportParentHandleRef:{current:dir},importNameRef:{current:null},rootFolder:{name:'workspace',handle:dir},fileList:[],workspaceType:'browser',localStorage:{getItem:()=>null,setItem:()=>{}},refreshFileList:async()=>{},window:{dispatchEvent:()=>{}},setTimeout:()=>{},openFile:(...args)=>opened.push(args),require:()=>({convertFileToMarkdown:convert})};
 const importFile=runExpression(extract('frontend/src/components/LeftSidebar.tsx','handleImportFile'),importContext);
 await importFile({target:{files:[localFile],value:''}});
 assert.equal(storage.get('local.md'),'# existing');assert.equal(storage.get('local_1.md'),'## 제 1 장\n로컬 본문');assert.equal(opened[0][0].path,'chosen-folder/local_1.md');
 importContext.targetImportNodeRef.current={path:'chosen-folder',handle:dir};
 await importFile({target:{files:[driveFile],value:''}});
 assert.equal(storage.get('remote.md'),'# 드라이브 본문');assert.equal(opened[1][0].name,'remote.md');
 // Binary download must preserve bytes, selected account and original extension.
 const bytes=new Uint8Array([0,255,80,75,3,4]);
 const download=Function('resolveAuthToken','fetch','parseDriveError',compile(extract('frontend/src/lib/gdrive/googleDriveClient.ts','readDriveImportFile'))+';return readDriveImportFile;')(token=>token,async(url,options)=>{assert.ok(url.includes('alt=media'));assert.equal(options.headers.Authorization,'Bearer account-B');return new Response(bytes);},()=>Error('read failed'));
 const downloaded=await download('account-B',{id:'binary-id',name:'sample.docx',mimeType:'application/octet-stream'});
 assert.equal(downloaded.name,'sample.docx');assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),bytes);
 assert.equal(toasts.some(args=>args[1]==='error'),false,JSON.stringify(toasts));
 console.log('PASS: source chooser/local/current folder, all existing format filters, other-account binary download, actual TXT/MD conversion and selected-folder storage with collision protection');
})().catch(error=>{console.error(error);process.exitCode=1;});
