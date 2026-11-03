const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),frontend=path.join(root,'frontend');
const req=createRequire(path.join(frontend,'package.json'));
const ts=req('typescript'),webpack=req('webpack');
const dir=path.join(root,'.tmp/picturebook-ime');fs.mkdirSync(dir,{recursive:true});
function compile(relative,name){
  const source=fs.readFileSync(path.join(frontend,'src',relative),'utf8');
  fs.writeFileSync(path.join(dir,name),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText);
}
compile('components/PicturebookSceneInput.tsx','input.js');
compile('lib/picturebook.ts','picturebook.js');compile('lib/frontmatter.ts','frontmatter.js');
compile('lib/toolbarConfig.ts','toolbar.js');compile('lib/visualCommandCatalog.ts','catalog.js');compile('lib/desktopClipboard.ts','clipboard.js');
compile('lib/imageResourceName.ts','imageName.js');
// Reuse the exact existing right-toolbar buttons, not newly added controls.
const toolbar=fs.readFileSync(path.join(frontend,'src/components/Toolbar.tsx'),'utf8');
const toolbarStart=toolbar.indexOf('{showProductivity && (')+'{showProductivity && ('.length;
const toolbarEnd=toolbar.indexOf('\n      )}',toolbarStart);
assert.ok(toolbarStart>0 && toolbarEnd>toolbarStart);
fs.writeFileSync(path.join(dir,'right-tools.js'),ts.transpileModule(`import React from 'react';
export default function RightTools({dispatch}:any){const isEmojiPanelOpen=false;const Icon=({name}:any)=><span>{name}</span>;
return (${toolbar.slice(toolbarStart,toolbarEnd)});}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText);
fs.writeFileSync(path.join(dir,'entry.js'),`
const React=require('react'),{createRoot}=require('react-dom/client');
const Input=require('./input').default,{parseBookScenes,replaceBookScene}=require('./picturebook');
const {picturebookImageReference}=require('./imageName');
const RightTools=require('./right-tools').default;
function App(){
 const [source,setSource]=React.useState(':::scene {cover}\\n![cover](media/test.png)\\n\\n# 표지\\n:::\\n\\n:::scene\\n![next](media/next.png)\\n\\n다음 장면 유지\\n:::');
 const commands=React.useRef(null);window.qaRef=commands;
 const [floating,setFloating]=React.useState(false);
 window.setSource=setSource;window.qaSource=source;window.qaCommits=window.qaCommits||[];
 const scene=parseBookScenes(source).scenes[0];
 return React.createElement(React.Fragment,null,React.createElement(Input,{label:'장면 원고',value:scene.raw,options:{commandRef:commands,customCommands:{h3:'qa3'},customHotkeys:{bold:'Ctrl+Alt+B'},floatingToolbarVisible:floating,
   onFloatingToolbar:visible=>{window.qaFloating=visible;setFloating(visible);},
   onAction:command=>{window.qaAction=command;},
   onImageDialog:insert=>{window.qaImageInsert=(path,alt)=>insert(picturebookImageReference(path,alt));},
   onImageFile:async file=>{window.qaUploads=(window.qaUploads||0)+1;return 'media/'+file.name;}
 },onCommit:text=>{
   window.qaCommits.push(text);setSource(current=>replaceBookScene(current,parseBookScenes(current).scenes[0],text));
 }}),React.createElement(RightTools,{dispatch:command=>{if(!commands.current?.(command))window.qaAction=command;}}));
}createRoot(document.getElementById('root')).render(React.createElement(App));`);
(async()=>{
 await new Promise((resolve,reject)=>webpack({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{modules:[path.join(frontend,'node_modules')],alias:{'@/lib/toolbarConfig':path.join(dir,'toolbar.js'),'@/lib/visualCommandCatalog':path.join(dir,'catalog.js'),'@/lib/desktopClipboard':path.join(dir,'clipboard.js')}},devtool:false},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
 fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><div id="root"></div><script src="bundle.js"></script>');
 const browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();page.on('pageerror',error=>console.error('Browser error:',error.message));await page.goto('file:///'+path.join(dir,'index.html').replace(/\\/g,'/'));
  const input=page.getByRole('textbox',{name:'장면 원고'});await input.focus();
  const initial=await input.inputValue();
  const during=await page.evaluate(()=>{
    const el=document.querySelector('textarea'),base=el.value;
    const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    for(const partial of ['ㅎ','하','한','한ㄱ','한그','한글']){
      setter.call(el,base+partial);el.setSelectionRange(el.value.length,el.value.length);
      el.dispatchEvent(new InputEvent('input',{bubbles:true,data:partial,inputType:'insertCompositionText',isComposing:true}));
    }
    return {value:el.value,commits:window.qaCommits.length};
  });
  assert.equal(during.value,initial+'한글');assert.equal(during.commits,0);
  await page.evaluate(()=>document.querySelector('textarea').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'한글'})));
  await page.waitForFunction(()=>window.qaCommits.length===1);
  assert.equal(await input.inputValue(),initial+'한글');
  assert.ok((await page.evaluate(()=>window.qaSource)).includes('다음 장면 유지'));
  await page.keyboard.press('End');await page.keyboard.insertText('  ');await page.keyboard.press('Enter');await page.keyboard.insertText('다음 줄');
  assert.ok((await input.inputValue()).endsWith('한글  \n다음 줄'));
  assert.ok((await page.evaluate(()=>window.qaSource)).includes('한글  \n다음 줄'));
  console.log('PASS: simulated Korean composition retains browser buffer, commits once, preserves spaces/newlines and other scene');
  await input.fill('hello');await input.press('Control+Home');await input.press('Control+Shift+End');await input.press('Control+Alt+b');
  assert.equal(await input.inputValue(),'**hello**');
  await input.press('Control+End');await input.press('Enter');await page.keyboard.type('/qa3');
  await page.getByRole('menuitem',{name:'/qa3',exact:true}).waitFor();await page.keyboard.press('Enter');await page.keyboard.insertText('QA 제목');
  assert.ok((await input.inputValue()).endsWith('### QA 제목'),await input.inputValue());
  assert.equal(await page.getByRole('button',{name:'사진 넣기',exact:true}).count(),0);
  await input.press('Control+End');await page.getByTitle('플로팅 서식 툴바 켜기/끄기',{exact:true}).click();
  assert.equal(await page.evaluate(()=>window.qaFloating),true);
  assert.equal(await page.getByRole('menu',{name:'장면 서식 도구'}).count(),0);
  await page.getByTitle('슬래시(/) 빠른 명령어 호출',{exact:true}).click();
  await page.getByRole('menu',{name:'장면 슬래시 명령어'}).waitFor();await input.press('Escape');
  await page.getByTitle('이모지 보관함 (Ctrl+Shift+E)',{exact:true}).click();
  assert.equal(await page.evaluate(()=>window.qaAction),'TOGGLE_EMOJI_PANEL');
  await page.evaluate(()=>window.qaRef.current('INSERT_TEXT:😀'));
  assert.ok((await input.inputValue()).endsWith('QA 제목😀'));
  await page.evaluate(()=>window.qaRef.current('IMAGE'));
  await page.evaluate(()=>window.qaImageInsert('media/modal-new.png?v=2','modal'));
  assert.ok((await input.inputValue()).includes('\n![modal](<media/modal-new.png?v=2>)'));
  await input.press('Control+End');
  await input.evaluate(el=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([1])],'paste.png',{type:'image/png'}));el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));});
  await page.waitForFunction(()=>document.querySelector('textarea').value.includes('media/paste.png'));
  await input.evaluate(el=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([1])],'drop.png',{type:'image/png'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));});
  await page.waitForFunction(()=>document.querySelector('textarea').value.includes('media/drop.png'));
  const imageAfterDrop=await input.inputValue();
  assert.ok(!imageAfterDrop.includes('media/paste.png'));
  assert.equal((imageAfterDrop.match(/^!\[/gm)||[]).length,1);
  assert.equal(await page.evaluate(()=>window.qaUploads),2);
  await page.evaluate(()=>window.qaRef.current('IMAGE'));
  await input.focus();await page.keyboard.insertText('다른 입력');
  assert.equal(await page.evaluate(()=>window.qaImageInsert('media/stale.png','stale')),false);
  assert.ok(!(await input.inputValue()).includes('media/stale.png'));
  await input.fill('![이전 그림](media/old.png)\n\n# 제목\n본문 유지');
  await input.press('Control+Home');
  await page.evaluate(()=>window.qaRef.current('IMAGE'));
  assert.equal(await page.evaluate(()=>window.qaImageInsert('media/img_new.png?v=3','새 그림')),true);
  const replaced=await input.inputValue();
  assert.ok(replaced.startsWith('![새 그림](<media/img_new.png?v=3>)'));
  assert.ok(!replaced.includes('media/old.png'));assert.ok(replaced.includes('본문 유지'));
  assert.ok((await page.evaluate(()=>window.qaSource)).includes('![새 그림](<media/img_new.png?v=3>)'));
  assert.ok((await page.evaluate(()=>window.qaSource)).includes('다음 장면 유지'));
  console.log('PASS: original right-toolbar icons, shared floating-toolbar callback, shortcuts/slash, emoji, image modal/paste/drop and no added action row');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
