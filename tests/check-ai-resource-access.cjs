const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const req = require('node:module').createRequire(path.resolve('frontend/package.json'));
const ts = req('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(`frontend/src/${file}`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const storage = () => {
  const map = new Map();
  return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) };
};
function computer(shared, device) {
  const local = storage(), session = storage();
  local.setItem('onrivi_device_client_id', device);
  local.setItem('resourceFolder', 'cloud display name');
  const window = Object.assign(new EventTarget(), { location: { hostname: 'onrivi.com' } });
  const stats = { fetches: 0, localReads: 0, writes: 0, failRead: false, failWrite: false, token: 'test-token' };
  const settings = { kind: 'drive', folderId: 'shared-resource', promptFolderId: 'prompts' };
  const drive = {
    getSavedDriveToken: () => stats.token,
    readDriveAICredentials: async () => { if (stats.failRead) throw Error('Drive 401'); return shared.cipher || null; },
    saveDriveAICredentials: async (_token, _folder, cipher) => { stats.writes++; if (stats.failWrite) return false; shared.cipher = cipher; return true; },
    findDriveFile: async () => { if (stats.failRead) throw Error('Drive 401'); return null; },
  };
  const modules = {};
  const load = file => {
    const exports = {};
    Function('exports', 'require', 'window', 'localStorage', 'sessionStorage', 'fetch', compile(file))(
      exports, id => {
        if (id.endsWith('resourceSettings')) return { getResourceSettings: () => settings, requireResourceSettings: () => settings };
        if (id.endsWith('googleDriveClient')) return drive;
        if (id.endsWith('indexedDbHelper')) return { idb: { get: async () => { stats.localReads++; return null; } } };
        if (id.endsWith('secureStorage')) return { loadSecureData: () => null, saveSecureData: () => {} };
        if (id.endsWith('browserAccountStorage')) return { browserAccountStorage: local, getBrowserAccountScope: () => device };
        if (id.endsWith('supabaseClient')) return { supabase: {} };
        if (id.endsWith('recommendedModels')) return { RECOMMENDED_MODELS: [] };
        if (id.endsWith('/gemini')) return { ONRIVI_AI_MODELS: [] };
        if (id.endsWith('/resourceAICredentials')) return modules.credentials;
        return req(id);
      }, window, local, session, async () => { stats.fetches++; throw Error('unexpected local API'); });
    return exports;
  };
  modules.credentials = load('lib/ai/resourceAICredentials.ts');
  return { credentials: modules.credentials, client: load('lib/ai/client.ts'), prompts: load('lib/resourceJson.ts'), window, drive, stats };
}
(async () => {
  const shared = {};
  const first = computer(shared, 'pc-one');
  const fixtures = {
    google: { apiKey: 'AIza_TEST_ONLY', model: 'google-test', models: [{ id: 'google-test', name: 'Google test', family: 'Gemini' }] },
    openai: { apiKey: 'sk-TEST_ONLY', model: 'openai-test', models: [{ id: 'openai-test', name: 'OpenAI test', family: 'GPT' }] },
    anthropic: { apiKey: 'sk-ant-TEST_ONLY', model: 'claude-test', models: [{ id: 'claude-test', name: 'Claude test', family: 'Claude' }] },
  };
  for (const [provider, value] of Object.entries(fixtures)) await first.credentials.saveProviderResourceCredentials(provider, value, 'cloud display name');
  assert.ok(shared.cipher && !shared.cipher.includes('TEST_ONLY'), 'resource file must be encrypted');
  const second = computer(shared, 'pc-two');
  await second.credentials.loadResourceAICredentials('cloud display name');
  const connections = second.client.readConnections();
  for (const [provider, value] of Object.entries(fixtures)) {
    assert.equal(second.client.getProviderApiKey('pc-two', provider), value.apiKey);
    assert.equal(connections[provider].model, value.model);
    assert.deepEqual(connections[provider].models, value.models);
  }
  assert.equal(second.stats.fetches, 0);
  assert.equal(second.stats.localReads, 0);
  // Even Electron must use Drive when the selected resource is in Drive.
  second.window.electronAPI = { loadAICredentials: async () => { throw Error('wrong local IPC'); } };
  await second.credentials.loadResourceAICredentials('cloud display name');
  second.stats.failRead = true;
  const before = shared.cipher;
  await assert.rejects(second.credentials.loadResourceAICredentials(), /401/);
  await assert.rejects(second.credentials.saveProviderResourceCredentials('openai', { apiKey: 'sk-replacement' }), /401/);
  await assert.rejects(second.prompts.readResourceJson('ai_presets.json', undefined, 'cloud display name'), /401/);
  assert.equal(shared.cipher, before, 'a failed read must never overwrite the encrypted file');
  assert.equal(second.stats.localReads, 0, 'cloud authentication failure must not fall back to local files');
  second.stats.failRead = false;
  second.stats.failWrite = true;
  await assert.rejects(second.client.configureAI('pc-two', 'openai', 'sk-replacement'), /저장/);
  assert.equal(second.credentials.getProviderResourceApiKey('openai'), fixtures.openai.apiKey, 'failed save cannot advertise a replacement key');
  second.stats.failWrite = false;
  second.stats.token = '';
  await assert.rejects(second.credentials.loadResourceAICredentials(), /다시 연결/);
  second.stats.token = 'renewed-token';
  await second.credentials.loadResourceAICredentials();
  assert.equal(second.client.readConnections().anthropic.model, fixtures.anthropic.model);
  // An older request finishing after reconnection must not replace the current cache.
  let finishOld;
  second.drive.readDriveAICredentials = () => new Promise(resolve => { finishOld = resolve; });
  const older = second.credentials.loadResourceAICredentials();
  while (!finishOld) await Promise.resolve();
  second.drive.readDriveAICredentials = async () => shared.cipher;
  await second.credentials.loadResourceAICredentials();
  finishOld(null);
  await older;
  assert.equal(second.client.readConnections().openai.model, fixtures.openai.model);
  console.log('PASS: two-PC encrypted credential restoration for all providers, Drive-only routing, 401/write-failure protection, reconnect recovery and stale-load protection');
})().catch(error => { console.error(error); process.exitCode = 1; });
