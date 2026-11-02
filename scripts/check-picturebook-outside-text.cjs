const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('node:module').createRequire(path.resolve('frontend/package.json'))('typescript');
const code = ts.transpileModule(fs.readFileSync('frontend/src/lib/picturebook.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const exportsObject = {};
const frontmatter = {};
Function('exports', ts.transpileModule(fs.readFileSync('frontend/src/lib/frontmatter.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText)(frontmatter);
Function('exports','require',code)(exportsObject, () => frontmatter);
const { parseBookScenes } = exportsObject;
const scene = title => `:::scene\n![그림](media/scene.png)\n${title}\n:::`;
const clean = parseBookScenes(scene('본문') + '\n\n[image]: media/a.png');
assert.equal(clean.outsideBlocks.length,0); assert.equal(clean.errors.length,0);
const source = '처음 밖에 있는 글\n' + scene('장면 안') + '\n중간의 잘못된 글\n\n두 번째 잘못된 문단\n' + scene('둘째') + '\n마지막에 벗어난 글';
const result = parseBookScenes(source, 7);
assert.equal(result.outsideBlocks.length,3);
assert.equal(result.outsideBlocks[0].location,'첫 장면 앞');
assert.equal(result.outsideBlocks[0].startLine,8);
assert.equal(result.outsideBlocks[1].location,'장면 1과 장면 2 사이');
assert.ok(result.outsideBlocks[1].text.includes('\n\n'));
assert.equal(result.outsideBlocks[2].location,'마지막 장면(장면 2) 뒤');
for (const block of result.outsideBlocks) {
  assert.equal(source.split('\n')[block.startLine - 8],block.text.split('\n')[0]);
  assert.ok(result.errors.some(error => error.includes(block.location) && error.includes('원문 ' + block.startLine)));
}
assert.equal(parseBookScenes('본문만 있음').outsideBlocks[0].location,'장면으로 묶이지 않은 본문');
const fenced = parseBookScenes('```\n:::scene\n```\n' + scene('정상'));
assert.equal(fenced.scenes.length,1);
assert.ok(fenced.outsideBlocks[0].text.includes(':::scene'));
assert.ok(!result.outsideBlocks.some(block => block.text.includes('장면 안')));
const metadata = '---\n메타영역\n#서식설정\ncss_profile: profile-book-123\ncss_profile_name: "그림책"\n---\n';
assert.equal(parseBookScenes(metadata + scene('정상 본문')).outsideBlocks.length,0);
const copied = parseBookScenes('**텍스트**' + metadata + '\n>\n메타영역\n#서식설정\ncss_profile: profile-book-123\n---\n' + scene('정상 본문'));
assert.equal(copied.outsideBlocks.length,1);
assert.equal(copied.outsideBlocks[0].text,'**텍스트**');
assert.equal(copied.outsideBlocks[0].startLine,1);
assert.ok(!copied.errors.join('').includes('css_profile'));
const editable = '**텍스트**' + metadata + scene('장면 유지');
const diagnosed = parseBookScenes(editable).outsideBlocks[0];
assert.equal(exportsObject.replaceOutsideBookText(editable,diagnosed,''),metadata + scene('장면 유지'));
const edited = exportsObject.replaceOutsideBookText(editable,diagnosed,'고친 본문');
assert.ok(edited.startsWith('고친 본문' + metadata));
assert.ok(edited.endsWith(scene('장면 유지')));
const actual = parseBookScenes(metadata + '실제 밖에 있는 글\n' + scene('정상 본문'));
assert.equal(actual.outsideBlocks[0].startLine,7);
assert.equal(actual.outsideBlocks[0].text,'실제 밖에 있는 글');
const literalMetadata = parseBookScenes('```\n' + metadata + '```\n' + scene('정상'));
assert.ok(literalMetadata.outsideBlocks[0].text.includes('css_profile'));
console.log('PASS: leading/between/trailing outside text, original line offsets, excerpts, complete paragraphs, reference definitions and fenced markers');
