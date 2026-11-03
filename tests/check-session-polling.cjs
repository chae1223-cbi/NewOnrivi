const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('node:module').createRequire(path.resolve('frontend/package.json'))('typescript');
const output = ts.transpileModule(fs.readFileSync('frontend/src/lib/sessionPolling.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const api = {}; Function('exports',output)(api);
const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
(async () => {
  let now=0, visible=true, calls=0, result=true, pending, timer, stoppedTimers=0;
  const polling=api.startSessionPolling({ now:()=>now, random:()=>0, visible:()=>visible,
    schedule:(fn,delay)=>{timer={fn,delay};return 1;}, cancel:()=>{stoppedTimers++;},
    check:async()=>{calls++;if(pending)await pending;return result;} });
  await flush();assert.equal(calls,1);assert.equal(timer.delay,60000);
  polling.request();polling.request();await flush();assert.equal(calls,1);assert.equal(timer.delay,10000);
  now=10000;timer.fn();await flush();assert.equal(calls,2);
  visible=false;now=70000;timer.fn();await flush();assert.equal(timer.delay,90000);
  visible=true;now=80000;polling.request();await flush();assert.equal(calls,4);assert.equal(timer.delay,60000);
  result=false;now=140000;timer.fn();await flush();assert.equal(timer.delay,120000);
  now=260000;timer.fn();await flush();assert.equal(timer.delay,240000);
  result=true;now=500000;timer.fn();await flush();assert.equal(timer.delay,60000);
  let resolve;pending=new Promise(done=>resolve=done);now=560000;timer.fn();await flush();const busyCalls=calls;
  polling.request();polling.request();await flush();assert.equal(calls,busyCalls);
  polling.stop();const savedTimer=timer;resolve();await flush();assert.equal(timer,savedTimer);
  assert.ok(stoppedTimers>0);
  console.log('PASS: 60s active, 90s hidden, resume deduplication, single in-flight, exponential backoff, recovery and cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
