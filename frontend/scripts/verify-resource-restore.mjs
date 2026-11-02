import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/gdrive/restoreResourceFolder.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let saved={kind:'drive',folderId:'last-folder'}, status=200, calls=0;
const exports={};
new Function('exports','require','fetch',code)(exports,()=>({getResourceSettings:mode=>{assert.equal(mode,'cloud');return saved;}}),async url=>{
  calls++;assert(url.includes('/last-folder?'));
  return {status,ok:status===200,json:async()=>({id:'last-folder',name:'Renamed resources',mimeType:'application/vnd.google-apps.folder'})};
});
assert.deepEqual(await exports.restoreDriveResourceFolder('token'),{id:'last-folder',name:'Renamed resources'});
status=404;assert.equal(await exports.restoreDriveResourceFolder('token'),null);
for(status of [401,403,503]) await assert.rejects(()=>exports.restoreDriveResourceFolder('token'));
assert.equal(saved.folderId,'last-folder');
saved=null;const before=calls;assert.equal(await exports.restoreDriveResourceFolder('token'),null);assert.equal(calls,before);
console.log('PASS: last Drive folder reused, missing folder detected, authorization/server errors preserve selection');
