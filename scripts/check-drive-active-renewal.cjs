const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('node:module').createRequire(path.resolve('frontend/package.json'))('typescript');
const compiled = ts.transpileModule(fs.readFileSync('frontend/src/lib/gdrive/activeTokenRenewal.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const mod = { exports: {} }; Function('exports', compiled)(mod.exports);
async function scenario(active, failure = false, stopDuringSave = false) {
  let now = 0, next, stopped, calls = [];
  stopped = mod.exports.startActiveTokenRenewal({
    expiresAt: 3600000, now: () => now, isActive: () => active,
    save: async () => { calls.push('save'); if (stopDuringSave) stopped(); if (failure) throw Error('offline'); },
    renew: async () => { calls.push('renew'); return 'new-token'; },
    schedule: (fn, delay) => { next = { fn, at: now + delay }; return 1; }, cancel: () => { next = null; }
  });
  assert.equal(next.at, 3420000, 'starts exactly three minutes before expiry');
  now = next.at; next.fn();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  if (!active) {
    assert.deepEqual(calls, []);
    active = true; now = next.at; next.fn();
    for (let i = 0; i < 8; i++) await Promise.resolve();
  }
  assert.deepEqual(calls, failure || stopDuringSave ? ['save'] : ['save', 'renew']);
  stopped();
}
(async () => {
  // Exercise the actual browser adapters, including their native method receiver.
  const client = fs.readFileSync('frontend/src/lib/gdrive/googleDriveClient.ts', 'utf8');
  const adapters = client.match(/schedule: \(callback, delay\) => window\.setTimeout\(callback, delay\),\s*cancel: timer => window\.clearTimeout\(timer\),/);
  assert.ok(adapters, 'browser timers use Window wrappers');
  const browser = {
    setTimeout(callback, delay) { assert.equal(this, browser); assert.equal(delay, 3420000); return 42; },
    clearTimeout(timer) { assert.equal(this, browser); assert.equal(timer, 42); }
  };
  const timerAdapters = Function('window', `return ({${adapters[0]}})`)(browser);
  const cancel = mod.exports.startActiveTokenRenewal({
    expiresAt: 3600000, now: () => 0, isActive: () => true,
    save: async () => {}, renew: async () => null, ...timerAdapters
  });
  cancel();
  await scenario(true); await scenario(false); await scenario(true, true); await scenario(true, false, true);
  let now = 3599000, called = false;
  mod.exports.startActiveTokenRenewal({ expiresAt: 3600000, now: () => now, isActive: () => true,
    save: async () => { called = true; }, renew: async () => { called = true; },
    schedule: fn => { queueMicrotask(fn); return 1; }, cancel() {} });
  await Promise.resolve(); assert.equal(called, false, 'no renewal in the final second');
  console.log('PASS: active/idle, resume activity, save before renewal, failed save blocks renewal, cancellation, final-second cutoff');
})().catch(error => { console.error(error); process.exitCode = 1; });
