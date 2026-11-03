const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const req = createRequire(path.resolve('frontend/package.json'));
const ts = req('typescript');
function load(file, overrides = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop:true } }).outputText;
  Function('exports', 'require', code)(exports, name => overrides[name] || req(name));
  return exports;
}
const media = load('frontend/src/lib/mediaMarkup.ts');
const bullet = load('frontend/src/lib/bulletNumberText.ts');
const api = load('frontend/src/lib/visualDocumentCodec.ts', { './mediaMarkup': media, './bulletNumberText': bullet });
const normalize = api.normalizeVisualMarkdownSpacing;
const bloated = '# 안내서' + '\n'.repeat(45) + '**활동명(별명)**을 입력합니다.';
assert.equal(normalize(bloated), '# 안내서\n\n**활동명(별명)**을 입력합니다.');
for (const source of [
  '일반\n\n문단\n\n\n다음',
  '끝\n\n\n\n\n',
  '---\n메타영역\n\n\n\ncss_profile: test\n---\n',
  '```text\na\n\n\n\nb\n```',
  '~~~text\na\n\n\n\nb\n~~~',
  '$$\na\n\n\n\nb\n$$',
  '<pre>\na\n\n\n\nb\n</pre>',
  '    code\n\n\n\n    more',
]) assert.equal(normalize(source), source, source);
assert.equal(normalize(bloated.replaceAll('\n', '\r\n')), normalize(bloated).replaceAll('\n', '\r\n'));
assert.equal(normalize(normalize(bloated)), normalize(bloated));
let source = bloated;
for (let i = 0; i < 5; i++) {
  const codec = api.createVisualDocumentCodec(source);
  source = codec.serialize(codec.doc);
  assert.equal(source, normalize(bloated));
}
function strongText(doc) {
  const result = [];
  doc.descendants(node => { if (node.isText && node.marks.some(mark => mark.type.name === 'strong')) result.push(node.text); });
  return result.join('');
}
for (const text of ['**활동명(별명)**을', '**제목:**입니다', '**첫째(예)**와 **둘째(예)**를']) {
  assert.ok(strongText(api.createVisualDocumentCodec(text).doc), text);
}
for (const text of ['\\*\\*활동명(별명)\\*\\*을', '`**활동명(별명)**을`', '```text\n**활동명(별명)**을\n```']) {
  assert.equal(strongText(api.createVisualDocumentCodec(text).doc), '', text);
}
async function main() {
  const { unified } = await import(pathToFileURL(req.resolve('unified')).href);
  const { default: parse } = await import(pathToFileURL(req.resolve('remark-parse')).href);
  const { remarkKoreanStrong } = load('frontend/src/lib/remarkKoreanStrong.ts');
  for (const [text, expected] of [['**활동명(별명)**을', 1], ['**제목:**입니다', 1], ['**첫째(예)**와 **둘째(예)**를', 2], ['\\*\\*활동명(별명)\\*\\*을', 0], ['`**활동명(별명)**을`', 0], ['```text\n**활동명(별명)**을\n```', 0]]) {
    const processor = unified().use(parse).use(remarkKoreanStrong);
    const tree = await processor.run(processor.parse(text), { value: text });
    let count = 0;
    const walk = node => { if (node.type === 'strong') count++; node.children?.forEach(walk); };
    walk(tree);
    assert.equal(count, expected, text);
  }
  console.log('PASS: blank-run cleanup, protected source, CRLF, repeated serialization, native and remark emphasis');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
