const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const file='frontend/src/components/MainEditorApp.tsx',source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let expression,keyHandler;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='dispatchCommand')expression=n.initializer.arguments[0].getText(tree);if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='handleGlobalKeyDown')keyHandler=n.initializer.getText(tree);ts.forEachChild(n,visit);}visit(tree);
const events=[],previewModeRef={current:'preview'};
const context={isRestrictedUser:false,previewModeRef,setPreviewFindReplaceMode:v=>events.push(['replaceMode',v]),setDirectEditEnabled:v=>events.push(['editing',v]),setIsPreviewFindOpen:v=>events.push(['open',v]),executingVisualSourceActionRef:{current:false},previewRef:{current:{querySelector:()=>null}},visualCommandRef:{current:command=>{events.push(['visual',command]);return true;}},showToast:()=>{},editorRef:{current:{focus:()=>events.push(['monacoFocus']),getPosition:()=>({})}},handlers:{find:()=>events.push(['monacoFind']),replace:()=>events.push(['monacoReplace']),undo:()=>events.push(['monacoUndo']),redo:()=>events.push(['monacoRedo'])}};
const dispatch=Function(...Object.keys(context),compile('const dispatch='+expression+';')+'return dispatch;')(...Object.values(context));
dispatch('FIND');assert.deepEqual(events.splice(0),[['replaceMode',false],['open',true]]);
dispatch('REPLACE');assert.deepEqual(events.splice(0),[['replaceMode',true],['editing',true],['open',true]]);
previewModeRef.current='both';dispatch('REPLACE');assert.deepEqual(events.splice(0),[['replaceMode',true],['editing',true],['open',true]]);
previewModeRef.current='edit';dispatch('FIND');assert.deepEqual(events.splice(0),[['monacoFocus'],['monacoFind']]);
dispatch('REPLACE');assert.deepEqual(events.splice(0),[['monacoFocus'],['monacoReplace']]);
dispatch('UNDO');assert.deepEqual(events.splice(0),[['monacoUndo']]);
dispatch('REDO');assert.deepEqual(events.splice(0),[['monacoRedo']]);
previewModeRef.current='preview';context.previewRef.current.querySelector=()=>({});
dispatch('UNDO');assert.deepEqual(events.splice(0),[['visual','UNDO']]);
dispatch('REDO');assert.deepEqual(events.splice(0),[['visual','REDO']]);
// Execute the exact first routing block before the visual editor's early return.
const firstBlock=keyHandler.slice(keyHandler.indexOf('{')+1,keyHandler.indexOf('// The visual editor owns'));
const route=Function('previewModeRef','navigator','dispatchCommand','e',compile(firstBlock));
previewModeRef.current='preview';
for(const [key,command] of [['f','FIND'],['h','REPLACE']]){
 let prevented=false;route(previewModeRef,{userAgent:'Windows'},value=>assert.equal(value,command),{ctrlKey:true,key,preventDefault:()=>prevented=true,stopPropagation:()=>{}});assert.equal(prevented,true);
}
console.log('PASS: menu find/replace and Ctrl+F/Ctrl+H route to document view before Monaco focus/visual shortcut guards; Markdown mode retains original handlers');
