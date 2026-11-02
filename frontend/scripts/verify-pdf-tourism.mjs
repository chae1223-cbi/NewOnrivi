import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {JSDOM} from 'jsdom';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=name=>ts.transpileModule(fs.readFileSync(new URL('../src/lib/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const layout=url(compile('pdfImportLayout.ts').replace('./pdfImportText',url(compile('pdfImportText.ts'))));
const {deduplicatePdfRuns,serializePdfBlocks}=await import(layout);
const {pdfRuledTableBlocks}=await import(url(compile('pdfImportTables.ts').replace('./pdfImportLayout',layout)));
const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2]))}).promise;
let result='',removed=0;
const counts=s=>{const m=new Map();for(const c of s.replace(/[\s\x00-\x1f]/g,''))m.set(c,(m.get(c)||0)+1);return m;};
for(let i=1;i<=pdf.numPages;i++) {
 const page=await pdf.getPage(i),text=await page.getTextContent(),ops=await page.getOperatorList();
 const runs=deduplicatePdfRuns(text.items);removed+=text.items.filter(r=>r.str?.trim()).length-runs.length;
 const output=serializePdfBlocks(pdfRuledTableBlocks(text.items,ops.fnArray,ops.argsArray,pdfjs.OPS).sort((a,b)=>b.y-a.y),true);
 const original=runs.map(r=>r.str).join('').replace(/[-–—]\s*\d+\s*[-–—]/g,'');
 const actual=new JSDOM(output).window.document.body.textContent;
 const a=counts(actual);
 for(const [c,n] of counts(original)) assert((a.get(c)||0)>=n,`Page ${i}: missing ${c}`);
 assert(!/\n\s*\n/.test(output));
 assert(!/^#{1,6} (?:[□ㅇ*※]|예\))/m.test(output),'Body labels must not become headings');
 if(i===1) {
  assert.equal((output.match(/「2026 한국관광 데이터랩 활용 경진대회」공모요강/g)||[]).length,1);
  assert.equal((output.match(/데이터랩으로 Local Growth, Real Biz Solution!/g)||[]).length,1);
  assert(!output.includes('11 경진대회'));
 }
 result+=output+'\n';
}
assert(!result.includes('22 경진대회'));
assert(!/극대화예\)/.test(result),'Example paragraphs stay separate');
assert(/^> \[데이터를 활용한 성과 창출 사례 예시\]/m.test(result),'Shaded examples become blockquotes');
assert(/^> ■ 데이터 기반 지역 관광 정책 수립/m.test(result),'Quote contains example items');
fs.mkdirSync('.tmp/pdf-tourism',{recursive:true});fs.writeFileSync('.tmp/pdf-tourism/imported.md',result);
console.log(JSON.stringify({pages:pdf.numPages,removedOverprints:removed,contentRetention:'passed',headingsAndExamples:'passed'}));
await pdf.cleanup();
