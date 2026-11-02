import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import CryptoJS from 'crypto-js';
const source=fs.readFileSync(new URL('../src/lib/gdrive/googleDriveClient.ts',import.meta.url),'utf8');
const section=source.slice(source.indexOf('let imageUploadQueue:'),source.indexOf('const driveImageBlobCache'));
const compiled=ts.transpileModule(section,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const digest=value=>CryptoJS.MD5(CryptoJS.lib.WordArray.create(new Uint8Array(value))).toString();
let creates=0;
let files=[{id:'old',name:'different-name.png',md5Checksum:digest(new TextEncoder().encode('same image'))}];
const fetchMock=async(url,options)=>{
  if(options.method==='POST'){creates++;const item={id:'new',name:'fresh.png',md5Checksum:digest(new TextEncoder().encode('new image'))};files.push(item);return {ok:true,json:async()=>item};}
  return {ok:true,json:async()=>({files})};
};
const exports={};
new Function('exports','CryptoJS','resolveAuthToken','fetch','parseDriveError',compiled)(exports,CryptoJS,()=> 'token',fetchMock,async()=>new Error('API error'));
const reused=await exports.uploadDriveImage('token','folder',new Blob(['same image']),'new-name.png');
assert.equal(reused.id,'old');assert.equal(creates,0);
const results=await Promise.all([exports.uploadDriveImage('token','folder',new Blob(['new image']),'fresh.png'),exports.uploadDriveImage('token','folder',new Blob(['new image']),'another.png')]);
assert.equal(creates,1);assert.equal(results[0].id,results[1].id);
console.log('Image dedup checks passed: legacy names and concurrent uploads');
