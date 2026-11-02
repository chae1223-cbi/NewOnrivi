const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const source=fs.readFileSync('frontend/src/components/MainEditorApp.tsx','utf8');
const tree=ts.createSourceFile('MainEditorApp.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='applyLinePrefix')fn=node.getText(tree);ts.forEachChild(node,visit);}
visit(tree);assert.ok(fn);
const code=ts.transpileModule('const '+fn+'; return applyLinePrefix;', {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
function convert(input,kind='orderedList'){
 const lines=input.split('\n');
 const model={getLineContent:number=>lines[number-1]};
 const editor={getSelection:()=>({startLineNumber:1,endLineNumber:lines.length,isEmpty:()=>false}),getModel:()=>model,
 pushUndoStop(){},focus(){},layout(){},executeEdits(_name,edits){for(const edit of edits){const range=edit.range;const line=lines[range.startLineNumber-1];lines[range.startLineNumber-1]=line.slice(0,range.startColumn-1)+edit.text+line.slice(range.endColumn-1);}}};
 class Range{constructor(startLineNumber,startColumn,endLineNumber,endColumn){Object.assign(this,{startLineNumber,startColumn,endLineNumber,endColumn});}}
 Function('editorRef','lastSelectionRef','window','setTimeout',code)({current:editor},{current:null},{monaco:{Range}},()=>{})(kind);
 return lines.join('\n');
}
assert.equal(convert('1. 가나다\n2. 2\\. 라마바\n   3. 아자차\n   4. 타파하'),'1. 가나다\n2. 라마바\n3. 아자차\n4. 타파하');
assert.equal(convert('1\\. 가나다\n\n2\\. 라마바\n\n3\\. 아자차\n\n4\\. 타파하'),'1. 가나다\n\n2. 라마바\n\n3. 아자차\n\n4. 타파하');
assert.equal(convert('- [ ] 1\\. **가나다**\n- [x] 2\\. [라마바](https://example.com)'),'1. **가나다**\n2. [라마바](https://example.com)');
assert.equal(convert('1\\. 가나다\n2\\. 라마바','list'),'- 1\\. 가나다\n- 2\\. 라마바');
console.log('PASS: actual Markdown toolbar conversion consumes escaped ordinals, removes stray indentation, skips blank lines, and preserves bold/links and bullet text');
