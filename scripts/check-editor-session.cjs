const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const api={};Function('exports',ts.transpileModule(fs.readFileSync('frontend/src/lib/editorSession.ts','utf8'),{compilerOptions:{module:1,target:7}}).outputText)(api);
const tabs=[{id:'local',name:'로컬.md',path:'작업장/로컬.md',content:'저장된 본문',node:{handle:{}}},
 {id:'cloud',name:'웹.md',path:'GoogleDrive/웹.md',node:{driveFileId:'drive-123'},content:'초안',isModified:true,model:{},scrollTop:90},
 {id:'draft',name:'새 문서.md',path:null,content:''},{id:'style',name:'서식',isStyleTab:true}];
const session=api.readEditorSession(JSON.stringify(api.captureEditorSession(tabs,'cloud','최신 초안','both')));
assert.equal(session.previewMode,'both');
assert.deepEqual(session.tabs.map(t=>t.id),['local','cloud','draft']);assert.equal(session.activeTabId,'cloud');
assert.equal(session.tabs[0].draft,undefined);assert.equal(session.tabs[1].draft,'최신 초안');assert.equal(session.tabs[2].draft,'');
assert.equal(session.tabs[1].driveFileId,'drive-123');assert.equal(session.tabs[1].scrollTop,90);
assert.equal(session.tabs[1].model,undefined);assert.equal(session.tabs[0].node,undefined);
assert.equal(api.matchesSessionTab({id:'new-id',path:'different',node:{driveFileId:'drive-123'}},session.tabs[1]),true);
assert.equal(api.matchesSessionTab({path:'작업장\\로컬.md'},session.tabs[0]),true);
assert.equal(api.readEditorSession('broken'),null);
// Exercise the actual application's restoration body with asynchronous file-open adapters.
const source=ts.createSourceFile('main.tsx',fs.readFileSync('frontend/src/components/MainEditorApp.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let initializer;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='restoreSessionTabs')initializer=n.initializer;ts.forEachChild(n,walk);}walk(source);
const js=ts.transpileModule('const restoreSessionTabs='+initializer.getText(source)+';', {compilerOptions:{target:7,module:1}}).outputText;
const tabsRef={current:[]},activeTabIdRef={current:null},contentRef={current:''};let activation,saved=false,mode;
const context={tabsRef,activeTabIdRef,contentRef,sessionRestoringRef:{current:false},sessionRestoredRef:{current:false},
 matchesSessionTab:api.matchesSessionTab,isPlaceholderWarning:api.isPlaceholderWarning,showToast(){},console,setTimeout:fn=>{fn();},
 setTabs:fn=>{tabsRef.current=fn(tabsRef.current);},updateContent:value=>{contentRef.current=value;},
 handleFileClick:async node=>{tabsRef.current.push({id:'restored-cloud',node,path:node.path,content:'클라우드 최신 원본'});activeTabIdRef.current='restored-cloud';},
 handleFileOpenByPath:async filePath=>{tabsRef.current.push({id:'restored-local',path:filePath,content:'디스크 최신 원본'});activeTabIdRef.current='restored-local';},
 createNewTab:(content,name)=>{tabsRef.current.push({id:'restored-draft',content,name,path:null});activeTabIdRef.current='restored-draft';},
 switchTab:id=>{activation=id;},saveFile:()=>{saved=true;},isRestrictedUser:false,setPreviewMode:value=>{mode=value;}};
const names=Object.keys(context);
const restore=Function(...names,js+'return restoreSessionTabs;')(...names.map(k=>context[k]));
(async()=>{
 await restore([],null,session.tabs,session.activeTabId,session.previewMode);
 assert.equal(mode,'both');
 assert.equal(activation,'restored-cloud');assert.equal(context.sessionRestoredRef.current,true);assert.equal(context.sessionRestoringRef.current,false);
 assert.deepEqual(tabsRef.current.map(t=>t.id),['restored-local','restored-cloud','restored-draft']);
 assert.equal(tabsRef.current[0].content,'디스크 최신 원본');assert.equal(tabsRef.current[1].content,'최신 초안');
 assert.equal(tabsRef.current[1].isModified,true);assert.equal(tabsRef.current[2].content,'');assert.equal(saved,false);
 console.log('PASS: local/Drive IDs, tab order, active document, empty/new/modified drafts and scroll metadata survive; latest saved files reload; restoration never writes files');
})().catch(error=>{console.error(error);process.exitCode=1;});
