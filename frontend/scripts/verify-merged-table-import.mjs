import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import mammoth from 'mammoth';
import {JSDOM} from 'jsdom';
globalThis.DOMParser = new JSDOM('').window.DOMParser;
const code = ts.transpileModule(fs.readFileSync(new URL('../src/lib/importHtmlMarkdown.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {htmlToImportMarkdown: convert} = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert(convert('<table><tr><td>A</td><td>B</td></tr></table>').startsWith('| A | B |'));
const merged = convert('<p>Outside</p><table onclick="evil()"><tr><td colspan="2"><strong>Title</strong></td></tr><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr></table>');
assert(merged.startsWith('Outside\n\n<table>'));
assert(merged.includes('colspan="2"'));
assert(merged.includes('rowspan="2"'));
assert(!merged.includes('evil'));
if (process.argv[2]) {
  const original = await mammoth.convertToHtml({buffer:fs.readFileSync(process.argv[2])});
  const converted = convert(original.value);
  const doc = new DOMParser().parseFromString(converted,'text/html');
  assert.equal(doc.querySelectorAll('tr').length,16);
  assert(doc.querySelector('td[colspan="10"]'));
  assert.equal(doc.querySelectorAll('tr')[8].children.length,1);
  assert(converted.includes('회의 안건'));
  fs.mkdirSync('.tmp/docx-merged',{recursive:true});
  fs.writeFileSync('.tmp/docx-merged/회의록.md',converted);
  console.log('Meeting minutes: 16 rows and full-width merged content preserved');
}
console.log('Merged table and simple Markdown table checks passed');
