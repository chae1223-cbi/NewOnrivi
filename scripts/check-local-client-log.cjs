const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('node:module').createRequire(path.resolve('frontend/package.json'))('typescript');
(async () => {
  const shared = await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('functions/api/client-log.js','utf8')).toString('base64'));
  const writes = [];
  const storage = { mkdir: async () => {}, writeFile: async (...args) => writes.push(args) };
  const source = ts.transpileModule(fs.readFileSync('frontend/src/app/api/client-log/route.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText;
  const exported = {};
  Function('exports','require','process',source)(exported,id => id.includes('functions/api/client-log') ? shared : id === 'node:fs' ? {promises:storage} : require(id),{env:{NODE_ENV:'development'},cwd:()=>path.resolve('frontend')});
  const request = (body, origin = 'http://localhost:3100') => new Request('http://localhost:3100/api/client-log', {
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  const response = await exported.POST(request({level:'ERROR',action:'BROWSER_ERROR',message:'token=fixture-secret user@example.com https://example.com/private 오류'}));
  assert.equal(response.status,204); assert.equal(writes.length,1);
  assert.ok(writes[0][0].includes(path.join('.tmp','client-logs')));
  assert.ok(!/[<>:"|?*]/.test(path.basename(writes[0][0])), 'Diagnostic filenames must be valid on Windows');
  await fs.promises.mkdir(path.dirname(writes[0][0]), {recursive:true});
  await fs.promises.writeFile(writes[0][0], writes[0][1], {mode:0o600});
  assert.equal(await fs.promises.readFile(writes[0][0], 'utf8'), writes[0][1]);
  assert.ok(!writes[0][1].includes('fixture-secret')); assert.ok(!writes[0][1].includes('user@example.com')); assert.ok(!writes[0][1].includes('https://example.com/private'));
  assert.equal((await exported.POST(request({level:'ERROR',message:'실패'},'https://evil.example'))).status,403);
  assert.equal((await exported.POST(request({level:'INVALID',message:'잘못된 이벤트'}))).status,400);
  assert.equal(writes.length,1);
  console.log('PASS: local client-log route returns 204, stores redacted diagnostics locally, rejects cross-origin and invalid input');
})().catch(error=>{console.error(error);process.exitCode=1;});
