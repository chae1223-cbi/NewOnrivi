const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../../main.js'), 'utf8');
const start = source.indexOf('async function initializeDesktopResourceFolder(');
const end = source.indexOf('// 26. 로컬 보안 데이터', start);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'onrivi-desktop-'));
const handlers = {};
vm.runInNewContext(source.slice(start, end), {
  fs, path, console, app: { getPath: () => temp },
  ipcMain: { handle: (name, callback) => { handlers[name] = callback; } },
});
(async () => {
  const ensure = handlers['desktop:ensureLocalEnvironment'];
  const result = await ensure(null, { profiles: [{ id: 'system-1' }] });
  assert.equal(result.success, true);
  assert.equal(result.workspacePath, path.join(temp, 'OnriviAuthor', '작업장'));
  for (const dir of ['profiles', 'prompt', 'bible', 'media', 'db']) {
    assert.ok(fs.statSync(path.join(result.resourcePath, dir)).isDirectory());
  }
  const file = path.join(result.resourcePath, 'profiles', 'userCssProfiles.json');
  assert.equal(JSON.parse(fs.readFileSync(file))[0].id, 'system-1');
  fs.writeFileSync(file, '[{"id":"custom"}]');
  await ensure(null, { resourceFolder: result.resourcePath, profiles: [{ id: 'system-1' }] });
  assert.equal(JSON.parse(fs.readFileSync(file))[0].id, 'custom');
  const selected = path.join(temp, 'selected-assets');
  const configured = await ensure(null, { resourceFolder: selected });
  assert.equal(configured.resourcePath, selected);
  const restored = await ensure(null, {});
  assert.equal(restored.resourcePath, selected);
  // Read the real native profile handler against an existing user document.
  const readStart = source.indexOf('function resolveUserProfilesPath(');
  const readEnd = source.indexOf("ipcMain.handle('file:saveProfiles'", readStart);
  vm.runInNewContext(source.slice(readStart, readEnd), {
    fs, path, console, ipcMain: { handle: (name, callback) => { handlers[name] = callback; } },
  });
  assert.equal((await handlers['file:readProfiles'](null, result.resourcePath))[0].id, 'custom');
  assert.equal((await ensure(null, { resourceFolder: 'relative-folder' })).success, false);
  console.log('Desktop bootstrap: defaults, configured path, subfolders, seed and preservation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
