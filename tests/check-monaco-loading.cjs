const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json'));
const dir=path.resolve('.tmp/monaco-loading-qa');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'env.js'),req('typescript').transpileModule(fs.readFileSync('frontend/src/lib/monacoEnv.ts','utf8'),{compilerOptions:{target:7,module:1}}).outputText);
fs.writeFileSync(path.join(dir,'entry.js'),`
const React=require('react'),{createRoot}=require('react-dom/client');
const Editor=require('@monaco-editor/react').default;
require('./env').configureMonacoEnvironment();
createRoot(document.getElementById('root')).render(React.createElement(Editor,{height:'600px',language:'markdown',defaultValue:'# 시작',onMount:(editor)=>window.qaEditor=editor}));
`);
async function main(){
await new Promise((resolve,reject)=>req('webpack')({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{modules:[path.resolve('frontend/node_modules')]}},(error,stats)=>error||stats.hasErrors()?reject(error||Error(stats.toString({all:false,errors:true}))):resolve()));
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost').pathname;
 if(url==='/bundle.js'){response.setHeader('Content-Type','application/javascript; charset=utf-8');response.end(fs.readFileSync(path.join(dir,'bundle.js')));return;}
 if(url.startsWith('/monaco-editor/')){
  const file=path.resolve('frontend/public','.'+url),base=path.resolve('frontend/public/monaco-editor')+path.sep;
  if(!file.startsWith(base)||!fs.existsSync(file)){response.writeHead(404);response.end();return;}
  response.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');response.end(fs.readFileSync(file));return;
 }
 response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<div id="root"></div><script src="/bundle.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
 for(const route of ['/editor','/editor/']){
  const page=await browser.newPage(),failures=[],errors=[];
  page.on('response',response=>{if(response.status()>=400)failures.push(response.url());});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+route);
  await page.waitForFunction(()=>!!window.qaEditor,null,{timeout:20000});
  await page.evaluate(()=>{window.qaEditor.setValue('# 제목\n\n가나다라\n\n- **목록**');window.qaEditor.focus();window.qaEditor.setPosition({lineNumber:3,column:5});});
  await page.keyboard.type(' test');
  assert.ok((await page.evaluate(()=>window.qaEditor.getValue())).includes('가나다라 test'));
  assert.equal(await page.evaluate(()=>new URL(window.MonacoEnvironment.getWorkerUrl('','json'),location.href).pathname),'/monaco-editor/min/vs/base/worker/workerMain.js');
  assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: actual Monaco markdown editor loads and edits on /editor and /editor/ with local AMD assets');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
