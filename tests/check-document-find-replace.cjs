const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript'),webpack=req('webpack');
const dir=path.resolve('.tmp/document-find-replace');fs.mkdirSync(dir,{recursive:true});
function compile(input,output){fs.writeFileSync(path.join(dir,output),ts.transpileModule(fs.readFileSync(input,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText);}
compile('frontend/src/lib/documentFind.ts','find.js');compile('frontend/src/components/preview/PreviewFindWidget.tsx','widget.js');compile('frontend/src/lib/visualDocumentCodec.ts','codec.js');compile('frontend/src/lib/mediaMarkup.ts','mediaMarkup.js');
const sample='---\ntitle: 숨긴메타\n---\n\n# 제목\n\n**고양이**는 고양이와 Cat cat\n\n서식 **연결** 검색\n\n> 인용 고양이\n\n| 열 |\n| --- |\n| 고양이 |\n\n[고양이](https://example.test/고양이)\n\n![고양이](media/고양이.png)\n\n```text\n고양이 [a]\n```\n';
compile('frontend/src/lib/bulletNumberText.ts','bulletNumberText.js');
const editorSource=fs.readFileSync('frontend/src/components/VisualDocumentEditor.tsx','utf8'),editorTree=ts.createSourceFile('editor.tsx',editorSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),bindings=[];
function visitKeys(node){if(ts.isPropertyAssignment(node)&&['Mod-z','Mod-y','Mod-Shift-z'].includes(node.name.text))bindings.push(node.getText(editorTree));ts.forEachChild(node,visitKeys);}visitKeys(editorTree);assert.equal(bindings.length,3);
fs.writeFileSync(path.join(dir,'entry.js'),`
const React=require('react'),{createRoot}=require('react-dom/client'),{EditorState}=require('prosemirror-state'),{EditorView}=require('prosemirror-view'),{history,undo,redo}=require('prosemirror-history');
const {keymap}=require('prosemirror-keymap'),historyKeys={${bindings.join(',')}};
const {createVisualDocumentCodec}=require('./codec'),{PreviewFindWidget}=require('./widget'),core=require('./find');
window.core=core;
function App(){
 const container=React.useRef(null),host=React.useRef(null),[open,setOpen]=React.useState(true),[source,setSource]=React.useState(${JSON.stringify(sample)}),[key,setKey]=React.useState(0);
 React.useLayoutEffect(()=>{
  const codec=createVisualDocumentCodec(source);let view;
  view=new EditorView(host.current,{state:EditorState.create({doc:codec.doc,plugins:[history(),keymap(historyKeys)]}),dispatchTransaction(tr){view.updateState(view.state.apply(tr));window.markdown=codec.serialize(view.state.doc);}});
  host.current.onriviSearchView=view;host.current.setAttribute('data-onrivi-search-editor','');window.view=view;window.markdown=codec.serialize(view.state.doc);
  window.undo=()=>undo(view.state,view.dispatch);window.redo=()=>redo(view.state,view.dispatch);
  return()=>{delete host.current.onriviSearchView;host.current.removeAttribute('data-onrivi-search-editor');view.destroy();};
 },[key]);
 window.switchDoc=text=>{setSource(text);setKey(k=>k+1);};window.open=()=>setOpen(true);
 return React.createElement('main',null,React.createElement('div',{ref:container,id:'preview'},React.createElement('div',{ref:host}),React.createElement('button',null,'고양이 도구 버튼')),React.createElement(PreviewFindWidget,{previewContainerRef:container,isOpen:open,onClose:()=>setOpen(false),replaceMode:true,documentKey:String(key)}));
}
createRoot(document.getElementById('app')).render(React.createElement(App));
`);
(async()=>{
 await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{modules:[path.resolve('frontend/node_modules'),'node_modules'],alias:{'@/lib/documentFind':path.join(dir,'find.js')}}},(error,stats)=>error||stats.hasErrors()?reject(error||Error(stats.toString())):resolve()));
 const browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<html><body><div id="app"></div></body></html>');await page.addScriptTag({path:path.join(dir,'bundle.js')});
  const query=page.getByRole('textbox',{name:'문서에서 찾기'}),replacement=page.getByRole('textbox',{name:'바꿀 내용'}),panel=page.getByRole('search');
  await query.fill('숨긴메타');await panel.getByText('결과 없음',{exact:true}).waitFor();
  await query.fill('서식 연결 검색');await panel.getByText('1 / 1',{exact:true}).waitFor();
  await query.fill('[a]');await panel.getByText('1 / 1',{exact:true}).waitFor();
  await query.fill('cat');await panel.getByText('1 / 2',{exact:true}).waitFor();
  await page.getByRole('checkbox',{name:'대소문자 구분'}).check();await panel.getByText('1 / 1',{exact:true}).waitFor();
  await page.getByRole('checkbox',{name:'대소문자 구분'}).uncheck();
  await query.fill('고양이');await panel.getByText('1 / 6',{exact:true}).waitFor();
  await query.press('Enter');await panel.getByText('2 / 6',{exact:true}).waitFor();
  await query.press('Shift+Enter');await panel.getByText('1 / 6',{exact:true}).waitFor();
  await replacement.fill('강아지');await page.getByRole('button',{name:'모두 바꾸기',exact:true}).click();
  await panel.getByText('결과 없음',{exact:true}).waitFor();
  const changed=await page.evaluate(()=>window.markdown);
  assert.match(changed,/\*\*강아지\*\*/);assert.match(changed,/> 인용 강아지/);assert.match(changed,/\| 강아지 \|/);assert.ok(decodeURI(changed).includes('https://example.test/고양이'),changed);assert.ok(changed.includes('![고양이](media/고양이.png)'));assert.ok(changed.includes('title: 숨긴메타'));
  await page.evaluate(()=>window.undo());await panel.getByText('1 / 6',{exact:true}).waitFor();
  await page.evaluate(()=>window.redo());await panel.getByText('결과 없음',{exact:true}).waitFor();
  await page.evaluate(()=>window.undo());await panel.getByText('1 / 6',{exact:true}).waitFor();
  await page.getByRole('button',{name:'바꾸기',exact:true}).click();await panel.getByText('1 / 5',{exact:true}).waitFor();
  await replacement.fill('');await page.getByRole('button',{name:'바꾸기',exact:true}).click();await panel.getByText('1 / 4',{exact:true}).waitFor();
  // Search results are refreshed when the document changes; old matches cannot edit a new doc.
  const staleProtected=await page.evaluate(()=>{const matches=window.core.collectDocumentMatches(document.getElementById('preview'),'고양이');window.view.dispatch(window.view.state.tr.insertText('수정 ',1));return window.core.replaceDocumentMatches(matches,'BAD');});assert.equal(staleProtected,0);
  await page.evaluate(()=>window.switchDoc('# 새 문서\n\n고양이 하나'));
  await panel.getByText('1 / 1',{exact:true}).waitFor();
  const readonly=await page.evaluate(()=>{const root=document.createElement('div');root.innerHTML='<p>읽기 <strong>전용</strong></p><button>읽기 전용</button>';const matches=window.core.collectDocumentMatches(root,'읽기 전용');return {count:matches.length,changed:window.core.replaceDocumentMatches(matches,'BAD'),html:root.innerHTML};});
  assert.equal(readonly.count,1);assert.equal(readonly.changed,0);assert.ok(readonly.html.includes('<strong>전용</strong>'));
  await page.evaluate(()=>{const container=document.getElementById('preview');container.style.height='100px';container.style.overflow='auto';window.switchDoc('긴 문단 '.repeat(2000)+'끝말');});
  await query.fill('끝말');await panel.getByText('1 / 1',{exact:true}).waitFor();
  const visible=await page.evaluate(()=>{const container=document.getElementById('preview'),match=window.core.collectDocumentMatches(container,'끝말')[0],bounds=container.getBoundingClientRect(),rect=match.range.getBoundingClientRect();return rect.top>=bounds.top&&rect.bottom<=bounds.bottom;});assert.equal(visible,true,'the matched line of a long paragraph must be visible');
  await replacement.fill('새말');
  const beforeReplace=await page.evaluate(()=>({top:document.getElementById('preview').scrollTop,left:document.getElementById('preview').scrollLeft}));
  await page.getByRole('button',{name:'바꾸기',exact:true}).click();
  await page.waitForFunction(()=>window.markdown.endsWith('새말'));
  const afterReplace=await page.evaluate(async()=>{await new Promise(resolve=>setTimeout(resolve,150));return {top:document.getElementById('preview').scrollTop,left:document.getElementById('preview').scrollLeft};});
  assert.deepEqual(afterReplace,beforeReplace,'replacement must not move the viewport');
  await page.locator('.ProseMirror').focus();await page.locator('.ProseMirror').press('Control+z');await page.waitForFunction(()=>window.markdown.endsWith('끝말'));
  await page.locator('.ProseMirror').press('Control+y');await page.waitForFunction(()=>window.markdown.endsWith('새말'));
  await query.focus();
  await query.press('Escape');await panel.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>CSS.highlights.has('preview-search')),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: actual visual schema/codec and find widget; marked text/table/quote/code search, case/literal matching, metadata/URL protection, single/all/empty replacement, serialization, undo/redo, stale-match protection, tab changes and close cleanup');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
