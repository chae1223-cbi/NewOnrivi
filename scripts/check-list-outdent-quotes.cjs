const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const req=require('module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
function load(file,overrides={}){const e={};new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:7,esModuleInterop:true}}).outputText)(e,id=>overrides[id]||req(id));return e;}
const media=load('frontend/src/lib/mediaMarkup.ts'),bullet=load('frontend/src/lib/bulletNumberText.ts');
const api=load('frontend/src/lib/visualDocumentCodec.ts',{'./mediaMarkup':media,'./bulletNumberText':bullet});
const commands=load('frontend/src/lib/visualListCommands.ts',{'./visualDocumentCodec':api});
const {EditorState,TextSelection}=req('prosemirror-state'),{history,undo,redo}=req('prosemirror-history');
function noMarkerOnlyItems(doc){doc.descendants(node=>{if(node.type.name==='list_item')assert.equal(node.firstChild.type.name,'paragraph',node.toString());});}
const full=fs.readFileSync('frontend/public/help/HELP-03_문서_저장과_세션_자동_복구의_차이.md','utf8');
const source=full.slice(full.indexOf('- 온리비 어서는'),full.indexOf('> [!WARNING]'));
const codec=api.createVisualDocumentCodec(source);let state=EditorState.create({doc:codec.doc,plugins:[history()]});const original=state.doc.textContent;
for(const target of ['프로그램을 다시','만약 캐시에','만약 캐시에']){
 let pos;state.doc.descendants((node,offset)=>{if(node.type.name==='paragraph'&&node.textContent.startsWith(target))pos=offset+1;});
 state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,pos)));const before=state;
 assert.equal(commands.independentLiftListItem(state,tr=>state=state.apply(tr)),true);state.doc.check();noMarkerOnlyItems(state.doc);
 assert.equal(state.doc.textContent,original);assert.ok(state.selection.$from.parent.textContent.startsWith(target));
 const saved=codec.serialize(state.doc);assert.ok(!/^-\s*>/m.test(saved),saved);
 const reloaded=api.createVisualDocumentCodec(saved);reloaded.doc.check();noMarkerOnlyItems(reloaded.doc);assert.equal(reloaded.doc.textContent,original);
 const result=state.doc;undo(state,tr=>state=state.apply(tr));assert.ok(state.doc.eq(before.doc));assert.equal(state.selection.from,pos);
 redo(state,tr=>state=state.apply(tr));assert.ok(state.doc.eq(result));
}
for(const selected of ['first','both']){
 const c=api.createVisualDocumentCodec('3. 상위 항목\n\n   5. 첫 하위\n   6. 둘째 하위\n   7. 남은 하위\n\n   > 인용 내용\n\n   후속 문단\n\n4. 다음 항목');
 let s=EditorState.create({doc:c.doc,plugins:[history()]});let a,b;
 s.doc.descendants((node,pos)=>{if(node.type.name==='paragraph'&&node.textContent==='첫 하위')a=pos+1;if(node.type.name==='paragraph'&&node.textContent==='둘째 하위')b=pos+1+node.content.size;});
 s=s.apply(s.tr.setSelection(TextSelection.create(s.doc,a,selected==='both'?b:a)));
 const before=s.doc.textContent;assert.equal(commands.independentLiftListItem(s,tr=>s=s.apply(tr)),true);s.doc.check();noMarkerOnlyItems(s.doc);assert.equal(s.doc.textContent,before);
 const remaining=[];s.doc.descendants(node=>{if(node.type.name==='ordered_list'&&node.firstChild.textContent==='남은 하위')remaining.push(node.attrs.order);});
 if(selected==='both')assert.deepEqual(remaining,[7]);
 assert.ok(!/^\d+\.\s*>/m.test(c.serialize(s.doc)));
}
console.log('PASS: real help outdent sequence keeps quote attached without marker-only items; text order, ordered continuation, selection, reload and undo/redo retained');
