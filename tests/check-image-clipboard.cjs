const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('node:module').createRequire(path.resolve('frontend/package.json'))('typescript');
const code = ts.transpileModule(fs.readFileSync('frontend/src/lib/mediaMarkup.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const writes = [], texts = [], urls = [];
let fail = false;
class Image {
  set src(url) { urls.push(url); queueMicrotask(() => fail ? this.onerror() : this.onload()); }
  naturalWidth = 20; naturalHeight = 30;
}
class ClipboardItem { constructor(data) { this.data = data; } }
const window = { ClipboardItem };
const navigator = { clipboard: { write: async data => writes.push(data), writeText: async text => texts.push(text) } };
const document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: callback => callback(new Blob(['pixels'],{type:'image/png'})) }) };
const exportsObject = {};
Function('exports','window','navigator','document','Image','ClipboardItem',code)(exportsObject,window,navigator,document,Image,ClipboardItem);
(async () => {
  assert.equal(await exportsObject.copyImageToClipboard('![cover](media/cover.png)',{currentSrc:'blob:resolved-drive-image'}),true);
  assert.equal(urls[0],'blob:resolved-drive-image');
  assert.equal(writes[0][0].data['image/png'].type,'image/png');
  assert.equal(await exportsObject.copyImageToClipboard('![cover](<https://example.com/a.png?driveId=123&signature=abc>)'),true);
  assert.equal(urls[1],'https://example.com/a.png?driveId=123&signature=abc');
  fail = true;
  assert.equal(await exportsObject.copyImageToClipboard('missing.png'),false);
  await assert.rejects(exportsObject.copyMediaSource('missing.png'));
  assert.equal(texts.length,0,'never put an image address on the clipboard');
  console.log('PASS: rendered image, PNG clipboard data, query preservation, failure never copies text');
})().catch(error => { console.error(error); process.exitCode = 1; });
