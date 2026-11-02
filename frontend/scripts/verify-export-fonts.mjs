import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
const localJs=ts.transpileModule(await readFile(new URL('../src/lib/localFontSources.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const localUrl='data:text/javascript;base64,'+Buffer.from(localJs).toString('base64');
const { rememberLocalFontSources }=await import(localUrl);
const source = (await readFile(new URL('../src/lib/exportFonts.ts', import.meta.url), 'utf8')).replace("'./localFontSources'",JSON.stringify(localUrl));
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { embedExportFonts } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { window } = new JSDOM();
globalThis.FileReader = window.FileReader;
const root = {
 ownerDocument: {
  baseURI: 'https://onrivi.com/editor',
  defaultView: { getComputedStyle: () => ({ fontFamily: '"Document Font", sans-serif' }) },
  styleSheets: [{ href: 'https://onrivi.com/_next/static/css/app.css', cssRules: [
   { cssText: '@font-face { font-family:"Document Font"; src:url("/fonts/doc.ttf") format("truetype"); font-weight:400; }' },
   { cssText: '@font-face { font-family:"Unused Font"; src:url("/fonts/unused.ttf"); }' },
  ] }],
 }, querySelectorAll: () => [],
};
function uniqueRoot(filename) {
 return {...root,ownerDocument:{...root.ownerDocument,styleSheets:root.ownerDocument.styleSheets.map(sheet=>({...sheet,cssRules:sheet.cssRules.map(rule=>({cssText:rule.cssText.replace('doc.ttf',filename)}))}))}};
}
test('selected document font is embedded, unrelated fonts are not fetched', async () => {
 const urls=[];
 globalThis.fetch=async url => { urls.push(url); return { ok:true, blob:async()=>new window.Blob(['font-data'],{type:'font/ttf'}) }; };
 const css=await embedExportFonts(root);
 assert.deepEqual(urls,['https://onrivi.com/fonts/doc.ttf']);
 assert.match(css,/url\("data:font\/ttf;base64,/);
 assert.doesNotMatch(css,/Unused Font|\/fonts\/doc.ttf/);
 assert.match(css,/font-weight:400/);
 await embedExportFonts(root);
 assert.equal(urls.length,1,'second export reuses font data');
});
test('missing selected font stops export with a named diagnostic',async()=>{
 globalThis.fetch=async()=>({ok:false,status:404});
 await assert.rejects(embedExportFonts(uniqueRoot('missing.ttf')),/document font.*배포 경로/);
});
test('bundled document fonts do not request unrelated imported CDN sheets',async()=>{
 const fonts=[{family:'Document Font',status:'loaded'}];
 const doc={...root.ownerDocument,fonts,styleSheets:[{...root.ownerDocument.styleSheets[0],cssRules:[...root.ownerDocument.styleSheets[0].cssRules,{cssText:'@import url("https://example.test/unrelated.css");'}]}]};
 let requests=0;
 globalThis.fetch=async()=>{requests++;throw Error('no network expected');};
 await embedExportFonts({...root,ownerDocument:doc});
 assert.equal(requests,0);
});
test('all bundled font-face paths exist in the web and desktop asset source', async () => {
 const css=await readFile(new URL('../src/app/globals.css',import.meta.url),'utf8');
 const paths=[...css.matchAll(/url\(['"]?(\/fonts\/[^'"\)]+)['"]?\)/g)].map(match=>match[1]);
 assert.ok(paths.length>=19);
 for(const path of paths) assert.ok((await readFile(new URL('../public'+path,import.meta.url))).length>0,path);
});
test('every font listed as bundled has a matching CSS family and legacy OTF entries are not duplicated',async()=>{
 const modal=await readFile(new URL('../src/components/FontSelectorModal.tsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/app/globals.css',import.meta.url),'utf8');
 const list=modal.split('const EMBEDDED_FONTS: FontEntry[] = [')[1].split('];')[0];
 const names=[...list.matchAll(/name:\s*'([^']+)'/g)].map(match=>match[1]);
 assert.equal(names.length,9);
 assert.equal(new Set(names).size,names.length);
 for(const name of names)assert.ok(css.includes("font-family: '"+name+"'"),name);
 assert.ok(!names.some(name=>name.includes('OTF')));
 for(const name of ['학교안심 포스터 OTF B','학교안심 어항꾸미기 OTF B','학교안심 보드마카 OTF R'])assert.ok(css.includes("font-family: '"+name+"'"));
});
test('HTML returned instead of a font is rejected',async()=>{
 globalThis.fetch=async()=>({ok:true,blob:async()=>new window.Blob(['<!doctype html>'],{type:'text/html'})});
 await assert.rejects(embedExportFonts(uniqueRoot('invalid.ttf')),/document font/);
});
test('local user fonts include regular and bold files without fetching system paths',async()=>{
 rememberLocalFontSources([
  {family:'User Font',style:'Regular',blob:async()=>new window.Blob(['regular'])},
  {family:'User Font',style:'Bold',blob:async()=>new window.Blob(['bold'])},
  {family:'Other Font',style:'Regular',blob:async()=>{throw Error('must not read');}},
 ]);
 const localRoot={ownerDocument:{baseURI:'https://onrivi.com/editor',styleSheets:[],defaultView:{getComputedStyle:()=>({fontFamily:'"User Font", sans-serif'})}},querySelectorAll:()=>[]};
 const css=await embedExportFonts(localRoot);
 assert.match(css,/font-weight:400/);assert.match(css,/font-weight:700/);
 assert.equal((css.match(/@font-face/g)||[]).length,2);
 assert.doesNotMatch(css,/Other Font/);
 rememberLocalFontSources([]);
});
