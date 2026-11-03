const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const handlers = {}, files = new Map(), requests = [];
let listener, opened, listenCallback, port, closeCount = 0, revoked = false;
const window = { webContents: {}, isDestroyed: () => false, isMinimized: () => false, focus() {} };
const memoryFs = { writeFile: async (name, bytes) => files.set(name, bytes), readFile: async name => { if (!files.has(name)) throw Error('ENOENT'); return files.get(name); }, rm: async name => files.delete(name) };
const http = { createServer(callback) {
  listener = callback;
  return { once: (event, callback) => { listenCallback = callback; }, on() {}, listen(value) { port = value; listenCallback(); }, address: () => ({ port }), close() { closeCount++; } };
} };
const fakeFetch = async (url, options) => {
  requests.push({ url, options });
  const body = JSON.parse(options.body);
  if (url.endsWith('/exchange')) {
    assert.equal(crypto.createHash('sha256').update(body.verifier).digest('base64url'), opened.searchParams.get('challenge'));
    assert.equal(body.ticket, 't'.repeat(43));
    return Response.json({ access_token: 'initial-token', expires_in: 3600, session_token: 's'.repeat(43) });
  }
  assert.equal(options.headers.Authorization, 'Bearer ' + 's'.repeat(43));
  return revoked ? Response.json({ code: 'REAUTH_REQUIRED' }, { status: 401 }) : Response.json({ access_token: 'renewed-token', expires_in: 3600 });
};
const exported = { exports: {} };
const context = { module: exported, require: name => name === 'node:http' ? http : name === 'node:fs/promises' ? memoryFs : require(name),
  process: { env: { NO_SERVER: 'true' } }, URL, URLSearchParams, AbortSignal, fetch: fakeFetch, Buffer, setTimeout, clearTimeout };
vm.runInNewContext(fs.readFileSync('electron/gdriveOAuth.cjs','utf8'), context);
exported.exports.registerDriveOAuth({ ipcMain: { handle: (name, fn) => handlers[name] = fn }, app: { isPackaged: false, getPath: () => '/fixture-user-data' },
  shell: { openExternal: async url => { opened = new URL(url); } }, safeStorage: { isEncryptionAvailable: () => true,
    encryptString: text => Buffer.from(text).map(byte => byte ^ 123), decryptString: bytes => Buffer.from(bytes).map(byte => byte ^ 123).toString() }, getWindow: () => window });
const event = { sender: window.webContents };
(async () => {
  await assert.rejects(handlers['gdrive:request-auth']({ sender: {} }));
  const auth = handlers['gdrive:request-auth'](event);
  assert.equal(opened.origin, 'https://onrivi.com'); assert.ok(port >= 49152 && port <= 65535);
  let status,html;
  const response = { setHeader() {}, writeHead: value => status = value, end(value) { html=value; } };
  await listener({ method: 'GET', url: '/callback?code=' + 't'.repeat(43) + '&state=wrong' }, response);
  assert.equal(status, 400); assert.equal(requests.length, 0);
  await listener({ method: 'GET', url: '/callback?code=' + 't'.repeat(43) + '&state=' + opened.searchParams.get('state') }, response);
  const tokens = await auth;
  assert.equal(tokens.access_token, 'initial-token'); assert.equal(tokens.session_token, undefined);
  assert.equal(status, 200); assert.equal(closeCount, 1);
  let closed=0,cleared=false,revealed=false,click;
  const complete={set hidden(value){revealed=!value;}};
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{
    history:{replaceState(_state,_title,url){assert.equal(url,'/callback');cleared=true;}},
    window:{close(){closed++;}},document:{getElementById(id){return id==='complete'?complete:{addEventListener(_event,handler){click=handler;}};}},
    setTimeout(handler){handler();}
  });
  assert.equal(closed,1);assert.equal(cleared,true);assert.equal(revealed,true);click();assert.equal(closed,2);
  assert.ok(!html.includes('initial-token'));assert.ok(!html.includes('t'.repeat(43)));
  assert.equal(files.size, 1); assert.ok(![...files.values()][0].toString().includes('ssssssss'));
  const renewed = await handlers['gdrive:refresh-auth'](event); assert.equal(renewed.access_token, 'renewed-token');
  assert.equal(requests.length, 2, 'refresh uses HTTP without opening another browser');
  const workspaceBytes = [...files.values()][0];
  const standalone = handlers['gdrive:request-auth'](event, { isStandalone: true });
  await listener({ method: 'GET', url: '/callback?code=' + 't'.repeat(43) + '&state=' + opened.searchParams.get('state') }, response);
  assert.equal((await standalone).access_token, 'initial-token');
  assert.equal([...files.values()][0], workspaceBytes, 'save-target login must not overwrite workspace credential storage');
  revoked = true;
  assert.equal((await handlers['gdrive:refresh-auth'](event)).code, 'REAUTH_REQUIRED');
  assert.equal(files.size, 0);
  assert.equal((await handlers['gdrive:refresh-auth'](event)).code, 'REAUTH_REQUIRED');
  console.log('PASS: desktop browser authorization, callback state, ticket proof, encrypted credential storage, silent renewal, untrusted IPC rejected, revoked session removed');
})().catch(error => { console.error(error); process.exitCode = 1; });
