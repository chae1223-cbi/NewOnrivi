import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import JSZip from 'jszip';
import {JSDOM} from 'jsdom';

const require = createRequire(import.meta.url);
globalThis.DOMParser = new JSDOM('').window.DOMParser;
const source = ts.transpileModule(fs.readFileSync(new URL('../src/lib/hwpxImporter.ts', import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}
}).outputText.replace("'jszip'", JSON.stringify(pathToFileURL(require.resolve('jszip')).href));
const {importHwpx} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const zip = new JSZip();
zip.file('Contents/content.hpf', '<package><manifest><item id="s1" href="Contents/section1.xml"/><item id="s0" href="Contents/section0.xml"/><item id="BIN1" href="BinData/BIN1.png" media-type="image/png"/></manifest><spine><itemref idref="s0"/><itemref idref="s1"/></spine></package>');
zip.file('Contents/section0.xml', '<sec><p><run><t>첫 문단</t></run></p><p><run><pic><img binaryItemIDRef="BIN1"/></pic></run></p><tbl colCnt="2"><tr><tc><cellAddr rowAddr="0" colAddr="1"/><p><run><t>오른쪽</t></run></p></tc><tc><cellAddr rowAddr="0" colAddr="0"/><p><run><t>왼쪽</t></run></p></tc></tr><tr><tc><cellAddr rowAddr="1" colAddr="0"/><p><run><t>다음 | 행</t></run></p></tc></tr></tbl></sec>');
zip.file('Contents/section1.xml', '<sec><p><run><t>마지막 문단</t></run></p></sec>');
zip.file('BinData/BIN1.png', Buffer.from([137,80,78,71]));
const bytes = await zip.generateAsync({type:'arraybuffer'});
const saved = [];
const markdown = await importHwpx(bytes, async (base64, mime) => {
  saved.push([base64, mime]);
  return '/media/image.png';
});
assert(markdown.indexOf('첫 문단') < markdown.indexOf('마지막 문단'));
assert(markdown.includes('![BIN1](/media/image.png)'));
assert(markdown.includes('| 왼쪽 | 오른쪽 |'));
assert(markdown.includes('| 다음 \\| 행 |  |'));
assert.equal(saved.length, 1);
assert.equal(saved[0][1], 'image/png');
await assert.rejects(importHwpx(await new JSZip().generateAsync({type:'arraybuffer'})), /목차/);
const exportedFixture = new URL('../.tmp/hwpx-export-smoke.hwpx', import.meta.url);
if (fs.existsSync(exportedFixture)) {
  const exported = fs.readFileSync(exportedFixture);
  const imported = await importHwpx(exported.buffer.slice(exported.byteOffset, exported.byteOffset + exported.byteLength), async () => '/media/roundtrip.png');
  assert(imported.includes('한글 & 문서'));
  assert(imported.includes('병합 제목'));
  assert(imported.includes('![BIN1](/media/roundtrip.png)'));
}
console.log('PASS: HWPX section order, text, image callback, table coordinates, and invalid package');
