const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve('.'),front=path.join(root,'frontend'),req=require('node:module').createRequire(path.join(front,'package.json'));
async function protocols(){
  const wire=await import('../frontend/src/lib/ai/wire.mjs'),{handleAIRequest}=await import('../frontend/src/lib/ai/server.mjs');
  const input={model:'test-model',prompt:'교정',images:[]};
  assert.throws(()=>wire.requestSpec('other','secret',input));
  assert.throws(()=>wire.requestSpec('google','secret',{...input,model:'../bad?key=x'}));
  const events={google:[{candidates:[{content:{parts:[{text:'수정'},{thought:true,text:'숨김'}]}}]},{candidates:[{content:{parts:[{text:' 완료'}]},finishReason:'STOP'}]}],openai:[{type:'response.output_text.delta',delta:'수정 완료'},{type:'response.completed'}],anthropic:[{type:'content_block_delta',delta:{type:'text_delta',text:'수정 완료'}},{type:'message_delta',delta:{stop_reason:'end_turn'}},{type:'message_stop'}]};
  for(const provider of wire.PROVIDERS){
    const spec=wire.requestSpec(provider,'TEST_KEY',input);assert.ok(!spec.url.includes('TEST_KEY'));
    const sse=events[provider].map(value=>'data: '+JSON.stringify(value)+'\r\n\r\n').join('');
    const bytes=new TextEncoder().encode(sse);let offset=0;
    const mock=async()=>new Response(new ReadableStream({pull(controller){if(offset>=bytes.length)return controller.close();controller.enqueue(bytes.slice(offset,offset+7));offset+=7;}}));
    const result=[];for await(const item of wire.generate(provider,'TEST_KEY',input,new AbortController().signal,mock))result.push(item);
    assert.equal(result.filter(e=>e.type==='textDelta').map(e=>e.text).join(''),'수정 완료');assert.equal(result.at(-1).type,'complete');
  }
  for(const [provider,event]of [['google',{candidates:[{finishReason:'MAX_TOKENS'}]}],['openai',{type:'response.incomplete'}],['anthropic',{type:'message_delta',delta:{stop_reason:'max_tokens'}}]]){
    await assert.rejects(async()=>{for await(const _ of wire.generate(provider,'TEST_KEY',input,new AbortController().signal,async()=>new Response('data: '+JSON.stringify(event)+'\n\n'))){};});
  }
  const models=await wire.listModels('google','key',undefined,async()=>Response.json({models:[{name:'models/gemma-4-26b-a4b-it',supportedGenerationMethods:['generateContent']},{name:'models/embedding',supportedGenerationMethods:['embedContent']}]}));assert.equal(models.length,1);assert.equal(models[0].family,'Gemma');
  const env={NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon'};
  const request=()=>new Request('https://onrivi.test/api/ai/request',{method:'POST',headers:{authorization:'Bearer TEST_TOKEN',origin:'https://onrivi.test','content-type':'application/json'},body:JSON.stringify({provider:'openai',key:'TEST_KEY',action:'generate',input})});
  assert.equal((await handleAIRequest(new Request('https://onrivi.test/api/ai/request',{method:'POST'}),env)).status,401);
  let calls=0;const response=await handleAIRequest(request(),env,async url=>{calls++;return String(url).includes('/auth/v1/user')?Response.json({id:'user'}):new Response(events.openai.map(v=>'data: '+JSON.stringify(v)+'\n\n').join(''));});
  const body=await response.text();assert.ok(body.includes('textDelta'));assert.ok(body.includes('complete'));assert.ok(!body.includes('TEST_KEY'));assert.equal(calls,2);
  console.log('PASS: Google/Gemma, OpenAI Responses, Claude Messages protocols; split UTF-8 SSE; completion, failure and authenticated bounded proxy');
}
async function desktop(){
  const {EventEmitter}=require('node:events'),{registerInlineAI}=require('../electron/inlineAI.cjs');
  const dir=path.join(root,'.tmp/inline-ai-vault-'+Date.now());fs.mkdirSync(dir,{recursive:true});const handlers=new Map(),app=new EventEmitter();app.getPath=()=>dir;
  const safeStorage={isEncryptionAvailable:()=>true,encryptString:value=>Buffer.from(value.split('').reverse().join('')),decryptString:value=>value.toString().split('').reverse().join('')};
  registerInlineAI({ipcMain:{handle:(name,handler)=>handlers.set(name,handler)},app,safeStorage});
  const sender=new EventEmitter();sender.id=7;sender.mainFrame={url:'app://onrivi/index.html'};sender.isDestroyed=()=>false;const sent=[];sender.send=(channel,event)=>sent.push(event);const event={sender,senderFrame:sender.mainFrame};
  const config={scope:'fixture-account',provider:'openai'};
  await assert.rejects(()=>handlers.get('inline-ai:key')({...event,senderFrame:{url:'https://evil.invalid'}},{...config,key:'TEST_KEY'}));
  assert.deepEqual(await handlers.get('inline-ai:key')(event,{...config,key:'TEST_VAULT_KEY',remember:true}),{connected:true});
  const vault=path.join(dir,'ai-credentials',fs.readdirSync(path.join(dir,'ai-credentials'))[0]);assert.ok(!fs.readFileSync(vault).includes('TEST_VAULT_KEY'));
  const originalFetch=global.fetch;
  try{
    global.fetch=async()=>Response.json({data:[{id:'gpt-text'},{id:'text-embedding-test'}]});const result=await handlers.get('inline-ai:run')(event,{...config,id:'models',action:'models'});assert.equal(result.models.length,1);
    global.fetch=async()=>new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:'hello'})+'\n\ndata: '+JSON.stringify({type:'response.completed'})+'\n\n');
    await handlers.get('inline-ai:run')(event,{...config,id:'generation',action:'generate',input:{model:'gpt-text',prompt:'test',images:[]}});assert.equal(sent.at(-1).type,'complete');assert.ok(!JSON.stringify(sent).includes('TEST_VAULT_KEY'));
    global.fetch=async(_url,options)=>new Promise((_resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(Error('abort')),{once:true});});
    const pending=handlers.get('inline-ai:run')(event,{...config,id:'cancel',action:'generate',input:{model:'gpt-text',prompt:'test',images:[]}});await new Promise(r=>setTimeout(r,20));handlers.get('inline-ai:cancel')(event,'cancel');await assert.rejects(pending,/중지/);
  }finally{global.fetch=originalFetch;}
  await handlers.get('inline-ai:key')(event,{...config,remove:true});assert.equal((await handlers.get('inline-ai:key')(event,config)).connected,false);assert.equal(fs.existsSync(vault),false);
  const files=require('../package.json').build.files;assert.ok(files.includes('electron/inlineAI.cjs'));assert.ok(files.includes('frontend/src/lib/ai/wire.mjs'));
  console.log('PASS: desktop IPC sender guard, encrypted vault contract, no key in renderer events, provider requests, cancellation, disconnect and package manifest');
}
async function browserTest(){
  const dir=path.join(root,'.tmp/inline-ai-qa');fs.mkdirSync(dir,{recursive:true});const ts=req('typescript');
  fs.writeFileSync(path.join(dir,'loader.cjs'),`const ts=require(${JSON.stringify(require.resolve(path.join(front,'node_modules/typescript')))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:99,target:9,jsx:4,esModuleInterop:true}}).outputText;`);
  fs.writeFileSync(path.join(dir,'resources.js'),`exports.getResourceSettings=()=>({kind:'browser',path:'test'});exports.readResourceJson=async name=>name==='ai_prompts.json'?{}:JSON.parse(JSON.stringify(window.presets));exports.writeResourceJson=async(name,value)=>{window.presets=JSON.parse(JSON.stringify(value));return {success:true};};`);
  fs.writeFileSync(path.join(dir,'credentialFixture.js'),`const rows={};exports.getActiveResourceApiKey=()=>rows.google?.apiKey||'';exports.getProviderResourceApiKey=p=>rows[p]?.apiKey||'';exports.getProviderResourceModel=p=>rows[p]?.model||'';exports.getProviderResourceModels=p=>rows[p]?.models||[];exports.saveProviderResourceCredentials=async(p,value)=>{rows[p]={...rows[p],...value};return {success:true};};exports.deleteProviderResourceCredentials=async p=>{delete rows[p];};exports.purgeLocalStorageAICredentials=()=>{};`);
  fs.writeFileSync(path.join(dir,'supabase.js'),`exports.supabase={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})}};`);
  fs.writeFileSync(path.join(dir,'entry.js'),`
const React=require('react'),{createRoot}=require('react-dom/client');
const {EditorView}=require('prosemirror-view'),{EditorState,TextSelection}=require('prosemirror-state'),{schema}=require('prosemirror-schema-basic'),{history,undo}=require('prosemirror-history');
const {VisualAITargets}=require(${JSON.stringify(path.join(front,'src/lib/ai/visualTarget.ts'))});
const Assistant=require(${JSON.stringify(path.join(front,'src/components/ai/InlineAIAssistant.tsx'))}).default;
const Settings=require(${JSON.stringify(path.join(front,'src/components/ai/AIConnectionSettings.tsx'))}).default;
const templates=require(${JSON.stringify(path.join(front,'src/lib/ai/templates.ts'))});
const {readAIAttachment}=require(${JSON.stringify(path.join(front,'src/lib/ai/attachments.ts'))});
window.presets=[{id:'legacy',name:'기존 교정',systemPrompt:'정중하게',userPrompt:'문장 교정',editorialCommand:'교정해 줘',unknownField:'preserve'}];
let listeners=new Set(),keys={},calls=[],fail=false;window.aiCalls=calls;
window.electronAPI={inlineAIKey:async d=>{if(d.remove)delete keys[d.provider];else if(d.key)keys[d.provider]=d.key;return {connected:!!keys[d.provider]};},onInlineAIEvent:f=>{listeners.add(f);return()=>listeners.delete(f);},inlineAICancel:async()=>{},inlineAIRun:async d=>{
 calls.push(d);if(d.action==='models')return {models:[{id:d.provider==='google'?'gemma-4-26b-a4b-it':d.provider==='openai'?'gpt-6.1-sol':'claude-sonnet-5-5',name:'검증 모델',family:d.provider==='google'?'Gemma':d.provider}]};
 await new Promise(r=>setTimeout(r,60));let output='수정된 문장';if(d.input.prompt.includes('[문서 수정 응답 규칙]')){const payload=d.input.prompt.split('[편집 대상 자료]')[1].split('[첨부 참고자료]')[0].trim();output=JSON.stringify(JSON.parse(payload).map(row=>({id:row.id,text:row.text+' 수정'})));}for(const f of listeners)f({id:d.id,type:'textDelta',text:output});
 if(window.failAI)throw Error('검증용 연결 중단');for(const f of listeners)f({id:d.id,type:'complete'});return {success:true};}};
const editorHost=document.createElement('div');document.body.append(editorHost);let manager=new VisualAITargets();
let view=new EditorView(editorHost,{state:EditorState.create({doc:schema.node('doc',null,[schema.node('paragraph',null,schema.text('원문 문장')),schema.node('heading',{level:2},schema.text('아래 제목')),schema.node('paragraph',null,schema.text('아래 본문'))]),plugins:[history()]}),dispatchTransaction(tr){manager.map(tr);view.updateState(view.state.apply(tr));},decorations:state=>require('prosemirror-view').DecorationSet.create(state.doc,manager.decorations())});
window.selectText=()=>{let pos=1;view.state.doc.descendants((node,p)=>{if(node.isText&&node.text==='원문 문장')pos=p;});view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,pos,pos+5)));};
window.mixedTargetTests=()=>{
 const host=document.createElement('div');document.body.append(host);const mixed=new VisualAITargets();
 const doc=schema.node('doc',null,[schema.node('paragraph',null,[schema.text('강조',[schema.marks.strong.create()]),schema.text(' 오타 '),schema.text('링크',[schema.marks.link.create({href:'https://example.com'})])])]);
 const v=new EditorView(host,{state:EditorState.create({doc,plugins:[history()]}),dispatchTransaction(tr){mixed.map(tr);v.updateState(v.state.apply(tr));}});
 try{const t=mixed.capture(v,'mixed');if(!t.apply('강조 수정 링크','replace'))throw Error('혼합 서식 적용 실패');const p=v.state.doc.firstChild;if(!p.firstChild.marks.some(m=>m.type.name==='strong')||!p.lastChild.marks.some(m=>m.type.name==='link'))throw Error('변경 밖 서식 손실');undo(v.state,v.dispatch);if(!v.state.doc.eq(doc))throw Error('혼합 서식 실행 취소 실패');return true;}finally{v.destroy();host.remove();}
};
window.documentTargetTests=()=>{
 const host=document.createElement('div');document.body.append(host);const batch=new VisualAITargets();
 const doc=schema.node('doc',null,[schema.node('heading',{level:2},schema.text('제목')),schema.node('paragraph',null,[schema.text('본문 '),schema.text('링크',[schema.marks.link.create({href:'https://example.com'})])]),schema.node('paragraph',null,schema.nodes.image.create({src:'figure.png'})),schema.node('code_block',null,schema.text('원본 코드')),schema.node('horizontal_rule')]);
 const v=new EditorView(host,{state:EditorState.create({doc,plugins:[history()]}),dispatchTransaction(tr){batch.map(tr);v.updateState(v.state.apply(tr));}});
 try{const t=batch.capture(v,'batch','document');if(t.sections.length!==2)throw Error('본문 범위 분리 실패');if(!t.applySections({[t.sections[1].id]:'수정 링크'}))throw Error('전체 문서 선택 적용 실패');if(v.state.doc.child(0).textContent!=='제목'||v.state.doc.child(2).firstChild.attrs.src!=='figure.png'||v.state.doc.child(3).textContent!=='원본 코드'||v.state.doc.child(4).type.name!=='horizontal_rule'||!v.state.doc.child(1).lastChild.marks.some(m=>m.type.name==='link'))throw Error('문서 구조 손실');undo(v.state,v.dispatch);if(!v.state.doc.eq(doc))throw Error('문서 전체 단일 실행취소 실패');const stale=batch.capture(v,'batch','document');v.dispatch(v.state.tr.insertText('변경',1));if(stale.valid()||stale.applySections({[stale.sections[0].id]:'금지'}))throw Error('문서 변경 감지 실패');stale.release();return true;}finally{v.destroy();host.remove();}
};
window.editorText=()=>view.state.doc.textContent;window.getView=()=>view;
window.editBefore=()=>view.dispatch(view.state.tr.insert(0,schema.node('paragraph',null,schema.text('앞 추가'))));
window.editInside=()=>view.dispatch(view.state.tr.insertText('변경',view.state.selection.from));
window.doUndo=()=>undo(view.state,view.dispatch);
window.testTargets=()=>{
 window.selectText();const target=manager.capture(view,'doc');window.editBefore();if(!target.valid())throw Error('앞 편집 위치 추적 실패');if(!target.apply('바뀐 글','replace'))throw Error('적용 실패');window.doUndo();
 window.selectText();const stale=manager.capture(view,'doc');window.editInside();if(stale.valid()||stale.apply('금지','replace'))throw Error('충돌 차단 실패');stale.release();window.doUndo();
 return true;
};
const app=document.createElement('div');document.body.append(app);const reactRoot=createRoot(app);
window.mount=(id='doc',disabled=false)=>reactRoot.render(React.createElement(React.Fragment,null,React.createElement(Settings,{scope:'desktop-local'}),React.createElement(Assistant,{documentId:id,disabled,disabledReason:'검증용 편집 제한 안내',readDocument:()=>view.state.doc.textContent,capture:scope=>manager.capture(view,id,scope),onSettings:()=>{window.settingsOpened=true;},legacyKey:'',legacyModel:''})));
window.templateTests=async()=>{const original=await templates.loadAITemplates();const updated=original.map(t=>({...t,name:'변경 이름'}));await templates.saveAITemplates(original,updated);if(window.presets[0].unknownField!=='preserve')throw Error('기존 필드 손실');const old=await templates.loadAITemplates();window.presets.push({id:'other',name:'다른 창'});try{await templates.saveAITemplates(old,[]);throw Error('충돌 무시');}catch(e){if(!e.message.includes('다른 창'))throw e;}if(templates.fillTemplate('{{독자}} 문장',{독자:'초보자'})!=='초보자 문장')throw Error('변수 실패');return true;};
window.attachmentTests=async()=>{const file=new File(['첨부 본문'],'test.txt',{type:'text/plain'});const a=await readAIAttachment(file);if(a.text!=='첨부 본문')throw Error('첨부 실패');try{await readAIAttachment(new File(['x'],'bad.exe'));throw Error('미지원 허용');}catch(e){if(!e.message.includes('지원'))throw e;}return true;};
window.extraAttachments=async files=>{const result=[];for(const f of files)result.push(await readAIAttachment(new File([Uint8Array.from(atob(f.data),c=>c.charCodeAt(0))],f.name)));const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));result.push(await readAIAttachment(new File([blob],'figure.png',{type:'image/png'})));return result;};
window.mount();`);
  await new Promise((resolve,reject)=>req('webpack')({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js','.mjs'],modules:[path.join(front,'node_modules')],alias:{'./resourceAICredentials':path.join(dir,'credentialFixture.js'),'@/lib/resourceJson':path.join(dir,'resources.js'),'@/lib/resourceSettings':path.join(dir,'resources.js'),'../resourceJson':path.join(dir,'resources.js'),'../resourceSettings':path.join(dir,'resources.js'),'./resourceJson':path.join(dir,'resources.js'),'./resourceSettings':path.join(dir,'resources.js'),'../supabaseClient':path.join(dir,'supabase.js'),'@':path.join(front,'src')},fallback:{fs:false,path:false,crypto:false}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(dir,'loader.cjs')}]},devtool:false},(error,stats)=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString('errors-only'))):resolve()));
  const server=http.createServer((request,response)=>{const js=/^\/[\w.-]+\.js$/.test(request.url)&&fs.existsSync(path.join(dir,request.url.slice(1)));response.setHeader('Content-Type',js?'application/javascript':'text/html; charset=utf-8');response.end(js?fs.readFileSync(path.join(dir,request.url.slice(1))):'<!doctype html><meta charset="utf-8"><style>button,input,textarea,select{margin:5px}section{background:white;border:1px solid #ccc} .onrivi-inline-ai{font:14px Arial} .ProseMirror{border:1px solid;padding:20px}</style><body><script src="/bundle.js"></script></body>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;try{
    browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('BROWSER:',error.message);});
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@*/build/pdf.worker.min.mjs',route=>route.fulfill({path:path.join(front,'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}}));
    await page.getByRole('region',{name:'Google · Gemini / Gemma 연결',exact:true}).getByLabel('새 AI API 키').fill('AIza_TEST_ONLY_SECRET');await page.getByRole('region',{name:'Google · Gemini / Gemma 연결',exact:true}).getByRole('button',{name:'연결 · 모델 목록 확인'}).click();await page.getByRole('status').filter({hasText:/정상 연결|확인했습니다/}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('AIza_TEST_ONLY_SECRET')),false);
    if(process.argv.includes('--phrase-only')){
      await page.evaluate(()=>{window.selectText();window.getView().focus();});
      await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();
      await page.getByRole('button',{name:'문구 수정',exact:true}).click();
      await page.getByRole('checkbox',{name:'정중한 문체로 바꾸기',exact:true}).check();
      await page.getByRole('checkbox',{name:'쉽게 설명하기',exact:true}).check();
      assert.ok((await page.getByLabel('AI 프롬프트 입력').inputValue()).includes('정중하고 일관된 문체'));
      assert.ok((await page.getByLabel('AI 프롬프트 입력').inputValue()).includes('이해하기 쉬운 표현'));
      for(const name of ['중복 표현 없애기','문장 흐름 개선하기','핵심을 먼저 쓰기','모호한 표현 명확히 하기','용어·말투 통일하기']) assert.equal(await page.getByRole('checkbox',{name,exact:true}).count(),1);
      const generated=await page.getByLabel('AI 프롬프트 입력').inputValue();
      await page.getByLabel('AI 프롬프트 입력').fill(generated+'\n\n독자는 초등학생입니다.');
      await page.getByRole('checkbox',{name:'중복 표현 없애기',exact:true}).check();
      assert.ok((await page.getByLabel('AI 프롬프트 입력').inputValue()).includes('같은 의미의 문장을 정리'));
      assert.ok((await page.getByLabel('AI 프롬프트 입력').inputValue()).includes('독자는 초등학생입니다.'));
      await page.getByRole('checkbox',{name:'중복 표현 없애기',exact:true}).uncheck();
      assert.ok(!(await page.getByLabel('AI 프롬프트 입력').inputValue()).includes('같은 의미의 문장을 정리'));
      const original=await page.evaluate(()=>window.editorText());
      const count=await page.evaluate(()=>window.aiCalls.filter(c=>c.action==='generate').length);
      await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).click();
      await page.getByLabel('AI 수정안',{exact:true}).waitFor();
      const prompt=await page.evaluate(()=>window.aiCalls.at(-1).input.prompt);
      assert.ok(prompt.includes('정중한 문체로 바꾸기 + 쉽게 설명하기'));
      assert.ok(prompt.includes('선택한 작업을 모두 함께 적용'));
      assert.equal(await page.evaluate(()=>window.aiCalls.filter(c=>c.action==='generate').length)-count,1);
      assert.equal(await page.evaluate(()=>window.editorText()),original);
      await page.getByRole('checkbox',{name:'쉽게 설명하기',exact:true}).uncheck();
      assert.equal(await page.getByRole('checkbox',{name:'정중한 문체로 바꾸기',exact:true}).isChecked(),true);
      await page.getByRole('button',{name:'직접 요청',exact:true}).click();
      assert.equal(await page.getByRole('checkbox',{name:'정중한 문체로 바꾸기',exact:true}).isChecked(),false);
      assert.equal(await page.getByLabel('AI 프롬프트 입력').inputValue(),'독자는 초등학생입니다.');
      assert.deepEqual(errors,[]);
      console.log('PASS: phrase edit tab combines tasks in one request, allows empty extra prompt, preserves source and supports deselection/reset');return;
    }
    if(process.argv.includes('--organize-only')){
      await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();
      await page.getByRole('button',{name:'문서 정리',exact:true}).click();
      const original=await page.evaluate(()=>window.editorText());
      await page.evaluate(()=>{const v=window.getView();v.dispatch(v.state.tr.insertText('최신 문서 내용 ',1));});
      const expected=await page.evaluate(()=>window.editorText());
      await page.getByLabel('AI 프롬프트 입력').fill('문서를 변경하지 말고 작성 규칙에 따라 위치·이유·제안으로 점검해 줘');
      const count=await page.evaluate(()=>window.aiCalls.filter(c=>c.action==='generate').length);
      await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).click();
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='답변 복사'&&!b.disabled),null,{timeout:5000});
      const prompt=await page.evaluate(()=>window.aiCalls.at(-1).input.prompt);
      assert.ok(prompt.includes('[현재 열린 문서 전체]'));
      assert.ok(prompt.includes('최신 문서 내용'));
      assert.ok(prompt.includes('작성 규칙에 따라 위치·이유·제안으로 점검해 줘'));
      assert.ok(prompt.includes('요약은 사용자가 요청한 경우에만'));
      assert.equal(await page.evaluate(()=>window.aiCalls.filter(c=>c.action==='generate').length)-count,1);
      assert.equal(await page.evaluate(()=>window.editorText()),expected);
      assert.equal(await page.getByRole('button',{name:'선택한 글 바꾸기',exact:true}).count(),0);
      assert.deepEqual(errors,[]);
      console.log('PASS: document organize tab follows review instruction, uses latest open document without attachment, one request and no source edits');return;
    }
    await page.getByRole('button',{name:'AI 제공자 및 모델 선택',exact:true}).click();assert.equal(await page.getByLabel('AI 프롬프트 입력').count(),0);
    await page.getByRole('menuitemradio',{name:'Gemma 4 26B A4B IT',exact:true}).waitFor();assert.equal(await page.getByRole('menuitemradio').count(),1);assert.equal(await page.locator('.onrivi-ai-sidebar').count(),0);assert.equal(await page.getByLabel('사용할 AI 모델 ID').count(),0);await page.getByRole('menuitemradio',{name:'Gemma 4 26B A4B IT',exact:true}).click();await page.evaluate(()=>window.selectText());
    if(process.argv.includes('--models-only')){console.log('PASS: connected-model dropdown excludes all unavailable providers and unlisted models');return;}
    await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='AI 프롬프트 입력');assert.equal(await page.getByRole('button',{name:'질문',exact:true}).getAttribute('aria-pressed'),'true');await page.getByLabel('AI 프롬프트 입력').fill('문서와 무관한 질문');const firstCount=await page.evaluate(()=>window.aiCalls.length);await page.getByLabel('AI 프롬프트 입력').press('Shift+Enter');assert.equal(await page.evaluate(()=>window.aiCalls.length),firstCount);assert.ok((await page.getByLabel('AI 프롬프트 입력').inputValue()).includes('\n'));await page.getByLabel('AI 프롬프트 입력').press('Enter');await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='답변 복사'&&!b.disabled));assert.ok(!(await page.evaluate(()=>window.aiCalls.at(-1).input.prompt)).includes('원문 문장'));await page.evaluate(()=>{const v=window.getView();v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,1,v.state.doc.child(0).nodeSize+v.state.doc.child(1).nodeSize-1)));v.focus();});await page.getByLabel('AI 프롬프트 입력').click();await page.getByText('선택한 글 참고 ·',{exact:false}).waitFor();assert.ok(await page.locator('.onrivi-ai-target').count()>0);await page.getByLabel('AI 프롬프트 입력').fill('이 부분을 설명해 줘');await page.getByLabel('AI 프롬프트 입력').press('Enter');await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='답변 복사'&&!b.disabled));const referenced=await page.evaluate(()=>window.aiCalls.at(-1).input.prompt);assert.ok(referenced.includes('원문 문장'));assert.ok(referenced.includes('아래 제목'));assert.ok(!referenced.includes('아래 본문'));await page.getByRole('button',{name:'선택 해제',exact:true}).click();assert.equal(await page.locator('.onrivi-ai-target').count(),0);
    await page.evaluate(()=>{window.selectText();window.getView().focus();});await page.getByRole('button',{name:'문구 수정',exact:true}).click();assert.equal(await page.getByText('수정 범위 · 선택한 글',{exact:true}).count(),1);await page.getByLabel('AI 프롬프트 입력').fill('자연스럽게 교정해 줘');await page.getByRole('button',{name:'AI 제공자 및 모델 선택',exact:true}).click();await page.getByRole('menuitemradio',{name:'Gemma 4 26B A4B IT',exact:true}).click();assert.equal(await page.getByLabel('AI 프롬프트 입력').inputValue(),'자연스럽게 교정해 줘');assert.equal(await page.getByRole('region',{name:'온리비 AI 프롬프트',exact:true}).count(),1);
    await page.getByText('📎 파일 첨부',{exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'reference.txt',mimeType:'text/plain',buffer:Buffer.from('첨부 근거 자료')});await page.getByText('reference.txt · 준비됨',{exact:false}).waitFor();
    const original=await page.evaluate(()=>window.editorText());await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).click();await page.getByLabel('AI 수정안').waitFor();await page.getByRole('button',{name:'선택한 글 바꾸기'}).waitFor();
    await page.waitForFunction(()=>!document.querySelector('[aria-label="AI 수정안"]').disabled);
    assert.equal(await page.evaluate(()=>window.editorText()),original);
    assert.ok(await page.evaluate(()=>window.aiCalls.at(-1).input.prompt.includes('첨부 근거 자료')));
    await page.getByRole('button',{name:'선택한 글 바꾸기'}).click();assert.ok((await page.evaluate(()=>window.editorText())).includes('수정된 문장'));assert.ok((await page.evaluate(()=>window.editorText())).includes('아래 본문'));
    await page.evaluate(()=>window.doUndo());assert.equal(await page.evaluate(()=>window.editorText()),original);
    await page.evaluate(()=>window.selectText());await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();
    // [PATCH: 인라인 템플릿 아코디언 UI 제거에 따라 모달 닫기 유지]
    await page.getByRole('button',{name:'AI 패널 닫기'}).click();
    assert.equal(await page.evaluate(()=>window.documentTargetTests()),true);assert.equal(await page.evaluate(()=>window.mixedTargetTests()),true);assert.equal(await page.evaluate(()=>window.testTargets()),true);assert.equal(await page.evaluate(()=>window.templateTests()),true);assert.equal(await page.evaluate(()=>window.attachmentTests()),true);
    await page.evaluate(()=>{window.selectText();window.getView().focus();});await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();await page.getByRole('button',{name:'문구 수정',exact:true}).click();await page.getByLabel('AI 프롬프트 입력').fill('실패 확인');await page.evaluate(()=>window.failAI=true);await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).click();await page.getByRole('status').filter({hasText:'검증용 연결 중단'}).waitFor();assert.equal(await page.getByRole('button',{name:'선택한 글 바꾸기'}).isDisabled(),true);
    await page.getByRole('button',{name:'AI 패널 닫기'}).click();await page.evaluate(()=>{window.failAI=false;const v=window.getView();v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,1)));v.focus();});await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();await page.getByRole('button',{name:'문구 수정',exact:true}).click();assert.equal(await page.getByText('수정 범위 · 문서 전체',{exact:true}).count(),1);await page.getByLabel('AI 프롬프트 입력').fill('전체 문단 교정');const fullOriginal=await page.evaluate(()=>window.editorText());const fullCallsBefore=await page.evaluate(()=>window.aiCalls.filter(c=>c.action==='generate').length);await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).click();await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='선택한 수정안 적용'&&!b.disabled));assert.equal(await page.evaluate(()=>window.editorText()),fullOriginal);assert.equal(await page.evaluate(()=>window.aiCalls.filter(c=>c.action==='generate').length)-fullCallsBefore,1,'short document must use one request');await page.getByRole('button',{name:'선택 해제',exact:true}).click();assert.equal(await page.getByRole('button',{name:'선택한 수정안 적용',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'전체 선택',exact:true}).click();await page.getByRole('button',{name:'선택한 수정안 적용',exact:true}).click();await page.evaluate(()=>window.doUndo());assert.equal(await page.evaluate(()=>window.editorText()),fullOriginal);
    await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();await page.getByRole('button',{name:'문서 정리',exact:true}).click();await page.getByLabel('AI 프롬프트 입력').fill('');const summaryCount=await page.evaluate(()=>window.aiCalls.length),summaryOriginal=await page.evaluate(()=>window.editorText());await page.getByLabel('AI 프롬프트 입력').press('Enter');await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='답변 복사'&&!b.disabled));assert.equal(await page.evaluate(()=>window.aiCalls.length)-summaryCount,1);assert.ok((await page.evaluate(()=>window.aiCalls.at(-1).input.prompt)).includes('[현재 열린 문서 전체]'));assert.equal(await page.getByRole('button',{name:'선택한 글 바꾸기',exact:true}).count(),0);assert.equal(await page.evaluate(()=>window.editorText()),summaryOriginal);
    await page.evaluate(()=>{const v=window.getView();v.dispatch(v.state.tr.insertText('최신 문서 내용 ',1));});
    await page.getByLabel('AI 프롬프트 입력').fill('문서를 변경하지 말고 작성 규칙에 따라 위치·이유·제안으로 점검해 줘');
    await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='답변 복사'&&!b.disabled));
    const reviewPrompt=await page.evaluate(()=>window.aiCalls.at(-1).input.prompt);
    assert.ok(reviewPrompt.includes('최신 문서 내용'));
    assert.ok(reviewPrompt.includes('작성 규칙에 따라 위치·이유·제안으로 점검해 줘'));
    assert.ok(reviewPrompt.includes('요약은 사용자가 요청한 경우에만'));
    assert.ok((await page.evaluate(()=>window.editorText())).includes('최신 문서 내용'));
    await page.evaluate(()=>window.doUndo());
    assert.equal(await page.evaluate(()=>window.editorText()),summaryOriginal);
    console.log('PASS: document organize tab uses latest open document, follows review requests, one request and no automatic source edits');
    await page.getByRole('button',{name:'AI 패널 닫기'}).click();
    await page.evaluate(()=>{const v=window.getView();v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,2)));v.focus();});await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();assert.equal(await page.locator('.onrivi-ai-target').count(),0);assert.equal(await page.getByText('선택한 글 참고 ·',{exact:false}).count(),0);assert.equal(await page.evaluate(()=>window.getView().state.selection.empty),true);assert.equal(await page.getByRole('button',{name:'질문',exact:true}).getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:'문구 수정',exact:true}).click();assert.equal(await page.locator('.onrivi-ai-target').count(),0);assert.equal(await page.evaluate(()=>window.getView().state.selection.empty),true);await page.getByRole('button',{name:'AI 패널 닫기'}).click();
    const Zip=req('jszip'),zip=new Zip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>DOCX attachment content</w:t></w:r></w:p></w:body></w:document>');
    const stream='BT /F1 12 Tf 20 100 Td (PDF attachment content) Tj ET',objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const extra=await page.evaluate(files=>window.extraAttachments(files),[{name:'fixture.docx',data:await zip.generateAsync({type:'base64'})},{name:'fixture.pdf',data:Buffer.from(pdf).toString('base64')}]);assert.ok(extra[0].text.includes('DOCX attachment content'));assert.ok(extra[1].text.includes('PDF attachment content'));assert.equal(extra[2].mime,'image/png');
    await page.getByLabel('연결한 AI 모델 선택').selectOption('gemma-4-26b-a4b-it');
    await page.evaluate(()=>window.mount('disabled-doc',true));await page.getByRole('button',{name:'온리비 AI 요청 입력',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'질문',exact:true}).getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:'문구 수정',exact:true}).click();await page.getByRole('status').filter({hasText:'검증용 편집 제한 안내'}).waitFor();assert.equal(await page.getByRole('region',{name:'AI 모델 선택',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'질문',exact:true}).click();await page.evaluate(()=>window.failAI=false);await page.getByLabel('AI 프롬프트 입력').fill('일반 질문 검증');await page.getByRole('button',{name:/^(보내기|다시 보내기)$/,exact:true}).click();await page.getByRole('button',{name:'답변 복사',exact:true}).waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='답변 복사'&&!b.disabled));assert.equal(await page.getByRole('button',{name:'답변 복사',exact:true}).isEnabled(),true);assert.equal(await page.getByRole('button',{name:'문서에 삽입',exact:true}).isDisabled(),true);
    
    await page.getByRole('button',{name:'AI 패널 닫기'}).click();
    for(const [name,key] of [['OpenAI 연결','TEST_OPENAI_SECRET'],['Claude 연결','TEST_CLAUDE_SECRET']]){const card=page.getByRole('region',{name,exact:true});await card.getByLabel('새 AI API 키').fill(key);await card.getByRole('button',{name:'연결 · 모델 목록 확인',exact:true}).click();await card.getByRole('status').filter({hasText:/정상 연결|확인했습니다/}).waitFor();}
    assert.deepEqual(await page.evaluate(()=>Promise.all(['google','openai','anthropic'].map(async provider=>(await window.electronAPI.inlineAIKey({scope:'desktop-local',provider})).connected))),[true,true,true]);
    for(const name of ['Google · Gemini / Gemma 연결','OpenAI 연결','Claude 연결']){const card=page.getByRole('region',{name,exact:true}),field=card.getByLabel('등록된 AI API 키');assert.equal(await field.inputValue(),'****************');assert.equal(await field.getAttribute('readonly'),'');assert.ok((await field.getAttribute('class')).includes('bg-blue-50'));assert.equal(await field.evaluate(el=>{const copy=new Event('copy',{bubbles:true,cancelable:true}),cut=new Event('cut',{bubbles:true,cancelable:true});return !el.dispatchEvent(copy)&&!el.dispatchEvent(cut);}),true);await card.getByRole('button',{name:'키 변경',exact:true}).click();assert.equal(await card.getByLabel('새 AI API 키').inputValue(),'');await card.getByLabel('새 AI API 키').fill('DO_NOT_SAVE_DRAFT');await card.getByRole('button',{name:'키 변경 취소',exact:true}).click();assert.equal(await card.getByLabel('등록된 AI API 키').inputValue(),'****************');}
    await page.getByRole('region',{name:'OpenAI 연결',exact:true}).getByRole('button',{name:'연결 해제',exact:true}).click();await page.getByRole('region',{name:'OpenAI 연결',exact:true}).getByRole('status').filter({hasText:'연결을 해제했습니다'}).waitFor();
    assert.deepEqual(await page.evaluate(()=>Promise.all(['google','openai','anthropic'].map(async provider=>(await window.electronAPI.inlineAIKey({scope:'desktop-local',provider})).connected))),[true,false,true]);
    await page.getByRole('button',{name:'AI 제공자 및 모델 선택',exact:true}).click();await page.getByRole('menuitemradio',{name:'Claude Sonnet 5.5',exact:true}).waitFor();assert.equal(await page.getByRole('menuitemradio').count(),2);assert.equal(await page.getByRole('menuitemradio',{name:'GPT-6.1 Sol',exact:true}).count(),0);await page.keyboard.press('Escape');assert.equal(await page.getByRole('menu',{name:'연결된 AI 모델 목록',exact:true}).count(),0);assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('TEST_OPENAI_SECRET'));assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('TEST_CLAUDE_SECRET'));
    await page.screenshot({path:path.join(dir,'inline-ai.png'),fullPage:true});assert.deepEqual(errors,[]);
    console.log('PASS: real inline AI UI, separate capsule buttons, key secrecy, Gemma model selection, attachments, review-before-apply, one-step undo, mapped targets, stale target rejection, legacy templates/conflicts and incomplete response guard');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
(async()=>{await protocols();await desktop();if(!process.argv.includes('--protocol-only'))await browserTest();})().catch(error=>{console.error(error);process.exitCode=1;});
