import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';

const url = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText).toString('base64')}`;
const preparationUrl = url(await readFile(new URL('../src/lib/exportPreparation.ts', import.meta.url), 'utf8'));
const prep = await import(preparationUrl);
const mediaSource = (await readFile(new URL('../src/lib/exportMediaHelper.ts', import.meta.url), 'utf8')).replace("'./exportPreparation'", JSON.stringify(preparationUrl));
const media = await import(url(mediaSource));

test('resource readiness waits for fonts and image decoding', async () => {
  let ready;
  let decoded = false;
  const image = { naturalWidth: 30, naturalHeight: 20, decode: async () => { decoded = true; } };
  const root = { ownerDocument: { fonts: { ready: new Promise(resolve => { ready = resolve; }) } }, querySelectorAll: () => [image] };
  const operation = prep.waitForExportResources(root, 1000);
  assert.equal(decoded, false);
  ready();
  await operation;
  assert.equal(decoded, true);
  assert.equal(image.loading, 'eager');
});

test('broken image stops export instead of silently omitting content', async () => {
  const root = { ownerDocument: {}, querySelectorAll: () => [{ alt: '사진', naturalWidth: 0, naturalHeight: 0, decode: async () => { throw new Error('not found'); } }] };
  await assert.rejects(prep.waitForExportResources(root), /1번째 이미지.*사진/);
});

test('failed font used in the document prevents a silently substituted output', async () => {
  const fonts = [{ status: 'error', family: 'Document Font' }];
  fonts.ready = Promise.resolve();
  const root = { ownerDocument: { fonts, defaultView: { getComputedStyle: () => ({ fontFamily: '"Document Font", sans-serif' }) } }, querySelectorAll: () => [] };
  await assert.rejects(prep.waitForExportResources(root), /문서 글꼴.*Document Font/);
});

test('unavailable small images are reported instead of being discarded as icons', async () => {
  const image = { naturalWidth: 16, naturalHeight: 16, src: 'missing.png', decode: async () => { throw new Error('missing'); } };
  const live = { querySelectorAll: selector => selector.startsWith('img') ? [image] : [] };
  const clone = { querySelectorAll: selector => selector.startsWith('img') ? [image] : [] };
  await assert.rejects(media.extractMediaFromElements(live, clone), /Word 파일에 포함하지 못했습니다/);
});

test('Electron print preparation runs only after image decoding and rejects broken print images', async () => {
  const source = await readFile(new URL('../../main.js', import.meta.url), 'utf8');
  const printHandler = source.slice(source.indexOf("ipcMain.handle('pdf:printHTMLToPDF'"));
  const script = printHandler.match(/executeJavaScript\(`([\s\S]*?)`\)/)?.[1];
  assert.ok(script);
  let decoded = false;
  const image = { naturalWidth: 10, naturalHeight: 10, decode: async () => { decoded = true; } };
  const fonts = [];
  fonts.ready = Promise.resolve();
  const context = { document: { fonts, images: [image] }, setTimeout, clearTimeout, requestAnimationFrame: callback => callback() };
  await vm.runInNewContext(script, context);
  assert.equal(decoded, true);
  image.decode = async () => { throw new Error('missing'); };
  await assert.rejects(vm.runInNewContext(script, context), /인쇄 이미지를 준비하지 못했습니다/);
});

test('hanging resource preparation ends with an error', async () => {
  await assert.rejects(prep.waitForExportResources({ ownerDocument: { fonts: { ready: new Promise(() => {}) } }, querySelectorAll: () => [] }, 10), /시간이 초과/);
});
test('desktop print ignores obsolete font failures but reports an unavailable selected font', async () => {
  const source = await readFile(new URL('../../main.js', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf("ipcMain.handle('pdf:printHTMLToPDF'"));
  const script = handler.match(/executeJavaScript\(`([\s\S]*?)`\)/)[1];
  const fonts = [{ status: 'error', family: 'Selected Font' }, { status: 'error', family: 'Unused Font' }];
  fonts.ready = Promise.resolve();
  fonts.check = () => true;
  const context = {
    document: { fonts, images: [], querySelectorAll: () => [{}] },
    getComputedStyle: () => ({ fontFamily: '"Selected Font", "Unused Font", sans-serif', fontWeight: '400', fontSize: '16px', fontStyle: 'normal' }),
    setTimeout, clearTimeout, requestAnimationFrame: callback => callback(),
  };
  await vm.runInNewContext(script, context);
  fonts.check = () => false;
  await assert.rejects(vm.runInNewContext(script, context), /Selected Font/);
  fonts.splice(0, 1);
  await vm.runInNewContext(script, context);
});

test('latest preview content must match before snapshot', async () => {
  const expected = '마지막 한글 글자';
  let current = prep.exportContentFingerprint('이전 본문');
  const root = { querySelector: () => ({ getAttribute: () => current }) };
  let finished = false;
  const operation = prep.waitForExportContent(root, expected).then(() => { finished = true; });
  assert.equal(finished, false);
  current = prep.exportContentFingerprint(expected);
  await operation;
  assert.equal(finished, true);
});

test('image fetch rejects HTTP failures and nonimage data', async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [new Response('', { status: 404 }), new Response('{}', { headers: { 'content-type': 'application/json' } })]) {
      globalThis.fetch = async () => response;
      await assert.rejects(prep.fetchExportImage('https://example.test/image'));
    }
  } finally { globalThis.fetch = original; }
});

test('image download deadline covers response body too', async () => {
  const original = globalThis.fetch;
  let aborted = false;
  try {
    globalThis.fetch = async (_, { signal }) => ({ ok: true, blob: () => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
    }) });
    await assert.rejects(prep.fetchExportImage('https://example.test/image', 10));
    assert.equal(aborted, true);
  } finally { globalThis.fetch = original; }
});

test('JPEG input is encoded as real PNG instead of copying original bytes', async () => {
  const original = globalThis.document;
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  let encodedType;
  try {
    globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: (callback, type) => {
      encodedType = type;
      callback(new Blob([signature], { type }));
    } }) };
    const result = await media.imgElementToPng({ src: 'data:image/jpeg;base64,/9j/', naturalWidth: 40, naturalHeight: 20, decode: async () => {} });
    assert.equal(encodedType, 'image/png');
    assert.deepEqual(new Uint8Array(result.buffer), signature);
    assert.equal(result.width, 40);
  } finally { globalThis.document = original; }
});
test('image alt text stays metadata while a visible caption is preserved', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<main><img src="data:image/png;base64,AA==" alt="이미지 설명"><figure><img src="data:image/png;base64,AA==" alt="Alternative"><figcaption>Visible caption</figcaption></figure></main>');
  const original = globalThis.document;
  const root = dom.window.document.querySelector('main');
  const clone = root.cloneNode(true);
  for (const img of clone.querySelectorAll('img')) {
    Object.defineProperty(img, 'naturalWidth', { value: 40 });
    Object.defineProperty(img, 'naturalHeight', { value: 20 });
    img.decode = async () => {};
  }
  try {
    globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: callback => callback(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])])) }) };
    const images = await media.extractMediaFromElements(root, clone);
    assert.equal(images[0].caption, undefined);
    assert.equal(images[0].alt, '이미지 설명');
    assert.equal(images[1].caption, 'Visible caption');
  } finally { globalThis.document = original; }
});
test('print table wrappers release scrolling and inline-block layout while rows and repeated headers remain protected', async () => {
  const { JSDOM } = await import('jsdom');
  const { PRINT_TABLE_FLOW_CSS } = await import(url(await readFile(new URL('../src/lib/exportPagination.ts', import.meta.url), 'utf8')));
  const cssForPrint = PRINT_TABLE_FLOW_CSS.replace('@media print {', '').replace(/}\s*$/, '');
  const dom = new JSDOM(`<style>.markdown-viewer-root .table-wrapper-area { display:inline-block !important; overflow-x:auto; }</style><style>${cssForPrint}</style><main class="custom-preview-container"><div class="markdown-viewer-root onrivi-content-root"><div class="table-wrapper-area"><table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table></div></div></main>`);
  const style = selector => dom.window.getComputedStyle(dom.window.document.querySelector(selector));
  assert.equal(style('.table-wrapper-area').display, 'block');
  assert.equal(style('.table-wrapper-area').overflowX, 'visible');
  assert.equal(style('.table-wrapper-area').breakInside, 'auto');
  assert.equal(style('tr').breakInside, 'avoid');
  assert.equal(style('thead').display, 'table-header-group');
});
test('PDF snapshots unwrap nested table layout containers without losing headers or captions', async () => {
  const { JSDOM } = await import('jsdom');
  const { unwrapPrintTables } = await import(url(await readFile(new URL('../src/lib/exportPagination.ts', import.meta.url), 'utf8')));
  const dom = new JSDOM('<main><h2>Title</h2><div><div class="print:block"><div class="table-wrapper-area"><table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table><p>Caption</p></div></div></div><p>Following paragraph</p></main>');
  const root = dom.window.document.querySelector('main');
  const originalText = root.textContent;
  unwrapPrintTables(root);
  assert.equal(root.textContent, originalText);
  assert.equal(root.querySelector('table').parentElement, root);
  assert.equal(root.querySelectorAll('thead').length, 1);
  assert.equal(root.querySelectorAll('.table-wrapper-area').length, 0);
  assert.equal(root.children[2].textContent, 'Caption');
});
