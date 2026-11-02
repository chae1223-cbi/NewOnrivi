const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../frontend/node_modules/typescript');
function fixture() {
  const calls = {writes:[],uploads:[],creates:[],reads:[]};
  const state = {siblings:[],old:'old',fail:false};
  const drive = {
    getSavedDriveToken:()=> 'token',hasValidDriveToken:()=>true,
    getSavedWorkspaceInfo:()=>({resourceFolderId:'resources'}),
    ensureDriveFolder:async(_token,_name,parent)=>parent==='root'?'app':'media-folder',
    listDriveChildren:async()=>state.siblings,
    uploadDriveImage:async(...args)=>{calls.uploads.push(args);return {id:'image-id',name:'photo.png'};},
    createDriveMarkdownFile:async(...args)=>{calls.creates.push(args);return {id:'new-md'};},
    readDriveFileContent:async()=>state.old
  };
  const sandbox = {
    exports:{},require:(name)=>{
      if(name.endsWith('indexedDbHelper')) return {idb:{get:async()=>null}};
      if(name.endsWith('resourceSettings')) return {getResourceSettings:mode=>mode==='local'?{kind:'local',path:'C:/Resources'}:{kind:'drive',folderId:'resources'}};
      if(name.endsWith('googleDriveClient')) return drive;
      if(name.endsWith('WorkspaceFolderPicker')) return {pickAccessibleDriveFolder:async()=>({id:'destination',name:'OnriviAuthor/여행'})};
      throw Error(name);
    },
    window:{electronAPI:{selectFolder:async()=>({status:'success',path:'C:/Documents'}),
      writeTransferCopy:async(root,relative,bytes)=>{calls.writes.push({root,relative,text:new TextDecoder().decode(bytes)});return {path:`${root}/${relative}`,relativePath:relative,reused:false};},
      readTransferFile:async(file)=>{calls.reads.push(file);return new Uint8Array([1,2,3]);}}},
    fetch:async()=>new Response(new Uint8Array([1,2,3]),{status:state.fail?404:200}),
    Blob, Response, URL, DOMException, Uint8Array, TextDecoder, console
  };
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/lib/documentTransfer.ts'),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,sandbox);
  return {api:sandbox.exports,calls,state};
}
test('references: definitions, HTML, nested paths; exclude code and external links',()=>{
  const {api}=fixture();
  const refs=api.findTransferReferences('[image1]: </media/travel/photo.png?driveId=123>\n<img src="/media/second.png">\n`![x](/media/code.png)`\n```md\n![x](/media/fenced.png)\n```\n[web](https://example.com/media/a.png)');
  assert.deepEqual(Array.from(refs,ref=>ref.name),['photo.png','second.png']);
  assert.equal(refs[0].relativePath,'travel/photo.png');
});
test('reject traversal and inline images',()=>{
  const {api}=fixture();
  assert.throws(()=>api.findTransferReferences('![x](/media/../secret.png)'));
  assert.throws(()=>api.findTransferReferences('![x](data:image/png;base64,AAAA)'));
});
test('URL text in the link label stays unchanged',async()=>{
  const {api,calls}=fixture();
  await api.transferDocument({direction:'download',name:'travel.md',markdown:'[/media/photo.png?driveId=123](/media/photo.png?driveId=123)',onProgress:()=>{}});
  assert.match(calls.writes[1].text,/^\[\/media\/photo.png\?driveId=123\]\(media:/);
});
test('download: resources and MD use separate destinations; code remains unchanged',async()=>{
  const {api,calls}=fixture();
  await api.transferDocument({direction:'download',name:'travel.md',markdown:'![x](/media/photo.png?driveId=123)\n`/media/photo.png?driveId=123`',onProgress:()=>{}});
  assert.equal(calls.writes[0].root,'C:/Resources');
  assert.equal(calls.writes[1].root,'C:/Documents');
  assert.match(calls.writes[1].text,/media:\/\/local\/serve\?url=C%3A%2FResources/);
  assert.match(calls.writes[1].text,/`\/media\/photo.png\?driveId=123`/);
});
test('failed resource read prevents MD save',async()=>{
  const {api,calls,state}=fixture(); state.fail=true;
  await assert.rejects(()=>api.transferDocument({direction:'download',name:'travel.md',markdown:'![x](/media/photo.png?driveId=123)',onProgress:()=>{}}),/MD 저장을 중단/);
  assert.equal(calls.writes.length,0);
});
test('upload rewrites references after resource copy',async()=>{
  const {api,calls}=fixture();
  await api.transferDocument({direction:'upload',name:'travel.md',markdown:'![x](/media/photo.png)',onProgress:()=>{}});
  assert.equal(calls.reads[0],'C:/Resources/media/photo.png');
  assert.equal(calls.uploads.length,1);
  assert.deepEqual(calls.creates[0],['token','destination','travel.md','![x](/media/photo.png?driveId=image-id)']);
});
test('different MD receives suffix; identical MD is reused',async()=>{
  const {api,calls,state}=fixture(); state.siblings=[{id:'old',name:'travel.md',isFolder:false}];
  await api.transferDocument({direction:'upload',name:'travel.md',markdown:'new',onProgress:()=>{}});
  assert.equal(calls.creates[0][2],'travel_1.md');
  calls.creates.length=0; state.old='new';
  await api.transferDocument({direction:'upload',name:'travel.md',markdown:'new',onProgress:()=>{}});
  assert.equal(calls.creates.length,0);
});
test('local Save As returns the new file and root for continued editing',async()=>{
  const {api}=fixture(); let saved;
  await api.transferDocument({direction:'download',sourceKind:'local',name:'new.md',markdown:'![x](data:image/png;base64,AAAA)',initialLocalFolder:{path:'C:/Previous'},onProgress:()=>{},onSaved:value=>saved=value});
  assert.equal(saved.node.path,'C:/Documents/new.md');
  assert.equal(saved.root.path,'C:/Documents');
  assert.equal(saved.workspaceType,'local');
  assert.match(saved.markdown,/data:image/);
});
test('Drive Save As returns a new Drive ID and preserves same-storage references',async()=>{
  const {api,calls}=fixture(); let saved;
  await api.transferDocument({direction:'upload',sourceKind:'drive',name:'new.md',markdown:'![x](/media/photo.png?driveId=original)',initialDrivePath:[{id:'parent',name:'Current'}],onProgress:()=>{},onSaved:value=>saved=value});
  assert.equal(saved.node.driveId,'new-md');
  assert.equal(saved.root.driveFolderId,'destination');
  assert.equal(saved.workspaceType,'cloud');
  assert.equal(calls.uploads.length,0);
  assert.equal(saved.markdown,'![x](/media/photo.png?driveId=original)');
});
