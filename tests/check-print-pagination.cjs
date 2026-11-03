const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json'));
const ts=req('typescript'),{JSDOM}=req('jsdom');
function load(file){const out={};Function('exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(out);return out;}
const settings=load('frontend/src/lib/documentPaginationSettings.ts'),breaks=load('frontend/src/lib/printBreaks.ts');
function root(html){return new JSDOM('<!doctype html><main>'+html+'</main>').window.document.querySelector('main');}
const anchorFor=(element,match)=>breaks.collectPrintCandidates(element).find(c=>match(c))?.anchor;
const original='<h1>문서</h1><table><thead><tr><th>제목</th><th>값</th></tr></thead><tbody><tr><td>첫째</td><td>1</td></tr><tr><td>둘째</td><td>2</td></tr><tr><td>셋째</td><td>3</td></tr></tbody></table><p>끝</p>';
let source=root(original);
const a=anchorFor(source,c=>c.anchor.kind==='row'&&c.anchor.text==='둘째 2');assert.ok(a);
const metadata={version:1,breaks:[a]};
for(const doc of ['# 제목\n\n원본 표\n','---\r\ntitle: 문서\r\n---\r\n\r\n본문\r\n','\uFEFF---\ntitle: 문서\n---\n본문']){
  const written=settings.writePaginationSettings(doc,metadata);
  assert.deepEqual(settings.readPaginationSettings(written),metadata);
  const prefix=/^(?:\uFEFF)?---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/;
  if(prefix.test(doc))assert.equal(written.replace(prefix,''),doc.replace(prefix,''),'body bytes remain unchanged');
  else assert.ok(written.endsWith(doc));
  assert.equal(settings.writePaginationSettings(written,metadata),written,'idempotent metadata write');
}
assert.deepEqual(settings.readPaginationSettings('---\nonrivi_pagination: invalid\n---\nbody'),settings.emptyPagination());
assert.equal(settings.writePaginationSettings('body',settings.emptyPagination()),'body');
const clone=root(original);breaks.applyPrintBreaks(clone,metadata);
assert.equal(clone.querySelectorAll('table').length,2);
assert.equal(clone.querySelectorAll('thead').length,2);
assert.equal(clone.querySelectorAll('[data-onrivi-forced-break]').length,1);
assert.equal(source.querySelectorAll('table').length,1,'editable original remains one table');
assert.equal(source.textContent,root(original).textContent);
assert.equal(clone.querySelectorAll('td').length,6,'no missing or duplicated body cells');
const restored=root(original);breaks.applyPrintBreaks(restored,settings.emptyPagination());assert.equal(restored.querySelectorAll('table').length,1);
const multi=breaks.collectPrintCandidates(root(original)).filter(c=>c.anchor.kind==='row'&&/둘째|셋째/.test(c.anchor.text)).map(c=>c.anchor);
const multiple=root(original);breaks.applyPrintBreaks(multiple,{version:1,breaks:multi});assert.equal(multiple.querySelectorAll('table').length,3);assert.equal(multiple.querySelectorAll('td').length,6);
const moved=root(original.replace('<p>끝</p>','<p>추가</p><p>끝</p>'));
assert.equal(breaks.applyPrintBreaks(moved,metadata).unresolved.length,0);
const missing=root(original.replace('<tr><td>둘째</td><td>2</td></tr>',''));
assert.equal(breaks.applyPrintBreaks(missing,metadata).unresolved.length,1);
for(const html of [
  '<p>앞</p><ol start="3"><li>첫째</li><li>둘째</li><li>셋째</li></ol>',
  '<p>앞</p><ul><li><input type="checkbox">첫째</li><li><input type="checkbox" checked>둘째</li></ul>',
  '<p>앞</p><blockquote data-alert-type="NOTE"><p>첫째</p><p>둘째</p></blockquote>',
  '<p>앞</p><pre><code class="language-js"><span class="hljs-keyword">첫째\n둘째</span>\n셋째\n</code></pre>',
  '<p>앞</p><blockquote><ul><li>첫째</li><li>둘째</li></ul></blockquote>',
]){
  const dom=root(html),before=dom.textContent;
  const target=anchorFor(dom,c=>c.anchor.text==='둘째');assert.ok(target,html);
  const result=breaks.applyPrintBreaks(dom,{version:1,breaks:[target]});
  assert.equal(result.unresolved.length,0);
  assert.equal(dom.textContent,before,'all original text preserved');
  assert.equal(dom.querySelectorAll('[data-onrivi-forced-break]').length,1);
  if(html.includes('<ol'))assert.equal(dom.querySelectorAll('ol')[1].getAttribute('start'),'4');
  if(html.includes('checked'))assert.equal(dom.querySelectorAll('input[checked]').length,1);
  if(html.includes('NOTE'))assert.equal(dom.querySelectorAll('blockquote[data-alert-type="NOTE"]').length,2);
  if(html.includes('<pre')){
    assert.equal(dom.querySelectorAll('pre').length,2);
    assert.equal(dom.querySelectorAll('code.language-js').length,2);
    assert.equal(Array.from(dom.querySelectorAll('pre')).map(n=>n.textContent).join(''),'첫째\n둘째\n셋째\n');
    assert.equal(dom.querySelectorAll('.hljs-keyword').length,2,'syntax markup retained across split');
  }
}
const merged=root('<p>앞</p><table><tr><th>A</th></tr><tr><td rowspan="2">첫째</td></tr><tr><td>둘째</td></tr></table>');
const forbidden=breaks.collectPrintCandidates(merged).find(c=>c.anchor.text==='둘째');assert.ok(forbidden.disabled);
const ambiguous=root('<p>앞</p><ul><li>A</li><li>X</li><li>B</li><li>A</li><li>X</li><li>B</li></ul>');
assert.ok(breaks.collectPrintCandidates(ambiguous).filter(c=>c.anchor.text==='X').every(c=>c.disabled));
console.log('PASS: print-only splits, original body/settings persistence, table headers, nested lists/quotes, numbering, tasks, highlighted code, ambiguity and merged-row guards');
const nested=root('<p>앞</p><ol start="3"><li><p>부모</p><ul><li>첫째</li><li>둘째</li></ul></li><li>다음 부모</li></ol>');
const nestedAnchor=anchorFor(nested,c=>c.anchor.kind==='item'&&c.anchor.text==='둘째');
breaks.applyPrintBreaks(nested,{version:1,breaks:[nestedAnchor]});
assert.equal(nested.querySelectorAll(':scope > ol')[1].getAttribute('start'),'3','continued parent item must not shift subsequent numbering');
const hooksSource=fs.readFileSync('frontend/src/hooks/useEditorHandlers.ts','utf8');
const hooksTree=ts.createSourceFile('handlers.ts',hooksSource,99,true);let apply;
function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(hooksTree)==='setPaginationSettings')apply=node.initializer.getText(hooksTree);ts.forEachChild(node,visit);}visit(hooksTree);assert.ok(apply);
const hook={},contentRef={current:'# 원본\n\n본문\n'};let tabs=[{id:'active',content:contentRef.current},{id:'other',content:'untouched'}],update;
Function('exports','contentRef','writePaginationSettings','updateContent','setTabs','activeTabIdRef',ts.transpileModule('exports.apply='+apply,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(hook,contentRef,settings.writePaginationSettings,value=>{update=value;},fn=>{tabs=fn(tabs);},{current:'active'});
hook.apply(metadata);assert.equal(update,contentRef.current);assert.ok(update.endsWith('# 원본\n\n본문\n'));assert.equal(tabs[0].isModified,true);assert.equal(tabs[1].content,'untouched');assert.deepEqual(settings.readPaginationSettings(update),metadata);
console.log('PASS: nested ordered continuation and actual active-document apply handler retain content and isolate tabs');
