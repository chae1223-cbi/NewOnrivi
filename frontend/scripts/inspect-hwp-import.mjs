import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import * as cfb from 'cfb';
import {inflateRawSync} from 'node:zlib';
const require=createRequire(import.meta.url);
const input=process.argv[2];if(!input)throw new Error('Pass an HWP file path');
const bytes=fs.readFileSync(input);const ole=cfb.read(bytes,{type:'buffer'});
const header=ole.FileIndex.find(entry=>entry.name==='FileHeader').content;
console.log('HWP header',{bytes:bytes.length,flags:Buffer.from(header).readUInt32LE(36),sections:ole.FullPaths.filter(p=>/BodyText\/Section\d+$/.test(p)),images:ole.FullPaths.filter(p=>/BinData\/BIN/i.test(p)).length});
let rawImages=0,compressedImages=0;
for(const entry of ole.FileIndex.filter(e=>/^BIN[0-9a-f]+\./i.test(e.name))) {try{inflateRawSync(entry.content);compressedImages++;}catch{rawImages++;}}
console.log('Image stream encoding',{rawImages,compressedImages});
const importer=fs.readFileSync(new URL('../src/lib/fileImporter.ts',import.meta.url),'utf8');
const streams=ts.transpileModule(fs.readFileSync(new URL('../src/lib/hwpStreams.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const dataURL=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const checkboxCode=ts.transpileModule(fs.readFileSync(new URL('../src/lib/importCheckboxes.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
let source="import {Buffer} from 'node:buffer';\nimport * as hwpLib from "+JSON.stringify(pathToFileURL(require.resolve('hwp.js')).href)+";\nimport {readHwpCompression,decodeHwpBody,decodeHwpParagraph,isRawHwpImage} from "+JSON.stringify(dataURL(streams))+";\nexport "+importer.slice(importer.indexOf('async function importHwp('));
for(const name of ['cfb','pako']) source=source.replaceAll(`import('${name}')`,`import(${JSON.stringify(pathToFileURL(require.resolve(name)).href)})`);
let imageSource=ts.transpileModule(fs.readFileSync(new URL('../src/lib/hwpImages.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
for(const name of ['utif','pako']) imageSource=imageSource.replace(`'${name}'`,JSON.stringify(pathToFileURL(require.resolve(name)).href));
source=source.replaceAll("import('./hwpImages')",`import(${JSON.stringify(dataURL(imageSource))})`);
source=`import {convertFormCheckboxes} from ${JSON.stringify(dataURL(checkboxCode))};\n`+source;
source=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {importHwp}=await import(dataURL(source));
const output=new URL('../.tmp/hwp-import/',import.meta.url);fs.mkdirSync(output,{recursive:true});
let imageCount=0;
const md=await importHwp(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),async(base64,mime)=>{
  const ext=({'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/bmp':'bmp'})[mime]||'bin';
  const payload=Buffer.from(base64,'base64');
  if(ext==='png') assert.deepEqual([...payload.subarray(0,8)],[137,80,78,71,13,10,26,10],'PNG signature');
  if(ext==='bmp') assert.equal(payload.subarray(0,2).toString(),'BM','BMP signature');
  const name=`image-${++imageCount}.${ext}`;fs.writeFileSync(new URL(name,output),payload);return `./${name}`;
});
if(path.basename(input)==='프로그램별설치및삭제가이드.hwp') {
  for(const label of ['통합설치 프로그램 (VeraPort)','공인인증서 (MAGIC-PKI)','증명서 위변조 방지 (E-SAFER)']) assert(md.includes(label));
  assert.equal(imageCount,78);assert(!md.includes('::HWP_IMAGE_PLACEHOLDER'));assert(!md.includes('첨부 이미지 목록'));
  assert.equal((md.match(/<img /g)||[]).length,128,'original picture placements, including reused logos');
  assert.equal(new Set(Array.from(md.matchAll(/<img src="([^"]+)"/g),match=>match[1])).size,78);
  assert((md.match(/^\|---/gm)||[]).length >= 10, 'table structures retained');
  const placements=Array.from(md.matchAll(/<img src="\.\/([^"]+)"/g),match=>match[1]);
  console.log('Image size after PNG conversion', {placementBytes:placements.reduce((sum,name)=>sum+fs.statSync(new URL(name,output)).size,0),tables:(md.match(/^\|---/gm)||[]).length});
  console.log('PASS: original fixture full labels, all 78 valid images, no placeholders or duplicate appendix');
}
fs.writeFileSync(new URL('imported.md',output),md);
if(path.basename(input).startsWith('2221730_')) {
  assert(md.includes('세무사법 일부개정법률안'));
  assert(md.includes('세무사가 납세자의 성실납세를 조력하고'));
  assert(md.includes('| 현'));
  assert(md.includes('|---|---|'));
  assert(!md.includes('세 무 사 법'));
  assert.equal(imageCount,0);
  console.log('PASS: attached bill words, body and two-column comparison table preserved without artificial letter spaces');
}
console.log('Imported result',{characters:md.length,images:imageCount,preview:md.slice(0,500),output:pathToFileURL(path.resolve('frontend/.tmp/hwp-import/imported.md')).href});

