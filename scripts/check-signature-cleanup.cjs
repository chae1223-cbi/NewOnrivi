const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const req = require('node:module').createRequire(path.resolve('frontend/package.json'));
const ts = req('typescript');
const exportsObject = {};
Function('exports', ts.transpileModule(fs.readFileSync('frontend/src/lib/signatureCleanup.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(exportsObject);
const { emptySignatureRanges, registerSignatureCleanup } = exportsObject;
const wrapper = '<div align="left">\n\n</div>';
assert.equal(emptySignatureRanges(wrapper).length, 1);
assert.equal(emptySignatureRanges('<div align="right"><p><br></p><span>&nbsp;</span></div>').length, 1);
for (const source of [
  '<div align="left">남아 있는 서명</div>',
  '<div align="left"><img src="stamp.png"></div>',
  '<div class="layout"></div>',
  '```html\n' + wrapper + '\n```',
  '`<div align="left"></div>`',
  '---\nexample: <div align="left"></div>\n---\n본문',
]) assert.equal(emptySignatureRanges(source).length, 0, source);
let content, listener, edits = 0, disposer;
const offset = position => {
  const lines = content.split('\n');
  return lines.slice(0, position.lineNumber - 1).reduce((size, line) => size + line.length + 1, 0) + position.column - 1;
};
const model = {
  getValue: () => content,
  getPositionAt: index => { const parts = content.slice(0,index).split('\n'); return {lineNumber: parts.length, column: parts.at(-1).length + 1}; },
  pushEditOperations: (_selections, operations) => {
    const ranges = operations.map(op => ({from:offset(op.range),to:offset({lineNumber:op.range.endLineNumber,column:op.range.endColumn}),text:op.text}));
    for (const range of ranges.reverse()) content = content.slice(0,range.from) + range.text + content.slice(range.to);
    edits++;
    listener({changes:[{rangeLength:1,text:'',rangeOffset:0}]});
  },
};
const editor = { getModel: () => model, getSelections: () => [], onDidChangeModelContent: fn => {listener=fn;return {dispose(){}};}, onDidDispose: fn => {disposer=fn;} };
class Range { constructor(lineNumber,column,endLineNumber,endColumn){Object.assign(this,{lineNumber,column,endLineNumber,endColumn});} }
registerSignatureCleanup(editor,{Range});
content='앞 문단\n\n'+wrapper+'\n\n뒤 문단';
listener({changes:[{rangeLength:40,text:'',rangeOffset:content.indexOf('>')+1}]});
assert.equal(content,'앞 문단\n\n\n\n뒤 문단');
assert.equal(edits,1,'cleanup reentrancy must not create an edit loop');
content=wrapper;
listener({isUndoing:true,changes:[{rangeLength:40,text:'',rangeOffset:20}]});
assert.equal(content,wrapper,'Undo must not immediately remove restored content');
listener({changes:[{rangeLength:0,text:wrapper,rangeOffset:0}]});
assert.equal(content,wrapper,'newly typed/pasted empty containers must not be removed');
content=wrapper+'\n\n'+wrapper;
const firstBody=wrapper.indexOf('>')+1;
listener({changes:[
  {rangeLength:80,text:'',rangeOffset:wrapper.length+2+80+firstBody},
  {rangeLength:80,text:'',rangeOffset:firstBody},
]});
assert.equal(content,'\n\n','multiple selections must map old offsets before removing both wrappers');
content=wrapper+'\n\n서명 내용이 남음';
const beforeEdits=edits;
listener({changes:[{rangeLength:1,text:'',rangeOffset:content.length}]});
assert.equal(edits,beforeEdits,'deleting unrelated text must preserve an existing empty container');
disposer();
console.log('PASS: source-editor deletion removes empty signature divs; nonempty signatures, images, code, metadata, insertion and undo remain intact');
