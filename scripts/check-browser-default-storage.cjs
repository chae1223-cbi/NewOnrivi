const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve('frontend/package.json'));
const ts = req('typescript');
const mainSource = fs.readFileSync('frontend/src/components/MainEditorApp.tsx', 'utf8');
const guideStart = mainSource.indexOf('  useEffect(() => {', mainSource.indexOf('// 🌟 [전체사용자 공통 리소스 폴더 미설정 시 초기 안내 모달 트리거]'));
const guideEnd = mainSource.indexOf(']);', guideStart) + 3;
assert.ok(guideStart > 0 && guideEnd > guideStart);
const guideEffect = ts.transpileModule(mainSource.slice(guideStart, guideEnd), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function checkGuide(initial, updated) {
  let settings = initial, callback, open;
  Function('useEffect', 'mounted', 'getResourceSettings', 'resourceFolder', 'resourceFolderHandle', 'isDuplicateInstance', 'isRestrictedUser', 'licenseStatus', 'isDismissedGuide', 'setTimeout', 'clearTimeout', 'setIsResourceGuideModalOpen', guideEffect)(
    effect => effect(), true, () => settings, null, null, false, false, { isActivated: true, isExpired: false }, false,
    fn => { callback = fn; return 1; }, () => {}, value => { open = value; });
  if (updated) settings = updated;
  callback?.();
  return open;
}
assert.equal(checkGuide({ path: '참조파일' }), false, 'Configured resources close an existing guide despite pending React state');
assert.equal(checkGuide(null), true, 'Missing resources still offer manual setup');
assert.notEqual(checkGuide(null, { path: '참조파일' }), true, 'Delayed guide must recheck completed initialization');
const dir = path.resolve('.tmp/browser-default-storage-qa');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'loader.cjs'), `const ts=require(${JSON.stringify(req.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(dir, 'icons.js'), 'exports.Icon=()=>null;');
fs.writeFileSync(path.join(dir, 'drive.js'), 'exports.getSavedDriveToken=()=>null;exports.uploadDriveImage=()=>{throw Error("Unexpected Drive access");};');
fs.writeFileSync(path.join(dir,'dynamic.js'), `module.exports=()=>()=>require('react').createElement('div',{id:'mounted-editor'},window.qa.getBrowserAccountScope());`);
fs.writeFileSync(path.join(dir,'auth.js'), `exports.supabase={auth:{onAuthStateChange:callback=>{window.qaAuthChange=callback;return {data:{subscription:{unsubscribe(){}}}};},getSession:async()=>{if(window.qaAuthError)throw Error('test auth failure');return {data:{session:window.qaAuthOwner?{user:{id:window.qaAuthOwner}}:null},error:null};}}};`);
fs.writeFileSync(path.join(dir, 'entry.js'), `
  const React=require('react');
  const {createRoot}=require('react-dom/client');
  const {ResourceFolderLocation}=require(${JSON.stringify(path.resolve('frontend/src/components/ResourceFolderLocation.tsx'))});
  let locationRoot;
  window.renderResourceLocation=()=>{
    if(!locationRoot){const host=document.createElement('div');host.id='resource-location';document.body.append(host);locationRoot=createRoot(host);}
    locationRoot.render(React.createElement(ResourceFolderLocation,{environment:'local',folder:JSON.parse(localStorage.getItem('onrivi_resource_settings')).local.path}));
  };
  window.renderEditorPage=()=>{
    const Page=require(${JSON.stringify(path.resolve('frontend/src/app/editor/page.tsx'))}).default;
    const host=document.createElement('div');document.body.append(host);createRoot(host).render(React.createElement(Page));
  };
  window.qa={...require(${JSON.stringify(path.resolve('frontend/src/lib/browserDefaultStorage.ts'))}),
    ...require(${JSON.stringify(path.resolve('frontend/src/lib/browserAccountStorage.ts'))}),
    ...require(${JSON.stringify(path.resolve('frontend/src/lib/browserPickerStartIn.ts'))}),
    ...require(${JSON.stringify(path.resolve('frontend/src/lib/resourceMedia.ts'))}),
    ...require(${JSON.stringify(path.resolve('frontend/src/lib/indexedDbHelper.tsx'))})};
`);
async function main() {
  await new Promise((resolve, reject) => req('webpack')({ mode: 'development', entry: path.join(dir, 'entry.js'),
    output: { path: dir, filename: 'bundle.js' },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(dir, 'loader.cjs') }] },
    resolve: { extensions: ['.ts', '.tsx', '.js'], modules: [path.resolve('frontend/node_modules')], alias: {
      '@/components/icons/Icon': path.join(dir, 'icons.js'),
      './gdrive/googleDriveClient': path.join(dir, 'drive.js'),
      '@/lib/gdrive/googleDriveClient': path.join(dir, 'drive.js'),
      'next/dynamic': path.join(dir, 'dynamic.js'),
      '@/lib/supabaseClient': path.join(dir,'auth.js'),
      '@/components/MainEditorApp': path.join(dir, 'icons.js'),
      '@': path.resolve('frontend/src'),
    } },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/bundle.js' ? 'application/javascript; charset=utf-8' : 'text/html; charset=utf-8');
    response.end(request.url === '/bundle.js' ? fs.readFileSync(path.join(dir, 'bundle.js')) : '<script src="/bundle.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await req('playwright-core').chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url);
    await page.evaluate(async () => {
      await Promise.all([qa.initializeBrowserDefaultStorage(), qa.initializeBrowserDefaultStorage()]);
      const workspace = await qa.idb.get('rootFolderHandle');
      const file = await workspace.getFileHandle('테스트.md', { create: true });
      const writer = await file.createWritable(); await writer.write('# 그림책\n\n저장 확인'); await writer.close();
      await qa.saveResourceMedia(new Blob(['image bytes'], { type: 'image/png' }), '테스트.png');
    });
    await page.reload();
    const result = await page.evaluate(async () => {
      await qa.initializeBrowserDefaultStorage();
      const workspace = await qa.idb.get('rootFolderHandle');
      const resources = await qa.idb.get('resourceFolderHandle');
      const media = await resources.getDirectoryHandle('media');
      const profiles = await resources.getDirectoryHandle('profiles');
      const tree = await qa.scanDirectory(workspace);
      return { mode: localStorage.getItem('workspaceType'),
        permission: await workspace.queryPermission({ mode: 'readwrite' }),
        document: await (await (await workspace.getFileHandle('테스트.md')).getFile()).text(),
        image: await (await (await media.getFileHandle('테스트.png')).getFile()).text(),
        profiles: JSON.parse(await (await (await profiles.getFileHandle('userCssProfiles.json')).getFile()).text()).length,
        listed: tree.some(node => node.name === '테스트.md'),
        pickerStart: await qa.browserPickerStartIn(workspace),
      };
    });
    assert.equal(result.mode, 'browser'); assert.equal(result.permission, 'granted');
    assert.equal(result.document, '# 그림책\n\n저장 확인'); assert.equal(result.image, 'image bytes');
    assert.ok(result.profiles > 0); assert.equal(result.listed, true);
    assert.equal(result.pickerStart, undefined);
    const resetResult = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const previous = await root.getDirectoryHandle('PreviouslySelected', {create:true});
      const file = await previous.getFileHandle('keep.md', {create:true});
      const writer = await file.createWritable(); await writer.write('preserve old file'); await writer.close();
      await qa.idb.set('rootFolderHandle', previous);
      localStorage.setItem('rootFolder', JSON.stringify({name:'PreviouslySelected'}));
      for (const key of ['onrivi_workspace_path','onrivi_last_local_workspace_path','onrivi_last_local_root_folder','onrivi_last_local_workspace_type']) localStorage.setItem(key, 'old-workspace');
      const resourcesBefore = localStorage.getItem('onrivi_resource_settings');
      const folder = await qa.resetBrowserWorkspace();
      return {name:folder.name, persisted:(await qa.idb.get('rootFolderHandle')).name,
        resourcesPreserved:resourcesBefore === localStorage.getItem('onrivi_resource_settings'),
        oldFile:await (await file.getFile()).text(),
        backup:localStorage.getItem('onrivi_last_local_root_folder'),
      };
    });
    assert.equal(resetResult.name, '작업장'); assert.equal(resetResult.persisted, '작업장');
    assert.equal(resetResult.resourcesPreserved, true); assert.equal(resetResult.oldFile, 'preserve old file');
    assert.equal(resetResult.backup, null);
    await page.reload();
    await page.evaluate(() => qa.initializeBrowserDefaultStorage());
    assert.equal(await page.evaluate(async () => (await qa.idb.get('rootFolderHandle')).name), '작업장');
    await page.evaluate(() => window.renderResourceLocation());
    await page.waitForFunction(() => document.querySelector('#resource-location')?.textContent.includes('브라우저 내부 저장소 (OPFS)'), null, {timeout:5000}).catch(async error => {
      console.error({errors, text:await page.locator('#resource-location').textContent()}); throw error;
    });
    const locationText = await page.locator('#resource-location').textContent();
    assert.ok(locationText.includes('OnriviAuthor/참조파일'));
    assert.ok(locationText.includes('사이트 데이터를 삭제하면'));
    assert.ok(!locationText.includes('사용자가 직접 연결한'));
    await page.evaluate(() => {
      localStorage.setItem('onrivi_resource_settings', JSON.stringify({local:{kind:'browser',path:'ExternalFolder'}}));
      window.renderResourceLocation();
    });
    await page.waitForFunction(() => document.querySelector('#resource-location')?.textContent.includes('내 PC · 직접 연결한 폴더'));
    assert.ok(!(await page.locator('#resource-location').textContent()).includes('기본 저장소입니다'));
    for (const scenario of ['cloud', 'external', 'disconnected', 'desktop']) {
      const isolated = await browser.newContext(); const tab = await isolated.newPage(); await tab.goto(url);
      const state = await tab.evaluate(async scenario => {
        if (scenario === 'cloud') { localStorage.setItem('workspaceType', 'cloud'); localStorage.setItem('rootFolder', '{"name":"Cloud"}'); }
        if (scenario === 'external') { localStorage.setItem('rootFolder', '{"name":"MyFolder"}'); localStorage.setItem('onrivi_resource_settings', '{"local":{"kind":"browser","path":"MyResources"}}'); }
        if (scenario === 'disconnected') { localStorage.setItem('rootFolder', '{"name":"MyFolder"}'); localStorage.setItem('onrivi_resource_settings', '{"local":null}'); }
        if (scenario === 'desktop') window.electronAPI = {};
        const before = JSON.stringify({ ...localStorage });
        await qa.initializeBrowserDefaultStorage();
        return { unchanged: before === JSON.stringify({ ...localStorage }), handle: !!await qa.idb.get('rootFolderHandle') };
      }, scenario);
      assert.equal(state.unchanged, scenario !== 'disconnected', scenario); assert.equal(state.handle, false, scenario);
      if (scenario === 'disconnected') {
        assert.equal(await tab.evaluate(() => JSON.parse(localStorage.getItem('onrivi_resource_settings')).local.kind), 'browser');
        assert.equal(await tab.evaluate(async () => !!await qa.idb.get('resourceFolderHandle')), true);
      }
      await isolated.close();
    }
    assert.deepEqual(errors, []);
    // Same browser profile, separate editor pages/accounts; raw legacy storage
    // and OPFS files must not become an account's fallback destination.
    for (const [owner, contents] of [['account-a','A private document'],['account-b','B private document']]) {
      const tab = await context.newPage(); await tab.goto(url);
      const before = await tab.evaluate(async owner => {
        qa.activateBrowserAccount(owner);
        const restored = await qa.idb.get('rootFolderHandle');
        const draft = qa.browserAccountStorage.getItem('onrivi_tabs_session');
        const drive = qa.browserAccountStorage.getItem('onrivi_gdrive_access_token');
        await qa.initializeBrowserDefaultStorage();
        const workspace = await qa.idb.get('rootFolderHandle');
        const root = await navigator.storage.getDirectory();
        return {restored:!!restored,draft,drive,relative:await root.resolve(workspace)};
      }, owner);
      assert.equal(before.restored, false); assert.equal(before.draft, null);
      assert.equal(before.drive, null);
      assert.deepEqual(before.relative, ['OnriviAuthor','accounts',owner,'작업장']);
      await tab.evaluate(async contents => {
        const workspace = await qa.idb.get('rootFolderHandle');
        const file = await workspace.getFileHandle('same-name.md',{create:true});
        const writer=await file.createWritable();await writer.write(contents);await writer.close();
        qa.browserAccountStorage.setItem('onrivi_tabs_session',contents);
        qa.browserAccountStorage.setItem('onrivi_gdrive_access_token',contents);
        await qa.saveResourceMedia(new Blob([contents],{type:'image/png'}),'same-name.png');
      }, contents);
      await tab.close();
    }
    for (const [owner, contents] of [['account-a','A private document'],['account-b','B private document']]) {
      const tab=await context.newPage();await tab.goto(url);
      const restored=await tab.evaluate(async owner=>{
        qa.activateBrowserAccount(owner);await qa.initializeBrowserDefaultStorage();
        const workspace=await qa.idb.get('rootFolderHandle');
        const resources=await qa.idb.get('resourceFolderHandle');
        const media=await resources.getDirectoryHandle('media');
        return {document:await(await(await workspace.getFileHandle('same-name.md')).getFile()).text(),
          image:await(await(await media.getFileHandle('same-name.png')).getFile()).text(),
          draft:qa.browserAccountStorage.getItem('onrivi_tabs_session'),
          drive:qa.browserAccountStorage.getItem('onrivi_gdrive_access_token'),
          keys:qa.browserAccountStorage.keys()};
      },owner);
      assert.equal(restored.document,contents);assert.equal(restored.image,contents);assert.equal(restored.draft,contents);
      assert.equal(restored.drive,contents);assert.ok(restored.keys.includes('onrivi_tabs_session'));
      assert.ok(!restored.keys.some(key=>key.startsWith('onrivi:account:')));
      await tab.close();
    }
    assert.equal(await page.evaluate(async()=> (await qa.idb.get('rootFolderHandle')).name),'작업장');
    console.log('PASS: account A/B same-name document/image isolation, separate handles/drafts, account return and legacy preservation');
    const gate = await context.newPage(); await gate.goto(url);
    await gate.evaluate(()=>{window.qaAuthOwner='account-a';window.renderEditorPage();});
    await gate.waitForFunction(()=>document.querySelector('#mounted-editor')?.textContent==='account-a');
    await Promise.all([
      gate.waitForEvent('framenavigated'),
      gate.evaluate(()=>window.qaAuthChange('SIGNED_IN',{user:{id:'account-b'}})),
    ]);
    await gate.waitForLoadState();
    assert.equal(await gate.locator('#mounted-editor').count(),0);
    await gate.evaluate(()=>{window.qaAuthOwner='account-b';window.renderEditorPage();});
    await gate.waitForFunction(()=>document.querySelector('#mounted-editor')?.textContent==='account-b');
    await gate.close();
    const failedGate=await context.newPage();await failedGate.goto(url);
    await failedGate.evaluate(()=>{window.qaAuthError=true;window.renderEditorPage();});
    await failedGate.getByRole('status').filter({hasText:'계정 저장소를 준비하지 못했습니다'}).waitFor();
    assert.equal(await failedGate.locator('#mounted-editor').count(),0);
    await failedGate.close();
    console.log('PASS: actual editor route waits for account, reloads on auth change, and blocks mounting on session failure');
    console.log('PASS: real OPFS + IndexedDB initialization, document/image write and reload, explorer scan, default profiles, existing destination guards');
    await context.close();
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
