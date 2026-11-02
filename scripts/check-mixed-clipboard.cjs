const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const req=require('module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const main=fs.readFileSync('main.js','utf8');const start=main.indexOf('function readNativeClipboardImage('),end=main.indexOf("ipcMain.handle('clipboard:readImage'",start);
let html='',text='',formats=[],reads=0;
const clipboard={readHTML:()=>html,readText:()=>text,availableFormats:()=>formats,readImage:()=>{reads++;return {isEmpty:()=>false,toDataURL:()=> 'data:image/png;base64,AQ=='};}};
const native=new Function('require','fs','path','process',main.slice(start,end)+';return readNativeClipboardImage;')(()=>({clipboard}),{existsSync:p=>p==='C:/image.png'},path,{platform:'win32'});
for(const content of [{html:'<p>TEXT</p><img src="x">',text:'TEXT'},{html:'<table><tr><td>cell</td></tr></table>',text:''},{html:'',text:'ordinary text'}]){
 html=content.html;text=content.text;reads=0;assert.equal(native(true),null);assert.equal(reads,0);
}
html='';text='';assert.ok(native(true).startsWith('data:image/'));
text='C:/image.png';assert.ok(native(true).startsWith('data:image/'));
text='Explorer filenames';formats=['FileNameW'];assert.ok(native(true).startsWith('data:image/'));
html='<p>rich</p>';assert.ok(native(false).startsWith('data:image/'));
console.log('PASS: actual native paste guard prioritizes rich/text data; pure image, Explorer files and explicit image reads retained');
const moduleText=ts.transpileModule(fs.readFileSync('frontend/src/lib/clipboardExport.ts','utf8'),{compilerOptions:{module:1,target:7}}).outputText;
async function run(){
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end('<html><body><main id="source"><h1>문서 제목</h1><p>본문 문장</p><table><tr><th>항목</th><th>값</th></tr><tr><td>첫 항목</td><td>값 1</td></tr></table><ul><li>목록 첫째</li><li>목록 둘째</li></ul><blockquote>인용문</blockquote><pre><code>const value = 1;</code></pre><img alt="그림" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6S8AAAAASUVORK5CYII="><style>.editor-css{color:red}</style></main><button id="copy">복사</button><div id="paste" contenteditable="true"></div></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(code=>{const exp={};new Function('exports',code)(exp);window.clip=exp;document.querySelector('#copy').onclick=async()=>{const data=exp.serializeDocumentForClipboard(document.querySelector('#source'));window.copied=data;window.copyOk=await exp.copyFormattedDocumentToClipboard(data.fullHtml,data.cleanText);};},moduleText);
 await page.click('#copy');await page.waitForFunction(()=>window.copyOk===true);
 const contents=await page.evaluate(async()=>{const result={};for(const item of await navigator.clipboard.read())for(const type of item.types)if(type.startsWith('text/'))result[type]=await(await item.getType(type)).text();return result;});
 for(const phrase of ['文','본문 문장','첫 항목','목록 첫째','인용문','const value = 1;'].filter(p=>p!=='文')){
  assert.ok(contents['text/plain'].includes(phrase),phrase);assert.ok(contents['text/html'].includes(phrase),phrase);
 }
 for(const tag of ['<table','<ul','<blockquote','<pre','<img'])assert.ok(contents['text/html'].includes(tag),tag);
 assert.ok(!contents['text/plain'].includes('.editor-css'));assert.ok(contents['text/plain'].includes('\n'));
 await page.locator('#paste').click();await page.keyboard.press('Control+v');
 for(const tag of ['table','ul','blockquote','pre','img'])assert.equal(await page.locator('#paste '+tag).count(),1,tag);
 assert.ok((await page.locator('#paste').textContent()).includes('본문 문장'));
 // Refusing all clipboard methods must never report success, even if a copy
 // event is dispatched by a failed execCommand implementation.
 const failed=await page.evaluate(async()=>{
  window.electronAPI={copyHtmlToClipboard:async()=>false,copyTextToClipboard:async()=>({success:false})};
  document.execCommand=()=>{document.dispatchEvent(new ClipboardEvent('copy',{clipboardData:new DataTransfer()}));return false;};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async()=>{throw Error('denied');},writeText:async()=>{throw Error('denied');}}});
  return await window.clip.copyFormattedDocumentToClipboard('<p>fail</p>','fail');
 });assert.equal(failed,false);
 console.log('PASS: real system clipboard HTML+text and mixed-content paste retain text/table/list/quote/code/image; failure cannot show success');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
