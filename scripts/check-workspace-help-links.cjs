const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const req = require('node:module').createRequire(path.resolve('frontend/package.json'));
const ts = req('typescript');
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const load = source => { const exports = {}; Function('exports', 'resolveDocumentLink', 'resolveWorkspaceHelpLink', compile(source))(exports, typeof native !== 'undefined' ? native.resolveDocumentLink : undefined, typeof native !== 'undefined' ? native.resolveWorkspaceHelpLink : undefined); return exports; };
const native = {}; Function('exports', compile(fs.readFileSync('frontend/src/lib/nativeDocumentPath.ts', 'utf8')))(native);
const workspace = 'D:/Developer/OnriviMarkDown/OnriviMarkDown';
const current = `${workspace}/frontend/public/help/HELP-01_온리비_어서_소개와_시작하기.md`;
const expected = `${workspace}/frontend/public/help/00_시작하기.md`;
assert.equal(native.resolveWorkspaceHelpLink('/help/00_시작하기.md', current), expected);
assert.equal(native.resolveWorkspaceHelpLink('help/00_시작하기.md', current), expected);
assert.equal(native.resolveWorkspaceHelpLink('./00_시작하기.md', current), './00_시작하기.md');
assert.equal(native.resolveWorkspaceHelpLink('/help/00_시작하기.md', `${workspace}/notes.md`), '/help/00_시작하기.md');

function extract(file, find) {
  const source = fs.readFileSync(file, 'utf8'), tree = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.TSX);
  let result;
  function visit(node) { if (find(node, tree)) result = node.getText(tree); ts.forEachChild(node, visit); }
  visit(tree); assert.ok(result, file); return result;
}
// Exercise both real document-view link resolvers, not a duplicate of their logic.
const markdown = load('exports.resolve=' + extract('frontend/src/components/MarkdownViewer.tsx', n => ts.isArrowFunction(n) && ts.isVariableDeclaration(n.parent) && n.parent.name.getText() === 'resolveRelativeImagePath'));
const visualSource = extract('frontend/src/components/VisualDocumentEditor.tsx', n => ts.isFunctionDeclaration(n) && n.name?.text === 'resolveDocPath');
const visual = load(visualSource + '\nexports.resolve=resolveDocPath;');
assert.equal(markdown.resolve('./00_시작하기.md', current), expected);
assert.equal(visual.resolve('./00_시작하기.md', current), expected);
for (const from of ['frontend/public/help/00_시작하기.md',current]) {
  const target='frontend/public/help/HELP-01_온리비_어서_소개와_시작하기.md';
  const resolved=native.resolveDocumentLink(target,from);
  assert.equal((resolved.match(/frontend\/public\/help/g)||[]).length,1,resolved);
  assert.equal(native.resolveDocumentLink('./'+target,from),resolved);
}


const main = fs.readFileSync('main.js', 'utf8'), tree = ts.createSourceFile('main.js', main, 99, true);
function handler(name) {
  let callback;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'ipcMain.handle' && node.arguments[0]?.text === name) callback = node.arguments[1].getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(callback); return compile(`exports.run=${callback};`);
}
const norm = value => path.win32.normalize(value).toLowerCase();
const appPath = 'C:/Program Files/Onrivi Author/resources/app.asar';
const bundled = `${appPath}/frontend/out/help/00_시작하기.md`;
const files = new Map([[norm(expected), 'workspace source'], [norm(current), 'workspace chapter'], [norm(bundled), 'installed source']]);
const writes = [];
const fakeFs = {
  existsSync: target => files.has(norm(target)) || norm(target) === norm(workspace),
  promises: { readFile: async target => { assert.ok(files.has(norm(target)), target); return files.get(norm(target)); } },
  writeFileSync: (target, value) => { writes.push(norm(target)); files.set(norm(target), value); },
};
function ipc(name) {
  const exports = {};
  Function('exports', 'fs', 'path', 'app', 'process', 'currentActiveWorkspacePath', 'findFileRecursive', 'require', 'console', handler(name))(
    exports, fakeFs, path.win32, { getAppPath: () => appPath }, { resourcesPath: 'C:/Program Files/Onrivi Author/resources' }, workspace,
    () => '', () => ({ externalizeInlineImages: source => source }), { warn() {}, error() {} });
  return exports.run;
}
(async () => {
  const read = ipc('file:readFromPath'), save = ipc('file:save');
  const opened = await read(null, native.resolveWorkspaceHelpLink('/help/00_시작하기.md', current));
  assert.equal(norm(opened.path), norm(expected));
  assert.equal(opened.content, 'workspace source');
  assert.equal((await read(null, 'file:///' + encodeURI(expected))).content, 'workspace source');
  await save(null, opened.path, 'edited workspace source');
  assert.deepEqual(writes, [norm(expected)], 'normal Save must write directly to the workspace original');
  assert.equal(files.get(norm(bundled)), 'installed source');
  await assert.rejects(read(null, `${workspace}/missing/help/00_시작하기.md`), /파일을 찾을 수 없습니다/);
  await assert.rejects(read(null, 'missing/help/00_시작하기.md'), /파일을 찾을 수 없습니다/);
  const helpCenter = await read(null, 'help/00_시작하기.md');
  assert.equal(helpCenter.content, 'installed source', 'explicit built-in Help remains available');
  // Follow the desktop UI path through workspace validation, the actual hook,
  // and the actual Electron read handler (with a virtual filesystem).
  const guardCode=extract('frontend/src/components/MarkdownViewer.tsx',n=>ts.isFunctionDeclaration(n)&&n.name?.text==='isPathInsideWorkspace');
  const guard=load(guardCode).isPathInsideWorkspace;
  const hook=extract('frontend/src/hooks/useFileExplorer.ts',n=>ts.isVariableDeclaration(n)&&n.name.getText()==='handleFileOpenByPath');
  let desktopOpened, currentNode;
  const root={name:workspace,path:workspace};
  const context={...native,window:{electronAPI:{readFromPath:target=>read(null,target)},location:{hostname:''}},
    rootFolder:root,rootFolderRef:{current:root},workspaceType:'local',fileList:[],
    tabsRef:{current:[{id:'source',name:path.win32.basename(current),path:current,content:'chapter'}]},activeTabIdRef:{current:'source'},currentFileNode:{path:current},helpContentRef:{current:null},
    getExternalFileHandle:async()=>null,
    createNewTab:(content,name,modified,target,node)=>{desktopOpened={content,path:target,node};},
    setCurrentFileNode:node=>{currentNode=node;},setCurrentFileName:()=>{},showToast:message=>{throw Error(message);},
  };
  const hookExports={};
  Function('exports',...Object.keys(context),compile(hook+'\nexports.open=handleFileOpenByPath;'))(hookExports,...Object.values(context));
  for(const href of ['./00_시작하기.md','frontend/public/help/00_시작하기.md']){
    const target=visual.resolve(href,current);
    const checked=guard(target,current,workspace,path.win32.basename(workspace));
    assert.equal(checked.isInside,true);
    assert.equal(norm(checked.resolvedPath),norm(expected));
    await hookExports.open(checked.resolvedPath,undefined,true);
    assert.equal(norm(desktopOpened.path),norm(expected));
    assert.equal(norm(currentNode.path),norm(expected));
    assert.equal(desktopOpened.content,'edited workspace source');
    await save(null,currentNode.path,'edited workspace source');
  }
  console.log('PASS: desktop visual link -> workspace guard -> file explorer -> Electron read/save uses the workspace original');
  const outside='E:/외부 문서/00_시작하기.md';
  files.set(norm(outside),'explicit external document');
  const desktopGuard={};
  Function('exports','resolveDocumentLink','resolveWorkspaceHelpLink','window',compile(guardCode))(desktopGuard,native.resolveDocumentLink,native.resolveWorkspaceHelpLink,context.window);
  assert.equal(guard(outside,current,workspace,'OnriviMarkDown').isInside,false,'web workspace boundary remains enforced');
  assert.equal(desktopGuard.isPathInsideWorkspace(outside,current,workspace,'OnriviMarkDown').isInside,true);
  await hookExports.open(outside,undefined,true);
  assert.equal(norm(desktopOpened.path),norm(outside));
  assert.equal(desktopOpened.content,'explicit external document');
  const buildTarget=extract('frontend/src/components/MainEditorApp.tsx',n=>ts.isVariableDeclaration(n)&&n.name.getText()==='buildDocLinkTarget');
  const targetExports={};
  Function('exports','window','workspaceType','rootFolder','resolveNativeDocumentPath',compile(buildTarget+'\nexports.target=buildDocLinkTarget;'))(targetExports,context.window,'local',root,native.resolveNativeDocumentPath);
  assert.equal(targetExports.target({path:outside}),outside);
  assert.equal(targetExports.target({path:'frontend/public/help/00_시작하기.md'},'제목'),expected+'#제목');
  console.log('PASS: desktop creates absolute links and opens explicit files on another drive outside the workspace');
  console.log('PASS: both document views resolve workspace sibling links; legacy /help URLs stay in the source folder; actual Electron read/save handlers write workspace originals; missing files never switch to installed namesakes');
})().catch(error => { console.error(error); process.exitCode = 1; });
