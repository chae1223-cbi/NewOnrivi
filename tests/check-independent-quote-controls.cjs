const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const req=require('module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
function load(file,overrides={}){const e={};new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:7,esModuleInterop:true}}).outputText)(e,id=>overrides[id]||req(id));return e;}
const media=load('frontend/src/lib/mediaMarkup.ts'),bullet=load('frontend/src/lib/bulletNumberText.ts');
const api=load('frontend/src/lib/visualDocumentCodec.ts',{'./mediaMarkup':media,'./bulletNumberText':bullet});
const lists=load('frontend/src/lib/visualListCommands.ts',{'./visualDocumentCodec':api});
const quotes=load('frontend/src/lib/visualQuoteCommands.ts',{'./visualDocumentCodec':api});
const {EditorState,TextSelection}=req('prosemirror-state'),{history,undo,redo}=req('prosemirror-history');
function select(state,text,end=false){let pos;state.doc.descendants((node,p)=>{if(node.type.name==='paragraph'&&node.textContent===text)pos=p+1+(end?node.content.size:0);});assert.ok(pos!==undefined,text);return state.apply(state.tr.setSelection(TextSelection.create(state.doc,pos)));}
function quote(doc){let found;doc.descendants(node=>{if(node.type.name==='blockquote')found=node;});return found;}
function levels(doc){const result=[];function walk(node,depth){if(['bullet_list','ordered_list'].includes(node.type.name))depth++;if(node.type.name==='paragraph'&&node.textContent!=='QUOTE')result.push([node.textContent,depth]);node.forEach(n=>walk(n,depth));}walk(doc,0);return result;}
for(const inset of ['  ','    ']){
 const source='- PARENT\n  - FIRST\n  - CURRENT\n\n'+inset+'> QUOTE\n\n- NEXT';
 const codec=api.createVisualDocumentCodec(source);let state=EditorState.create({doc:codec.doc,plugins:[history()]});const original=state.doc.textContent;
 // Delete at the nested list's end must not mutate or absorb a quote.
 state=select(state,'CURRENT',true);let writes=0;
 assert.equal(quotes.protectQuoteBoundary(state,()=>writes++),true);assert.equal(writes,0);
 // Only the selected list item moves. The quote's saved independent indent
 // stays fixed while Tab and Shift+Tab change list membership.
 for(const command of [lists.independentLiftListItem,lists.independentIndentListItem,lists.independentLiftListItem]){
  state=select(state,'CURRENT');const before=state;
  assert.equal(quotes.withIndependentQuotes(command)(state,tr=>state=state.apply(tr)),true);state.doc.check();
  assert.equal(state.doc.textContent,original);const q=quote(state.doc);
  assert.equal(q.attrs.indentPx,inset.length===2?28:56);
  state.doc.descendants((node,pos)=>{if(node===q)assert.equal(state.doc.resolve(pos).depth,0);});
  const saved=codec.serialize(state.doc),loaded=api.createVisualDocumentCodec(saved).doc;loaded.check();
  assert.equal(quote(loaded).attrs.indentPx,q.attrs.indentPx);assert.equal(loaded.textContent,original);
  const after=state.doc;undo(state,tr=>state=state.apply(tr));assert.ok(state.doc.eq(before.doc));redo(state,tr=>state=state.apply(tr));assert.ok(state.doc.eq(after));
 }
 for(const backward of [false,true]){
  state=select(state,'QUOTE');const beforeLevels=levels(state.doc),indent=quote(state.doc).attrs.indentPx;
  assert.equal(quotes.quoteIndent(backward)(state,tr=>state=state.apply(tr)),true);state.doc.check();
  assert.deepEqual(levels(state.doc),beforeLevels);assert.equal(quote(state.doc).attrs.indentPx,indent+(backward?-28:28));
 }
}
const plugin=load('frontend/src/lib/remarkQuoteIndent.ts').remarkQuoteIndent();
const tree={children:[{type:'html',value:'<!-- onrivi:quote-indent=28 -->'},{type:'blockquote',children:[{type:'paragraph',children:[{type:'text',value:'QUOTE'}]}]}]};
plugin(tree);assert.equal(tree.children.length,1);assert.equal(tree.children[0].data.hProperties['data-onrivi-quote-indent'],28);
console.log('PASS: list and quote controls are independent; Delete protected; quote indent, paragraph order, undo/redo and Markdown round-trip retained');
