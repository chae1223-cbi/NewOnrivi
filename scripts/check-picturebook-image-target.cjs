const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),frontend=path.join(root,'frontend'),req=createRequire(path.join(frontend,'package.json'));
const ts=req('typescript'),webpack=req('webpack'),dir=path.join(root,'.tmp/picturebook-image-target');fs.mkdirSync(dir,{recursive:true});
function compile(file,name){fs.writeFileSync(path.join(dir,name),ts.transpileModule(fs.readFileSync(path.join(frontend,'src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText);}
compile('components/PicturebookPreview.tsx','preview.js');compile('lib/picturebook.ts','picturebook.js');compile('lib/frontmatter.ts','frontmatter.js');compile('constants/paperSizes.ts','paper.js');compile('lib/desktopClipboard.ts','clipboard.js');
const nativeSource=fs.readFileSync(path.join(frontend,'src/components/VisualDocumentEditor.tsx'),'utf8');
const resetViewport=nativeSource.split('\n').find(line=>line.includes("if(scrollContainer && !hostEl.closest('[data-book-text]'))"));assert.ok(resetViewport);
fs.writeFileSync(path.join(dir,'editor.js'),`const React=require('react');module.exports=props=>{
 window.qaEditorProps=props;
 const element=React.useRef(null);React.useLayoutEffect(()=>{
  const hostEl=element.current,scrollContainer=element.current.closest('.custom-preview-container'),cached=undefined,content='';
  ${resetViewport}
 },[]);
 return React.createElement('div',{ref:element,tabIndex:0,className:'visual-document-surface','data-test-editor':true},'body editor');
};`);
fs.writeFileSync(path.join(dir,'input.js'),'module.exports=()=>null;');
// The integration exercises page event ownership and replacement. Save/network
// and OS file decoding are supplied by fixtures, not live accounts.
fs.writeFileSync(path.join(dir,'resource.js'),'exports.parseDroppedDataToBlob=dt=>dt.files[0]?{file:dt.files[0]}:null;exports.fetchExternalImageFile=async()=>null;');
fs.writeFileSync(path.join(dir,'media.js'),'exports.copyImageToClipboard=async()=>true;');
fs.writeFileSync(path.join(dir,'entry.js'),`
const React=require('react'),{createRoot}=require('react-dom/client'),Preview=require('./preview').default;
function App(){
 const [source,setSource]=React.useState(':::scene {cover}\\n![cover](media/old.png)\\n\\n# first title\\nfirst text\\n:::\\n\\n:::scene\\n![next](media/next.png)\\n\\nsecond text\\n:::');
 window.qaSource=source;window.setSource=setSource;
 return React.createElement('div',{className:'custom-preview-container',style:{height:500,overflow:'auto'}},React.createElement(Preview,{content:source,fingerprint:'test',profile:{pageStyle:{paperSize:'a4',orientation:'portrait',marginTop:'0px',marginRight:'0px',marginBottom:'0px',marginLeft:'0px'},layout:{cover:'image-right',imageRatio:.5,gap:'0px',imageFit:'contain'}},
 onChange:setSource,editorOptions:{documentId:'qa',commandRef:{current:null},tabSize:4,customHotkeys:{bold:'Ctrl+B'},customCommands:{},onFloatingToolbar:()=>{},floatingToolbarVisible:false,onAction:()=>{},onImageFile:async file=>{window.qaSaves=(window.qaSaves||0)+1;if(window.qaDelay)return new Promise(resolve=>window.qaResolve=resolve);return 'media/'+file.name;}},
 renderMarkdown:part=>React.createElement('div',{'data-rendered':true},part)}));
}createRoot(document.getElementById('root')).render(React.createElement(App));`);
(async()=>{
 await new Promise((resolve,reject)=>webpack({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{modules:[path.join(frontend,'node_modules')],alias:{'./VisualDocumentEditor':path.join(dir,'editor.js'),'./PicturebookSceneInput':path.join(dir,'input.js'),'@/lib/picturebook':path.join(dir,'picturebook.js'),'@/constants/paperSizes':path.join(dir,'paper.js'),'@/lib/resourceMedia':path.join(dir,'resource.js'),'@/lib/desktopClipboard':path.join(dir,'clipboard.js'),'@/lib/mediaMarkup':path.join(dir,'media.js')}},devtool:false},(err,stats)=>err||stats.hasErrors()?reject(err||new Error(stats.toString({all:false,errors:true}))):resolve()));
 fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
 const browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();page.on('pageerror',error=>console.error(error.message));await page.goto('file:///'+path.join(dir,'index.html').replace(/\\/g,'/'));
  const pages=page.locator('.book-page');await pages.nth(1).waitFor();
  // Drop over the body, not the picture: it must still replace the picture.
  await pages.first().locator('.book-text').evaluate(el=>{const dt=new DataTransfer();dt.items.add(new File(['pixels'],'drop-cover.png',{type:'image/png'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));});
  await page.waitForFunction(()=>window.qaSource.includes('media/drop-cover.png'));
  assert.ok((await pages.first().locator('.book-image').textContent()).includes('media/drop-cover.png'));
  assert.ok(!(await pages.first().locator('.book-text').textContent()).includes('drop-cover.png'));
  assert.ok((await pages.first().locator('.book-text').textContent()).includes('first text'));
  assert.ok((await pages.nth(1).locator('.book-image').textContent()).includes('media/next.png'));
  await pages.nth(1).locator('.book-text').evaluate(el=>{const dt=new DataTransfer();dt.items.add(new File(['pixels2'],'paste-scene.png',{type:'image/png'}));el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));});
  await page.waitForFunction(()=>window.qaSource.includes('media/paste-scene.png'));
  assert.ok(!(await pages.nth(1).locator('.book-text').textContent()).includes('paste-scene.png'));
  assert.ok((await pages.nth(1).locator('.book-text').textContent()).includes('second text'));
  await page.evaluate(()=>{window.qaDelay=true;});
  await pages.first().locator('.book-text').evaluate(el=>{const dt=new DataTransfer();dt.items.add(new File(['late'],'late.png',{type:'image/png'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));});
  await page.waitForFunction(()=>!!window.qaResolve);
  await page.evaluate(()=>window.setSource(window.qaSource.replace('first text','updated first text')));
  await page.evaluate(()=>window.qaResolve('media/late.png'));
  await page.getByRole('alert').waitFor();
  assert.ok(!(await page.evaluate(()=>window.qaSource)).includes('media/late.png'));
  assert.ok((await page.evaluate(()=>window.qaSource)).includes('updated first text'));
  const viewport=page.locator('.custom-preview-container');
  await viewport.evaluate(el=>{el.scrollTop=1000;});
  const before=await viewport.evaluate(el=>el.scrollTop);
  await pages.nth(1).getByRole('button',{name:'본문 편집',exact:true}).evaluate(el=>el.click());
  await pages.nth(1).locator('[data-test-editor]').waitFor();
  assert.equal(await viewport.evaluate(el=>el.scrollTop),before);
  assert.equal(await page.evaluate(()=>document.activeElement.className),'visual-document-surface');
  assert.ok(await page.evaluate(()=>!!window.qaEditorProps.commandRef && typeof window.qaEditorProps.onFloatingToolbar==='function' && window.qaEditorProps.customHotkeys.bold==='Ctrl+B' && window.qaEditorProps.documentId==='qa'));
  await page.evaluate(()=>window.setSource('---\ncss_profile: "picturebook-custom"\n---\n\n'+window.qaSource));
  await page.waitForFunction(()=>window.qaSource.startsWith('---'));
  await page.evaluate(()=>window.qaEditorProps.onChange('**second text**'));
  await page.waitForFunction(()=>window.qaSource.includes('**second text**'));
  assert.ok((await page.evaluate(()=>window.qaSource)).startsWith('---\ncss_profile: "picturebook-custom"\n---'));
  await page.getByRole('button',{name:'표지 다음 장면 추가',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.book-page').length===3);
  const next=await page.evaluate(()=>window.qaSource);
  assert.ok(next.indexOf('새 장면의 내용을 입력하세요.')<next.indexOf('second text'));
  assert.ok(next.includes('updated first text'));assert.ok(next.includes('media/paste-scene.png'));
  await page.evaluate(()=>window.setSource(window.qaSource+'\n\n실제 장면 밖 본문\n메타영역\n#서식설정\ncss_profile: profile-book-test\n---'));
  const warning=page.locator('.book-validation');await warning.waitFor();
  await warning.locator('summary').click();
  assert.equal((await warning.locator('.book-issue-text').textContent()).trim(),'실제 장면 밖 본문');
  const colors=await warning.locator('.book-issue-text').evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,size:getComputedStyle(el).fontSize}));
  assert.equal(colors.color,'rgb(23, 32, 51)');assert.equal(colors.background,'rgb(255, 255, 255)');assert.equal(colors.size,'14px');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.qaCopiedText=text;}}}));
  await warning.getByRole('button',{name:'복사',exact:true}).click();
  await page.waitForFunction(()=>window.qaCopiedText==='실제 장면 밖 본문');
  await warning.getByRole('button',{name:'편집',exact:true}).click();
  await warning.getByRole('textbox',{name:'장면 밖 본문 편집'}).fill('');
  await warning.getByRole('button',{name:'적용',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.book-validation'));
  assert.ok((await page.evaluate(()=>window.qaSource)).includes('css_profile: profile-book-test'));
  console.log('PASS: picture replacement, stale guards, scene edit viewport preservation and insertion immediately after selected scene');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
