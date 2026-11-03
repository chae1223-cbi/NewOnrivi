const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const source=fs.readFileSync('frontend/src/components/MenuBar.tsx','utf8'),tree=ts.createSourceFile('menu.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let items;
function visit(node){if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&node.tagName.getText(tree)==='MenuDropdown'){
 const attrs=node.attributes.properties;const label=attrs.find(a=>a.name?.getText(tree)==='label');
 if(label?.initializer?.getText(tree)==="{t('edit')}")items=attrs.find(a=>a.name?.getText(tree)==='items').initializer.expression.getText(tree);
}ts.forEachChild(node,visit);}visit(tree);assert.ok(items);
const compiled=ts.transpileModule('exports.items='+items,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const commands=[];
function evaluate(isRestrictedUser,activeTabId){const result={};Function('exports','require','Icon','t','dispatch','isRestrictedUser','activeTabId',compiled)(result,req,()=>null,key=>key,value=>commands.push(value),isRestrictedUser,activeTabId);return result.items;}
const enabled=evaluate(false,'document');
for(const label of ['undo','redo']){const item=enabled.find(item=>item.label===label);assert.equal(item.disabled,false);item.onClick();}
assert.deepEqual(commands,['UNDO','REDO']);
assert.equal(enabled.some(item=>item.label?.includes('이모지')||item.label?.includes('날짜')),false);
assert.equal(evaluate(true,'document').find(item=>item.label==='undo').disabled,true);
assert.equal(evaluate(false,null).find(item=>item.label==='redo').disabled,true);
console.log('PASS: actual Edit menu enables document undo/redo, preserves no-document/read-only guards and removes only requested menu entries');
