const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
function load(file,overrides={}){const exports={};Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:7,esModuleInterop:true}}).outputText)(exports,id=>overrides[id]||req(id));return exports;}
const media=load('frontend/src/lib/mediaMarkup.ts');
const bullet=load('frontend/src/lib/bulletNumberText.ts');
const api=load('frontend/src/lib/visualDocumentCodec.ts',{'./mediaMarkup':media,'./bulletNumberText':bullet});
const lists=load('frontend/src/lib/visualListCommands.ts',{'./visualDocumentCodec':api});
const {EditorState,TextSelection}=req('prosemirror-state');
const {history,undo,redo}=req('prosemirror-history');for(const following of [false,true])for(const nested of [false,true]){
 const n=api.visualSchema.nodes, p=text=>n.paragraph.create(null,text?api.visualSchema.text(text):null);
 const blank=p('');
 const item=n.list_item.create(null,[p('편안한 본문 입력'),n.bullet_list.create(null,n.list_item.create(null,p('하위 설명'))),blank]);
 const list=n.ordered_list.create({order:3},following?[item,n.list_item.create(null,p('다음 항목'))]:[item]);
 const doc=n.doc.create(null,nested?n.bullet_list.create(null,n.list_item.create(null,[p('상위'),list])):list);
 let s=EditorState.create({doc,plugins:[history()]});let pos;
 doc.descendants((node,offset)=>{if(node===blank)pos=offset+1;});
 s=s.apply(s.tr.setSelection(TextSelection.create(doc,pos)));const before=s;
 assert.equal(lists.exitEmptyListItem(s,tr=>s=s.apply(tr)),true);s.doc.check();
 let retained;s.doc.descendants(node=>{if(node.type.name==='ordered_list'&&node.attrs.order===3)retained=node;});
 assert.equal(retained.firstChild.childCount,2);assert.equal(retained.firstChild.child(0).textContent,'편안한 본문 입력');
 assert.equal(retained.firstChild.child(1).textContent,'하위 설명');
 assert.equal(s.selection.$from.depth,nested?3:1);
 const codec=api.createVisualDocumentCodec('');const saved=codec.serialize(s.doc);
 assert.ok(saved.includes('3. 편안한 본문 입력'),saved);
 if(following)assert.ok(saved.includes('4. 다음 항목'),saved);
 api.createVisualDocumentCodec(saved).doc.check();
 undo(s,tr=>s=s.apply(tr));assert.ok(s.doc.eq(before.doc));assert.equal(s.selection.from,pos);
 redo(s,tr=>s=s.apply(tr));assert.ok(s.doc.textContent.includes('하위 설명'));
}
console.log('PASS: Enter after nested bullets preserves numbered parent, following numbers, nesting and undo/redo');

{
 const n=api.visualSchema.nodes,p=text=>n.paragraph.create(null,text?api.visualSchema.text(text):null);
 const blank=p('');
 const doc=n.doc.create(null,n.ordered_list.create({order:5},n.list_item.create(null,[p('저장 및 최종 내보내기'),n.bullet_list.create(null,[n.list_item.create(null,p('Ctrl + S로 저장합니다.')),n.list_item.create(null,p('필요한 형식으로 내보냅니다.')),n.list_item.create(null,blank)])])));
 let s=EditorState.create({doc,plugins:[history()]});let pos;
 doc.descendants((node,offset)=>{if(node===blank)pos=offset+1;});
 s=s.apply(s.tr.setSelection(TextSelection.create(doc,pos)));
 for(const expectedDepth of [3,1]){
  assert.equal(lists.exitEmptyListItem(s,tr=>s=s.apply(tr)),true);s.doc.check();
  assert.equal(s.selection.$from.depth,expectedDepth);
  assert.equal(s.doc.firstChild.attrs.order,5);
  assert.equal(s.doc.firstChild.firstChild.child(1).childCount,2);
  const saved=api.createVisualDocumentCodec('').serialize(s.doc);
  const reloaded=api.createVisualDocumentCodec(saved).doc;
  assert.equal(reloaded.firstChild.attrs.order,5);
  assert.equal(reloaded.firstChild.firstChild.child(0).textContent,'저장 및 최종 내보내기');
  assert.equal(reloaded.firstChild.firstChild.child(1).childCount,2);
  assert.ok(!saved.includes('- \n'),saved);
 }
 console.log('PASS: two Enter presses exit nested bullets then numbered parent; numbered content and bullets survive reload (blank caret paragraphs are normalized)');
}

