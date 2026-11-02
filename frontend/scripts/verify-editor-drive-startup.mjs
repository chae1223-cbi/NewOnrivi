import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/hooks/useEditorSettings.ts', import.meta.url), 'utf8');
const start = source.indexOf('      const rawSavedWorkspaceType =');
const end = source.indexOf('      setMounted(true);\n    };', start);
assert(start >= 0 && end > start);
const code = ts.transpileModule(`(async () => {${source.slice(start, end)}setMounted(true);})();`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
for (const route of ['saved-root', 'workspace-info', 'no-workspace']) {
  const state = { mounted: false, root: undefined };
  const saved = { workspaceType: 'cloud' };
  if (route === 'saved-root') saved.rootFolder = JSON.stringify({ type: 'GDRIVE', driveFolderId: 'workspace' });
  const sandbox = {
    localStorage: { getItem: key => saved[key] || null },
    detectedAddon: false, baseSettings: { previewMode: 'split' },
    setWorkspaceType: () => {}, setPreviewMode: () => {},
    setRootFolder: root => { state.root = root; },
    setMounted: value => { state.mounted = value; },
    getSavedWorkspaceInfo: () => route === 'workspace-info' ? { workspaceFolderId: 'workspace' } : null,
  };
  await vm.runInNewContext(code, sandbox);
  assert.equal(state.mounted, true, `${route}: profile loader must be enabled`);
  if (route !== 'no-workspace') assert.equal(state.root.driveFolderId, 'workspace');
}
console.log('PASS: editor startup enables profile loading for saved Drive root, workspace fallback, and missing workspace');
