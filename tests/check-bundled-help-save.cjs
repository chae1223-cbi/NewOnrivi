const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('node:module').createRequire(path.resolve('frontend/package.json'))('typescript');
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const bundled = {};
Function('exports', compile(fs.readFileSync('frontend/src/lib/bundledDocument.ts', 'utf8')))(bundled);
const isBundledDocumentPath = bundled.isBundledDocumentPath;
const archive = 'C:\\Program Files\\Onrivi Author\\resources\\app.asar\\frontend\\out\\help\\00_시작하기.md';
assert.ok(isBundledDocumentPath(archive));
assert.ok(isBundledDocumentPath('/help/00_시작하기.md'));
assert.equal(isBundledDocumentPath('D:/notes/help/00_시작하기.md'), false);
assert.equal(isBundledDocumentPath('D:/app.asar.unpacked/notes.md'), false);
const source = fs.readFileSync('frontend/src/hooks/useEditorHandlers.ts', 'utf8');
const tree = ts.createSourceFile('handlers.ts', source, 99, true);
let callback;
function visit(node) { if (ts.isPropertyAssignment(node) && node.name.getText(tree) === 'save') callback = node.initializer.getText(tree); ts.forEachChild(node, visit); }
visit(tree); assert.ok(callback);
let rows = [{ id: 'help', name: '00_시작하기.md', path: archive, node: { path: archive, name: '00_시작하기.md' }, content: '# edited help', isModified: true }];
let copied = false, overwriteCalls = 0, cancel = true, overwrittenPath;
const context = {
  isBundledDocumentPath,
  window: { electronAPI: { saveFile: async target => { overwriteCalls++; overwrittenPath = target; return true; }, saveFileAs: async value => { assert.equal(value, '# edited help'); if (cancel) return null; copied = true; return { name: '내 도움말.md', path: 'D:/notes/내 도움말.md' }; } }, dispatchEvent: () => {} },
  licenseStatusRef: { current: { planName: 'REGULAR' } },
  tabsRef: { get current() { return rows; } }, activeTabIdRef: { current: 'help' },
  currentFileNodeRef: { current: rows[0].node }, currentFileNameRef: { current: rows[0].name },
  contentRef: { current: '# edited help' }, editorRef: { current: null },
  workspaceTypeRef: { current: 'local' }, rootFolderRef: { current: { path: 'D:/notes', name: 'D:/notes' } },
  profiles: [], activeProfileId: 'system-1', DEFAULT_PROFILE: { id: 'system-1', name: 'Default' },
  compactLegacyPrintMetadata: value => value, extractFrontmatter: () => ({ data: {} }), updateCssProfileInFrontmatter: value => value,
  setSaveStatus: () => {}, setCurrentFileNode: () => {}, setCurrentFileName: () => {}, updateContent: () => {},
  showToast: () => {}, reportClientLog: () => {}, triggerKnowledgeAutoSync: () => {},
  lastSavedContentRef: { current: '' }, refreshFileList: async () => {}, BROWSER_STORAGE_NAME: 'browser',
  setTabs: change => { rows = change(rows); }, setActiveTabId: () => {},
};
const output = {};
Function('exports', ...Object.keys(context), compile(`exports.save=${callback};`))(output, ...Object.values(context));
(async () => {
  await output.save();
  assert.equal(overwriteCalls, 0, 'canceling a copy must never write into app.asar');
  assert.equal(rows[0].isModified, true, 'canceled save keeps the edited buffer');
  cancel = false;
  await output.save();
  assert.ok(copied);
  assert.equal(overwriteCalls, 0);
  assert.equal(rows[0].path, 'D:/notes/내 도움말.md');
  assert.equal(rows[0].isModified, false);
  assert.equal(context.currentFileNodeRef.current.path, rows[0].path);
  await output.save();
  assert.equal(overwriteCalls, 1, 'the saved user copy must support ordinary Save afterward');
  rows = [{ id: 'help', name: 'linked.md', path: 'D:/workspace/sub/linked.md', node: { name: 'linked.md', path: 'D:/workspace/sub/linked.md' }, content: '# edited help' }];
  // Deliberately leave currentFileNodeRef pointing at the previous copy.
  await output.save();
  assert.equal(overwrittenPath, 'D:/workspace/sub/linked.md', 'linked document Save must use the active tab node, never a stale previous-file ref');
  const app = fs.readFileSync('frontend/src/components/MainEditorApp.tsx', 'utf8');
  const appTree = ts.createSourceFile('MainEditorApp.tsx', app, 99, true, ts.ScriptKind.TSX);
  for (const name of ['isBundledDocumentPath', 'clearMarkdownFormatting']) assert.ok(appTree.statements.some(n => ts.isImportDeclaration(n) && n.importClause?.namedBindings?.elements?.some(e => e.name.text === name)), `${name} must be an actual import, not a comment`);
  const block = app.slice(app.indexOf('    const effectiveFileNode = activeTab ?'));
  assert.ok(block.indexOf('isBundledDocumentPath(effectiveFileNode?.path)') < block.indexOf('setTimeout('), 'autosave must skip archive paths before scheduling a write');
  const native = {};
  Function('exports', compile(fs.readFileSync('frontend/src/lib/nativeDocumentPath.ts','utf8')))(native);
  const root = { name: 'Workspace display name', path: 'D:/workspace' };
  assert.equal(native.resolveNativeDocumentPath('sub/linked.md', root), 'D:/workspace/sub/linked.md');
  assert.equal(native.matchesLinkedDocument({ name: 'same.md', path: 'D:/workspace/a/same.md' }, 'D:/workspace/b/same.md', root), false);
  assert.equal(native.matchesLinkedDocument({ name: 'same.md', path: 'D:/workspace/a/same.md' }, './a/same.md', root), true);
  assert.equal(native.matchesLinkedDocument({ path: 'D:/workspace/a/same.md' }, 'file:///D:/workspace/b/../a/same.md', root), true);
  console.log('PASS: document links match exact locations, resolve workspace paths, and save to the active document despite a stale previous-file ref');
  console.log('PASS: installed help never overwrites app.asar; Ctrl+S opens Save As, cancel retains edits, a saved copy supports subsequent Save, autosave skips bundled files');
})().catch(error => { console.error(error); process.exitCode = 1; });
