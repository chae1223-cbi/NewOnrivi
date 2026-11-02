const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const base = path.resolve(__dirname,'..');
const req = createRequire(path.join(base,'frontend/package.json'));
const ts = req('typescript');
const compile = text => ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const read = name => fs.readFileSync(path.join(base,name),'utf8');
async function main() {
  const media = {};
  vm.runInNewContext(compile(read('frontend/src/lib/mediaMarkup.ts')),{exports:media});
  const ranges = {};
  vm.runInNewContext(compile(read('frontend/src/lib/mediaSourceRange.ts')),{exports:ranges,require:name=>name==='./mediaMarkup'?media:req(name)});
  const markup = '<iframe src="https://maps.google.com/maps?q=37,127&amp;z=12" style="width:320px; height:200px;" data-align="left"></iframe>';
  assert.equal(media.mediaDetails(markup).kind,'map');
  assert.equal(media.mediaDetails(markup).width,'320px');
  assert.equal(media.mediaDetails(markup).path,'https://maps.google.com/maps?q=37,127&z=12');
  const image = '![설명](media/a.png?width=200)';
  const source = '```markdown\n'+image+'\n```\n\n'+image+'\n\n'+image;
  const found = ranges.mediaSourceRange(source,'image','media/a.png?width=200',8);
  assert.equal(found.from,source.lastIndexOf(image));
  assert.equal(ranges.mediaSourceRange('```html\n'+markup+'\n```','map',media.mediaDetails(markup).path),null);

  // Execute the real upload implementation with a fake Drive transport.
  const drive = read('frontend/src/lib/gdrive/googleDriveClient.ts');
  const upload = drive.slice(drive.indexOf('let imageUploadQueue:'),drive.indexOf('/**\n * 구글 드라이브 /참조파일/media 폴더에서 파일명'));
  let existing = [{id:'stable-id',name:'사진.png',modifiedTime:'2026-10-01'}];
  const requests = [];
  const exports = {};
  vm.runInNewContext(compile(upload),{exports,URL,URLSearchParams,TextEncoder,Uint8Array,resolveAuthToken:token=>token,parseDriveError:async()=>new Error('Drive failed'),fetch:async(url,options={})=>{
    requests.push({url,...options});
    return {ok:true,json:async()=>url.includes('upload/')?{id:'created-id',name:'새사진.png'}:{files:existing}};
  }});
  const result = await exports.uploadDriveImage('token','folder',new Blob(['new bytes'],{type:'image/png'}),'사진.png');
  assert.equal(result.id,'stable-id');
  assert.equal(requests.at(-1).method,'PATCH');
  assert.ok(requests.at(-1).url.includes('/stable-id?'));
  assert.equal(Buffer.from(requests.at(-1).body).toString(),'new bytes');
  existing=[]; await exports.uploadDriveImage('token','folder',new Blob(['next']),'새사진.png');
  assert.equal(requests.at(-1).method,'POST');

  // Browser destination overwrites the selected filename, using current settings.
  const files = new Map([['clip.mp4',new Blob(['old'])]]);
  const browser = {name:'configured',queryPermission:async()=> 'granted',getDirectoryHandle:async name=>{
    assert.equal(name,'media');return {getFileHandle:async name=>({createWritable:async()=>({write:async blob=>files.set(name,blob),close:async()=>{}})})};
  }};
  const resource = {};
  vm.runInNewContext(compile(read('frontend/src/lib/resourceMedia.ts')), {exports:resource,Blob,Uint8Array,URL,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},window:{dispatchEvent(){}},require:name=>{
    if(name==='./resourceSettings') return {requireResourceSettings:()=>({kind:'browser',path:'configured'})};
    if(name==='./indexedDbHelper') return {idb:{get:async()=>browser}};
    if(name==='./gdrive/googleDriveClient') return {};
    throw new Error(name);
  }});
  await resource.saveResourceMedia(new Blob(['latest']),'clip.mp4',browser);
  assert.equal(await files.get('clip.mp4').text(),'latest'); assert.equal(files.size,1);
  await resource.saveResourceMedia(new Blob(['latest image']),'사진.png',browser);
  assert.equal(await files.get('사진.png').text(),'latest image');

  // Execute the actual Electron save handler against an isolated workspace fixture.
  let save;
  const mainSource=read('main.js');
  const handler=mainSource.slice(mainSource.indexOf("ipcMain.handle('file:saveImage'"),mainSource.indexOf('// 20. 다중 파일 병합'));
  vm.runInNewContext(handler,{ipcMain:{handle:(_name,fn)=>{save=fn;}},fs,path,Buffer,console});
  const folder=path.join(base,'.tmp/media-overwrite-qa/media');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'clip.mp4'),'old');
  const saved=await save(null,folder,Buffer.from('latest desktop').toString('base64'),'clip.mp4');
  assert.equal(saved.success,true);assert.equal(fs.readFileSync(path.join(folder,'clip.mp4'),'utf8'),'latest desktop');
  assert.ok(saved.mediaPath.includes('?v='));
  // The picker chooses the connected workspace and uses its resource root.
  const picker = {}; let mode='local'; let opened; let chosenRoot;
  const localSettings={kind:'browser',path:'configured'};
  const cloudSettings={kind:'drive',path:'참조파일',folderId:'resource-root',mediaFolderId:'media-child'};
  class TestFile extends Blob {constructor(parts,name,options){super(parts,options);this.name=name;}}
  const pickerWindow={electronAPI:{selectMediaFile:async options=>{opened=options;return {name:'clip.mp4',bytes:[1,2],mimeType:'video/mp4'};}}};
  vm.runInNewContext(compile(read('frontend/src/lib/resourceMediaPicker.ts')),{exports:picker,File:TestFile,Uint8Array,window:pickerWindow,fetch:async()=>({ok:true,blob:async()=>new Blob(['drive bytes'])}),require:name=>{
    if(name==='./resourceSettings')return {getResourceSettings:environment=>{mode=environment || mode;return mode==='cloud'?cloudSettings:localSettings;}};
    if(name==='./indexedDbHelper')return {idb:{get:async()=>browser}};
    if(name==='./gdrive/googleDriveClient')return {getSavedDriveToken:()=> 'token'};
    if(name==='./gdrive/ResourceFilePicker')return {pickDriveResourceFile:async(_token,root)=>{chosenRoot=root;return {id:'file-id',name:'사진.png',mimeType:'image/png'};},pickLocalResourceFile:async handle=>{chosenRoot=handle;return new TestFile(['local'],'사진.png',{type:'image/png'});}};
    throw new Error(name);
  }});
  assert.equal((await picker.pickResourceMedia('video','local')).name,'clip.mp4');
  assert.equal(opened.defaultPath,'configured');assert.equal(opened.kind,'video');
  assert.equal((await picker.pickResourceMedia('image','cloud')).name,'사진.png');
  assert.equal(chosenRoot,'resource-root');
  delete pickerWindow.electronAPI;
  pickerWindow.showOpenFilePicker=async options=>{opened=options;return [{getFile:async()=>new TestFile(['local'],'사진.png',{type:'image/png'})}];};
  await picker.pickResourceMedia('image','browser',browser);
  assert.equal(opened.startIn,browser);assert.equal(opened.excludeAcceptAllOption,true);
  delete pickerWindow.showOpenFilePicker;await picker.pickResourceMedia('image','browser',browser);assert.equal(chosenRoot,browser);
  let nativePicker;let dialogOptions;
  const dialogHandler=mainSource.slice(mainSource.indexOf("ipcMain.handle('dialog:selectMediaFile'"),mainSource.indexOf("ipcMain.handle('dialog:selectFolder'"));
  vm.runInNewContext(dialogHandler,{ipcMain:{handle:(_name,fn)=>{nativePicker=fn;}},fs,path,Uint8Array,mainWindow:{},dialog:{showOpenDialog:async(_window,options)=>{dialogOptions=options;return {canceled:false,filePaths:[path.join(folder,'clip.mp4')]};}}});
  const nativeResult=await nativePicker(null,{kind:'video',defaultPath:path.dirname(folder)});
  assert.equal(dialogOptions.defaultPath,path.dirname(folder));assert.ok(dialogOptions.filters[0].extensions.includes('mp4'));assert.equal(nativeResult.name,'clip.mp4');
  console.log('PASS: Drive, native OS and browser pickers start at the configured resource folder');
  console.log('PASS: media parsing, duplicate selection, fenced example exclusion, Drive PATCH/create, browser and desktop filename overwrite');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
