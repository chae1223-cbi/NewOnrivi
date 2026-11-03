const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
function load(name,overrides={}){const exports={};Function('exports','require',ts.transpileModule(fs.readFileSync('frontend/src/lib/'+name+'.ts','utf8'),{fileName:name+'.ts',compilerOptions:{module:1,target:7,esModuleInterop:true}}).outputText)(exports,id=>overrides[id]||req(id));return exports;}
const store=new Map();global.window={};global.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
const accounts=load('browserAccountStorage');accounts.activateBrowserAccount('account_test');
const settings=load('documentPrintSettings',{'./frontmatter':load('frontmatter'),'./browserAccountStorage':accounts,'./defaultWatermark':load('defaultWatermark')});
let resource={kind:'browser',path:'참조파일'},token='token';
const png=new Blob(['bytes'],{type:'image/png'});
const handle={name:'참조파일',getDirectoryHandle:async name=>{assert.equal(name,'media');return{async *entries(){yield ['logo.png',{kind:'file',getFile:async()=>png}];yield ['notes.md',{kind:'file'}];yield ['animation.gif',{kind:'file'}];}};}};
const resources=load('watermarkResources',{'./resourceSettings':{getResourceSettings:()=>resource,requireResourceSettings:()=>resource},'./indexedDbHelper':{idb:{get:async()=>handle}},'./gdrive/googleDriveClient':{getSavedDriveToken:()=>token,listDriveChildren:async()=>[{id:'drive-file',name:'도장.png',isFolder:false},{id:'folder',name:'folder',isFolder:true}]}});
(async()=>{
 settings.saveDefaultWatermarkSettings(settings.DEFAULT_PRINT_SETTINGS);
 assert.ok([...store.keys()].some(key=>key.includes('account:account_test:')));
 assert.ok(![...store.values()].some(value=>value.includes('data:image')),'image binary must not be stored in settings');
 settings.saveDefaultWatermarkSettings({...settings.DEFAULT_PRINT_SETTINGS,enabled:true,kind:'text',text:'환경설정 기본'});
 const doc=settings.writePrintSettings('원고',{...settings.DEFAULT_PRINT_SETTINGS,enabled:true,kind:'text',text:'기존 문서 설정'});
 assert.equal(settings.readEffectivePrintSettings(doc).text,'환경설정 기본');
 let files=await resources.listWatermarkResources();assert.deepEqual(files.map(f=>f.name),['logo.png']);assert.equal(files[0].reference,'/media/logo.png');assert.equal(await files[0].read(),png);
 const browserKey=resources.watermarkResourceIdentity();
 resource={kind:'local',path:'D:/자원'};window.electronAPI={listDirectory:async()=>[{kind:'file',name:'로고.png',path:'D:/자원/media/로고.png'}],readTransferFile:async()=>new Uint8Array([1,2,3])};
 files=await resources.listWatermarkResources();assert.ok(files[0].reference.startsWith('media://local/serve?url='));assert.equal((await files[0].read()).size,3);assert.notEqual(resources.watermarkResourceIdentity(),browserKey);
 resource={kind:'drive',path:'드라이브 자원',mediaFolderId:'media-id',folderId:'resource-id'};
 global.fetch=async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer renewed');return new Response(png,{headers:{'Content-Type':'image/png'}});};
 files=await resources.listWatermarkResources();assert.equal(files[0].reference,'/media/%EB%8F%84%EC%9E%A5.png?driveId=drive-file');token='renewed';assert.equal((await files[0].read()).size,png.size);
 assert.equal(resources.watermarkReferenceKey('/media/logo.png?v=123'),resources.watermarkReferenceKey('/media/logo.png'));
 // Exercise the actual Settings upload handler: bytes go to media, state holds a reference.
 const source=ts.createSourceFile('settings.tsx',fs.readFileSync('frontend/src/components/SettingsModal.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let initializer;
 function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='handleWatermarkImageUpload')initializer=node.initializer;ts.forEachChild(node,walk);}walk(source);
 let value={...settings.DEFAULT_PRINT_SETTINGS},saved=false;
 const context={watermarkResourceIdentity:()=> 'resource-id',settingsOpen:{current:true},setWatermarkBusy(){},validateWatermarkImage:async()=>{},saveResourceMedia:async(file,name)=>{assert.equal(file,png);assert.ok(name.startsWith('watermark_'));saved=true;return '/media/saved.png';},setWatermarkSettings:fn=>{value=fn(value);},reloadWatermarkResources:async()=>{},showToast(){}};
 const js=ts.transpileModule('const upload='+initializer.getText(source)+';', {compilerOptions:{module:1,target:7}}).outputText;
 const upload=Function(...Object.keys(context),js+'return upload;')(...Object.values(context));await upload(png);
 assert.equal(saved,true);assert.equal(value.image,'/media/saved.png');assert.equal(value.imageResource,'resource-id');assert.ok(!value.image.startsWith('data:'));
 console.log('PASS: account-scoped global defaults, no embedded image storage, local/browser/Drive image listing and reads, current token, actual Settings upload saves resource references');
})().catch(error=>{console.error(error);process.exitCode=1;});
