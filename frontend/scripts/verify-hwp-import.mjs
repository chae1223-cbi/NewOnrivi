import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);

// The HWP importer uses pdfjs only for other formats; avoid its browser-only
// DOMMatrix initialization in this Node verification script.
const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'pdfjs-dist') return { GlobalWorkerOptions: {}, version: 'test' };
  return originalLoad.call(this, id, ...args);
};
require.extensions['.ts'] = (module, file) => {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  } }).outputText;
  module._compile(js, file);
};

const { cleanHwpText } = require('../src/lib/hwpTextCleanup.ts');
const { convertFormCheckboxes } = require('../src/lib/importCheckboxes.ts');
assert.equal(cleanHwpText('□ 일반현황\u001f'), '□ 일반현황 ');
assert.equal(cleanHwpText('󰠲'.repeat(60)), '---');
assert.equal(cleanHwpText('□□ 부호'), '□□ 부호');
const consentRow = '<tr><td>□ 개인정보의 수집 목적</td><td>□ 동의함 □ 동의하지 않음</td></tr>';
const converted = convertFormCheckboxes(consentRow);
assert.equal((converted.match(/data-import-checkbox/g) || []).length, 2);
assert(converted.includes('□ 개인정보의 수집 목적'));
assert(converted.includes('aria-label="동의함"'));
assert(converted.includes('aria-label="동의하지 않음"'));

if (process.argv[2]) {
  const { convertFileToMarkdown } = require('../src/lib/fileImporter.ts');
  const bytes = fs.readFileSync(process.argv[2]);
  const markdown = await convertFileToMarkdown(new File([bytes], 'sample.hwp'), async () => '/media/test.png');
  assert(markdown.includes('신청자명'));
  assert(markdown.includes('000'));
  assert(markdown.includes('창업아이템'));
  assert(markdown.includes('/media/test.png'));
  assert(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(markdown));
  assert(!markdown.includes('󰠲'));
  assert(!markdown.includes('<table><br>'));
  assert.equal((markdown.match(/data-import-checkbox/g) || []).length, 6);
  assert(markdown.includes('aria-label="동의함"'));
  assert(markdown.includes('aria-label="동의하지 않음"'));
  const dom = new JSDOM(markdown).window.document;
  assert(dom.querySelector('td[colspan="3"]'));
  assert(dom.querySelector('td[rowspan="3"]'));
  assert(dom.querySelector('td > table'));
  console.log('HWP sample: merged and nested tables, controls, checkboxes and image passed');
}

console.log('HWP text and checkbox checks passed');
