const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),front=path.join(root,'frontend'),req=createRequire(path.join(front,'package.json'));
const ts=req('typescript'),webpack=req('webpack');
const dir=path.join(root,'.tmp/resource-image-qa');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'loader.cjs'),`const ts=require(${JSON.stringify(req.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:99,target:7,jsx:2,esModuleInterop:true}}).outputText;`);
fs.writeFileSync(path.join(dir,'stubs.js'),`const React=require('react');exports.default=()=>null;exports.useToast=()=>({showToast:()=>{}});exports.getEffectiveResourceFolder=()=>window.__resourceFolderHandle?.name;exports.loadSecureData=()=>null;`);
fs.writeFileSync(path.join(dir,'entry.js'),`
const React=require('react'),{createRoot}=require('react-dom/client');
const Viewer=require(${JSON.stringify(path.join(front,'src/components/MarkdownViewer.tsx'))}).default;
const Editor=require(${JSON.stringify(path.join(front,'src/components/VisualDocumentEditor.tsx'))}).default;
const {saveResourceSettings}=require(${JSON.stringify(path.join(front,'src/lib/resourceSettings.ts'))});
const {saveResourceMedia}=require(${JSON.stringify(path.join(front,'src/lib/resourceMedia.ts'))});
window.init=async()=>{
 const h=await (await navigator.storage.getDirectory()).getDirectoryHandle('ImageQA',{create:true});
 window.__resourceFolderHandle=h;saveResourceSettings({kind:'browser',path:h.name});
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=32;canvas.getContext('2d').fillRect(0,0,64,32);
 const blob=window.qaImageData?await(await fetch(window.qaImageData)).blob():await new Promise(r=>canvas.toBlob(r));
 const saved=await saveResourceMedia(blob,'한글 사진 (1).png',h);
 window.saved=saved;window.render=source=>createRoot(document.getElementById('root')).render(React.createElement(Viewer,{mediaControlsManaged:true,content:source,resourceFolderHandle:h,resourceFolder:h.name,rootFolder:{name:'작업장'},rootFolderPath:'작업장',workspaceType:'local'}));
 window.render('![한글 사진]('+saved+')');
 window.mountEditor=()=>{
  const parent=document.createElement('div');parent.id='editor';document.body.append(parent);
  function App(){const [content,setContent]=React.useState('드롭 위치');window.setEditorSource=setContent;window.editorSource=content;return React.createElement(Editor,{content,onChange:setContent,onImageFile:f=>saveResourceMedia(f,f.name,h),renderImage:source=>React.createElement(Viewer,{mediaControlsManaged:true,content:source,resourceFolderHandle:h,resourceFolder:h.name,rootFolder:{name:'작업장'},rootFolderPath:'작업장',workspaceType:'local'})});}
  createRoot(parent).render(React.createElement(App));
 };
};`);
(async()=>{
 const stubs=path.join(dir,'stubs.js');
 await new Promise((resolve,reject)=>webpack({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(front,'node_modules')],alias:{'./PicturebookPreview':stubs,'@/components/ToastProvider':stubs,'@/lib/profileStorage':stubs,'@/lib/secureStorage':stubs,'@':path.join(front,'src')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(dir,'loader.cjs')},{test:/\.css$/,type:'asset/source'}]},devtool:false},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));
 const server=http.createServer((rq,rs)=>{rs.setHeader('Content-Type',rq.url==='/bundle.js'?'application/javascript':'text/html; charset=utf-8');rs.end(rq.url==='/bundle.js'?fs.readFileSync(path.join(dir,'bundle.js')):'<div id="root"></div><script src="/bundle.js"></script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>console.error(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const input=process.argv[2];
  if(input)await page.evaluate(data=>{window.qaImageData=data;},'data:image/png;base64,'+fs.readFileSync(input).toString('base64'));
  await page.evaluate(()=>window.init());
  await page.waitForTimeout(1200);
  const result=await page.evaluate(()=>({saved:window.saved,html:document.getElementById('root').innerHTML.slice(-2500),images:Array.from(document.images).map(i=>({src:i.src,width:i.naturalWidth,height:i.naturalHeight}))}));
  const expectedSize=input?1000:64;
  assert.ok(result.images.some(i=>i.width===expectedSize&&i.height===(input?1000:32)));
  await page.evaluate(()=>window.mountEditor());await page.locator('.visual-document-surface').waitFor();
  await page.evaluate(()=>{const img=document.querySelector('#root img'),el=document.querySelector('.visual-document-surface p'),r=el.getBoundingClientRect(),dt=new DataTransfer();dt.setData('text/html',img.outerHTML);dt.setData('text/uri-list',img.src);el.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:r.left+2,clientY:r.top+2}));});
  await page.waitForTimeout(1500);
  const dropped=await page.evaluate(()=>({html:document.querySelector('.visual-document-surface').innerHTML,images:Array.from(document.querySelectorAll('#editor img')).map(i=>({width:i.naturalWidth,height:i.naturalHeight}))}));
  assert.ok(dropped.images.some(i=>i.width===expectedSize&&i.height===(input?1000:32)));
  const count=await page.locator('#editor .visual-image-block').count();
  await page.evaluate(()=>{const el=document.querySelector('.visual-document-surface p:last-child'),r=el.getBoundingClientRect(),dt=new DataTransfer();dt.setData('text/html','<img src="file:///C:/Documents/picture.png">');el.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:r.left+2,clientY:r.top+2}));});
  await page.getByRole('status').filter({hasText:'PC 파일 주소만 전달'}).waitFor();
  assert.equal(await page.locator('#editor .visual-image-block').count(),count);
  console.log('PASS: external Markdown file-URL drop shows an actionable warning without inserting an empty image');
  for(const betweenImages of [false,true]){
   await page.evaluate(between=>window.setEditorSource(between?`![first](${window.saved})\n\n![second](${window.saved})`:'앞 문단\n\n뒤 문단'),betweenImages);
   await page.waitForTimeout(200);
   await page.evaluate(async between=>{
    const surface=document.querySelector('.visual-document-surface');const blocks=Array.from(surface.children);
    const a=blocks[0].getBoundingClientRect(),b=blocks[1].getBoundingClientRect();
    const blob=await(await fetch(document.querySelector('#root img').src)).blob();
    const dt=new DataTransfer();dt.items.add(new File([blob],'middle.png',{type:blob.type}));
    const x=a.left+10,y=(a.bottom+b.top)/2;const target=document.elementFromPoint(x,y)||surface;
    target.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:x,clientY:y}));
    target.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:x,clientY:y}));
   },betweenImages);
   await page.waitForTimeout(400);
   const check=await page.evaluate(()=>({source:window.editorSource,images:Array.from(document.querySelectorAll('#editor img')).map(i=>i.naturalWidth)}));
   assert.ok(check.images.every(w=>w===expectedSize),JSON.stringify(check));
   assert.equal(check.images.length,betweenImages?3:1,JSON.stringify(check));
   assert.ok(check.source.includes('![](/media/middle.png'),check.source);
   assert.equal(await page.locator('#editor figcaption').filter({hasText:'middle.png'}).count(),0);
   assert.ok(check.source.indexOf('middle.png')<(betweenImages?check.source.indexOf('![second]'):check.source.indexOf('뒤 문단')),JSON.stringify(check));
  }
  console.log('PASS: middle drops between text and between images render actual image bytes in source order');
  await page.evaluate(()=>window.setEditorSource(`1. 첫 내용\n2. 다음 내용\n\n   ![목록 안](${window.saved})\n\n3. 마지막 내용\n\n![별도](${window.saved})\n`));
  await page.locator('#editor li .visual-image-block img').waitFor();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('#editor img')).length===2 && Array.from(document.querySelectorAll('#editor img')).every(i=>i.complete&&i.naturalWidth>0));
  await page.locator('#editor li .visual-image-block img').click();
  assert.equal(await page.locator('#editor .ProseMirror-selectednode').count(),1);
  assert.equal(await page.locator('#editor figure.ProseMirror-selectednode').count(),1);
  await page.keyboard.press('Delete');
  await page.waitForFunction(()=>document.querySelectorAll('#editor .visual-image-block').length===1);
  assert.equal(await page.locator('#editor .visual-image-block').count(),1);
  assert.ok((await page.locator('.visual-document-surface').textContent()).includes('마지막 내용'));
  console.log('PASS: clicking nested image selects only its figure; Delete preserves list text and separate image');
  console.log('PASS: actual resource save and MarkdownViewer render with Korean, spaces and parentheses in filename');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

