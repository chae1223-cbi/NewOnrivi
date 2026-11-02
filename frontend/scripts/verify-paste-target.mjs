import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../src/hooks/editor/useMonacoSetup.ts', import.meta.url), 'utf8');
const start = source.indexOf('                  const handledPasteEvents =');
const end = source.indexOf("                  container?.addEventListener('paste'", start);
assert(start >= 0 && end > start);
class NodeMock {}
const editorInput = new NodeMock();
const jsonInput = new NodeMock();
const promptInput = new NodeMock();
let calls = 0;
const context = {
  Node: NodeMock, WeakSet,
  editorDom: { contains: node => node === editorInput },
  depsRef: { current: { handleEditorPaste: () => { calls++; } } },
};
const code = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code + '\nglobalThis.paste = onEditorPaste;', context);
for (const target of [jsonInput, promptInput, null]) context.paste({ target });
assert.equal(calls, 0, 'modal inputs must keep native paste');
const event = { target: editorInput };
context.paste(event);
context.paste(event);
assert.equal(calls, 1, 'editor paste must execute once across capture listeners');
console.log('PASS: JSON/prompt paste ignored by editor; editor paste handled once');
