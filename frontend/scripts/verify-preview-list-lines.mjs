import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../src/lib/editorUtils.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {preprocessMarkdownForPreview: process} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const fixtures = [
  '모집대상\n  - 기준\n  - 입주협약\n  - 본사\n  - 가점\n\n신청자격',
  '제목\n    - 첫째\n        - 하위\n    - 둘째',
  '  - 첫째\n  - 둘째\n끝\n  - 새 목록\n  - 다음',
  '---\ncss_profile: system-1\n---\n\n모집대상\n  - 기준\n  - 입주협약\n  - 본사'
];
for (const input of fixtures) {
  const result = process(input);
  const rendered = result.text.split('\n');
  assert.equal(rendered.length, result.lineMap.length);
  input.split('\n').forEach((line, index) => {
    const label = line.trim().replace(/^- /, '');
    if (!/^\s*- /.test(line)) return;
    const position = rendered.findIndex(row => row.includes(label));
    assert(position >= 0, label);
    assert.equal(result.lineMap[position], index + 1, label);
  });
}
console.log('Indented list source mapping: 4 fixtures passed');
