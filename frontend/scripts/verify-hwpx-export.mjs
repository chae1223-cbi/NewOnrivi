import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import JSZip from 'jszip';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const dom=new JSDOM('');
globalThis.Node=dom.window.Node;globalThis.DOMParser=dom.window.DOMParser;globalThis.XMLSerializer=dom.window.XMLSerializer;
const compile=file=>ts.transpileModule(fs.readFileSync(new URL('../src/lib/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
let source=compile('hwpxGenerator.ts').replace("'jszip'",JSON.stringify(pathToFileURL(require.resolve('jszip')).href)).replace("'./hwpxHeaderTemplate'",JSON.stringify(url(compile('hwpxHeaderTemplate.ts')))).replace("'./hwpxStyles'",JSON.stringify(url(compile('hwpxStyles.ts'))));
const {generateHwpx}=await import(url(source));
const container=dom.window.document.createElement('div');
container.innerHTML='<h1>한글 &amp; 문서</h1><p>본문 <strong>굵게</strong><br>줄바꿈</p><blockquote><p>인용문</p></blockquote><ol start="3"><li>목록<ul><li>하위</li></ul></li></ol><div class="codeblock-header">복사</div><pre><code class="language-js"><span class="onrivi-line">let a = 1;</span><span class="onrivi-line">  a++;</span></code></pre><table><tr><th colspan="2">병합 제목</th></tr><tr><td>가</td><td>나</td></tr></table><figure data-export-img-id="1" data-export-caption="그림 설명"><img data-export-img-id="1" src="/media/test.png"></figure>';
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZksAAAAASUVORK5CYII=','base64');
const blob=await generateHwpx(container,{title:'한글 시험',defaultFont:'맑은 고딕',images:[{id:1,buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),width:1,height:1}]});
const buffer=await blob.arrayBuffer();const zip=await JSZip.loadAsync(buffer);
assert.equal(await zip.file('mimetype').async('string'),'application/hwp+zip');
const parsed=new Map();
for(const [name,entry] of Object.entries(zip.files)) if(/\.(xml|hpf|rdf)$/.test(name)) {
  const doc=new DOMParser().parseFromString(await entry.async('string'),'application/xml');
  assert(!doc.querySelector('parsererror'),name+' malformed XML');parsed.set(name,doc);
}
const section=parsed.get('Contents/section0.xml');const header=parsed.get('Contents/header.xml');
const imageParagraphStyle=Array.from(header.querySelectorAll('paraPr')).find(p=>p.getAttribute('id')==='21');
assert(Array.from(imageParagraphStyle.querySelectorAll('lineSpacing')).every(s=>s.getAttribute('value')==='100'));
const dividerStyle=Array.from(header.querySelectorAll('paraPr')).find(p=>p.getAttribute('id')==='25');
assert(Array.from(dividerStyle.querySelectorAll('margin')).every(m=>m.querySelector('next').getAttribute('value')==='600'));
for (const tag of ['paraPr','charPr']) {
  assert.deepEqual(Array.from(header.querySelectorAll(tag)).map(el=>Number(el.getAttribute('id'))),Array.from({length:header.querySelectorAll(tag).length},(_,i)=>i));
}
const charIds=new Set(Array.from(header.querySelectorAll('charPr')).map(el=>el.getAttribute('id')));
const paraIds=new Set(Array.from(header.querySelectorAll('paraPr')).map(el=>el.getAttribute('id')));
const styleIds=new Set(Array.from(header.querySelectorAll('style')).map(el=>el.getAttribute('id')));
const paragraphIds=new Set();
for(const p of section.querySelectorAll('p')) {assert(!paragraphIds.has(p.getAttribute('id')));paragraphIds.add(p.getAttribute('id'));assert(paraIds.has(p.getAttribute('paraPrIDRef')));assert(styleIds.has(p.getAttribute('styleIDRef')));}
for(const run of section.querySelectorAll('run')) assert(charIds.has(run.getAttribute('charPrIDRef')),'dangling char reference');
for(const item of parsed.get('Contents/content.hpf').querySelectorAll('item')) assert(zip.file(item.getAttribute('href')),'missing manifest entry');
for(const image of section.querySelectorAll('img')) assert(zip.file('BinData/'+image.getAttribute('binaryItemIDRef')+'.png'));
assert(section.querySelector('tbl'));assert.equal(section.querySelector('cellSpan').getAttribute('colSpan'),'2');assert(section.querySelector('lineBreak'));assert(section.querySelector('pic'));
const picture=section.querySelector('pic');
assert.equal(picture.querySelector('pos').getAttribute('treatAsChar'),'1');
assert.equal(picture.querySelector('pos').getAttribute('affectLSpacing'),'1');
assert.deepEqual(Array.from(picture.children).map(el=>el.localName),['offset','orgSz','curSz','flip','rotationInfo','renderingInfo','img','imgRect','imgClip','inMargin','imgDim','effects','sz','pos','outMargin']);
assert.equal(picture.querySelector('imgDim').getAttribute('dimwidth'),picture.querySelector('imgClip').getAttribute('right'));
assert.equal(picture.querySelector('imgDim').getAttribute('dimheight'),picture.querySelector('imgClip').getAttribute('bottom'));
const separatorRoot=container.cloneNode(false);separatorRoot.innerHTML='<hr>';
const separatorZip=await JSZip.loadAsync(await (await generateHwpx(separatorRoot)).arrayBuffer());
const separatorXml=await separatorZip.file('Contents/section0.xml').async('string');
assert(!separatorXml.includes('─'));
assert(separatorXml.includes('paraPrIDRef="25"'));
const preview=await zip.file('Preview/PrvText.txt').async('string');assert(preview.includes('3. 목록'));assert(preview.includes('let a = 1;\n  a++;'));assert(preview.includes('그림 설명'));assert(!preview.includes('복사'));
const broken=container.cloneNode(true);broken.innerHTML='<img src="missing.png">';await assert.rejects(()=>generateHwpx(broken),/이미지/);
const quote=container.cloneNode(false);
quote.innerHTML='<blockquote><p>Tip heading</p><ul><li>Photo tip</li><li>Walking tip</li></ul></blockquote>';
const quoteZip=await JSZip.loadAsync(await (await generateHwpx(quote)).arrayBuffer());
const quoteSection=new DOMParser().parseFromString(await quoteZip.file('Contents/section0.xml').async('string'),'application/xml');
const quoteHeader=new DOMParser().parseFromString(await quoteZip.file('Contents/header.xml').async('string'),'application/xml');
const quoteStyle=Array.from(quoteHeader.querySelectorAll('paraPr')).find(p=>p.getAttribute('id')==='20');
assert(Array.from(quoteStyle.querySelectorAll('margin')).every(m=>m.querySelector('left').getAttribute('value')==='1700'));
const quoteBorderRef=quoteStyle.querySelector('border').getAttribute('borderFillIDRef');
const quoteBorder=Array.from(quoteHeader.querySelectorAll('borderFill')).find(b=>b.getAttribute('id')===quoteBorderRef);
assert.equal(quoteBorder.querySelector('leftBorder').getAttribute('type'),'SOLID');
assert.equal(quoteBorder.querySelector('leftBorder').getAttribute('color'),'#1D4ED8');
assert.equal(quoteBorder.querySelector('winBrush').getAttribute('faceColor'),'#EFF6FF');
assert.equal(quoteStyle.querySelector('border').getAttribute('connect'),'1');
for(const text of ['Tip heading','Photo tip','Walking tip']) {
  const paragraph=Array.from(quoteSection.querySelectorAll('p')).find(p=>p.textContent.includes(text));
  assert(paragraph,'missing quoted content: '+text);
  assert.equal(paragraph.getAttribute('paraPrIDRef'),'20');
}
fs.mkdirSync(new URL('../.tmp/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../.tmp/hwpx-export-smoke.hwpx',import.meta.url),Buffer.from(buffer));
console.log('PASS: HWPX ZIP/XML, style references, unique paragraph IDs, editable table/merged cells/code, image embedding, missing image error');
