import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { marked } from 'marked';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=name=>ts.transpileModule(fs.readFileSync(new URL('../src/lib/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const layout=url(compile('pdfImportLayout.ts').replace('./pdfImportText',url(compile('pdfImportText.ts'))));
const {pdfRuledTableBlocks}=await import(url(compile('pdfImportTables.ts').replace('./pdfImportLayout',layout)));
const {serializePdfBlocks}=await import(layout);
const file=process.argv[2];
assert(file,'Pass the source PDF');
const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(file))}).promise;
let result='',tables=0,nested=0;
for(let i=1;i<=pdf.numPages;i++) {
 const page=await pdf.getPage(i), text=await page.getTextContent(), ops=await page.getOperatorList();
 const blocks=pdfRuledTableBlocks(text.items,ops.fnArray,ops.argsArray,pdfjs.OPS);
 const output=serializePdfBlocks(blocks.sort((a,b)=>b.y-a.y),true);
 assert(!/\n\s*\n/.test(output),'No generated blank lines');
 const doc=new JSDOM(marked.parse(output)).window.document;
 if(i>=7 && i<=11) {
  const roots=Array.from(doc.querySelectorAll('table')).filter(t=>!t.parentElement.closest('table'));
  assert.equal(roots.length,1,`Page ${i}: comparison must remain one outer table`);
  for(const row of roots[0].rows) assert.equal(row.cells.length,2,`Page ${i}: comparison columns`);
 }
 if(i===3 || i===4) {
  assert(output.includes('| --- | --- |'),'Ordinary rate tables use Markdown');
  assert(!output.includes('<table>'),'Ordinary rate tables do not require HTML');
 }
 tables+=doc.querySelectorAll('table').length; nested+=doc.querySelectorAll('table table').length;
 // Every extracted non-folio character must survive reconstruction, including numbers.
 const normalize=s=>s.replace(/\s/g,'');
 const original=normalize(text.items.map(r=>r.str||'').join('').replace(/[-–—]\s*\d+\s*[-–—]/g,''));
 const actual=normalize(new JSDOM(output).window.document.body.textContent.replace(/^#{1,6} /gm,''));
 const counts=s=>{const m=new Map();for(const c of s)m.set(c,(m.get(c)||0)+1);return m;};
 const a=counts(actual);
 for(const [c,n] of counts(original)) assert((a.get(c)||0)>=n,`Page ${i}: missing ${c} (${n} vs ${a.get(c)||0})`);
 if(i===7) {
  const outer=doc.querySelector('table');assert(outer);
  assert.equal(outer.rows[0].cells.length,2);
  assert.match(outer.rows[0].cells[0].textContent,/현\s*행/);
  assert.match(outer.rows[0].cells[1].textContent,/개\s*정\s*안/);
  assert(outer.rows[1].cells[0].querySelector('table'),'Current-law tax grid');
  assert(outer.rows[1].cells[1].querySelector('table'),'Amendment tax grid');
  for(const inner of outer.querySelectorAll('table'))for(const row of inner.rows)assert.equal(row.cells.length,2);
  fs.mkdirSync('.tmp/pdf-bill',{recursive:true});
  fs.writeFileSync('.tmp/pdf-bill/page7.html','<!doctype html><meta charset="utf-8"><style>body{font:14px serif;width:900px;margin:25px}table{border-collapse:collapse;width:100%;table-layout:fixed}td{border:1px solid #888;padding:6px;vertical-align:top}p{margin:4px 0;line-height:1.5}table table{font-size:12px}</style>'+output);
 }
 assert(!/^\s*[-–—]\s*\d+\s*[-–—]\s*$/m.test(output));
 result+=output+'\n';
}
fs.writeFileSync('.tmp/pdf-bill/imported.md',result);
console.log(JSON.stringify({pages:pdf.numPages,tables,nested,characterRetention:'passed',comparisonColumns:'passed'}));
await pdf.cleanup();
