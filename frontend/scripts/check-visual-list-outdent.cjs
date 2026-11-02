const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { EditorState, TextSelection } = require('prosemirror-state');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText;
  module._compile(output, filename);
};

const { visualSchema } = require(path.join(__dirname, '../src/lib/visualDocumentCodec.ts'));
const { independentLiftListItem, independentIndentListItem } = require(path.join(__dirname, '../src/lib/visualListCommands.ts'));
const n = visualSchema.nodes;
const paragraph = text => n.paragraph.create(null, visualSchema.text(text));
const item = (text, checked = null, nested) => n.list_item.create({ checked }, nested ? [paragraph(text), nested] : [paragraph(text)]);

function outdent(doc, text) {
  let position = -1;
  doc.descendants((node, pos) => { if (node.isText && node.text === text) position = pos; });
  assert.ok(position >= 0);
  const state = EditorState.create({ schema: visualSchema, doc, selection: TextSelection.create(doc, position + 1) });
  let transaction;
  const handled = independentLiftListItem(state, tr => { transaction = tr; });
  return { handled, doc: transaction?.doc ?? doc };
}

for (const list of [
  n.bullet_list.create(null, [item('bullet')]),
  n.bullet_list.create(null, [item('check', false)]),
  n.ordered_list.create({ order: 3 }, [item('numbered')]),
]) {
  const doc = n.doc.create(null, [list]);
  const result = outdent(doc, list.textContent);
  assert.equal(result.handled, true);
  assert.ok(result.doc.eq(doc), 'top-level list marker must remain unchanged');
}

for (const [outerType, nested] of [
  [n.bullet_list, n.bullet_list.create(null, [item('child')])],
  [n.bullet_list, n.bullet_list.create(null, [item('child', false)])],
  [n.ordered_list, n.ordered_list.create({ order: 2 }, [item('child')])],
]) {
  const nestedDoc = n.doc.create(null, [outerType.create(null, [item('parent', null, nested)])]);
  const moved = outdent(nestedDoc, 'child');
  assert.equal(moved.handled, true);
  assert.equal(moved.doc.child(0).childCount, 2);
  assert.equal(moved.doc.child(0).type, outerType);
  assert.equal(moved.doc.child(0).child(1).textContent, 'child');
  assert.equal(moved.doc.child(0).child(1).attrs.checked, nested.firstChild.attrs.checked);
}

const indentedDoc = n.doc.create(null, [n.bullet_list.create({ indentPx: 28 }, [item('indented')])]);
const indented = outdent(indentedDoc, 'indented');
assert.equal(indented.handled, true);
assert.equal(indented.doc.child(0).type, n.bullet_list);
assert.equal(indented.doc.child(0).attrs.indentPx, null);

for (const [outer, inner] of [
  [n.bullet_list, n.bullet_list],
  [n.bullet_list, n.ordered_list],
  [n.ordered_list, n.bullet_list],
]) {
  const deep = inner.create(null, [item('child', null, n.bullet_list.create(null, [item('grandchild')]))]);
  const doc = n.doc.create(null, [outer.create(null, [item('parent', null, deep), item('following')])]);
  const moved = outdent(doc, 'parent');
  assert.equal(moved.handled, true);
  assert.equal(moved.doc.child(0).child(0).textContent, 'parent');
  assert.equal(moved.doc.child(1).type, inner);
  assert.equal(moved.doc.child(1).child(0).textContent, 'childgrandchild');
  assert.equal(moved.doc.child(2).child(0).textContent, 'following');
}

const selectedNested = n.bullet_list.create(null, [
  item('first'),
  item('second', null, n.bullet_list.create(null, [
    item('third', null, n.bullet_list.create(null, [item('fourth')]))
  ])),
]);
const selectedDoc = n.doc.create(null, [selectedNested]);
let firstPos = -1, lastPos = -1;
selectedDoc.descendants((node, pos) => {
  if (node.isText && node.text === 'first') firstPos = pos;
  if (node.isText && node.text === 'fourth') lastPos = pos;
});
const selectedState = EditorState.create({ schema: visualSchema, doc: selectedDoc,
  selection: TextSelection.create(selectedDoc, firstPos, lastPos + 'fourth'.length) });
let selectedTr;
assert.equal(independentLiftListItem(selectedState, tr => { selectedTr = tr; }), true);
assert.ok(selectedTr);
assert.deepEqual(Array.from({ length: selectedTr.doc.childCount }, (_, index) => selectedTr.doc.child(index).textContent),
  ['firstsecond', 'thirdfourth']);
assert.equal(selectedTr.doc.child(0).childCount, 2);
assert.equal(selectedTr.doc.child(1).child(0).child(1).child(0).textContent, 'fourth');
assert.equal(selectedTr.selection.empty, false);
assert.equal(selectedTr.doc.textBetween(selectedTr.selection.from, selectedTr.selection.to).includes('fourth'), true);
assert.equal(selectedTr.doc.textBetween(selectedTr.selection.from, selectedTr.selection.to).includes('first'), true);

let secondPos = -1;
selectedDoc.descendants((node, pos) => { if (node.isText && node.text === 'second') secondPos = pos; });
const parentOnlyState = EditorState.create({ schema: visualSchema, doc: selectedDoc,
  selection: TextSelection.create(selectedDoc, firstPos, secondPos + 'second'.length) });
let parentOnlyTr;
assert.equal(independentLiftListItem(parentOnlyState, tr => { parentOnlyTr = tr; }), true);
assert.equal(parentOnlyTr, undefined, 'unselected child list must stay nested');

const indentDoc = n.doc.create(null, [n.bullet_list.create(null, [
  item('first'), item('second'), item('third', null, n.bullet_list.create(null, [item('fourth')]))
])]);
let indentStart = -1, indentEnd = -1;
indentDoc.descendants((node, pos) => {
  if (node.isText && node.text === 'first') indentStart = pos;
  if (node.isText && node.text === 'fourth') indentEnd = pos + node.text.length;
});
const indentState = EditorState.create({ schema: visualSchema, doc: indentDoc,
  selection: TextSelection.create(indentDoc, indentStart, indentEnd) });
let indentTr;
assert.equal(independentIndentListItem(indentState, tr => { indentTr = tr; }), true);
assert.ok(indentTr);
assert.equal(indentTr.doc.child(0).childCount, 3);
assert.equal(indentTr.doc.child(0).attrs.indentPx, 28);
assert.equal(indentTr.doc.child(0).textContent, 'firstsecondthirdfourth');
assert.equal(indentTr.selection.empty, false);
let oldDepth = -1, newDepth = -1;
indentDoc.descendants((node, pos) => { if (node.isText && node.text === 'fourth') oldDepth = indentDoc.resolve(pos).depth; });
indentTr.doc.descendants((node, pos) => { if (node.isText && node.text === 'fourth') newDepth = indentTr.doc.resolve(pos).depth; });
assert.equal(newDepth, oldDepth, 'selected subtree structure must stay intact');

const partialDoc = n.doc.create(null, [n.bullet_list.create(null, [
  item('outside-before'), item('selected-one'), item('selected-two'), item('outside-after')
])]);
let partialFrom = -1, partialTo = -1;
partialDoc.descendants((node, pos) => {
  if (node.isText && node.text === 'selected-one') partialFrom = pos;
  if (node.isText && node.text === 'selected-two') partialTo = pos + node.text.length;
});
const partialState = EditorState.create({ schema: visualSchema, doc: partialDoc,
  selection: TextSelection.create(partialDoc, partialFrom, partialTo) });
let partialTr;
assert.equal(independentIndentListItem(partialState, tr => { partialTr = tr; }), true);
assert.deepEqual(Array.from({ length: partialTr.doc.childCount }, (_, index) => partialTr.doc.child(index).textContent),
  ['outside-before', 'selected-oneselected-two', 'outside-after']);
assert.deepEqual(Array.from({ length: partialTr.doc.childCount }, (_, index) => partialTr.doc.child(index).attrs.indentPx),
  [null, 28, null]);
assert.equal(partialTr.selection.empty, false);

for (const [listType, attrs, checked] of [
  [n.bullet_list, null, false],
  [n.ordered_list, { order: 4 }, null],
]) {
  const doc = n.doc.create(null, [listType.create(attrs, [
    item('before', checked), item('chosen', checked), item('after', checked)
  ])]);
  let from = -1;
  doc.descendants((node, pos) => { if (node.isText && node.text === 'chosen') from = pos; });
  const state = EditorState.create({ schema: visualSchema, doc,
    selection: TextSelection.create(doc, from, from + 'chosen'.length) });
  let tr;
  assert.equal(independentIndentListItem(state, next => { tr = next; }), true);
  assert.deepEqual(Array.from({ length: tr.doc.childCount }, (_, index) => tr.doc.child(index).textContent),
    ['before', 'chosen', 'after']);
  assert.deepEqual(Array.from({ length: tr.doc.childCount }, (_, index) => tr.doc.child(index).attrs.indentPx),
    [null, 28, null]);
  assert.deepEqual(Array.from({ length: tr.doc.childCount }, (_, index) => tr.doc.child(index).firstChild.attrs.checked),
    [checked, checked, checked]);
  if (listType === n.ordered_list) assert.deepEqual(
    Array.from({ length: tr.doc.childCount }, (_, index) => tr.doc.child(index).attrs.order), [4, 5, 6]);
  assert.equal(tr.selection.empty, false);
}

process.stdout.write('Tab/Shift+Tab list selection checks passed\n');
