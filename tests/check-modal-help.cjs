const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const req = require('node:module').createRequire(path.resolve('frontend/package.json'));
const ts = req('typescript');
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const source = file => fs.readFileSync(`frontend/src/${file}`, 'utf8');
const window = new EventTarget();
const effects = [];
const hooks = {};
Function('exports', 'require', 'window', transpile(source('hooks/useModalEscape.ts')))(hooks, () => ({ useRef: current => ({ current }), useEffect: fn => effects.push(fn()) }), window);
let parent = 0, child = 0;
hooks.useModalEscape(true, () => parent++);
hooks.useModalEscape(true, () => child++);
function escape() { const event = new Event('keydown', { cancelable: true }); event.key = 'Escape'; window.dispatchEvent(event); assert.equal(event.defaultPrevented, true); }
escape(); assert.equal(child, 1); assert.equal(parent, 0);
effects.pop()();
escape(); assert.equal(parent, 1);
effects.pop()();
console.log('PASS: Escape closes only the latest open modal and restores the parent handler after cleanup');

const help = ts.createSourceFile('HelpModal.tsx', source('components/HelpModal.tsx'), 99, true, ts.ScriptKind.TSX);
let save;
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(help) === 'saveDocumentCopy') save = node.initializer.getText(help); ts.forEachChild(node, visit); }
visit(help); assert.ok(save);
const raw = '---\ncss_profile: onrivi-help\n---\n\n# 도움말 원문\n';
let message = '', saved, written;
const saveHandler = (window, currentDoc = 'HELP-01_예시.md') => Function('window', 'currentDoc', 'rawContent', 'setSaveMessage', transpile(`return (${save});`))(window, currentDoc, raw, value => { message = value; });
(async () => {
  await saveHandler({ electronAPI: { saveFileAs: async (...args) => { saved = args; return { path: 'copy.md' }; } } })();
  assert.deepEqual(saved, [raw, 'HELP-01_예시.md']);
  assert.match(message, /저장했습니다/);
  message = '';
  await saveHandler({ electronAPI: { saveFileAs: async () => null } })();
  assert.equal(message, '', 'canceling save must not report success');
  await saveHandler({ showSaveFilePicker: async () => ({ createWritable: async () => ({ write: async value => { written = value; }, close: async () => {} }) }) })();
  assert.equal(written, raw, 'browser save must retain frontmatter and the selected help chapter');
  await saveHandler({ showSaveFilePicker: async () => { throw Error('permission'); } })();
  assert.match(message, /저장하지 못했습니다/);
  const clean = {};
  Function('exports', transpile(source('lib/clearMarkdownFormatting.ts')))(clean);
  const result = clean.clearMarkdownFormatting('<div align="right">**첫째**</div><div>~~둘째~~</div>');
  assert.equal(result, '첫째\n\n둘째\n\n');
  assert.match(clean.clearMarkdownFormatting('<division>남김</division>'), /<division>/, 'unrelated tag names must not match div');
  console.log('PASS: help copy saves selected raw Markdown on desktop/browser, cancel/error handling and div formatting cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
