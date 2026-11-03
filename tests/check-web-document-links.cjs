const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('node:module').createRequire(path.resolve('frontend/package.json'))('typescript');
const compile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const native = {}; Function('exports',compile(fs.readFileSync('frontend/src/lib/nativeDocumentPath.ts','utf8')))(native);
const viewerSource = fs.readFileSync('frontend/src/components/MarkdownViewer.tsx','utf8');
const viewerTree = ts.createSourceFile('viewer.tsx',viewerSource,99,true,ts.ScriptKind.TSX);
let guardSource;
function findGuard(node) { if(ts.isFunctionDeclaration(node) && node.name?.text==='isPathInsideWorkspace') guardSource=node.getText(viewerTree); ts.forEachChild(node,findGuard); }
findGuard(viewerTree); assert.ok(guardSource);
const guardExports={};
Function('exports','resolveDocumentLink',compile(guardSource))(guardExports,native.resolveDocumentLink);
const source = fs.readFileSync('frontend/src/hooks/useFileExplorer.ts','utf8'), tree = ts.createSourceFile('explorer.ts',source,99,true);
let callback;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='handleFileOpenByPath')callback=node.initializer.getText(tree);ts.forEachChild(node,visit);}visit(tree);assert.ok(callback);
let written='', opened;
const targetName='HELP-01_온리비_어서_소개와_시작하기.md';
const file={kind:'file',name:targetName,getFile:async()=>({text:async()=>written}),createWritable:async()=>({write:async text=>{written=text;},close:async()=>{}})};
const directory=(name,entries)=>({name,kind:'directory',getDirectoryHandle:async key=>{if(entries[key]?.kind!=='directory')throw Error('missing '+key);return entries[key];},getFileHandle:async key=>{if(entries[key]?.kind!=='file')throw Error('missing '+key);return entries[key];},async *values(){yield* Object.values(entries);}});
const root={name:'OnriviMarkDown',handle:directory('OnriviMarkDown',{frontend:directory('frontend',{public:directory('public',{help:directory('help',{[targetName]:file})})})})};
const current='frontend/public/help/00_시작하기.md';
assert.equal(guardExports.isPathInsideWorkspace('../../../../outside.md',current,root.name,root.name).isInside,false);
const diskRoot='D:/Developer/OnriviMarkDown/OnriviMarkDown';
const diskCurrent=diskRoot+'/'+current;
const diskTarget=native.resolveDocumentLink('./'+targetName,diskCurrent);
assert.equal(guardExports.isPathInsideWorkspace(diskTarget,diskCurrent,diskRoot,root.name).resolvedPath,diskTarget);
assert.equal(guardExports.isPathInsideWorkspace('D:/outside.md',diskCurrent,diskRoot,root.name).isInside,false);
const context={...native,rootFolder:root,rootFolderRef:{current:root},workspaceType:'browser',fileList:[],tabsRef:{current:[{id:'source',name:'00_시작하기.md',path:current}]},activeTabIdRef:{current:'source'},currentFileNode:{path:current},helpContentRef:{current:null},window:{location:{hostname:'onrivi.com'}},handleFileClick:async node=>{opened=node;},showToast:message=>{throw Error(message);}};
const exportsObject={};Function('exports',...Object.keys(context),compile('exports.open='+callback))(exportsObject,...Object.values(context));
(async()=>{
  for(const href of ['./'+targetName,'frontend/public/help/'+targetName,'./frontend/public/help/'+targetName]){
    opened=null;
    // Visual editor resolves the href, then MainEditorApp validates the workspace.
    // Both stages must preserve the same path before the browser opens the file.
    const resolved=native.resolveDocumentLink(href,current);
    const guard=guardExports.isPathInsideWorkspace(resolved,current,root.name,root.name);
    assert.equal(guard.isInside,true);
    assert.equal(guard.resolvedPath,resolved,'workspace guard must not append the document directory twice');
    await exportsObject.open(guard.resolvedPath,undefined,true);
    assert.equal(opened.handle,file,'web document links must retain the authorized writable file handle');
    assert.equal(opened.path,'frontend/public/help/'+targetName);
    const writer=await opened.handle.createWritable();await writer.write('edited web document');await writer.close();
    assert.equal(written,'edited web document');
  }
  console.log('PASS: actual onrivi.com browser open handler resolves sibling/workspace-prefixed links and retains writable File System Access handles');
})().catch(error=>{console.error(error);process.exitCode=1;});
