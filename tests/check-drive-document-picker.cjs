const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript'),webpack=req('webpack');
const dir=path.resolve('.tmp/drive-document-picker');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'picker.js'),ts.transpileModule(fs.readFileSync('frontend/src/lib/gdrive/WorkspaceFolderPicker.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText);
fs.writeFileSync(path.join(dir,'drive.js'),`
let accounts=[{email:'a@example.test',token:'A',expiresAt:Date.now()+3600000,isWorkspaceAccount:true},{email:'b@example.test',token:'B',expiresAt:Date.now()+3600000}];
exports.getSavedDriveAccounts=()=>accounts;
exports.saveDriveAccount=a=>{accounts=accounts.filter(v=>v.email!==a.email).concat(a)};
exports.fetchGoogleUserInfo=async token=>({email:token==='A'?'a@example.test':'b@example.test'});
exports.listSharedDrives=async()=>[{id:'shared',name:'Shared'}];
exports.ensureDriveFolder=async()=> 'onrivi';
exports.createDriveFolder=async()=> 'new';
exports.requestGoogleDriveAuth=async()=> 'B';
exports.listDriveChildren=async(token,id)=>[{id:'sub',name:'하위 폴더',isFolder:true,mimeType:'application/vnd.google-apps.folder'},{id:token+'-doc',name:'report.docx',isFolder:false,mimeType:'application/octet-stream'},{id:'image',name:'image.png',isFolder:false,mimeType:'image/png'}];
`);
fs.writeFileSync(path.join(dir,'entry.js'),`const {pickAccessibleDriveFolder}=require('./picker');window.start=async selectFile=>{window.result=undefined;window.result=await pickAccessibleDriveFolder('A',[{id:'current',name:'현재 폴더'}],{title:'파일 선택 검사',selectFile,acceptFile:f=>f.name.endsWith('.docx')});};`);
(async()=>{
 await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{modules:[path.resolve('frontend/node_modules'),'node_modules'],alias:{'./googleDriveClient':path.join(dir,'drive.js')}}},(error,stats)=>error||stats.hasErrors()?reject(error||Error(stats.toString())):resolve()));
 const browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<html><body></body></html>');await page.addScriptTag({path:path.join(dir,'bundle.js')});
  await page.evaluate(()=>{void window.start(true)});
  await page.getByRole('button',{name:/report.docx/}).waitFor();assert.equal(await page.getByRole('button',{name:/image.png/}).count(),0);
  assert.equal(await page.getByRole('button',{name:'이 폴더에 저장',exact:true}).count(),0);
  await page.getByRole('combobox',{name:'구글 드라이브 계정 선택'}).selectOption('b@example.test');
  await page.getByRole('button',{name:/report.docx/}).click();
  await page.waitForFunction(()=>window.result?.id==='B-doc');
  const result=await page.evaluate(()=>window.result);assert.equal(result.token,'B');assert.equal(result.name,'report.docx');
  await page.evaluate(()=>{void window.start(false)});
  await page.getByRole('button',{name:/하위 폴더/}).waitFor();assert.equal(await page.getByRole('button',{name:/report.docx/}).count(),0);
  await page.getByRole('button',{name:'이 폴더에 저장',exact:true}).click();await page.waitForFunction(()=>window.result?.id==='current');
  assert.deepEqual(errors,[]);
  console.log('PASS: actual Drive picker renders document/filter modes, switches source accounts and returns selected file token; folder-saving mode preserved');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
