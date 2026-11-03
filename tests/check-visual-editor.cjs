const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const base = path.resolve(__dirname, '..');
const frontend = path.join(base, 'frontend');
const req = createRequire(path.join(frontend, 'package.json'));
const ts = req('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const mediaExports = {};
vm.runInNewContext(compile(path.join(frontend,'src/lib/mediaMarkup.ts')), {exports:mediaExports,require:req});
const exportsObject = {};
const bulletExports = {};
vm.runInNewContext(compile(path.join(frontend,'src/lib/bulletNumberText.ts')), {exports:bulletExports,require:req});
vm.runInNewContext(compile(path.join(frontend, 'src/lib/visualDocumentCodec.ts')), { exports: exportsObject, require: name => name === './bulletNumberText' ? bulletExports : name === './mediaMarkup' ? mediaExports : req(name) });
const { createVisualDocumentCodec, visualSchema } = exportsObject;
for (const href of ['./00_시작하기.md','./폴더 이름/문서 (초안).md#제목','./00_%EC%8B%9C%EC%9E%91%ED%95%98%EA%B8%B0.md','D:/다른 작업장/00_시작하기.md','file:///D:/문서/00_시작하기.md']) {
  const linkDoc=visualSchema.nodes.doc.create(null,visualSchema.nodes.paragraph.create(null,visualSchema.text('도움말 전체 목차',[visualSchema.marks.link.create({href})])));
  const markdown=exportsObject.visualSerializer.serialize(linkDoc);
  assert.ok(!markdown.includes('%EC'),'Korean document paths should remain readable');
  assert.match(markdown,/\]\(</);
  const parsed=createVisualDocumentCodec(markdown).doc.firstChild.firstChild;
  assert.equal(decodeURI(parsed.marks.find(mark=>mark.type.name==='link').attrs.href),decodeURI(href));
}
const multilineTable = createVisualDocumentCodec('| A |\n|---|\n| first<br>second |\n');
assert.equal(multilineTable.doc.firstChild.type.name, 'table');
assert.equal(multilineTable.doc.firstChild.child(1).firstChild.firstChild.child(1).type.name, 'hard_break');
const serializedTable = exportsObject.visualSerializer.serialize(multilineTable.doc);
assert.match(serializedTable, /first<br>second/);
assert.equal(createVisualDocumentCodec(serializedTable).doc.firstChild.child(1).firstChild.firstChild.child(1).type.name, 'hard_break');
const mainSource=fs.readFileSync(path.join(frontend,'src/components/MainEditorApp.tsx'),'utf8');
const mainTree=ts.createSourceFile('main.tsx',mainSource,99,true,ts.ScriptKind.TSX);
let docLinkSelect;
function findDocLinkSelect(node){if(ts.isVariableDeclaration(node)&&node.name.getText(mainTree)==='handleDocLinkSelect')docLinkSelect=node.initializer.getText(mainTree);ts.forEachChild(node,findDocLinkSelect);}
findDocLinkSelect(mainTree);assert.ok(docLinkSelect);
let insertedLink;
const linkRef={current:(href,title)=>{insertedLink={href,title};return true;}};
const selectExports={};
vm.runInNewContext(ts.transpileModule('exports.select='+docLinkSelect,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports:selectExports,visualDocLinkInsertRef:linkRef,docLinkCustomTitle:'도움말 전체 목차',
  closeDocLinkPicker:()=>{linkRef.current=null;},buildDocLinkTarget:()=>'./00_시작하기.md',getDocLinkDefaultLabel:()=>'',
  editorRef:{get current(){throw Error('Visual document links must not fall through to the hidden source editor');}},
});
selectExports.select({path:'frontend/public/help/00_시작하기.md'});
assert.deepEqual(insertedLink,{href:'./00_시작하기.md',title:'도움말 전체 목차'});
console.log('PASS: doclink selection survives picker cleanup and Korean document URLs round-trip readably');
const wheelStart=mainSource.indexOf('const handlePreviewWheel = useCallback');
const wheelEnd=mainSource.indexOf('  }, []);',wheelStart)+'  }, []);'.length;
const wheelExports={};
const wheelCode=ts.transpileModule(mainSource.slice(wheelStart,wheelEnd)+'\nexports.wheel=handlePreviewWheel;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let prevented=false,zoomed=false;
vm.runInNewContext(wheelCode,{exports:wheelExports,useCallback:fn=>fn,setPreviewZoomScale:()=>{zoomed=true;}});
wheelExports.wheel({ctrlKey:false,deltaY:400,preventDefault:()=>{prevented=true;},stopPropagation:()=>{}});
assert.equal(prevented,false,'Preview wheel must retain native document scrolling');
wheelExports.wheel({ctrlKey:true,deltaY:-100,preventDefault:()=>{prevented=true;},stopPropagation:()=>{}});
assert.equal(zoomed,true,'Ctrl+wheel must retain preview zoom');
console.log('PASS: actual preview wheel handler keeps native document scroll and Ctrl+wheel zoom');
const pasteExports={};
vm.runInNewContext(compile(path.join(frontend,'src/lib/visualMarkdownPaste.ts')),{exports:pasteExports,require:name=>name==='./bulletNumberText'?bulletExports:name==='@/lib/visualDocumentCodec'?exportsObject:req(name)});
const { EditorState } = req('prosemirror-state');
{
  const source=fs.readFileSync(path.join(frontend,'src/components/VisualDocumentEditor.tsx'),'utf8');
  assert.ok(!source.includes('insertPageBreak'));
  const catalog={};vm.runInNewContext(compile(path.join(frontend,'src/lib/toolbarConfig.ts')),{exports:catalog});
  assert.ok(!catalog.TOOLBAR_ITEMS.some(item=>item.id==='pagebreak'));
  const commands=catalog.getSlashCommands({languages:{CompletionItemKind:{Keyword:17,Snippet:15}}},{pagebreak:'old-user-command'});
  assert.ok(!commands.some(item=>item.id==='pagebreak'),'saved custom command cannot restore removed slash action');
  const legacy='앞\n\n<!-- onrivi:page-break -->\n\n뒤';
  const codec=createVisualDocumentCodec(legacy);assert.equal(codec.doc.child(1).type.name,'page_break');assert.equal(codec.serialize(codec.doc),legacy);
  console.log('PASS: duplicate page-break action removed; stored legacy page markers still round-trip');
}
const trailingCodec=createVisualDocumentCodec('tail');
let trailingState=EditorState.create({doc:trailingCodec.doc});
trailingState=trailingState.apply(trailingState.tr.insertText('    ',5));
const trailingMD=trailingCodec.serialize(trailingState.doc);
assert.equal(createVisualDocumentCodec(trailingMD).doc.firstChild.textContent,'tail    ');
trailingState=trailingState.apply(trailingState.tr.insert(9,visualSchema.nodes.hard_break.create()));
trailingState=trailingState.apply(trailingState.tr.insert(10,visualSchema.nodes.hard_break.create()));
const breakMD=trailingCodec.serialize(trailingState.doc);
assert.equal(createVisualDocumentCodec(breakMD).doc.firstChild.type.name,'paragraph');
assert.equal(createVisualDocumentCodec(breakMD).doc.firstChild.childCount,3);
assert.ok(!breakMD.includes('<br>'));
assert.ok(!breakMD.includes('\\'));
assert.equal(breakMD,'tail    \n\n');
assert.ok(!trailingMD.includes('&#32;'));

const headingSpacing=createVisualDocumentCodec('body\n# heading\n');
let headingState=EditorState.create({doc:headingSpacing.doc});headingState=headingState.apply(headingState.tr.insertText('edited ',1));
assert.match(headingSpacing.serialize(headingState.doc),/body\n\n# heading/);
const headingCode=createVisualDocumentCodec('```markdown\n# code heading\n```');
assert.equal(headingCode.serialize(headingCode.doc),'```markdown\n# code heading\n```');
const sceneExample = '# 출력 A\n\n```markdown\n:::scene {cover}\n![표지](media/cover.png)\n\n# 제목\n:::\n```\n\n뒤 문단\n';
const exampleCodec = createVisualDocumentCodec(sceneExample);
assert.equal(exampleCodec.doc.childCount, 3);
assert.equal(exampleCodec.doc.child(1).type.name, 'code_block');
assert.equal(exampleCodec.serialize(exampleCodec.doc), sceneExample);
const samples = [
  '', '\n\n', '# 제목\n본문\n', '# 제목\r\n\r\n본문\r\n',
  '---\n메타영역\n#서식설정\ncss_profile: system-1\n---\n\n# 제목\n\n본문',
  '앞 문단\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n뒤 문단',
  ':::scene {cover}\n![표지](media/a.png?driveId=123)\n\n# 책\n:::',
  '![사진](media/a.png)\n\n본문', '각주[^1]\n\n[^1]: 원본 주석\n',
  '참고\n\n[ref]: https://example.com\n', '<div>원본 HTML</div>\n',
  '* 하나\n* 둘\n\n1. 첫째\n2. 둘째\n',
  '```mermaid\ngraph TD\nA-->B\n```\n', '$$\nx^2\n$$\n',
  '일반 글\n\n- [x] 완료\n- [ ] 다음\n',
];
for (const source of samples) {
  const codec = createVisualDocumentCodec(source);
  assert.equal(codec.serialize(codec.doc), source, `No-op must preserve ${JSON.stringify(source)}`);
}
const source = '---\ncss_profile: system-1\n---\n\n첫 문단\n\n| 표 | 값 |\n|---|---|\n| a | b |\n\n[ref]: https://example.com\n';
const codec = createVisualDocumentCodec(source);
let state = EditorState.create({ doc: codec.doc });
state = state.apply(state.tr.insertText('수정 ', 1));
const changed = codec.serialize(state.doc);
assert.ok(changed.includes('수정 첫 문단'));
assert.ok(changed.startsWith('---\ncss_profile: system-1\n---\n'));
assert.ok(changed.includes('| 표 | 값 |\n|---|---|\n| a | b |'));
assert.ok(changed.endsWith('[ref]: https://example.com\n'));
assert.equal(visualSchema.nodes.source_block.spec.atom, true);
console.log('PASS: exact source preservation, metadata, opaque blocks, targeted paragraph edits');
const helpPath=path.join(frontend,'public/help/HELP-01_온리비_어서_소개와_시작하기.md');
const helpSource=fs.readFileSync(helpPath,'utf8').replace(/\r\n/g,'\n').trimEnd()+'\n\n'+[
  '## Regression examples',
  '| Name | Value |', '| :--- | ---: |', '| a | 1 |', '| b | 2 |', '| c | 3 |', '| d | 4 |', '',
  '```text', 'a long code line', '```', '', '```javascript', 'const value = 1;', '```', '',
  '> [!NOTE]', '> First alert', '', '> [!TIP]', '> Second alert', ''
].join('\n');
const initialSource='---\n메타영역\n#서식설정\ncss_profile: system-1\ncss_profile_name: "Onrivi 기본서식"\n---\n\n';
const importedCodec=createVisualDocumentCodec(initialSource);
const {history,undo,redo}=req('prosemirror-history');
let importedState=EditorState.create({doc:importedCodec.doc,plugins:[history()]});
importedState=importedState.apply(pasteExports.markdownPasteTransaction(importedState,importedCodec,helpSource));
assert.equal(importedCodec.serialize(importedState.doc),helpSource,'Whole HELP paste must retain every original byte');
undo(importedState,tr=>{importedState=importedState.apply(tr);});
assert.equal(importedCodec.serialize(importedState.doc),initialSource,'Undo must also restore metadata');
redo(importedState,tr=>{importedState=importedState.apply(tr);});
assert.equal(importedCodec.serialize(importedState.doc),helpSource);
const {AllSelection}=req('prosemirror-state');
importedState=importedState.apply(importedState.tr.setSelection(new AllSelection(importedState.doc)));
importedState=importedState.apply(pasteExports.markdownPasteTransaction(importedState,importedCodec,helpSource));
assert.equal(importedCodec.serialize(importedState.doc),helpSource,'Select-all replacement must not duplicate frontmatter');
assert.equal(pasteExports.mergePastedFrontmatter('---\nauthor: Author\ncss_profile: old\n---\n', '---\ntitle: New\ncss_profile: new\n---\n').match(/css_profile:/g).length,1);
console.log('PASS: entire attached HELP file paste, exact MD preservation, metadata merge and undo/redo');
const incrementalExports={};
vm.runInNewContext(compile(path.join(frontend,'src/lib/incrementalVisualModel.ts')),{exports:incrementalExports});
for (const [before,after] of [['abc','abXc'],['앞😀뒤','앞😃뒤'],['abc',''],['','한글'],['a\nb','a\n새\nb']]) {
  let value=before;
  const offsetAt=(line,column)=>{const lines=value.split('\n');return lines.slice(0,line-1).reduce((total,text)=>total+text.length+1,0)+column-1;};
  const model={getValue:()=>value,getPositionAt:offset=>{const lines=value.slice(0,offset).split('\n');return {lineNumber:lines.length,column:lines.at(-1).length+1};},
    pushEditOperations(_selection,edits){for(const edit of edits){const start=offsetAt(edit.range.startLineNumber,edit.range.startColumn),end=offsetAt(edit.range.endLineNumber,edit.range.endColumn);value=value.slice(0,start)+edit.text+value.slice(end);}}};
  incrementalExports.syncVisualSourceModel(model,after);assert.equal(value,after);
}
const bigCode='```text\n'+'diagram line '.repeat(10000)+'\n```';
let editSize=0;
incrementalExports.syncVisualSourceModel({getValue:()=>bigCode,getPositionAt:offset=>({lineNumber:1,column:offset+1}),pushEditOperations(_s,edits){editSize=edits[0].text.length;}},bigCode.slice(0,100)+'X'+bigCode.slice(100));
assert.equal(editSize,1);
console.log('PASS: incremental source synchronization, Unicode boundaries and one-character edits in a large code block');

async function visual() {
  const dir = path.join(base, '.tmp/visual-editor-qa');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'footnoteOrganizer.js'), compile(path.join(frontend, 'src/lib/footnoteOrganizer.ts')));
  // The focused text fixture does not exercise network image downloads.
  fs.writeFileSync(path.join(dir, 'resourceMedia.js'), 'exports.parseDroppedDataToBlob=async()=>null;exports.fetchExternalImageFile=async()=>null;');
  if(process.argv.includes('--image-drops-only'))fs.writeFileSync(path.join(dir,'resourceMedia.js'),compile(path.join(frontend,'src/lib/resourceMedia.ts')));
  fs.writeFileSync(path.join(dir,'dropStorageStubs.js'),'exports.idb={get:async()=>null};exports.requireResourceSettings=()=>{throw Error("unexpected storage access");};exports.getSavedDriveToken=()=>null;');
  fs.writeFileSync(path.join(dir, 'codec.js'), compile(path.join(frontend, 'src/lib/visualDocumentCodec.ts')));
  fs.writeFileSync(path.join(dir, 'bulletNumberText.js'), compile(path.join(frontend,'src/lib/bulletNumberText.ts')));
  fs.writeFileSync(path.join(dir, 'bibliography.js'), compile(path.join(frontend,'src/lib/bibliography.ts')));
  fs.writeFileSync(path.join(dir, 'bibliographySummary.js'), compile(path.join(frontend,'src/components/BibliographySummary.tsx')));
  fs.writeFileSync(path.join(dir,'pageGuides.js'),compile(path.join(frontend,'src/components/DocumentPageGuides.tsx')));
  fs.writeFileSync(path.join(dir,'pageGeometry.js'),compile(path.join(frontend,'src/lib/pageGeometry.ts')));
  fs.writeFileSync(path.join(dir,'paperSizes.js'),compile(path.join(frontend,'src/constants/paperSizes.ts')));
  fs.writeFileSync(path.join(dir,'accountStorage.js'),compile(path.join(frontend,'src/lib/browserAccountStorage.ts')));
  fs.writeFileSync(path.join(dir, 'quoteCommands.js'), compile(path.join(frontend,'src/lib/visualQuoteCommands.ts')));
  fs.writeFileSync(path.join(dir, 'editor.js'), compile(path.join(frontend, 'src/components/VisualDocumentEditor.tsx')));
  fs.writeFileSync(path.join(dir, 'importHtml.js'), compile(path.join(frontend,'src/lib/importHtmlMarkdown.ts')));
  fs.writeFileSync(path.join(dir, 'pasteHandlers.js'), compile(path.join(frontend,'src/utils/pasteHandlers.ts')));
  fs.writeFileSync(path.join(dir,'aiVisualTarget.js'),compile(path.join(frontend,'src/lib/ai/visualTarget.ts')));
  fs.writeFileSync(path.join(dir, 'inputRules.js'), compile(path.join(frontend, 'src/lib/visualMarkdownInputRules.ts')));
  fs.writeFileSync(path.join(dir, 'paste.js'), compile(path.join(frontend, 'src/lib/visualMarkdownPaste.ts')));
  fs.writeFileSync(path.join(dir, 'mediaMarkup.js'), compile(path.join(frontend, 'src/lib/mediaMarkup.ts')));
  fs.writeFileSync(path.join(dir, 'clipboard.js'), compile(path.join(frontend, 'src/lib/desktopClipboard.ts')));
  fs.writeFileSync(path.join(dir, 'caret.js'), compile(path.join(frontend, 'src/lib/visualCaret.ts')));
  // These unrelated dialogs are not exercised by the editor/Mermaid fixture.
  fs.writeFileSync(path.join(dir,'unrelatedModals.js'),'module.exports = () => null;');
  fs.writeFileSync(path.join(dir, 'listCommands.js'), compile(path.join(frontend,'src/lib/visualListCommands.ts')));
  fs.writeFileSync(path.join(dir, 'tableCommands.js'), compile(path.join(frontend, 'src/lib/visualTableCommands.ts')));
  fs.writeFileSync(path.join(dir, 'icons.js'), "const React=require('react');exports.Plus=exports.X=(props)=>React.createElement('svg',props);");
  fs.writeFileSync(path.join(dir, 'tableModal.js'), compile(path.join(frontend, 'src/components/TableModal.tsx')));
  fs.writeFileSync(path.join(dir, 'aiFriendlyReport.js'), compile(path.join(frontend, 'src/lib/aiFriendlyReport.ts')));
  fs.writeFileSync(path.join(dir, 'headingNumbering.js'), compile(path.join(frontend, 'src/lib/headingNumbering.ts')));
  fs.writeFileSync(path.join(dir, 'reportNumbering.js'), compile(path.join(frontend, 'src/lib/reportNumbering.ts')));
  fs.writeFileSync(path.join(dir, 'markdownCleaner.js'), compile(path.join(frontend, 'src/utils/markdownCleaner.ts')));
  fs.writeFileSync(path.join(dir, 'tableHeader.js'), compile(path.join(frontend, 'src/components/TableHeaderCell.tsx')));
  fs.writeFileSync(path.join(dir, 'readonly.js'), compile(path.join(frontend, 'src/components/VisualReadOnlyMarkdownBlock.tsx')));
  fs.writeFileSync(path.join(dir, 'catalog.js'), compile(path.join(frontend, 'src/lib/visualCommandCatalog.ts')));
  fs.writeFileSync(path.join(dir, 'toolbar.js'), compile(path.join(frontend, 'src/lib/toolbarConfig.ts')));
  // Exercise the exact existing MainEditorApp toolbar JSX, not a lookalike.
  const mainSource = fs.readFileSync(path.join(frontend, 'src/components/MainEditorApp.tsx'), 'utf8');
  const toolbarStart = mainSource.indexOf('{floatingToolbar.visible && (() => {');
  const toolbarEnd = mainSource.indexOf('\n                      })()}', toolbarStart);
  assert.ok(toolbarStart > 0 && toolbarEnd > toolbarStart);
  const toolbarBody = mainSource.slice(toolbarStart + '{floatingToolbar.visible && (() => {'.length, toolbarEnd);
  fs.writeFileSync(path.join(dir, 'legacy.tsx'), `import React from 'react'; import {createPortal} from 'react-dom';
    export default function Legacy({floatingToolbar,setFloatingToolbar,commandRef}:any) {
      const floatingToolbarRef=React.useRef(null); const visualFloatingOriginRef={current:true};
      const editorRef={current:null}; const visualCommandRef=commandRef;
      const [floatingHeadingLevel,setFloatingHeadingLevel]=React.useState(3);
      const setFloatingQuoteDropdown=(value:any)=>{};
      const dispatchCommand=(command:string)=>commandRef.current?.(command);
      const Icon=({name}:any)=><span>{name}</span>;
      ${toolbarBody}
    }`);
  fs.writeFileSync(path.join(dir, 'legacy.js'), compile(path.join(dir, 'legacy.tsx')));
  fs.writeFileSync(path.join(dir, 'entry.js'), `
    const React = require('react');
    const {createRoot} = require('react-dom/client');
    const Editor = require('./editor').default;
    const Legacy = require('./legacy').default;
    const View = require('prosemirror-view').EditorView;
    const updateState = View.prototype.updateState;
    View.prototype.updateState = function(state) { window.qaView=this; return updateState.call(this,state); };
    function App() {
      const [content,setContent] = React.useState('---\\ncss_profile: system-1\\n---\\n\\n# 시작\\n\\n첫 문단\\n\\n둘째 문단\\n');
      const [visible,setVisible] = React.useState(true);
      const [readonly,setReadonly] = React.useState(false);
      const [commands,setCommands] = React.useState({});
      const [hotkeys,setHotkeys] = React.useState({});
      const [shared,setShared]=React.useState(false);
      const [documentId,setDocumentId]=React.useState('test-document');
      const [headingNumbering,setHeadingNumbering]=React.useState([]);window.setTestHeadingFormats=setHeadingNumbering;
      const [floating,setFloating]=React.useState({visible:false,top:0,left:0});
      const sharedCommand=React.useRef(null);window.qaEditorCommand=command=>sharedCommand.current?.(command);const aiTarget=React.useRef(null);window.qaAITarget=scope=>aiTarget.current?.(scope);
      window.qaReportNumbering=require('./reportNumbering');
      window.qaHeadingNumbering=require('./headingNumbering');
      window.setTestSource=setContent;
      window.setTestCommands=setCommands;
      window.setTestHotkeys=setHotkeys;
      window.setSharedToolbar=setShared;
      window.setTestDocument=(id,source)=>{setDocumentId(id);setContent(source);};
      return React.createElement('div',{},
        React.createElement('button',{id:'toggle',onClick:()=>setVisible(!visible)},'보기 전환'),
        React.createElement('button',{id:'readonly',onClick:()=>setReadonly(!readonly)},'읽기 전용'),
        shared && floating.visible && React.createElement(Legacy,{floatingToolbar:floating,setFloatingToolbar:setFloating,commandRef:sharedCommand}),
        visible && React.createElement(Editor,{content,headingNumbering,onSourceScroll:offset=>{window.qaSourceScroll=offset;},onSourceCursor:(offset,reveal=true)=>{window.qaSourceCursor=offset;window.qaCursorReveal=reveal;},onChange:setContent,readOnly:readonly,documentId,customCommands:commands,customHotkeys:hotkeys,commandRef:sharedCommand,aiTargetRef:aiTarget,
          renderImage:source=>React.createElement('img',{alt:'test preview',style:{width:320,height:160},src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWo4AAAAASUVORK5CYII='}),
          onMediaDialog:(kind,source,insert)=>{window.qaMediaDialog={kind,source,insert};},
          onImageDialog:(source,insert)=>{window.qaImageDialog={source,insert};},
          onImageFile:async file=>{window.qaImageUploads=(window.qaImageUploads||0)+1;if(window.qaUploadFailure)throw Error('테스트 저장 실패');if(window.qaHoldUpload)await new Promise(resolve=>window.qaReleaseUpload=resolve);return window.qaUniquePaths?'media/'+file.name:'media/test-paste.png';},
          floatingToolbarVisible:floating.visible,
          onFloatingToolbar:shared?((visible,position)=>{setFloating(prev=>prev.visible===visible && (!visible || (prev.top===position.top+48 && prev.left===position.left))?prev:{visible,top:position.top+48,left:position.left});}):undefined,
          onSourceAction:(id,source,from,to)=>{window.qaSourceAction={id,source,from,to};}}),
        React.createElement('textarea',{id:'source',value:content,readOnly:true,style:{width:'100%',height:180}}));
    }
    createRoot(document.getElementById('root')).render(React.createElement(App));
  `);
  const webpack = req('webpack');
  fs.writeFileSync(path.join(dir,'clearFormatting.js'),compile(path.join(frontend,'src/lib/clearMarkdownFormatting.ts')));
  fs.writeFileSync(path.join(dir,'modalEscape.js'),compile(path.join(frontend,'src/hooks/useModalEscape.ts')));
  fs.writeFileSync(path.join(dir,'signatureCleanup.js'),compile(path.join(frontend,'src/lib/signatureCleanup.ts')));
  fs.writeFileSync(path.join(dir,'nativeDocumentPath.js'),compile(path.join(frontend,'src/lib/nativeDocumentPath.ts')));
  const focusedAliases = { '@/lib/nativeDocumentPath':path.join(dir,'nativeDocumentPath.js'), '@/lib/signatureCleanup':path.join(dir,'signatureCleanup.js'), '@/lib/clearMarkdownFormatting':path.join(dir,'clearFormatting.js'), '@/hooks/useModalEscape':path.join(dir,'modalEscape.js'), '@/lib/headingNumbering':path.join(dir,'headingNumbering.js'), '../visualDocumentCodec':path.join(dir,'codec.js'), '@/utils/markdownCleaner':path.join(dir,'markdownCleaner.js'), '@/lib/aiFriendlyReport':path.join(dir,'aiFriendlyReport.js'), '@/components/DocumentPageGuides':path.join(dir,'pageGuides.js'), '@/lib/pageGeometry':path.join(dir,'pageGeometry.js'), '../constants/paperSizes':path.join(dir,'paperSizes.js'), '@/lib/browserAccountStorage':path.join(dir,'accountStorage.js'), '@/lib/bibliography':path.join(dir,'bibliography.js'), '@/components/BibliographySummary':path.join(dir,'bibliographySummary.js'), '@/lib/bulletNumberText':path.join(dir,'bulletNumberText.js'), ...(process.argv.some(arg=>['--editor-fixes-only','--current-help-only','--heading-space-only','--report-numbering-only','--report-table-only','--inline-ai-only','--image-resize-only','--page-break-only','--list-enter-only','--list-indentation-only','--typing-scroll-only','--spacing-emphasis-only','--list-markers-only','--image-drops-only'].includes(arg)) ? {
    '@/lib/footnoteOrganizer': path.join(dir, 'footnoteOrganizer.js'),
    '@/lib/resourceMedia': path.join(dir, 'resourceMedia.js'),
    './resourceSettings':path.join(dir,'dropStorageStubs.js'),
    './indexedDbHelper':path.join(dir,'dropStorageStubs.js'),
    './gdrive/googleDriveClient':path.join(dir,'dropStorageStubs.js'),
  } : {}) };
  focusedAliases['@/lib/importHtmlMarkdown']=path.join(dir,'importHtml.js');
  focusedAliases['@/utils/pasteHandlers']=path.join(dir,'pasteHandlers.js');
  // The read-only renderer includes KaTeX styles. Load its real CSS in the
  // browser fixture instead of relying on the production Next.js CSS loader.
  fs.writeFileSync(path.join(dir, 'css-loader.cjs'), `module.exports = function(source) {
    return 'const style=document.createElement("style");style.textContent='+JSON.stringify(source)+';document.head.appendChild(style);';
  };`);
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry: path.join(dir, 'entry.js'),
    module: { rules: [{ test: /\.css$/, use: [path.join(dir, 'css-loader.cjs')] }] },
    output: { path: dir, filename: 'bundle.js' }, resolve: { modules: [path.join(frontend, 'node_modules')],
      alias: { ...focusedAliases, '@/lib/ai/visualTarget':path.join(dir,'aiVisualTarget.js'), '@/components/LinkModal':path.join(dir,'unrelatedModals.js'), '@/components/CalendarModal':path.join(dir,'unrelatedModals.js'), '@/components/DateTimeInsertPicker':path.join(dir,'unrelatedModals.js'), '@/lib/visualListCommands':path.join(dir,'listCommands.js'), '@/lib/visualQuoteCommands':path.join(dir,'quoteCommands.js'), 'lucide-react':path.join(dir,'icons.js'), './visualDocumentCodec':path.join(dir,'codec.js'), '@/lib/visualTableCommands':path.join(dir,'tableCommands.js'), '@/components/TableModal':path.join(dir,'tableModal.js'), '@/components/TableHeaderCell':path.join(dir,'tableHeader.js'), './mediaMarkup':path.join(dir,'mediaMarkup.js'), '@/lib/mediaMarkup':path.join(dir,'mediaMarkup.js'), '@/lib/desktopClipboard':path.join(dir,'clipboard.js'), '@/lib/visualCaret': path.join(dir, 'caret.js'), '@/lib/visualDocumentCodec': path.join(dir, 'codec.js'), '@/lib/visualMarkdownInputRules': path.join(dir, 'inputRules.js'), '@/lib/visualCommandCatalog': path.join(dir,'catalog.js'), '@/lib/toolbarConfig': path.join(dir,'toolbar.js'), '@/lib/visualMarkdownPaste':path.join(dir,'paste.js'), '@/components/VisualReadOnlyMarkdownBlock':path.join(dir,'readonly.js') } }, devtool: false,
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const cssDir=path.join(frontend,'out/_next/static/css');
  const css=fs.existsSync(cssDir)?fs.readdirSync(cssDir).filter(file=>file.endsWith('.css')).map(file=>`<link rel="stylesheet" href="file:///${path.join(cssDir,file).replace(/\\/g,'/')}">`).join(''):'';
  const mediaCss=fs.readFileSync(path.join(frontend,'src/app/globals.css'),'utf8').split('/* Media actions share')[1];
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><meta charset="utf-8">'+css+'<style>/* Media actions share'+mediaCss+'</style>'+'<div id="root"></div><script src="bundle.js"></script>');
  const { chromium } = req('playwright-core');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:',error.message); });
    await page.goto('file:///' + path.join(dir, 'index.html').replace(/\\/g, '/'));
    const surface = page.locator('.visual-document-surface');
    if(process.argv.includes('--smart-inline-only')) {
      await surface.waitFor();
      const emphasisCss=fs.readFileSync(path.join(frontend,'src/app/globals.css'),'utf8').split('\n').filter(line=>line.includes(':is(.visual-document-surface,.onrivi-content-root)')).join('\n');
      await page.addStyleTag({content:'.visual-document-surface code{font-weight:400!important;font-style:normal!important;}'+emphasisCss});
      const mainSource=fs.readFileSync(path.join(frontend,'src/components/MainEditorApp.tsx'),'utf8');
      const captureStart=mainSource.indexOf('// Escape: 인용구 드롭다운');
      const captureEnd=mainSource.indexOf('const isCtrl =',captureStart);
      assert.ok(captureStart>=0 && captureEnd>captureStart);
      await page.evaluate(code=>{
        const handler=Function('e','floatingQuoteDropdown','floatingToolbar','setFloatingQuoteDropdown','setFloatingToolbar',code);
        window.qaCaptureEscape=e=>handler(e,{open:false},{visible:true},()=>{},()=>{window.qaToolbarClosed=true;});
        window.addEventListener('keydown',window.qaCaptureEscape,true);
      },mainSource.slice(captureStart,captureEnd));
      for (const [index, delimiters] of [['**','**'],['*','*'],['~~','~~'],['<u>','</u>'],['`','`'],['**<u>`','`</u>**']].entries()) {
        const word='word'+index, start=3, end=start+word.length;
        const source='앞 '+delimiters[0]+word+delimiters[1]+'😀뒤';
        const select=async(from,to=from)=>page.evaluate(({from,to})=>{const v=window.qaView;v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,from,to)));v.focus();},{from,to});
        await page.locator('#source').focus();await page.evaluate(s=>window.setTestDocument('exit-'+Math.random(),s),source);
        await page.waitForFunction(text=>window.qaView.state.doc.textContent===text,'앞 '+word+'😀뒤');
        const original=await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON()));
        await select(end);await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(()=>window.qaView.state.selection.from),end+2,'One arrow exits and advances across the whole emoji');
        assert.equal(await surface.locator('.onrivi-inline-syntax-tag').count(),0);
        assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),original);
        await select(end-1);await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(()=>window.qaView.state.selection.from),end,'Arriving at the end folds on the same arrow');
        assert.equal(await surface.locator('.onrivi-inline-syntax-tag').count(),0);
        await select(start+1);await page.keyboard.press('ArrowLeft');
        assert.equal(await page.evaluate(()=>window.qaView.state.selection.from),start,'Arriving at the start folds on the same arrow');
        assert.equal(await surface.locator('.onrivi-inline-syntax-tag').count(),0);
        await select(start);await page.keyboard.press('ArrowLeft');
        assert.equal(await page.evaluate(()=>window.qaView.state.selection.from),start-1);
        assert.equal(await surface.locator('.onrivi-inline-syntax-tag').count(),0);
        for(const selected of [false,true]) {
          await select(start+1,selected?end-1:start+1);await page.keyboard.press('End');
          assert.equal(await page.evaluate(()=>window.qaView.state.selection.from),end+1);
          assert.equal(await page.evaluate(()=>window.qaView.state.selection.empty),true);
          assert.equal(await surface.locator('.onrivi-inline-syntax-tag').count(),0);
          assert.equal(await page.evaluate(()=>window.qaView.state.doc.textContent),'앞 '+word+' 😀뒤');
          const afterEnd=await page.evaluate(()=>window.qaView.state.doc.textContent);
          await page.keyboard.press('End');
          assert.equal(await page.evaluate(()=>window.qaView.state.doc.textContent),afterEnd,'Repeated End must not add spaces');
        }
        // End with no active mark retains native navigation. Return to the
        // known exit location to check the following input's actual marks.
        await select(end+1);
        await page.keyboard.type('plain');
        assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.nodeBefore.marks.length),0);
      }
      await page.locator('#source').focus();
      await page.evaluate(()=>window.setTestDocument('end-space-tail','**끝**'));
      await page.waitForFunction(()=>window.qaView.state.doc.textContent==='끝');
      await page.evaluate(()=>{const v=window.qaView;v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,2)));v.focus();});
      await page.keyboard.press('End');
      assert.equal(await page.evaluate(()=>window.qaView.state.doc.textContent),'끝 ');
      assert.equal(await page.evaluate(()=>window.qaView.state.selection.from),3);
      await page.waitForFunction(()=>document.querySelector('#source').value.endsWith(' '));
      assert.equal(createVisualDocumentCodec(await page.locator('#source').inputValue()).doc.textContent,'끝 ');
      await page.keyboard.type('일반');
      assert.equal(await surface.locator('strong').textContent(),'끝');
      assert.equal(await page.evaluate(()=>window.qaView.state.doc.textContent),'끝 일반');
      console.log('PASS: End exits through one saved plain space, reuses existing space, and preserves following plain typing; arrow navigation leaves source unchanged');
      await page.evaluate(()=>window.removeEventListener('keydown',window.qaCaptureEscape,true));
      for (const [name,shortcut,tag] of [['strong','Control+b','strong'],['em','Control+i','em'],['strike','Control+Shift+x','s'],['underline','Control+u','u']]) {
        const sample='sample-'+name;
        await page.locator('#source').focus();
        await page.evaluate(s=>window.setTestDocument('code-marks-'+Math.random(),s),sample);
        await page.waitForFunction(s=>window.qaView.state.doc.textContent===s && window.qaView.state.doc.firstChild.firstChild.marks.length===0,sample);
        await page.evaluate(()=>{const v=window.qaView;v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,1,v.state.doc.content.size-1)));v.focus();});
        await page.keyboard.press(shortcut);await page.keyboard.press('Control+e');
        assert.equal(await surface.locator(tag+' code').textContent(),sample);
        if(name==='strong')assert.ok(Number(await surface.locator(tag+' code').evaluate(node=>getComputedStyle(node).fontWeight))>=600);
        if(name==='em')assert.equal(await surface.locator(tag+' code').evaluate(node=>getComputedStyle(node).fontStyle),'italic');
        const source=await page.locator('#source').inputValue();
        const reparsed=createVisualDocumentCodec(source).doc;
        assert.deepEqual(Array.from(reparsed.firstChild.firstChild.marks,m=>m.type.name).sort(),[name,'code'].sort(),source);
        assert.equal(reparsed.textContent,sample);
        await page.locator('#source').focus();
        await page.evaluate(s=>window.setTestDocument('reopen-code-'+Math.random(),s),source);
        await surface.locator(tag+' code').waitFor();
      }
      const allMarks=['strong','em','strike','underline','code'].map(name=>visualSchema.marks[name].create());
      const allDoc=visualSchema.nodes.doc.create(null,visualSchema.nodes.paragraph.create(null,visualSchema.text('가나다라',allMarks)));
      const allSource=exportsObject.visualSerializer.serialize(allDoc);
      const allReloaded=createVisualDocumentCodec(allSource).doc;
      assert.deepEqual(Array.from(allReloaded.firstChild.firstChild.marks,m=>m.type.name).sort(),allMarks.map(m=>m.type.name).sort(),allSource);
      assert.equal(createVisualDocumentCodec('`<u>literal</u>`').doc.firstChild.firstChild.marks.length,1,'Literal code must not become HTML emphasis');
      console.log('PASS: bold/italic/strike/underline plus inline code retain marks after save/reload; code CSS preserves explicit weight/style; five combined marks round-trip');
      for (const [shortcut,tag] of [['Control+b','strong'],['Control+i','em'],['Control+e','code'],['Control+u','u'],['Control+Shift+x','s']]) {
        await page.locator('#source').focus();
        await page.evaluate(()=>window.setTestDocument('smart-'+Math.random(),''));
        await page.waitForFunction(()=>window.qaView.state.doc.textContent==='');
        await surface.click();await page.keyboard.press(shortcut);
        assert.equal(await page.evaluate(()=>window.qaView.state.selection.empty),false);
        await page.keyboard.type('abc');
        assert.equal(await surface.locator(tag).textContent(),'abc');
        const closing=await surface.locator('.onrivi-inline-syntax-tag').last().elementHandle();
        await page.evaluate(()=>{const data=new DataTransfer();data.setData('text/plain','붙임');window.qaView.dom.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
        assert.equal(await surface.locator(tag).textContent(),'abc붙임');
        assert.equal(await closing.evaluate(node=>node===document.querySelector('.visual-document-surface .onrivi-inline-syntax-tag:last-of-type')),true);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(()=>window.qaView.state.doc.childCount),2,'Enter must insert a paragraph, not only fold syntax');
        assert.ok(await surface.locator('.onrivi-inline-syntax-tag').count()>0,'Enter retains formatting');
        await page.keyboard.type('continued');
        assert.equal(await surface.locator(tag).last().textContent(),'continued');
        const beforeExit=await page.evaluate(()=>window.qaView.state.doc.textContent);
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(()=>window.qaView.state.doc.textContent),beforeExit,'Exit must not insert a space');
        assert.equal(await surface.locator('.onrivi-inline-syntax-tag').count(),0);
        await page.keyboard.type('plain');
        assert.equal(await surface.locator(tag).last().textContent(),'continued');
        assert.ok((await page.locator('#source').inputValue()).includes('plain'));
        // Chromium's IME protocol produces real composition DOM updates rather
        // than substituting insertText for a Korean keyboard composition.
        await page.keyboard.press('Enter');await page.keyboard.press(shortcut);
        await page.evaluate(()=>{window.qaSyntaxNodes=Array.from(window.qaView.dom.querySelectorAll('.onrivi-inline-syntax-tag'));});
        const session=await page.context().newCDPSession(page);
        for(const text of ['ㅎ','하','한','한ㄱ','한그','한글'])
          await session.send('Input.imeSetComposition',{text,selectionStart:text.length,selectionEnd:text.length});
        await session.send('Input.insertText',{text:'한글'});
        await page.waitForFunction(()=>window.qaView.state.doc.lastChild.lastChild?.marks.length>0);
        assert.equal(await page.evaluate(()=>window.qaSyntaxNodes.every(node=>window.qaView.dom.contains(node))),true,'IME completion must reuse syntax widgets');
        await page.keyboard.type('ab');
        assert.equal(await surface.locator(tag).last().textContent(),'한글ab');
        await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await page.keyboard.type('outside');
        assert.equal(await surface.locator(tag).last().textContent(),'한글ab');
        await session.detach();
        await page.keyboard.press('Enter');await page.keyboard.press(shortcut);
        await page.keyboard.press('Backspace');
        assert.ok((await page.evaluate(()=>window.qaView.state.storedMarks?.length))>0);
        assert.ok(await surface.locator('.onrivi-inline-syntax-tag').count()>0);
        await page.keyboard.type('다시');
        assert.equal(await surface.locator(tag).last().textContent(),'다시');
        await page.evaluate(()=>{const data=new DataTransfer();data.setData('text/plain','HTML');data.setData('text/html','<p><em>HTML</em></p>');window.qaView.dom.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
        assert.ok((await surface.locator(tag).last().textContent()).includes('HTML'));
        await page.keyboard.press('ArrowRight');
      }
      await page.locator('#source').focus();
      await page.evaluate(()=>window.setTestDocument('smart-combined','**_both_** tail'));
      const combined=surface.locator('strong em, em strong');
      await combined.waitFor();
      await page.evaluate(()=>{const v=window.qaView;v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,1,5)));v.focus();});
      await page.keyboard.type('mixed');
      assert.equal(await combined.textContent(),'mixed');
      await page.evaluate(()=>{const v=window.qaView;v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,1)));v.focus();});
      await page.keyboard.press('ArrowLeft');
      assert.equal(await surface.locator('.onrivi-inline-syntax-tag').count(),0);
      await page.keyboard.type('outside');
      assert.equal(await combined.textContent(),'mixed');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
      await page.waitForFunction(()=>document.querySelectorAll('.onrivi-inline-syntax-tag').length>0);
      const saved=await page.locator('#source').inputValue();
      assert.ok(!saved.includes('onrivi-inline-syntax-tag'));
      assert.ok(!saved.includes('텍스트'));
      await page.locator('#source').focus();
      await page.evaluate(()=>window.setTestDocument('smart-nesting','**<u>열심히</u>**'));
      await surface.locator('u').waitFor();
      await page.evaluate(()=>{const v=window.qaView;v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,2)));v.focus();});
      await page.waitForFunction(()=>document.querySelectorAll('.onrivi-inline-syntax-tag').length===4);
      assert.deepEqual(await surface.locator('.onrivi-inline-syntax-tag').allTextContents(),['**','<u>','</u>','**']);
      await page.evaluate(()=>{const v=window.qaView;v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,2)).setStoredMarks(v.state.doc.firstChild.firstChild.marks));v.focus();});
      await page.keyboard.press('Tab');
      assert.ok(await surface.locator('.onrivi-inline-syntax-tag').count()>0,'Tab must no longer fold/exit the active marks');
      assert.deepEqual(errors,[]);
      console.log('PASS: five inline marks retain Latin/Korean input and marks across Enter; arrows exit without inserting spaces; Tab no longer exits; paste, empty templates and nested delimiters retain marks');
      return;
    }
    if(process.argv.includes('--editor-fixes-only')) {
      await surface.waitFor();
      const source = '앞 문단\n\n---\n\n뒤 문단\n';
      await page.evaluate(value=>window.setTestSource(value),source);
      await surface.locator('hr').waitFor();
      for(let n=0;n<3;n++) {
        await surface.locator('hr').click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
      }
      assert.equal(await page.locator('#source').inputValue(),source,'rule navigation must not insert blank paragraphs');
      await page.evaluate(()=>window.qaEditorCommand('TABLE'));
      await page.getByRole('button',{name:/표 삽입하기/}).waitFor();
      await page.locator('input').first().focus();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button',{name:/표 삽입하기/}).count(),0,'Escape closes the visual editor table dialog from its input');
      assert.equal(await page.locator('#source').inputValue(),source);
      const html='<div align="right">\n\n**서식 본문**\n\n</div>\n';
      await page.evaluate(value=>window.setTestSource(value),html);
      await surface.locator('.visual-source-block').first().waitFor();
      await page.evaluate(()=>window.qaView.focus());
      await page.keyboard.press('Control+a');
      await page.evaluate(()=>{
        const v=window.qaView;
        window.qaEditorCommand('REMOVE_PREFIX');
      });
      await page.waitForFunction(()=>!/<\/?div\b/i.test(document.querySelector('#source').value),null,{timeout:3000}).catch(async error=>{console.error(await page.evaluate(()=>({doc:window.qaView.state.doc.toString(),selection:window.qaView.state.selection.toJSON()})));throw error;});
      const cleared=await page.locator('#source').inputValue();
      assert.ok(!/<\/?div\b/i.test(cleared),cleared);
      assert.ok(cleared.includes('서식 본문'),cleared);
      await page.locator('#source').focus();
      await page.evaluate(value=>window.setTestSource(value), '앞 문단\n\n<div align="left">\n\n2026년 10월 22일  \n**작성자: 홍길동** 인\n\n</div>\n\n뒤 문단\n');
      await page.waitForFunction(()=>document.querySelector('#source').value.includes('홍길동'));
      await surface.locator('.visual-source-block').first().waitFor({timeout:3000}).catch(async error=>{console.error(await page.evaluate(()=>({doc:window.qaView.state.doc.toString(),source:document.querySelector('#source').value})));throw error;});
      await page.evaluate(()=>{
        const v=window.qaView;let first,last;
        v.state.doc.forEach((node,pos)=>{if(node.type.name==='paragraph' && node.textContent.includes('2026'))first=pos;if(node.type.name==='paragraph' && node.textContent.includes('작성자'))last=pos+node.nodeSize;});
        if(first===undefined || last===undefined)throw Error(v.state.doc.toString());
        v.dispatch(v.state.tr.delete(first,last));
      });
      await page.waitForFunction(()=>!document.querySelector('#source').value.includes('<div'));
      const deleted=await page.locator('#source').inputValue();
      assert.ok(deleted.includes('앞 문단') && deleted.includes('뒤 문단'));
      await page.evaluate(()=>window.qaEditorCommand('UNDO'));
      await page.waitForFunction(()=>document.querySelector('#source').value.includes('홍길동') && document.querySelector('#source').value.includes('<div'));
      assert.deepEqual(errors,[]);
      console.log('PASS: signature deletion removes both div tags in one undoable edit');
      console.log('PASS: horizontal rule navigation preserves source, table Escape works from input, visual clear removes div wrappers');
      return;
    }
    if(process.argv.includes('--image-resize-only')){
      await surface.waitFor();
      await page.evaluate(()=>window.setTestSource('앞 제목\n\n![](/media/picture.png)\n\n아래 본문 유지\n\n### 다음 제목\n\n다음 설명\n\n![](/media/second.png)\n\n마지막 본문'));
      await surface.locator('.visual-image-block').first().waitFor();
      for(const width of [400,200,80]){
        await surface.locator('.visual-image-block').first().hover();
        await surface.getByRole('button',{name:'이미지 편집',exact:true}).first().click();
        assert.equal(await page.evaluate(w=>window.qaImageDialog.insert('/media/picture.png?width='+w+'&align=center',''),width),true);
        for(const text of ['아래 본문 유지','다음 제목','다음 설명','마지막 본문']){
          assert.ok((await page.locator('#source').inputValue()).includes(text));
          const block=surface.getByText(text,{exact:true});await block.scrollIntoViewIfNeeded();await block.waitFor({state:'visible'});
        }
        assert.equal(await surface.locator('.visual-image-block').count(),2);
      }
      assert.deepEqual(errors,[]);console.log('PASS: repeated image resize preserves following paragraphs, headings, second image and visible editable blocks');return;
    }
    if(process.argv.includes('--inline-ai-only')){
      await surface.waitFor();await page.evaluate(()=>window.setTestSource('앞 문장\n\n수정할 문장\n\n![](/media/test.png)\n\n아래 본문'));
      await surface.getByText('앞 문장',{exact:true}).click();await page.evaluate(()=>{const host=document.querySelector('.visual-document-surface');const texts=[];const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())texts.push(node);const a=texts.find(n=>n.textContent==='앞 문장'),b=texts.find(n=>n.textContent==='수정할 문장');const range=document.createRange();range.setStart(a,0);range.setEnd(b,b.textContent.length);const selection=document.getSelection();selection.removeAllRanges();selection.addRange(range);window.referenceAI=window.qaAITarget('reference');const input=document.createElement('textarea');input.id='reference-question';document.body.append(input);input.focus();});
      assert.equal(await page.evaluate(()=>window.referenceAI.text),'앞 문장\n수정할 문장');assert.ok(await surface.locator('.onrivi-ai-target').count()>0);assert.equal(await page.evaluate(()=>window.referenceAI.apply('수정 금지','replace')),false);await page.evaluate(()=>{window.referenceAI.release();document.querySelector('#reference-question').remove();});
      await surface.getByText('수정할 문장',{exact:true}).click();await page.keyboard.press('Home');await page.keyboard.press('Shift+End');
      const before=await page.locator('#source').inputValue();
      assert.equal(await page.evaluate(()=>{window.actualAITarget=window.qaAITarget();return window.actualAITarget.text;}),'수정할 문장');
      assert.equal(await page.evaluate(()=>window.actualAITarget.apply('다듬은 문장','replace')),true);
      await page.waitForFunction(()=>document.querySelector('#source').value.includes('다듬은 문장'));assert.ok((await page.locator('#source').inputValue()).includes('다듬은 문장'));assert.ok((await page.locator('#source').inputValue()).includes('아래 본문'));assert.equal(await surface.locator('.visual-image-block').count(),1);
      await page.keyboard.press('Control+z');assert.equal(await page.locator('#source').inputValue(),before);

      await page.waitForFunction(()=>document.querySelector('.visual-document-surface')?.textContent.includes('수정할 문장'));const fullBefore=await page.locator('#source').inputValue();
      assert.equal(await page.evaluate(()=>{const t=window.qaAITarget('document');window.fullTarget=t;return t.sections.some(row=>row.text==='수정할 문장');}),true);
      assert.equal(await page.evaluate(()=>{const t=window.fullTarget;return t.applySections(Object.fromEntries(t.sections.map(row=>[row.id,row.text+' 수정'])));}),true);
      await page.waitForFunction(()=>document.querySelector('#source').value.includes('수정할 문장 수정'));const fullAfter=await page.locator('#source').inputValue();assert.ok(fullAfter.includes('수정할 문장 수정'));assert.equal(await surface.locator('.visual-image-block').count(),1);await page.keyboard.press('Control+z');assert.equal(await page.locator('#source').inputValue(),fullBefore);
      await surface.getByText('아래 본문',{exact:true}).click();await page.keyboard.press('End');await page.evaluate(()=>{window.actualAITarget=window.qaAITarget();});await page.keyboard.type('changed');assert.equal(await page.evaluate(()=>window.actualAITarget.apply('금지','replace')),false);
      console.log('PASS: actual VisualDocumentEditor AI target bridge, source synchronization, image/body preservation, one undo and stale target rejection');return;
    }
    if(process.argv.includes('--current-help-only')){
      await surface.waitFor();
      await page.locator('#source').focus();await page.evaluate(()=>window.setTestSource(''));
      await page.waitForFunction(()=>!document.querySelector('.visual-document-surface').textContent);
      await surface.click();
      await page.evaluate(source=>{const data=new DataTransfer();data.setData('text/plain',source);data.setData('text/html','<strong>Wrong clipboard HTML</strong>');document.querySelector('.visual-document-surface').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},helpSource);
      await page.waitForFunction(source=>document.querySelector('#source').value===source,helpSource);
      assert.equal(await page.locator('#source').inputValue(),helpSource);
      assert.equal(await surface.locator('table tbody tr:has(td)').count(),4);
      assert.ok(await surface.locator('pre').count()>=2);
      assert.ok(await surface.locator('blockquote[data-alert-type]').count()>=2);
      await page.keyboard.press('Control+z');await page.waitForFunction(()=>document.querySelector('#source').value==='');
      await page.keyboard.press('Control+y');await page.waitForFunction(source=>document.querySelector('#source').value===source,helpSource);
      await page.locator('#readonly').click();
      const names=fs.readdirSync(path.join(frontend,'public/help')).filter(name=>name.endsWith('.md'));
      for(const name of names){
        const source=fs.readFileSync(path.join(frontend,'public/help',name),'utf8').replace(/\r\n/g,'\n');
        const title=JSON.parse(source.match(/^title: (.+)$/m)[1]);
        await page.locator('#source').focus();await page.evaluate(source=>window.setTestSource(source),source);
        await page.waitForFunction(title=>document.querySelector('.visual-document-surface').textContent.includes(title),title);
        assert.equal(await page.locator('#source').inputValue(),source,name+' source changed');
      }
      assert.deepEqual(errors,[]);
      console.log('PASS: all '+names.length+' current help documents render; full help paste preserves source, code/table/callouts and undo/redo');return;
    }
    if(process.argv.includes('--heading-space-only')){
      await surface.waitFor();
      for(let level=1;level<=6;level++){
        await page.locator('#source').focus();await page.evaluate(()=>window.setTestSource(''));
        await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='');
        await surface.click();await page.keyboard.type('#'.repeat(level));
        assert.equal(await surface.locator('h1,h2,h3,h4,h5,h6').count(),0,'Hash-only input must wait for Space');
        assert.equal(await surface.locator('p').first().textContent(),'#'.repeat(level));
        await page.keyboard.press('Space');
        assert.equal(await surface.locator('h'+level).count(),1,'Space must immediately activate heading '+level);
        assert.equal(await surface.locator('h'+level).textContent(),'');
        await page.keyboard.insertText('Title '+level);
        assert.ok((await page.locator('#source').inputValue()).includes('#'.repeat(level)+' Title '+level));
      }
      await page.locator('#source').focus();await page.evaluate(()=>window.setTestSource('Existing title'));
      await surface.getByText('Existing title',{exact:true}).waitFor();await surface.locator('p').click();await page.keyboard.press('Home');await page.keyboard.type('##');
      assert.equal(await surface.locator('h2').count(),0);
      await page.keyboard.press('Space');assert.equal(await surface.locator('h2').textContent(),'Existing title');
      await page.locator('#source').focus();await page.evaluate(()=>{window.setTestSource('');window.setTestHeadingFormats(['roman']);});
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='');
      await surface.click();await page.keyboard.type('#');await page.keyboard.press('Space');
      assert.equal(await surface.locator('h1').count(),1);
      await page.keyboard.insertText('Numbered title');assert.ok((await page.locator('#source').inputValue()).includes('# Ⅰ. Numbered title'));
      assert.deepEqual(errors,[]);console.log('PASS: H1-H6 activate on Space, hashes wait as text, existing title and configured numbering preserved');return;
    }
    if(process.argv.includes('--report-numbering-only')){
      await surface.waitFor();
      await page.evaluate(()=>{
        const style=document.createElement('style');style.textContent='@layer onrivi-settings { .visual-document-surface ol{list-style-type:onrivi-report!important;} '+window.qaReportNumbering.reportNumberingCss({rules:{ol:{'list-style-type':'onrivi-report'}}})+' }';document.head.append(style);
        window.setTestSource('1. First level\n   1. Second level\n      1. Third level\n         1. Fourth level\n            1. Fifth level');
      });
      await surface.getByText('Fifth level',{exact:true}).waitFor();
      const styles=await surface.locator('ol').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).listStyleType));
      assert.deepEqual(styles,['onrivi-report','decimal','onrivi-report-hangul','onrivi-report-decimal-paren','onrivi-report-hangul-paren']);
      const labels=()=>surface.evaluate(node=>{const clone=node.cloneNode(true);window.qaReportNumbering.materializeReportNumbers(node,clone);return Array.from(clone.querySelectorAll('.onrivi-report-marker')).map(n=>n.textContent.trim());});
      assert.deepEqual(await labels(),['Ⅰ.','1.','가.','1)','가)']);
      await surface.getByText('Fifth level',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.type('Next fifth level');
      assert.deepEqual(await labels(),['Ⅰ.','1.','가.','1)','가)','나)']);
      await page.keyboard.press('Shift+Tab');
      assert.deepEqual(await labels(),['Ⅰ.','1.','가.','1)','가)','2)']);
      await page.keyboard.press('Tab');
      assert.deepEqual(await labels(),['Ⅰ.','1.','가.','1)','가)','나)']);
      const saved=await page.locator('#source').inputValue();await page.evaluate(source=>window.setTestSource(source+'\n'),saved);
      await surface.getByText('Next fifth level',{exact:true}).waitFor();
      assert.deepEqual(await labels(),['Ⅰ.','1.','가.','1)','가)','나)']);
      await page.locator('#source').focus();
      await page.evaluate(()=>{
        const style=document.createElement('style');style.textContent=window.qaHeadingNumbering.headingNumberingCss({headingNumbering:['roman','decimal','hangul','decimal-paren','hangul-paren','none']});document.head.append(style);
        window.setTestDocument('heading-numbering','# First heading\n\n## Child heading\n\n# Ⅱ. Existing heading');
      });
      await surface.getByText('Ⅱ. Existing heading',{exact:true}).waitFor({timeout:5000});
      assert.equal(await surface.locator('h1[data-onrivi-heading-numbered]').count(),1);
      await surface.getByText('Child heading',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.type(' edited');
      assert.ok((await page.locator('#source').inputValue()).includes('## Child heading edited'));
      assert.ok(!(await page.locator('#source').inputValue()).includes('## 1. Child'));
      await page.keyboard.press('Control+z');assert.ok(!(await page.locator('#source').inputValue()).includes('edited'));
      await page.evaluate(()=>window.setTestHeadingFormats(['roman',{type:'custom',number:'bullet',prefix:'',suffix:'',bullet:'◆'}]));
      await surface.getByText('◆ Child heading',{exact:true}).waitFor();
      const numberedSource=await page.locator('#source').inputValue();
      assert.ok(numberedSource.includes('# Ⅰ. First heading'));
      assert.ok(numberedSource.includes('## ◆ Child heading'));
      assert.ok(numberedSource.includes('# Ⅱ. Existing heading'));
      await surface.getByText('◆ Child heading',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.type(' updated');
      assert.ok((await page.locator('#source').inputValue()).includes('## ◆ Child heading updated'));
      await page.keyboard.press('Control+z');assert.equal(await page.locator('#source').inputValue(),numberedSource);
      await page.evaluate(()=>window.setTestHeadingFormats([{type:'custom',number:'decimal',prefix:'제',suffix:'장'},'decimal']));
      await surface.getByText('제1장 First heading',{exact:true}).waitFor();
      assert.ok((await page.locator('#source').inputValue()).includes('## 1. Child heading'));
      assert.ok(!(await page.locator('#source').inputValue()).includes('◆'));
      await page.evaluate(()=>window.setTestHeadingFormats([]));
      await surface.getByText('First heading',{exact:true}).waitFor();
      assert.ok(!(await page.locator('#source').inputValue()).includes('제1장'));
      await page.locator('#source').focus();
      await page.evaluate(()=>{window.setTestSource('# Start heading\n\nEnd body');window.setTestHeadingFormats(['roman','decimal',{type:'custom',number:'bullet',prefix:'',suffix:'',bullet:'◆'}]);});
      await surface.getByText('Ⅰ. Start heading',{exact:true}).waitFor();
      await surface.getByText('End body',{exact:true}).click();await page.keyboard.press('End');
      const beforePaste=await page.locator('#source').inputValue();
      await page.evaluate(()=>{const dt=new DataTransfer();dt.setData('text/plain','# 77. Pasted heading\n\n## Pasted child\n\n### Pasted bullet\n\n###Missing space\n\n```md\n# Code heading\n```\n\n| A | B |\n| --- | --- |\n| one | two |');document.querySelector('.visual-document-surface').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));});
      await surface.getByText('Ⅱ. Pasted heading',{exact:true}).waitFor();
      const pasted=await page.locator('#source').inputValue();
      assert.ok(pasted.includes('# Ⅱ. Pasted heading'));
      assert.ok(pasted.includes('## 1. Pasted child'));
      assert.ok(pasted.includes('### ◆ Pasted bullet'));
      assert.ok(pasted.includes('# Code heading'));
      assert.ok(!pasted.includes('77. Pasted'));
      await page.keyboard.press('Control+z');assert.equal(await page.locator('#source').inputValue(),beforePaste);
      await page.keyboard.press('Control+Shift+z');assert.ok((await page.locator('#source').inputValue()).includes('# Ⅱ. Pasted heading'));
      await page.evaluate(()=>window.qaEditorCommand('CLEAN_DOC'));
      await surface.getByText('◆ Missing space',{exact:true}).waitFor({timeout:5000});
      const cleaned=await page.locator('#source').inputValue();
      assert.ok(cleaned.includes('### ◆ Missing space'));
      assert.ok(cleaned.includes('# Ⅱ. Pasted heading'));
      assert.ok(cleaned.includes('## 1. Pasted child'));
      assert.ok(cleaned.includes('```md\n# Code heading\n```'));
      assert.equal(await surface.locator('table').count(),1);
      await page.evaluate(()=>window.qaEditorCommand('CLEAN_DOC'));
      assert.equal(await page.locator('#source').inputValue(),cleaned,'Repeated cleanup must not duplicate heading labels');
      console.log('PASS: actual Markdown paste auto-renumbers headings and bullets, preserves code/table, undo/redo and CLEAN_DOC repair/idempotency');
      console.log('PASS: actual visual editor writes numbering/bullets to Markdown, switches formats, removes labels, preserves typing and undo');
      console.log('PASS: heading decorations preserve source and native edit/undo, literal heading labels do not duplicate');
      assert.deepEqual(errors,[]);console.log('PASS: 5-level report numbering, native Enter/Tab/Shift+Tab, sequential labels, standard Markdown save/reload');return;
    }
    if(process.argv.includes('--report-table-only')){
      await surface.waitFor();await page.evaluate(()=>window.setTestSource('**표 3. 기존 자료**\n\n앞 본문\n\n뒤 본문'));
      await surface.getByText('앞 본문',{exact:true}).click();await page.keyboard.press('End');await page.keyboard.press('Enter');
      await page.evaluate(()=>window.qaEditorCommand('TABLE'));
      await page.getByLabel('표 제목',{exact:true}).fill('추진 일정');
      assert.equal(await page.getByLabel('표 번호',{exact:true}).inputValue(),'4');
      await page.keyboard.press('Enter');await surface.locator('table').waitFor();
      const saved=await page.locator('#source').inputValue();
      assert.ok(saved.includes('표 4. 추진 일정'),'Caption must survive editor insertion');
      assert.ok(saved.indexOf('표 4. 추진 일정')<saved.indexOf('|'),'Caption must precede the table in Markdown');
      assert.ok(saved.includes('뒤 본문'));
      await page.keyboard.type('담당자');assert.ok((await page.locator('#source').inputValue()).includes('담당자'));
      await page.evaluate(s=>window.setTestSource(s+'\n'),await page.locator('#source').inputValue());
      await surface.getByText('표 4. 추진 일정',{exact:true}).waitFor();
      assert.deepEqual(errors,[]);console.log('PASS: report table title and next number, insertion before table, editable first header, body preservation and reload');return;
    }
    if(process.argv.includes('--page-break-only')){
      await surface.waitFor();
      await page.evaluate(()=>{window.qaPrintRequests=0;window.addEventListener('onrivi:open-print',()=>window.qaPrintRequests++);});
      for(const source of ['- 첫째\n- 둘째','| A |\n|---|\n| B |','> 인용문','```js\n코드\n```']){
        await page.locator('#source').focus();await page.evaluate(s=>window.setTestDocument('print-'+s.slice(0,6),s),source);
        await page.waitForFunction(s=>document.querySelector('#source').value===s,source);
        assert.equal(await page.evaluate(()=>window.qaEditorCommand('PAGEBREAK')),false);
        assert.equal(await page.locator('#source').inputValue(),source);
      }
      assert.equal(await page.evaluate(()=>window.qaPrintRequests),0);
      console.log('PASS: removed editor page-break action does not change source or open duplicate UI');return;
    }
    if(process.argv.includes('--list-enter-only')){
      await surface.waitFor();
      if(process.argv.includes('--mixed-clipboard-only')){
        await page.context().grantPermissions(['clipboard-read','clipboard-write']);
        await page.locator('#source').focus();
        await page.evaluate(()=>window.setTestDocument('mixed-clipboard-test','시작 문단'));
        await page.waitForFunction(()=>window.qaView.state.doc.textContent==='시작 문단');
        await page.evaluate(async()=>{
          const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;canvas.getContext('2d').fillRect(0,0,20,20);
          const image=await new Promise(resolve=>canvas.toBlob(resolve));
          const html='<p>혼합 본문</p><table><tr><th>열 제목</th></tr><tr><td>표 내용</td></tr></table><ul><li>목록 항목</li></ul><blockquote><p>인용 내용</p></blockquote><pre><code>const mixed = 1;</code></pre><img src="'+canvas.toDataURL()+'">';
          await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob(['혼합 본문 표 내용 목록 항목 인용 내용 const mixed = 1;'],{type:'text/plain'}),'image/png':image})]);
          // The native handler was independently tested against the same mixed
          // formats; it returns null so Ctrl+V reaches the real DOM paste event.
          window.electronAPI={readClipboardImageSync:()=>null};
        });
        await surface.locator('p').first().click();await page.keyboard.press('Control+End');await page.keyboard.press('Enter');await page.keyboard.press('Control+v');
        await page.waitForFunction(()=>window.qaView.state.doc.textContent.includes('혼합 본문'));
        const saved=await page.locator('#source').inputValue();
        for(const text of ['혼합 본문','표 내용','목록 항목','인용 내용','const mixed = 1;'])assert.ok(saved.includes(text),text);
        for(const type of ['table','bullet_list','blockquote','code_block'])assert.ok(await page.evaluate(type=>{let found=false;window.qaView.state.doc.descendants(node=>{if(node.type.name===type)found=true;});return found;},type),type);
        assert.ok(await page.evaluate(()=>{let found=false;window.qaView.state.doc.descendants(node=>{if(['image','visual_image'].includes(node.type.name))found=true;});return found;}),'image');
        assert.ok(saved.includes('data:image/png;base64,'),'image source preserved');
        console.log('PASS: actual Ctrl+V of HTML+text+bitmap preserves paragraph/table/list/quote/code/image in VisualDocumentEditor');return;
      }
      await page.locator('#source').focus();
      await page.evaluate(()=>window.setTestDocument('numbered-parent-enter','3. **편안한 본문 입력**\n   - 첫 설명\n   - 둘째 설명'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('둘째 설명'));
      await page.evaluate(()=>{
        const v=window.qaView;let end;
        v.state.doc.descendants((n,p)=>{if(n.type.name==='list_item'&&n.firstChild.textContent==='편안한 본문 입력')end=p+n.nodeSize-1;});
        const tr=v.state.tr.insert(end,v.state.schema.nodes.paragraph.create());
        tr.setSelection(v.state.selection.constructor.create(tr.doc,end+1));v.dispatch(tr);v.focus();
      });
      await page.keyboard.press('Enter');
      assert.equal(await surface.locator(':scope > ol > li p').first().textContent(),'편안한 본문 입력');
      assert.equal(await surface.locator(':scope > ol').getAttribute('start'),'3');
      assert.equal(await surface.locator(':scope > ol > li ul > li').count(),2);
      assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.depth),1);
      await page.keyboard.press('Control+z');
      assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.depth),3);
      if(process.argv.includes('--continuation-only')){
        await page.locator('#source').focus();
        await page.evaluate(()=>window.setTestDocument('nested-two-enter','5. **저장 및 최종 내보내기**\n   - Ctrl + S로 저장합니다.\n   - 필요한 형식으로 내보냅니다.'));
        await page.waitForFunction(()=>window.qaView.state.doc.textContent.includes('필요한 형식'));
        await surface.locator('li p').last().click();
        await page.keyboard.press('End');await page.keyboard.press('Enter');
        assert.equal(await surface.locator('ul > li').count(),3);
        for(const depth of [3,1]){
          await page.keyboard.press('Enter');
          assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.depth),depth);
          assert.equal(await surface.locator(':scope > ol').getAttribute('start'),'5');
          assert.equal(await surface.locator('ul > li').count(),2);
        }
        await page.keyboard.type('목록 밖 본문');
        const saved=await page.locator('#source').inputValue();
        await page.locator('#source').focus();
        await page.evaluate(s=>window.setTestDocument('nested-two-enter-reload',s),saved);
        await page.waitForFunction(()=>window.qaView.state.doc.lastChild.textContent==='목록 밖 본문');
        assert.equal(await surface.locator(':scope > ol').getAttribute('start'),'5');
        assert.equal(await surface.locator('ul > li').count(),2);
        assert.deepEqual(errors,[]);
        console.log('PASS: actual Enter preserves numbered parent and nested bullets, exits only blank paragraph, and undoes in one step');return;
      }
      await page.locator('#source').focus();
      await page.evaluate(()=>window.setTestSource('- 1\\. 일번\n- 2\\. 이번\n- 3\\. 삼번\n- 4\\. 사번\n\n<p></p>'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('사번'));
      await surface.locator('li p').first().click();await page.keyboard.press('End');await page.keyboard.press('Delete');
      assert.equal(await page.evaluate(()=>window.qaView.state.selection.$head.parent.textContent),'1. 일번');
      await page.keyboard.type('X');
      assert.equal(await surface.locator('li p').first().textContent(),'1. 일번X');
      assert.ok((await surface.textContent()).includes('2. 이번'));
      for(const prefix of ['1. ','- ','- [ ] ']){
        await page.evaluate(p=>window.setTestSource(p+'마지막 항목'),prefix);
        await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='마지막 항목');
        await surface.locator('p').click();await page.keyboard.press('Control+End');await page.keyboard.press('Enter');await page.keyboard.press('Enter');
        assert.equal(await surface.locator(':scope > p').count(),1);
        await page.keyboard.type('plain after list');
        assert.equal(await surface.locator(':scope > p').textContent(),'plain after list');
        await page.evaluate(p=>window.setTestSource(p+'앞\n'+p+'지울 내용\n'+p+'뒤'),prefix);
        await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('지울 내용'));
        await surface.locator('li p').nth(1).click();await page.keyboard.press('Home');await page.keyboard.press('Shift+End');await page.keyboard.press('Backspace');await page.keyboard.press('Enter');
        assert.equal(await surface.locator(':scope > p').count(),1);
        assert.ok((await surface.locator(':scope > p').textContent()).trim()==='');
        const saved=await page.locator('#source').inputValue();assert.ok(saved.includes('<p></p>'),saved);
        await page.evaluate(s=>window.setTestSource(s+'\n'),saved);await page.waitForTimeout(80);
        await surface.locator(':scope > p').click();await page.keyboard.type('plain between lists');
        assert.equal(await surface.locator(':scope > p').textContent(),'plain between lists');
        assert.equal(await surface.locator(':scope > ol, :scope > ul').count(),2);
        assert.ok((await surface.textContent()).includes('앞'));assert.ok((await surface.textContent()).includes('뒤'));
      }
      await page.evaluate(()=>window.setTestSource('3. 홈페이지제작\n4. \n5. \n   - 한국 NCS자격 개발원\n6. 공공데이터'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('NCS'));
      await surface.evaluate(()=>{
        const v=window.qaView;let target;
        v.state.doc.descendants((n,p)=>{if(n.type.name==='list_item'&&n.childCount>1&&n.textContent.includes('NCS'))target=p+2;});
        if(target===undefined)throw Error(v.state.doc.toString());
        v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,target)));v.focus();
      });await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.depth),1);
      await page.keyboard.type('plain with sublist');
      assert.ok((await surface.locator(':scope > p').textContent()).includes('plain with sublist'));
      assert.ok((await surface.textContent()).includes('한국 NCS자격 개발원'));
      assert.ok((await surface.textContent()).includes('공공데이터'));
      await page.evaluate(()=>window.setTestSource('1. 생산성 도구\n2. 즐길거리\n3. 홈페이지제작\n\n<p></p>\n\n1. **공공데이터**\n2. [개발관련사이트](https://example.com)'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('공공데이터'));
      await surface.locator(':scope > p').click();await page.waitForTimeout(50);await page.keyboard.press('Delete');
      assert.equal(await surface.locator(':scope > ol').count(),1);assert.equal(await surface.locator(':scope > ol > li').count(),5);
      assert.ok((await page.locator('#source').inputValue()).includes('4. **공공데이터**'));
      assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.parent.textContent),'공공데이터');
      await page.keyboard.press('Control+z');assert.equal(await surface.locator(':scope > ol').count(),2);assert.equal(await surface.locator(':scope > p').count(),1);
      assert.deepEqual(errors,[]);console.log('PASS: Enter keeps editable list exits; one Delete joins numbered lists with intact text and one-step undo');return;
    }
    if(process.argv.includes('--list-indentation-only')){
      await surface.waitFor();
      if(process.argv.includes('--independent-quote-controls')){
        const help=fs.readFileSync('frontend/public/help/HELP-03_문서_저장과_세션_자동_복구의_차이.md','utf8');
        const source=help.slice(help.indexOf('- 온리비 어서는'),help.indexOf('> [!WARNING]'));
        const select=async(text,end=false)=>{await page.evaluate(({text,end})=>{const v=window.qaView;let pos;v.state.doc.descendants((n,p)=>{if(n.type.name==='paragraph'&&n.textContent.startsWith(text))pos=p+1+(end?n.content.size:0);});v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,pos)));v.focus();},{text,end});};
        const quoteX=()=>surface.locator('blockquote').first().evaluate(el=>el.getBoundingClientRect().left);
        const listLocations=()=>page.evaluate(()=>{const result=[];window.qaView.state.doc.descendants((n,p)=>{if(n.type.name!=='paragraph')return;const r=window.qaView.state.doc.resolve(p);let inQuote=false,depth=0;for(let i=1;i<=r.depth;i++){inQuote ||= r.node(i).type.name==='blockquote';if(['bullet_list','ordered_list'].includes(r.node(i).type.name))depth++;}if(!inQuote)result.push([n.textContent,depth,window.qaView.nodeDOM(p).getBoundingClientRect().left]);});return result;});
        await page.locator('#source').focus();await page.evaluate(s=>window.setTestDocument('independent-quote-controls',s),source);
        await page.waitForFunction(()=>window.qaView.state.doc.textContent.includes('만약 캐시에'));
        const initialText=await surface.textContent();
        await select('만약 캐시에',true);
        const initialDoc=await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON()));
        await page.keyboard.press('Delete');assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),initialDoc,'Delete at original list/quote boundary must be blocked');
        const initialLocations=await listLocations(),initialQuoteX=await quoteX();
        for(const key of ['Tab','Shift+Tab']){
          await select('"저장되지 않은 세션');await page.keyboard.press(key);
          assert.deepEqual(await listLocations(),initialLocations,'quote key must not move original enclosing list');
          assert.ok(key==='Tab'?await quoteX()>initialQuoteX:await quoteX()<initialQuoteX);
          await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),initialDoc);
        }
        for(const key of ['Shift+Tab','Tab','Tab','Shift+Tab']){
          await select('만약 캐시에');
          if(!await surface.locator('blockquote').count())throw Error('Quote missing before '+key+': '+await page.evaluate(()=>window.qaView.state.doc.toString())+' SOURCE '+await page.locator('#source').inputValue());
          const beforeX=await quoteX();
          const before=await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON()));
          await page.keyboard.press(key);
          assert.ok(Math.abs(await quoteX()-beforeX)<1.1,key+' must not move quote horizontally');
          assert.equal(await surface.textContent(),initialText);
          assert.equal(await page.evaluate(()=>{let inside=false;window.qaView.state.doc.descendants((n,p)=>{if(n.type.name==='blockquote'){const r=window.qaView.state.doc.resolve(p);for(let i=1;i<=r.depth;i++)inside ||= r.node(i).type.name==='list_item';}});return inside;}),false);
          const after=await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON()));
          await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),before);
          await page.keyboard.press('Control+y');assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),after);
        }
        const locationBefore=await listLocations();
        await select('"저장되지 않은 세션');const beforeX=await quoteX();await page.keyboard.press('Tab');
        assert.ok(await quoteX()>beforeX);assert.deepEqual(await listLocations(),locationBefore);
        await page.keyboard.press('Shift+Tab');assert.ok(Math.abs(await quoteX()-beforeX)<1.1);assert.deepEqual(await listLocations(),locationBefore);
        await select('만약 캐시에',true);
        const beforeDelete=await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON()));await page.keyboard.press('Delete');
        assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),beforeDelete,'Delete must not absorb quote');
        const saved=await page.locator('#source').inputValue(),beforeReloadX=await quoteX();
        await page.locator('#source').focus();await page.evaluate(s=>window.setTestDocument('independent-quote-reload',s),saved);
        await page.locator('#toggle').click();await surface.waitFor({state:'detached'});
        await page.locator('#toggle').click();await surface.waitFor();
        await page.waitForFunction(()=>window.qaView && !window.qaView.isDestroyed && !!document.querySelector('.visual-document-surface blockquote'));
        assert.ok(Math.abs(await quoteX()-beforeReloadX)<1.1,'saved quote indent must survive reload');
        assert.equal(await surface.textContent(),initialText);assert.deepEqual(errors,[]);
        console.log('PASS: actual list Tab/Shift+Tab keep quote X fixed; quote keys keep list layout fixed; Delete, undo and reload preserve boundaries');return;
      }
      if(process.argv.includes('--quote-outdent-only')){
        const help=fs.readFileSync('frontend/public/help/HELP-03_문서_저장과_세션_자동_복구의_차이.md','utf8');
        const source=help.slice(help.indexOf('- 온리비 어서는'),help.indexOf('> [!WARNING]'));
        await page.locator('#source').focus();await page.evaluate(s=>window.setTestDocument('quote-outdent-initial',s),source);
        await page.waitForFunction(()=>window.qaView.state.doc.textContent.includes('만약 캐시에'));
        const originalText=await page.evaluate(()=>window.qaView.state.doc.textContent);
        await page.evaluate(()=>{const view=window.qaView;let pos;view.state.doc.descendants((n,p)=>{if(n.type.name==='paragraph'&&n.textContent.startsWith('만약 캐시에'))pos=p+1;});view.dispatch(view.state.tr.setSelection(view.state.selection.constructor.create(view.state.doc,pos)));view.focus();});
        const beforeIndent=await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON()));
        await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),beforeIndent,'ordinary Tab then Shift+Tab must retain original nesting');
        let iteration=0;
        for(const target of ['프로그램을 다시','만약 캐시에','만약 캐시에']){
          await page.evaluate(target=>{const view=window.qaView;let pos;view.state.doc.descendants((node,p)=>{if(node.type.name==='paragraph'&&node.textContent.startsWith(target))pos=p+1;});view.dispatch(view.state.tr.setSelection(view.state.selection.constructor.create(view.state.doc,pos)));view.focus();},target);
          const before=await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON()));
          await page.keyboard.press('Shift+Tab');
          const result=await page.evaluate(()=>{const view=window.qaView;view.state.doc.check();const orphan=[];view.state.doc.descendants(n=>{if(n.type.name==='list_item'&&n.firstChild.type.name!=='paragraph')orphan.push(n.toString());});return {json:JSON.stringify(view.state.doc.toJSON()),text:view.state.doc.textContent,orphan,caret:view.state.selection.$from.parent.textContent};});
          assert.deepEqual(result.orphan,[]);assert.equal(result.text,originalText);assert.ok(result.caret.startsWith(target));
          await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),before);
          await page.keyboard.press('Control+y');assert.equal(await page.evaluate(()=>JSON.stringify(window.qaView.state.doc.toJSON())),result.json);
          const saved=await page.locator('#source').inputValue();assert.ok(!/^-\s*>/m.test(saved),saved);
          await page.locator('#source').focus();await page.evaluate(({s,id})=>window.setTestDocument(id,s),{s:saved,id:'quote-outdent-reload-'+iteration++});
          await page.waitForFunction(text=>window.qaView.state.doc.textContent===text,originalText);
        }
        await page.locator('#source').focus();await page.evaluate(()=>window.setTestDocument('quote-caret-outdent','- 상위 문장\n\n  > 인용 본문\n\n- 다음 항목'));
        await page.waitForFunction(()=>window.qaView.state.doc.textContent.includes('인용 본문'));
        await page.evaluate(()=>{const view=window.qaView;let pos;view.state.doc.descendants((n,p)=>{if(n.type.name==='paragraph'&&n.textContent==='인용 본문')pos=p+1;});view.dispatch(view.state.tr.setSelection(view.state.selection.constructor.create(view.state.doc,pos)));view.focus();});
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(()=>window.qaView.state.doc.child(1).type.name),'blockquote');
        assert.ok((await surface.textContent()).includes('상위 문장'));assert.ok((await surface.textContent()).includes('다음 항목'));
        for(const source of ['3. 상위 문장\n\n   > 인용 본문\n\n4. 다음 항목','- > 인용 본문\n\n- 다음 항목']){
          await page.locator('#source').focus();await page.evaluate(s=>window.setTestDocument('quote-only-'+s[0],s),source);
          await page.waitForFunction(()=>window.qaView.state.doc.textContent.includes('인용 본문'));
          await page.evaluate(()=>{const v=window.qaView;let pos;v.state.doc.descendants((n,p)=>{if(n.type.name==='paragraph'&&n.textContent==='인용 본문')pos=p+1;});v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,pos)));v.focus();});
          await page.keyboard.press('Shift+Tab');
          assert.equal(await page.evaluate(()=>{let bad=false;window.qaView.state.doc.descendants(n=>{if(n.type.name==='list_item'&&(!n.firstChild?.textContent || n.firstChild.type.name!=='paragraph'))bad=true;});return bad;}),false);
          if(source.startsWith('3.'))assert.ok((await page.locator('#source').inputValue()).includes('4. 다음 항목'));
        }
        assert.deepEqual(errors,[]);console.log('PASS: actual repeated Shift+Tab, quote caret, undo/redo and source reload preserve all content without extra bullets');return;
      }
      for(const separate of [false,true])for(const startOffset of [0,1]){
        await page.locator('#source').focus();
        await page.evaluate(({separate,startOffset})=>window.setTestDocument('indent-'+separate+'-'+startOffset,separate?'- sns\n\n1. **페이스북** https://www.facebook.com/\n2. 네이버 블로그 https://blog.naver.com/':'5. sns\n   - 스레드\n6. **페이스북** https://www.facebook.com/\n7. 네이버 블로그 https://blog.naver.com/'),{separate,startOffset});
        await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('페이스북'));
        const original=await surface.textContent();
        await page.evaluate(offset=>{
          const el=document.querySelector('.visual-document-surface');el.focus();
          const paragraphs=Array.from(el.querySelectorAll('p'));
          const first=paragraphs.find(p=>p.textContent.startsWith('페이스북')),last=paragraphs.find(p=>p.textContent.startsWith('네이버'));
          const a=document.createTreeWalker(first,NodeFilter.SHOW_TEXT).nextNode();
          const walker=document.createTreeWalker(last,NodeFilter.SHOW_TEXT);let b,node;while(node=walker.nextNode())b=node;
          const range=document.createRange();range.setStart(a,offset);range.setEnd(b,b.textContent.length);const s=document.getSelection();s.removeAllRanges();s.addRange(range);
        },startOffset);
        await page.waitForTimeout(50);await page.keyboard.press('Tab');
        assert.equal(await surface.textContent(),original,'Tab must preserve all selected text');
        assert.equal(await surface.locator(separate?':scope > ul > li':':scope > ol > li').count(),1,'both selected items must nest under sns');
        assert.equal(await surface.locator(separate?'ul ol > li':'ol ol > li').count(),2);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await surface.locator(separate?':scope > ul > li':':scope > ol > li').count(),3);
        assert.equal(await surface.textContent(),original);assert.equal(await surface.locator('strong').textContent(),'페이스북');
      }
      await page.locator('#source').focus();
      await page.evaluate(()=>window.setTestDocument('indent-paragraphs','첫 문단\n\n둘째 문단\n\n선택 밖'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('선택 밖'));
      await surface.evaluate(el=>{
        el.focus();const ps=el.querySelectorAll('p'),r=document.createRange();
        r.setStart(ps[0].firstChild,1);r.setEnd(ps[1].firstChild,2);
        const s=document.getSelection();s.removeAllRanges();s.addRange(r);
      });
      await page.waitForTimeout(50);await page.keyboard.press('Tab');
      let texts=await surface.locator(':scope > p').allTextContents();
      assert.match(texts[0],/^ +첫 문단$/);assert.match(texts[1],/^ +둘째 문단$/);assert.equal(texts[2],'선택 밖');
      await page.keyboard.press('Shift+Tab');
      assert.deepEqual(await surface.locator(':scope > p').allTextContents(),['첫 문단','둘째 문단','선택 밖']);
      console.log('PASS: multiple list items and paragraphs indent/outdent together without losing selected text or bold');return;
    }
    if(process.argv.includes('--typing-scroll-only')) {
      await surface.waitFor();
      await page.evaluate(()=>window.setTestSource(Array.from({length:60},(_,i)=>`문단 ${i} 본문입니다.`).join('\n\n')));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('문단 59'));
      await page.addStyleTag({content:'.custom-preview-container{height:350px;overflow:auto;overflow-anchor:none!important}.visual-document-surface{font-size:20px;line-height:1.6}.visual-document-surface p{margin:16px 0}'});
      await surface.evaluate(el=>{
        el.closest('.visual-document-editor').classList.add('custom-preview-container');
        const v=window.qaView;let pos;v.state.doc.descendants((n,p)=>{if(n.isTextblock&&n.textContent.includes('문단 30'))pos=p+1+n.content.size;});
        v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.create(v.state.doc,pos)).scrollIntoView());v.focus();
        const pane=el.closest('.custom-preview-container');
        pane.scrollTop+=v.coordsAtPos(v.state.selection.head).top-pane.getBoundingClientRect().top-150;
        window.qaScrollSamples=[];pane.addEventListener('scroll',()=>window.qaScrollSamples.push(pane.scrollTop));
      });
      await page.waitForTimeout(100);
      const before=await surface.evaluate(el=>el.closest('.custom-preview-container').scrollTop);
      await page.keyboard.type(' typing without moving viewport', {delay:15});
      await page.waitForTimeout(150);
      const after=await surface.evaluate(el=>el.closest('.custom-preview-container').scrollTop);
      assert.ok(Math.abs(before-after)<=1,JSON.stringify({before,after}));
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' long text '.repeat(45),{delay:2});
      await page.waitForTimeout(150);
      const result=await page.evaluate(()=>{const v=window.qaView,pane=v.dom.closest('.custom-preview-container'),r=v.coordsAtPos(v.state.selection.head),b=pane.getBoundingClientRect();return{top:r.top,bottom:r.bottom,viewTop:b.top,viewBottom:b.bottom,samples:window.qaScrollSamples};});
      assert.ok(result.bottom<=result.viewBottom+1&&result.top>=result.viewTop-1,JSON.stringify(result));
      assert.equal(errors.length,0);
      console.log('PASS: visible-caret typing retains viewport; wrapped text at document end keeps caret visible');
      return;
    }
    if(process.argv.includes('--image-drops-only')) {
      await surface.waitFor();
      await page.evaluate(()=>{window.qaUniquePaths=true;window.setTestSource('드롭 본문');});
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='드롭 본문');
      const drop=async names=>page.evaluate(names=>{
        const target=document.querySelector('.visual-document-surface p:last-child');const box=target.getBoundingClientRect();
        const dt=new DataTransfer();names.forEach(name=>dt.items.add(new File([new Uint8Array([1,2,3])],name,{type:'image/png'})));
        target.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:box.left+3,clientY:box.top+3}));
      },names);
      await drop(['one.png','two.png']);
      await page.waitForFunction(()=>document.querySelector('#source').value.includes('two.png'));
      assert.equal(await page.evaluate(()=>window.qaImageUploads),2);
      assert.equal(await surface.locator('.visual-image-block').count(),2);
      let saved=await page.locator('#source').inputValue();assert.ok(saved.indexOf('one.png')<saved.indexOf('two.png'),saved);
      await page.evaluate(()=>{
        const source=URL.createObjectURL(new Blob([new Uint8Array([1,2,3])],{type:'image/png'}));
        const target=document.querySelector('.visual-document-surface p:last-child'),box=target.getBoundingClientRect();
        const dt=new DataTransfer();dt.setData('text/html','<img src="'+source+'">');
        target.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:box.left+3,clientY:box.top+3}));
      });
      await page.waitForFunction(()=>document.querySelectorAll('.visual-image-block').length===3);
      assert.ok(!(await page.locator('#source').inputValue()).includes('blob:'));
      await page.evaluate(()=>{window.qaUploadFailure=true;});
      await drop(['failed.png']);
      await page.getByRole('status').filter({hasText:'테스트 저장 실패'}).waitFor();
      assert.ok(!(await page.locator('#source').inputValue()).includes('failed.png'));
      await page.evaluate(()=>{window.qaUploadFailure=false;window.qaHoldUpload=true;});
      await drop(['late.png']);
      await page.waitForFunction(()=>!!window.qaReleaseUpload);
      await page.evaluate(()=>window.setTestDocument('other-document','다른 문서'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='다른 문서');
      await page.evaluate(()=>{window.qaHoldUpload=false;window.qaReleaseUpload();});
      await page.waitForFunction(()=>document.querySelector('#source').value==='다른 문서');
      // The global capture handler must let a picturebook scene own its drop.
      const sceneResult=await page.evaluate(()=>{
        const scene=document.createElement('section');scene.className='book-page';document.body.append(scene);
        const dt=new DataTransfer();dt.items.add(new File(['x'],'scene.png',{type:'image/png'}));
        let reached=false;scene.addEventListener('drop',event=>{event.preventDefault();reached=true;});
        scene.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));scene.remove();
        return reached;
      });
      assert.equal(sceneResult,true);
      assert.deepEqual(errors,[]);
      console.log('PASS: actual image-drop parser, ordered multi-file insertion, visible save failure, stale document guard and scene event ownership');
      return;
    }
    if(process.argv.includes('--list-markers-only')) {
      await surface.waitFor();
      for(const selectedSource of ['앞 문장\n\n1. 가나다\n2. 2\\. 라마바\n   3. 아자차\n   4. 타파하','앞 문장\n\n1. 가나다\n\n2\\. 라마바\n3\\. 아자차\n4\\. 타파하']) {
      await page.evaluate(source=>{window.setSharedToolbar(true);window.setTestSource(source);},selectedSource);
      await surface.locator('ol li p').first().waitFor();
      await surface.locator('ol li p').first().click();await page.keyboard.press('Home');await page.keyboard.press('Control+Shift+End');
      await page.keyboard.press('Control+Space');
      await page.getByTitle('숫자 목록',{exact:true}).last().click();
      await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface ol > li').length===4,null,{timeout:5000}).catch(async error=>{console.error(await page.locator('#source').inputValue());throw error;});
      assert.deepEqual(await surface.locator('ol > li').allTextContents(),['가나다','라마바','아자차','타파하']);
      assert.equal(await surface.locator('li li').count(),0);
      assert.equal(await surface.locator('p').first().textContent(),'앞 문장');
      await page.evaluate(()=>window.setSharedToolbar(false));
      }
      await page.evaluate(()=>window.setTestSource('가나다\n2\\. 라마바\n3\\. 아자차\n4\\. 타파하'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('타파하'));
      await surface.locator('p').first().click();await page.keyboard.press('Control+Home');await page.keyboard.type('1. ');
      await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface ol > li').length===4,null,{timeout:5000}).catch(async error=>{console.error(await page.locator('#source').inputValue());throw error;});
      assert.deepEqual(await surface.locator('ol > li').allTextContents(),['가나다','라마바','아자차','타파하']);
      assert.equal(await surface.locator('li li').count(),0);
      await page.evaluate(()=>window.setTestSource('- 1. 가나다\n- 2. 마바사\n- [ ] 3. 아자차'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('1. 가나다'));
      assert.equal(await surface.locator('ol').count(),0);
      assert.equal(await surface.locator('li li').count(),0);
      await surface.locator('li p').first().click();await page.keyboard.press('Home');
      await page.evaluate(()=>{
        const data=new DataTransfer();data.setData('text/plain','1. 붙임\n2. 다음');
        document.querySelector('.visual-document-surface').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
      });
      assert.equal(await surface.locator('ol').count(),0);
      assert.ok((await surface.textContent()).includes('1. 붙임'));
      await page.evaluate(()=>window.setTestSource('가나다'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='가나다');
      await surface.locator('p').click();await page.keyboard.press('Home');await page.keyboard.type('1. ');
      await surface.locator('ol li').waitFor();
      await page.evaluate(()=>window.setTestSource('마바사'));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='마바사');
      await surface.locator('p').click();await page.keyboard.press('Home');await page.keyboard.type('1) ');
      await surface.locator('ol li').waitFor();
      await page.evaluate(()=>window.setTestSource(''));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='');
      await surface.locator('p').click();await page.keyboard.type('/ol');
      await page.getByRole('menu').getByRole('button',{name:'/ol',exact:true}).click();
      await surface.locator('ol li').waitFor();
      await page.evaluate(()=>window.setTestSource('- **가나다**\n- [마바사](https://example.com)\n'));
      await surface.locator('ul li').first().waitFor();
      await surface.locator('li p').first().click();await page.keyboard.press('Home');
      await page.keyboard.type('1. ');
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface ul li p')?.textContent==='1. 가나다');
      assert.equal(await surface.locator('li li').count(),0);
      assert.equal(await surface.locator('ol').count(),0);
      assert.ok((await surface.locator('strong').textContent()).includes('가나다'));
      await page.keyboard.press('Home');await page.keyboard.press('Delete');
      assert.equal(await surface.locator('ul li').first().textContent(),'. 가나다');
      assert.ok((await surface.locator('strong').textContent()).includes('가나다'));
      // Let the input-rule undo boundary expire by replacing the external source.
      await page.evaluate(()=>window.setTestSource('1. 앞 문장\n2. **가나다**\n3. [마바사](https://example.com)\n'));
      await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface ol li').length===3);
      await surface.locator('ol li p').nth(1).click();await page.keyboard.press('Home');await page.keyboard.press('Backspace');
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface > p strong')?.textContent==='가나다');
      assert.equal(await surface.locator('a').textContent(),'마바사');
      const value=await page.locator('#source').inputValue();
      assert.ok(value.includes('**가나다**'));assert.ok(value.includes('[마바사](https://example.com)'));
      assert.ok(value.includes('앞 문장'));
      await page.keyboard.press('Control+z');
      await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface ol li').length===3);
      for(const marker of ['- ','- [ ] ']) {
        await page.evaluate(marker=>window.setTestSource(['1. 가나다','2. 라마바','3. 아자차','4. 타파하'].map(text=>marker+text).join('\n')),marker);
        await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface li').length===4);
        await surface.locator('li p').first().click();await page.keyboard.press('Control+a');await page.keyboard.press('Control+Shift+0');
        await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface > p').length===4);
        assert.equal(await surface.locator('ol,ul,input[type="checkbox"]').count(),0);
        await page.waitForFunction(()=>!/<\/?div\b/i.test(document.querySelector('#source').value),null,{timeout:3000}).catch(async error=>{console.error(await page.evaluate(()=>({doc:window.qaView.state.doc.toString(),selection:window.qaView.state.selection.toJSON()})));throw error;});
      const cleared=await page.locator('#source').inputValue();
        for(let number=1;number<=4;number++)assert.ok(cleared.includes(number+'\\. '),cleared);
        await page.evaluate(value=>window.setTestSource(value+'\n'),cleared);
        await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface > p').length===4);
        assert.equal(await surface.locator('ol,ul').count(),0);
      }
      assert.deepEqual(errors,[]);
      console.log('PASS: bullet item numbers stay editable text; Backspace removes structural marker and preserves sibling text, bold, links and undo');
      return;
    }
    if (process.argv.includes('--spacing-emphasis-only')) {
      await surface.waitFor();
      const source = '# 안내서' + '\n'.repeat(45) + '**활동명(별명)**을 입력합니다.';
      await page.evaluate(value => window.setTestSource(value), source);
      await page.waitForFunction(() => document.querySelector('#source').value === '# 안내서\n\n**활동명(별명)**을 입력합니다.');
      assert.equal(await surface.locator('strong').textContent(), '활동명(별명)');
      await page.evaluate(() => window.setTestSource(''));
      await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
      await surface.click();
      await page.evaluate(value => {
        const data = new DataTransfer(); data.setData('text/plain', value);
        document.querySelector('.visual-document-surface').dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }, source);
      await page.waitForFunction(() => document.querySelector('#source').value.includes('**활동명(별명)**을') && !/\n{4,}/.test(document.querySelector('#source').value));
      assert.equal(await surface.locator('strong').textContent(), '활동명(별명)');
      assert.deepEqual(errors, []);
      const quoted="마크다운은 일반 문서 작성 프로그램과 달리 **'문단(Paragraph)'**과 **'강제 줄바꿈(Soft Break)'**을 명확히 구분하여 처리합니다:";
      await page.locator('#source').focus();
      await page.evaluate(source=>window.setTestDocument('quoted-strong-open',source),quoted);
      await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface strong').length===2);
      assert.deepEqual(await surface.locator('strong').allTextContents(),["'문단(Paragraph)'","'강제 줄바꿈(Soft Break)'"]);
      await page.locator('#source').focus();await page.evaluate(()=>window.setTestDocument('quoted-strong-paste',''));
      await page.waitForFunction(()=>window.qaView.state.doc.textContent==='');
      await surface.click();
      await page.evaluate(text=>{const data=new DataTransfer();data.setData('text/plain',text);window.qaView.dom.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},quoted);
      await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface strong').length===2);
      const saved=await page.locator('#source').inputValue();
      await page.locator('#source').focus();await page.evaluate(source=>window.setTestDocument('quoted-strong-reopen',source),saved);
      await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface strong').length===2);
      assert.deepEqual(await surface.locator('strong').allTextContents(),["'문단(Paragraph)'","'강제 줄바꿈(Soft Break)'"]);
      console.log('PASS: quoted bold before Korean particles renders on open, clipboard paste and saved-source reopen');
      const codeStrong='문단을 분리하지 않고 **`Shift + Enter`**를 누릅니다.\n\n마크다운 표준 방식인 **줄 끝에 공백 2칸을 입력하고 `Enter`**를 눌러도 동일하게 작동합니다.';
      for(const paste of [false,true]) {
        await page.locator('#source').focus();
        await page.evaluate(s=>window.setTestDocument('code-strong-'+Math.random(),s),paste?'':codeStrong);
        if(paste) {
          await page.waitForFunction(()=>window.qaView.state.doc.textContent==='');await surface.click();
          await page.evaluate(text=>{const data=new DataTransfer();data.setData('text/plain',text);window.qaView.dom.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},codeStrong);
        }
        await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface strong code').length===2);
        assert.deepEqual(await surface.locator('strong code').allTextContents(),['Shift + Enter','Enter']);
        const saved=await page.locator('#source').inputValue();
        await page.locator('#source').focus();await page.evaluate(source=>window.setTestDocument('code-strong-reopen-'+Math.random(),source),saved);
        await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface strong code').length===2);
        assert.deepEqual(await surface.locator('strong').allTextContents(),['Shift + Enter','줄 끝에 공백 2칸을 입력하고 Enter']);
      }
      console.log('PASS: both reported Korean code+bold sentences render on open/paste and saved-source reopen');
      console.log('PASS: actual editor normalizes existing source and Markdown paste, renders parenthesized bold before Korean particles');
      return;
    }
    const checkTableModal=async()=>{
    for(const submitWithEnter of [false,true]) {
      await page.evaluate(()=>window.setTestSource(''));
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='');
      await surface.locator('p').first().click();await page.keyboard.type('/table');
      await page.getByRole('menu',{name:'슬래시 명령어'}).getByRole('button',{name:'/table',exact:true}).click();
      await page.locator('[data-purpose="submit-button"]').waitFor();
      if(submitWithEnter)await page.keyboard.press('Enter');
      else await page.locator('[data-purpose="submit-button"]').click();
      await surface.locator('th').first().waitFor();
      assert.equal(await page.evaluate(()=>window.getSelection().toString()),'제목');
      assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.parent.type.name),'paragraph');
      assert.equal(await surface.evaluate(el=>el.contains(document.activeElement)),true);
      await page.keyboard.insertText('첫 헤더');
      assert.equal(await surface.locator('th').first().textContent(),'첫 헤더');
      assert.equal(await surface.locator('th').nth(1).textContent(),'제목');
    }
    console.log('PASS: table modal button/Enter insertion selects the first header text and typing replaces only that cell');
    };
    if(process.argv.includes('--table')){await checkTableModal();await browser.close();return;}

    await surface.locator('p').first().click();
    await page.keyboard.press('End');
    await page.keyboard.insertText(' 추가');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('첫 문단 추가'));
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => !document.querySelector('#source').value.includes(' 추가'));
    await page.keyboard.press('Control+y');
    await page.waitForFunction(() => document.querySelector('#source').value.includes(' 추가'));
    await page.locator('#toggle').click(); await page.locator('#toggle').click();
    await surface.locator('p').first().click(); await page.keyboard.press('Control+z');
    await page.waitForFunction(() => !document.querySelector('#source').value.includes(' 추가'));
    // Select only the first paragraph; formatting must not rewrite metadata or the next paragraph.
    await surface.locator('p').first().click(); await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    assert.equal(await page.getByRole('toolbar', { name: '선택한 글 서식' }).count(), 0);
    await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar', { name: '선택한 글 서식' }).getByRole('button', { name: 'bold', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#source').value.includes('**첫 문단**'));
    await surface.locator('p').last().click(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
    await page.keyboard.insertText('/');
    await page.getByRole('menu', { name: '슬래시 명령어' }).getByRole('button', { name: '/h2', exact: true }).click();
    await page.keyboard.insertText('새 제목');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('## 새 제목'));
    assert.ok((await page.locator('#source').inputValue()).startsWith('---\ncss_profile: system-1\n---\n'));
    await page.evaluate(() => window.setTestSource('첫 글\n\n| A | B |\n|---|---|\n| 1 | 2 |\n'));
    await page.locator('.visual-editable-table').waitFor();
    await surface.locator('p').first().click(); await page.keyboard.press('End');
    await page.keyboard.insertText(' 한글 입력');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('한글 입력'));
    assert.ok((await page.locator('#source').inputValue()).includes('| A | B |\n|---|---|\n| 1 | 2 |'));
    await page.evaluate(() => window.setTestSource('첫 항목'));
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '첫 항목');
    await surface.locator('p').first().click();
    await page.getByLabel('문단 서식').selectOption({ label: '글머리 목록' });
    await page.waitForFunction(() => document.activeElement?.classList.contains('visual-document-surface'));
    await page.keyboard.press('End');
    await page.waitForFunction(() => { const state=window.qaView.state; return state.selection.$from.parentOffset === state.selection.$from.parent.content.size; });
    await page.keyboard.press('Enter'); await page.keyboard.insertText('둘째 항목');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('둘째 항목'));
    assert.equal(await surface.locator('li').count(), 2);
    const listSource = await page.locator('#source').inputValue();
    assert.match(listSource, /[*-] 첫 항목/); assert.match(listSource, /[*-] 둘째 항목/);
    await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar', { name: '선택한 글 서식' }).waitFor();
    await page.keyboard.press('Control+Space');
    assert.equal(await page.getByRole('toolbar', { name: '선택한 글 서식' }).count(), 0);
    await page.keyboard.press('End'); await page.keyboard.press('Enter'); await page.keyboard.insertText('/');
    await page.getByRole('menu', { name: '슬래시 명령어' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('menu', { name: '슬래시 명령어' }).count(), 0);
    await page.keyboard.press('Control+Space');
    await page.getByRole('menu', { name: '슬래시 명령어' }).waitFor();
    await page.getByRole('menu', { name: '슬래시 명령어' }).getByRole('button', { name: '/h2', exact: true }).click();
    await page.keyboard.insertText('단축키 제목');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('## 단축키 제목'));
    for (const [typed, tag, expected] of [['## ', 'h2', '## 제목'], ['- ', 'ul', '- 제목'], ['> ', 'blockquote', '> 제목']]) {
      await page.evaluate(() => window.setTestSource(''));
      await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
      await surface.click(); await page.keyboard.type(typed); await page.keyboard.insertText('제목');
      await surface.locator(tag).waitFor();
      await page.waitForFunction(() => document.querySelector('#source').value.includes('제목'));
      assert.ok((await page.locator('#source').inputValue()).includes(expected), `${typed}: ${await page.locator('#source').inputValue()}`);
      assert.ok(!(await page.locator('#source').inputValue()).includes('\\##'));
    }
    await page.evaluate(() => window.setTestSource(''));
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
    await surface.click(); await page.keyboard.type('**bold**');
    await surface.locator('strong').waitFor();
    assert.equal(await surface.locator('strong').textContent(), 'bold');
    await page.evaluate(() => window.setTestSource(''));
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
    await surface.click();
    await page.evaluate(() => {
      const data = new DataTransfer(); data.setData('text/plain', '## 붙여넣은 제목\n\n**강조** 본문');
      document.querySelector('.visual-document-surface').dispatchEvent(new ClipboardEvent('paste', {clipboardData:data, bubbles:true, cancelable:true}));
    });
    await surface.locator('h2').waitFor();
    assert.equal(await surface.locator('h2').textContent(), '붙여넣은 제목');
    assert.equal(await surface.locator('strong').textContent(), '강조');
    await page.evaluate(()=>window.setTestSource('```text\nhello\n```\n'));
    const languageInput=page.getByRole('textbox',{name:'코드 블록 언어'});
    await languageInput.waitFor();await languageInput.fill('python');await languageInput.press('Tab');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('```python'));
    await page.evaluate(()=>window.setTestSource('> [!TIP]\n> Colored callout\n'));
    await surface.locator('blockquote[data-alert-type="TIP"]').waitFor();
    assert.equal(await surface.locator('blockquote').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(236, 253, 245)');
    await page.evaluate(()=>window.setTestSource('```python\nhello\n```\n'));
    await surface.locator('.visual-code-block code').waitFor();
    await surface.locator('.visual-code-block code').click();await page.keyboard.press('Control+End');await page.keyboard.press('Control+Enter');
    await page.keyboard.insertText('after code');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('after code'));
    assert.equal(await surface.locator('p').last().textContent(),'after code');
    await page.evaluate(()=>window.setTestSource('first paragraph\n\nsecond paragraph'));
    await surface.locator('p').last().waitFor();
    await page.locator('#source').focus();
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('onrivi:source-cursor',{detail:{offset:17}})));
    await page.waitForFunction(()=>window.qaView.state.selection.$from.parent.textContent==='second paragraph');
    await page.evaluate(()=>window.setTestSource('paragraph'));
    await surface.locator('p').waitFor();await surface.locator('p').click();await page.keyboard.press('End');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement===window.qaView.dom),true);
    assert.ok((await surface.locator('p').textContent()).endsWith(' '));
    await page.keyboard.press('Shift+Tab');assert.equal(await surface.locator('p').textContent(),'paragraph');
    await page.evaluate(()=>window.setTestSource('```python\nhello\n```\n'));
    await surface.locator('.visual-code-block code').waitFor();await surface.locator('.visual-code-block code').click();await page.keyboard.press('End');await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement===window.qaView.dom),true);
    assert.ok((await surface.locator('.visual-code-block code').textContent()).endsWith(' '));
    await page.evaluate(()=>window.setTestSource(''));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='');
    await surface.click();await page.keyboard.type('- [ ] ');await page.keyboard.insertText('Task one');
    await surface.getByRole('checkbox').waitFor();
    assert.ok((await page.locator('#source').inputValue()).includes('- [ ] Task one'));
    await page.keyboard.press('Enter');await page.keyboard.insertText('Task two');
    assert.equal(await surface.getByRole('checkbox').count(),2);
    await page.keyboard.press('Tab');
    assert.equal(await surface.locator('li li').count(),1);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await surface.locator('li li').count(),0);
    await surface.getByRole('checkbox').first().check();
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('- [x] Task one'));
    await page.evaluate(()=>window.setTestSource('- Bullet\n\n1. First\n2. Second\n'));
    await surface.locator('ol li').last().waitFor();
    // Reproduce the profile's !important checkbox display that used to reveal hidden inputs.
    await page.addStyleTag({content:'.visual-document-surface input[type=checkbox] { display:inline-flex!important; border:1px solid black!important; }'});
    assert.equal(await surface.locator('input[type=checkbox]').count(),0);
    assert.equal(await surface.locator('li.task-list-item').count(),0);
    await page.evaluate(()=>window.setTestSource('- [ ] Parent\n  - [x] Child\n  - Ordinary\n'));
    await surface.getByRole('checkbox').last().waitFor();
    assert.equal(await surface.getByRole('checkbox').count(),2);
    assert.equal(await surface.locator('li li').count(),2);
    assert.equal(await surface.locator('li.task-list-item').count(),2);
    await page.evaluate(()=>window.setTestSource('1. Parent\n\n- [ ] Child\n- [ ] Sibling\n'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('Sibling'));
    await surface.getByRole('checkbox').first().waitFor();
    await surface.locator('ul li p').first().click();
    await page.waitForFunction(()=>window.qaView.state.selection.$from.parent.textContent==='Child');
    await page.keyboard.press('End');await page.keyboard.press('Tab');
    await page.waitForFunction(()=>document.querySelectorAll('.visual-document-surface ol li ul li').length===1);
    let nestedSource=await page.locator('#source').inputValue();
    assert.ok(nestedSource.includes('Parent\n   - [ ] Child'),nestedSource);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await surface.locator('ol li ul li').count(),0);
    await page.evaluate(()=>window.setTestSource('alpha beta'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='alpha beta');
    await surface.locator('p').click();await page.keyboard.press('Home');await page.keyboard.press('Tab');
    assert.ok((await surface.locator('p').textContent()).startsWith(' '));
    await page.keyboard.press('Shift+Tab');assert.equal(await surface.locator('p').textContent(),'alpha beta');
    await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');await page.keyboard.press('Tab');
    assert.ok((await surface.locator('p').textContent()).includes('alpha '));
    await page.keyboard.press('Shift+Tab');assert.equal(await surface.locator('p').textContent(),'alpha beta');
    await page.evaluate(()=>window.setTestSource('space check'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='space check');
    await page.addStyleTag({content:'.custom-preview-container p { white-space:normal!important; }'});
    await surface.locator('p').click();await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');
    await page.keyboard.type('    ');
    assert.equal(await surface.locator('p').textContent(),'space     check');
    assert.equal(await surface.locator('p').evaluate(el=>getComputedStyle(el).whiteSpace),'break-spaces');
    const widths=await surface.locator('p').evaluate(el=>{const text=el.firstChild;const one=document.createRange(),many=document.createRange();one.setStart(text,5);one.setEnd(text,6);many.setStart(text,5);many.setEnd(text,9);return [one.getBoundingClientRect().width,many.getBoundingClientRect().width];});
    assert.ok(widths[1]>widths[0]*3.5,JSON.stringify(widths));
    await page.evaluate(()=>window.setTestSource('1. Parent\n   - Child\n2. Following\n'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('Following'));
    await page.addStyleTag({content:'.custom-preview-container p + ul {margin-top:1.2em!important;} .custom-preview-container li ul {margin-top:0!important;margin-bottom:0!important;}'});
    // Match the actual document container and reproduce the paragraph/list profile spacing.
    await surface.evaluate(el=>el.parentElement.classList.add('custom-preview-container'));
    const nestedList=surface.locator('li ul');
    assert.equal(await nestedList.evaluate(el=>getComputedStyle(el).marginTop),'0px');
    assert.equal(await nestedList.evaluate(el=>getComputedStyle(el).marginBottom),'0px');
    await surface.evaluate(el=>el.parentElement.classList.remove('custom-preview-container'));
    await page.evaluate(()=>window.setTestSource('first paragraph\n\nsecond paragraph'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='first paragraphsecond paragraph');
    await surface.locator('p').last().click();
    await page.waitForFunction(()=>typeof window.qaSourceCursor==='number' && window.qaSourceCursor>=17);
    await page.keyboard.press('Home');
    await page.waitForFunction(()=>window.qaSourceCursor===17);
    await page.evaluate(()=>window.setTestSource(Array.from({length:40},(_,i)=>'Paragraph '+i+' text '.repeat(10)).join('\n\n')));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('Paragraph 39'));
    const scrollPane=page.locator('.visual-document-editor');
    await scrollPane.evaluate(el=>{el.classList.add('custom-preview-container');el.style.height='400px';el.style.overflowY='scroll';window.qaSourceScroll=undefined;});
    await surface.locator('p').first().hover();await page.mouse.wheel(0,400);
    await page.waitForFunction(()=>document.querySelector('.visual-document-editor').scrollTop>0 && window.qaSourceScroll>0);
    const firstScroll=await page.evaluate(()=>window.qaSourceScroll);
    await page.mouse.wheel(0,400);await page.waitForFunction(first=>window.qaSourceScroll>first,firstScroll);
    await scrollPane.evaluate(el=>{el.classList.remove('custom-preview-container');el.style.height='';el.style.overflowY='';});
    await page.evaluate(()=>window.setTestSource('tail'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='tail');
    await surface.locator('p').click();await page.keyboard.press('End');await page.keyboard.type('    ');
    assert.equal(await surface.locator('p').textContent(),'tail    ');
    await page.keyboard.press('Enter');await page.keyboard.press('Enter');
    assert.equal(await surface.locator('p').count(),1);
    assert.ok(!(await page.locator('#source').inputValue()).includes('<br>'));
    await page.keyboard.insertText('next line');assert.ok((await surface.locator('p').textContent()).includes('next line'));
    await page.evaluate(()=>window.setTestSource('Typing stability test'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='Typing stability test');
    await surface.locator('p').click();await page.keyboard.press('End');
    await page.keyboard.type(' abcd');
    await page.waitForFunction(()=>window.qaCursorReveal===false);
    assert.equal(await surface.locator('p').textContent(),'Typing stability test abcd');
    await page.evaluate(()=>window.setTestSource(''));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='');
    await surface.click();await page.keyboard.type('###');
    assert.equal(await surface.locator('h3').count(),0);
    await page.keyboard.press('Space');await page.keyboard.insertText('Hash only heading');
    assert.equal(await surface.locator('h3').textContent(),'Hash only heading');
    await page.evaluate(()=>window.setTestSource('Previous body'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='Previous body');
    await surface.locator('p').click();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.type('###');await page.keyboard.press('Space');await page.keyboard.insertText('New heading');
    assert.equal(await surface.locator('p').first().textContent(),'Previous body');
    assert.equal(await surface.locator('h3').textContent(),'New heading');
    await page.evaluate(()=>window.setTestSource('1. First\n2. Second\n3. Third'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent==='FirstSecondThird');
    await surface.locator('p').first().click();await page.keyboard.press('Control+a');await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar',{name:'선택한 글 서식'}).getByRole('button',{name:'clear',exact:true}).click();
    assert.equal(await surface.locator('li').count(),0);assert.equal(await surface.locator('p').count(),1);
    assert.equal(await page.locator('#source').inputValue(),'First\nSecond\nThird');
    await surface.click();await page.keyboard.press('Control+a');await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar',{name:'선택한 글 서식'}).getByRole('button',{name:'checklist',exact:true}).click();
    assert.equal(await surface.getByRole('checkbox').count(),3);
    assert.ok((await page.locator('#source').inputValue()).includes('- [ ] First\n- [ ] Second\n- [ ] Third'));
    await surface.locator('p').first().click();await page.keyboard.press('Control+a');await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar',{name:'선택한 글 서식'}).getByRole('button',{name:'orderedList',exact:true}).click();
    assert.equal(await surface.locator('ol li').count(),3);assert.equal(await surface.getByRole('checkbox').count(),0);
    await surface.locator('p').first().click();await page.keyboard.press('Control+a');await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar',{name:'선택한 글 서식'}).getByRole('button',{name:'list',exact:true}).click();
    assert.equal(await surface.locator('ul li').count(),3);
    await page.evaluate(()=>window.setTestSource('1. Upper list\n\nLower line one\nLower line two'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent.includes('Lower line two'));
    const boundaryCss=mainSource.match(/\/\* Separate top-level lists retain the same gap as a following paragraph\. \*\/([\s\S]*?)`;/)[1];
    await page.addStyleTag({content:'@layer onrivi-settings { .custom-preview-container ul,.custom-preview-container ol {margin-top:4px!important;margin-bottom:4px!important;} .custom-preview-container ol + p {margin-top:1.5em!important;}'+boundaryCss+'}'});
    await surface.evaluate(el=>el.parentElement.classList.add('custom-preview-container'));
    await surface.locator('p').last().click();await page.keyboard.press('Home');await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar',{name:'선택한 글 서식'}).getByRole('button',{name:'list',exact:true}).click();
    const listGap=await surface.locator(':scope > ul').evaluate(el=>({margin:parseFloat(getComputedStyle(el).marginTop),font:parseFloat(getComputedStyle(el).fontSize)}));
    assert.ok(listGap.margin>=listGap.font*1.4,JSON.stringify(listGap));
    await surface.evaluate(el=>el.parentElement.classList.remove('custom-preview-container'));
    for(const quoteSource of ['> Quoted body','> [!TIP]\n> Tip body']){
      await page.evaluate(source=>window.setTestSource(source),quoteSource);
      await page.waitForFunction(()=>document.querySelector('.visual-document-surface blockquote'));
      await surface.locator('blockquote p').last().click();await page.keyboard.press('End');await page.keyboard.press('Control+Enter');await page.keyboard.insertText('Outside quote');
      assert.equal(await surface.locator(':scope > p').last().textContent(),'Outside quote');
      assert.ok(!(await surface.locator('blockquote').textContent()).includes('Outside quote'));
    }
    await page.evaluate(()=>window.setTestSource('> Last quote line'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface blockquote').textContent==='Last quote line');
    await surface.locator('blockquote p').click();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.press('Enter');
    assert.equal(await surface.locator(':scope > p').count(),0);
    await page.keyboard.press('Control+Enter');await page.keyboard.insertText('After blank quote line');
    assert.equal(await surface.locator(':scope > p').last().textContent(),'After blank quote line');
    await page.evaluate(()=>window.setTestSource('> [!TIP]\n> Quote first line'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface blockquote').textContent==='Quote first line');
    await surface.locator('blockquote p').click();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.insertText('Quote second line');
    assert.equal(await surface.locator('blockquote p').count(),1);
    assert.equal(await surface.locator('blockquote br:not(.ProseMirror-trailingBreak)').count(),1);
    assert.ok((await page.locator('#source').inputValue()).includes('> Quote first line\n> Quote second line'));
    await page.keyboard.press('Enter');await page.keyboard.press('Enter');
    assert.equal(await surface.locator(':scope > p').count(),0);
    await page.keyboard.insertText('Still in quote');
    assert.ok((await surface.locator('blockquote').textContent()).includes('Still in quote'));
    await page.keyboard.press('Control+Enter');await page.keyboard.insertText('After quote');
    assert.equal(await surface.locator(':scope > p').last().textContent(),'After quote');
    assert.ok((await surface.locator('blockquote').textContent()).includes('Quote second line'));
    await page.evaluate(()=>window.setTestSource('> [!TIP]\n> Keep quote\n\n###'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface h3'));
    await surface.locator('h3').click();await page.keyboard.press('Backspace');
    assert.equal(await surface.locator('h3').count(),0);
    assert.equal(await surface.locator(':scope > p').count(),1);
    assert.equal(await surface.locator('blockquote h3').count(),0);
    assert.equal(await surface.locator('blockquote').textContent(),'Keep quote');
    assert.ok(!(await page.locator('#source').inputValue()).includes('###'));
    await page.keyboard.insertText('Outside title');
    assert.equal(await surface.locator(':scope > p').textContent(),'Outside title');
    await page.evaluate(()=>window.setTestSource('> Previous quote\n\n### Title text'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface h3')?.textContent==='Title text');
    await surface.locator('h3').click();await page.keyboard.press('Home');
    await page.waitForFunction(()=>window.qaView.state.selection.$from.parent.type.name==='heading' && window.qaView.state.selection.$from.parentOffset===0);
    await page.keyboard.press('Backspace');
    assert.equal(await surface.locator(':scope > p').textContent(),'Title text');
    assert.equal(await surface.locator('blockquote').textContent(),'Previous quote');
    await page.evaluate(()=>window.setTestSource('```text\nflowchart LR\nA[Start] --> B[End]\n```'));
    await page.getByRole('textbox',{name:'코드 블록 언어'}).waitFor();
    await page.getByRole('textbox',{name:'코드 블록 언어'}).fill('mermaid');await page.getByRole('textbox',{name:'코드 블록 언어'}).press('Tab');
    await surface.locator('.visual-mermaid-preview img').waitFor();
    assert.equal(await surface.locator('.visual-code-editor-panel').evaluate(el=>el.open),false);
    await surface.getByText('코드 편집',{exact:true}).click();
    assert.equal(await surface.locator('.visual-code-editor-panel').evaluate(el=>el.open),true);
    await surface.getByRole('button',{name:'편집 완료',exact:true}).click();
    assert.equal(await surface.locator('.visual-code-editor-panel').evaluate(el=>el.open),false);
    await page.evaluate(()=>window.setTestSource('```text\n'+ 'long_line_'.repeat(200)+'\n```\n\n```text\nsecond\n```'));
    await surface.locator('.visual-code-block').nth(1).waitFor();
    const codeLayout=await surface.locator('.visual-code-block').first().evaluate(el=>{
      const pre=el.querySelector('pre');pre.scrollLeft=150;
      return {gap:el.nextElementSibling.getBoundingClientRect().top-el.getBoundingClientRect().bottom,overflow:getComputedStyle(pre).overflowX,scrollWidth:pre.scrollWidth,width:pre.clientWidth,left:pre.scrollLeft};
    });
    assert.ok(codeLayout.gap>=24);assert.equal(codeLayout.overflow,'auto');assert.ok(codeLayout.scrollWidth>codeLayout.width);assert.ok(codeLayout.left>0);
    await page.evaluate(()=>{window.qaCopiedCode=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.qaCopiedCode=value;}}});});
    await surface.locator('.visual-code-block').first().getByRole('button',{name:'코드 내용 복사'}).click();
    assert.equal(await page.evaluate(()=>window.qaCopiedCode),'long_line_'.repeat(200));
    assert.equal(await surface.locator('.visual-code-block').first().getByRole('button',{name:'코드 내용 복사'}).textContent(),'복사됨');
    console.log('PASS: consecutive code cards have spacing, horizontal scroll and exact code copying');
    const copyTableSource='| Name | Value |\n| :--- | ---: |\n| **First** | second<br>line |\n';
    await page.evaluate(source=>window.setTestSource(source),copyTableSource);
    await surface.locator('td').first().click();
    await page.getByRole('button',{name:'표 복사',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.qaCopiedCode),copyTableSource);
    console.log('PASS: table copying preserves Markdown alignment, formatting and cell line breaks');
    await checkTableModal();
    const mermaidPage=await browser.newPage({viewport:{width:1200,height:900}});
    await mermaidPage.setContent('<div id="graph"></div>');
    await mermaidPage.addScriptTag({path:path.join(frontend,'public/mermaid.min.js')});
    const viewerSource=fs.readFileSync(path.join(frontend,'src/components/MarkdownViewer.tsx'),'utf8');
    const initConfig=viewerSource.match(/mermaidObj\.initialize\(\{([\s\S]*?)\n          \}\);/)[1];
    const graphResult=await mermaidPage.evaluate(async config=>{
      const settings=Function('isDark','return ({'+config+'});')(false);
      // React attaches a circular Fiber reference to the document root. ELK's
      // diagnostic logging must not serialize that DOM through D3 selections.
      document.documentElement.__reactFiber$regression={stateNode:document.documentElement};
      window.mermaid.initialize(settings);
      const code='flowchart LR\nV[문서 직접 편집] --> C[공통 문서 명령]\nM[마크다운 보기] --> C\nA[AI·사진·표 모달] --> C\nC --> S[탭별 문서 세션]\nS --> V\nS --> M\nS --> F[기존 MD 저장소]\nS --> R[출력 전용 렌더러]\nR --> E[PDF·EPUB 등]';
      const rendered=await window.mermaid.render('mermaid-clean-qa',code);document.getElementById('graph').innerHTML=rendered.svg;
      return {nodes:document.querySelectorAll('g.node').length,svg:rendered.svg};
    },initConfig);
    assert.equal(graphResult.nodes,8);assert.ok(graphResult.svg.includes('#eaf2ff'));assert.ok(graphResult.svg.includes('rx:16px'));
    await mermaidPage.screenshot({path:path.join(dir,'mermaid-clean-diagram.png'),fullPage:true});await mermaidPage.close();
    if(process.argv.includes('--mermaid')){console.log('PASS: auto Mermaid preview, collapsed code editor and real ELK renderer with rounded blue nodes');await browser.close();return;}
    // A heading's literal numeric prefix must never become an ordered list.
    await page.evaluate(() => window.setTestSource(''));
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
    await surface.click(); await page.keyboard.type('### 1. '); await page.keyboard.insertText('기본정보');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('기본정보'));
    assert.equal(await surface.locator('h3').textContent(), '1. 기본정보');
    assert.equal(await surface.locator('ol').count(), 0);
    assert.ok((await page.locator('#source').inputValue()).includes('### 1. 기본정보'));
    await page.keyboard.press('Enter'); await page.keyboard.insertText('다음 본문');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('다음 본문'));
    assert.equal(await surface.locator('p').last().textContent(), '다음 본문');
    // Closing inline delimiters end the mark before subsequent words.
    for (const [open, close, tag] of [['**','**','strong'], ['*','*','em'], ['`','`','code']]) {
      await page.evaluate(() => window.setTestSource(''));
      await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
      await surface.click(); await page.keyboard.type(open); await page.keyboard.insertText('가나다'); await page.keyboard.type(close);
      await surface.locator(tag).waitFor();
      await page.keyboard.insertText('  마바사 아자차');
      await page.waitForFunction(() => document.querySelector('#source').value.includes('아자차'));
      assert.equal(await surface.locator(tag).textContent(), '가나다');
    }
    await page.evaluate(() => window.setTestSource('가나다 마바사'));
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '가나다 마바사');
    await surface.click(); await page.keyboard.press('Home');
    await page.waitForFunction(() => window.qaView.state.selection.$from.parentOffset === 0);
    for (let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Control+Space');
    await page.getByRole('toolbar', { name:'선택한 글 서식' }).getByRole('button', {name:'bold',exact:true}).click();
    await surface.locator('strong').waitFor(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.qaView.state.selection.empty);
    await page.keyboard.insertText(' 추가');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('추가'));
    assert.equal(await surface.locator('strong').textContent(), '가나다');
    assert.equal(await page.getByLabel('현재 입력 서식').textContent(), 'plain');
    // Reuse the existing command identifiers and user overrides, with Enter acceptance.
    await page.evaluate(() => { window.setTestSource(''); window.setTestCommands({h2:'subtitle'}); });
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
    await surface.click(); await page.keyboard.type('/subtitle');
    await page.getByRole('menu', {name:'슬래시 명령어'}).getByRole('button', {name:'/subtitle',exact:true}).waitFor();
    await page.keyboard.press('Enter'); await page.keyboard.insertText('명령 제목');
    await page.waitForFunction(() => document.querySelector('#source').value.includes('## 명령 제목'));
    await page.evaluate(() => window.setTestSource(''));
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '');
    await surface.click(); await page.keyboard.type('/math');
    await page.getByRole('menu', {name:'슬래시 명령어'}).getByRole('button', {name:'/math',exact:true}).click();
    await surface.locator('.katex').first().waitFor();
    const mathSource=await page.locator('#source').inputValue();
    assert.ok(mathSource.includes('\\frac'));assert.ok(!mathSource.includes('/math'));
    assert.ok(!mathSource.includes('ONRIVICURSOR'));
    await page.evaluate(() => { window.setTestSource('옛 툴바'); window.setSharedToolbar(true); });
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent === '옛 툴바');
    await surface.click(); await page.keyboard.press('Control+Space');
    const legacy=page.locator('#floating-toolbar'); await legacy.waitFor();
    assert.ok(await legacy.locator('img').count()>10);
    assert.equal(await page.getByRole('toolbar', {name:'선택한 글 서식'}).count(),0);
    await legacy.locator('button[title="제목 3 적용"]').click();
    await surface.locator('h3').waitFor();
    assert.equal(await surface.locator('h3').textContent(),'옛 툴바');
    await page.waitForFunction(()=>!document.querySelector('#floating-toolbar'));
    await page.keyboard.press('Control+Space'); await legacy.waitFor();
    await page.screenshot({path:path.join(dir,'legacy-floating-toolbar.png'),fullPage:true});
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.setTestSource(''));
    await page.waitForFunction(() => document.querySelector('.visual-document-surface').textContent==='');
    await surface.click(); await page.keyboard.type('/h');
    const rows=page.locator('#visual-slash-menu button');
    await page.getByRole('button',{name:'/h1',exact:true}).waitFor();
    const first=await rows.nth(0).boundingBox(),second=await rows.nth(1).boundingBox();
    assert.ok(Math.abs(first.x-second.x)<1 && second.y>first.y);
    await page.screenshot({path:path.join(dir,'legacy-slash-menu.png'),fullPage:true});
    await page.keyboard.press('Escape');
    // Use the user's complete fixture, with misleading HTML on the clipboard.
    await page.evaluate(source => window.setTestSource(source),initialSource);
    await page.waitForFunction(()=>!document.querySelector('.visual-document-surface').textContent);
    await surface.click();
    await page.evaluate(source=>{
      const data=new DataTransfer(); data.setData('text/plain',source);
      data.setData('text/html','<strong>## 잘못된 HTML 강조</strong><img src="fake.png">');
      document.querySelector('.visual-document-surface').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
    },helpSource);
    await page.waitForFunction(source=>document.querySelector('#source').value===source,helpSource);
    assert.equal(await page.locator('#source').inputValue(),helpSource);
    await surface.locator('table').waitFor();
    assert.equal(await surface.locator('th').first().evaluate(el=>getComputedStyle(el).textAlign),'center');
    assert.equal(await surface.locator('h2').count(),(helpSource.match(/^## /gm)||[]).length);
    assert.equal(await surface.locator('h3').count(),(helpSource.match(/^### /gm)||[]).length);
    assert.equal(await surface.locator('table tbody tr:has(td)').count(),4);
    assert.ok(await surface.locator('pre').count()>=2);
    assert.equal(await surface.locator('.visual-code-block code').first().getAttribute('spellcheck'),'false');
    assert.ok(await surface.locator('.visual-readonly-callout, blockquote[data-alert-type]').count()>=2);
    const helpLinks=await surface.locator('a').evaluateAll(links=>links.map(link=>decodeURI(link.getAttribute('href')||'')));
    assert.ok(helpLinks.filter(href=>href==='./00_시작하기.md').length>=1);
    await page.keyboard.press('Control+z');
    await page.waitForFunction(source=>document.querySelector('#source').value===source,initialSource);
    await page.keyboard.press('Control+y');
    await page.waitForFunction(source=>document.querySelector('#source').value===source,helpSource);
    await surface.locator('table').waitFor();
    assert.equal(await surface.locator('th').first().evaluate(el=>getComputedStyle(el).textAlign),'center');
    await page.screenshot({path:path.join(dir,'full-help-paste.png'),fullPage:true});
    if(process.argv.includes('--help')) {
      console.log('PASS: current complete help document rendering, examples, links, exact clipboard source and undo/redo');
      await browser.close();return;
    }
    const secondHelp=fs.readFileSync(path.join(frontend,'public/help/HELP-30_코드블록_입력_편집_복사.md'),'utf8');
    await page.evaluate(source=>window.setTestSource(source),secondHelp);
    await page.waitForFunction(source=>document.querySelector('#source').value===source,secondHelp);
    await page.waitForTimeout(50);
    await surface.locator('.visual-code-block code').first().waitFor();
    const codeElement=surface.locator('.visual-code-block code').first();
    const plainCode=await codeElement.textContent();
    assert.ok(plainCode.includes('const message'));
    const beforeClick=await page.locator('#source').inputValue();
    await codeElement.click();
    assert.equal(await page.locator('#source').inputValue(),beforeClick);
    assert.equal(await codeElement.getAttribute('spellcheck'),'false');
    const timing=await page.evaluate(async()=>{
      const view=window.qaView,position=view.state.selection.from;
      const start=performance.now();view.dispatch(view.state.tr.insertText('검사',position));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return performance.now()-start;
    });
    assert.ok(timing<1500,`Code editing unexpectedly stalled for ${timing}ms`);
    console.log(`HELP-30 code edit + two animation frames: ${timing.toFixed(1)}ms`);
    await surface.locator('p').first().click();
    await page.keyboard.press('End');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.visual-persistent-caret')).display === 'block');
    assert.equal(await page.locator('.visual-persistent-caret').evaluate(el => getComputedStyle(el).width), '3px');
    await page.evaluate(()=>{window.qaBeforeP=document.querySelector('.visual-document-surface p');window.qaBeforeCode=document.querySelector('.visual-code-block code');});
    await page.waitForFunction(()=>window.qaView.state.selection.$from.parent.textContent===document.querySelector('.visual-document-surface p').textContent);
    const beforeRefresh=await page.evaluate(() => window.qaView.state.selection.head);
    await page.evaluate(() => window.setTestSource(document.querySelector('#source').value.replace('system-1','system-2')));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.qaView.state.selection.head),beforeRefresh);
    assert.equal(await page.evaluate(()=>window.qaBeforeP===document.querySelector('.visual-document-surface p')),true);
    assert.equal(await page.evaluate(()=>window.qaBeforeCode===document.querySelector('.visual-code-block code')),true);
    assert.equal(await surface.evaluate(el => el.contains(document.activeElement)),true);
    await page.screenshot({path:path.join(dir,'code-block-display.png'),fullPage:true});
    await page.evaluate(()=>window.setTestSource('테스트'));
    await surface.locator('p').first().click();
    await page.keyboard.press('End');
    await page.keyboard.insertText(' /제목3');
    await page.locator('#visual-slash-menu button[data-selected="true"][aria-label="/h3"]').waitFor();
    await page.keyboard.press('Enter');
    await surface.locator('h3').waitFor();
    await page.evaluate(()=>window.setTestSource('테스트'));
    await surface.locator('p').first().click();
    await page.keyboard.press('End');
    await page.evaluate(()=>window.setTestCommands({bold:'strongtext'}));
    await page.keyboard.insertText(' /strongtext');
    await page.locator('#visual-slash-menu button[data-selected="true"][aria-label="/strongtext"]').waitFor();
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('강조');
    await surface.locator('strong').waitFor();
    await page.evaluate(()=>{window.setTestSource('설정 테스트');window.setTestHotkeys({bold:'Ctrl+Alt+B'});});
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent === '설정 테스트');
    await surface.locator('p').first().click();
    await page.keyboard.press('End');
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.keyboard.press('Control+Alt+b');
    await surface.locator('strong').waitFor();
    await page.evaluate(source=>window.setTestSource(source),sceneExample);
    await surface.locator('.visual-code-block').waitFor();
    assert.equal(await surface.locator('.visual-source-block').count(),0);
    const colors=await surface.locator('.visual-code-block code').evaluate(el=>({text:getComputedStyle(el).color,background:getComputedStyle(el.closest('.visual-code-block')).backgroundColor}));
    assert.notEqual(colors.text,colors.background);
    // Image insertion keeps the captured position while the dialog is open.
    await page.evaluate(()=>window.setTestSource('前文\n\n後文\n'));
    await surface.locator('p').first().click(); await page.keyboard.press('End');
    await page.getByRole('button',{name:'image',exact:true}).click();
    await page.keyboard.insertText('追記');
    assert.equal(await page.evaluate(()=>window.qaImageDialog.insert('media/picture.png?width=200&align=right','説明')),true);
    await surface.locator('.visual-image-block').waitFor();
    assert.ok((await page.locator('#source').inputValue()).includes('![説明](media/picture.png?width=200&align=right)'));
    await surface.locator('.visual-image-block').hover();
    await page.getByRole('button',{name:'이미지 편집',exact:true}).click();
    assert.ok(await page.evaluate(()=>window.qaImageDialog.source.includes('picture.png')));
    assert.equal(await page.evaluate(()=>window.qaImageDialog.insert('media/replacement.png?width=300&align=left','교체')),true);
    assert.equal(await surface.locator('.visual-image-block').count(),1);
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('replacement.png'));
    await page.keyboard.press('Control+z');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('picture.png'));
    await page.keyboard.press('Control+y');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('replacement.png'));
    await surface.locator('p').last().click();
    await page.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([1])],'clipboard.png',{type:'image/png'}));document.querySelector('.visual-document-surface').dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));});
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('test-paste.png'));
    assert.equal(await page.evaluate(()=>window.qaImageUploads),1);
    await page.evaluate(()=>{window.electronAPI={readClipboardImageSync:()=> 'data:image/png;base64,AQ=='};});
    await surface.locator('p').last().click();
    await page.keyboard.press('Control+v');
    await page.waitForFunction(()=>window.qaImageUploads===2);
    await page.waitForFunction(()=>document.querySelectorAll('.visual-image-block').length===3);
    await page.evaluate(()=>{delete window.electronAPI;const el=document.querySelector('.visual-document-surface p:last-child');const rect=el.getBoundingClientRect();const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([1])],'drag.png'));el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:rect.left+3,clientY:rect.top+3}));});
    await page.waitForFunction(()=>window.qaImageUploads===3);
    await page.waitForFunction(()=>document.querySelectorAll('.visual-image-block').length===4);

    await page.getByRole('button',{name:'image',exact:true}).click();
    await page.locator('#toggle').click();
    assert.equal(await page.evaluate(()=>window.qaImageDialog.insert('media/stale.png','')),false);
    await page.locator('#toggle').click();
    assert.ok(!(await page.locator('#source').inputValue()).includes('stale.png'));
    await page.evaluate(()=>window.setTestSource('미디어 테스트'));
    await surface.locator('p').first().click(); await page.keyboard.press('End');
    await page.keyboard.insertText(' /동영상');
    await page.locator('#visual-slash-menu button[data-selected="true"][aria-label="/video"]').waitFor();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.qaMediaDialog.kind),'video');
    assert.equal(await page.evaluate(()=>window.qaMediaDialog.insert('<video src="/media/clip.mp4?v=1" title="영상" controls style="width:320px; height:180px;" data-align="left"></video>')),true);
    await page.getByRole('button',{name:'동영상 편집'}).waitFor({state:'attached'});
    await surface.locator('.visual-media-block').hover();
    await page.getByRole('button',{name:'동영상 편집'}).click();
    assert.ok(await page.evaluate(()=>window.qaMediaDialog.source.includes('clip.mp4')));
    assert.equal(await page.evaluate(()=>window.qaMediaDialog.insert('<video src="/media/replaced.mp4" controls></video>')),true);
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('replaced.mp4'));
    await page.evaluate(()=>{window.electronAPI={copyTextToClipboard:async text=>{window.qaCopiedMedia=text;}};});
    await surface.locator('.visual-media-block').hover();
    await page.getByRole('button',{name:'미디어 참조 복사'}).click();
    await page.waitForFunction(()=>window.qaCopiedMedia?.includes('replaced.mp4'));
    await surface.locator('p').last().click();
    await page.keyboard.insertText(' /지도');
    await page.locator('#visual-slash-menu button[data-selected="true"][aria-label="/map"]').waitFor();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.qaMediaDialog.kind),'map');
    assert.equal(await page.evaluate(()=>window.qaMediaDialog.insert('<iframe src="https://maps.google.com/maps?q=37.5,127&z=12&output=embed" style="width:300px; height:200px;" data-align="right"></iframe>')),true);
    await page.getByRole('button',{name:'지도 편집'}).waitFor({state:'attached'});
    await surface.locator('.visual-media-block').last().hover();
    await page.getByRole('button',{name:'지도 편집'}).click();
    assert.ok(await page.evaluate(()=>window.qaMediaDialog.source.includes('maps.google.com')));
    await page.evaluate(()=>{delete window.electronAPI;});
    await page.evaluate(()=>window.setTestSource('| 이름 | 금액 |\n| :--- | ---: |\n| 가나다 | 10 |\n'));
    await surface.locator('.visual-editable-table').waitFor();
    await surface.locator('td p').first().click();await page.keyboard.press('End');await page.keyboard.insertText('수정|값');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('수정\\|값'));
    assert.equal(await surface.locator('th').first().evaluate(el=>getComputedStyle(el).textAlign),'center');
    assert.equal(await surface.locator('td').last().evaluate(el=>getComputedStyle(el).textAlign),'right');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.parent.textContent),'10');
    await page.keyboard.press('Tab');
    assert.equal(await surface.locator('tr').count(),3);
    assert.equal(await page.evaluate(()=>window.qaView.state.selection.$from.index(window.qaView.state.selection.$from.depth-2)),0);
    await page.getByRole('button',{name:'행 삭제',exact:true}).click();
    assert.equal(await surface.locator('tr').count(),2);
    await page.getByRole('button',{name:'행 추가',exact:true}).click();
    assert.equal(await surface.locator('tr').count(),3);
    await page.getByRole('button',{name:'열 추가',exact:true}).click();
    assert.equal(await surface.locator('tr').first().locator('th').count(),3);
    await page.getByRole('button',{name:'열 삭제',exact:true}).click();
    assert.equal(await surface.locator('tr').first().locator('th').count(),2);
    await page.getByRole('button',{name:'행 삭제',exact:true}).click();
    assert.equal(await surface.locator('tr').count(),2);
    await page.keyboard.press('Control+z');await page.waitForFunction(()=>document.querySelectorAll('.visual-editable-table tr').length===3);
    await page.evaluate(()=>window.setTestSource(''));
    await surface.locator('p').first().click();
    await page.getByRole('button',{name:'table',exact:true}).click();
    await page.locator('[data-purpose="submit-button"]').click();
    await surface.locator('.visual-editable-table').waitFor();
    assert.equal(await surface.locator('th').count(),2);
    await page.keyboard.insertText('헤더수정');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('헤더수정'));
    await page.keyboard.press('Home');await page.keyboard.insertText('# ');
    assert.ok((await surface.locator('th').first().textContent()).startsWith('# '));
    await page.getByRole('button',{name:'표 아래 본문',exact:true}).click();
    await page.keyboard.insertText('표 뒤 본문');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('표 뒤 본문'));
    await page.evaluate(()=>window.setTestSource('취소선 일반'));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent === '취소선 일반');
    await surface.locator('p').first().click();await page.keyboard.press('Home');
    for(let i=0;i<3;i++)await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Control+Shift+x');
    await surface.locator('s').waitFor();
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('~~취소선~~'));
    await page.keyboard.press('ArrowRight');await page.keyboard.insertText('보통');
    assert.equal(await surface.locator('s').textContent(),'취소선');
    await page.evaluate(()=>window.setTestSource(''));
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface').textContent === '');
    await surface.locator('p').first().click();await page.keyboard.insertText('/note');
    await page.getByRole('menu').getByRole('button',{name:'/note',exact:true}).click();
    await page.keyboard.insertText('참고 내용');
    await surface.locator('blockquote[data-alert-type="NOTE"]').waitFor();
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('> [!NOTE]') && document.querySelector('#source').value.includes('> 참고 내용'));
    await page.keyboard.press('Control+Shift+2');
    assert.equal(await surface.locator('blockquote').getAttribute('data-alert-type'),'TIP');
    await page.evaluate(()=>window.setTestSource('> [!WARNING]\n> 기존 인용\n'));
    await surface.locator('blockquote[data-alert-type="WARNING"]').waitFor();
    await surface.locator('blockquote p').click();await page.keyboard.press('End');await page.keyboard.insertText(' 수정');
    await page.waitForFunction(()=>document.querySelector('#source').value.includes('[!WARNING]') && document.querySelector('#source').value.includes('수정'));
    await page.locator('#readonly').click();
    assert.equal(await surface.getAttribute('contenteditable'), 'false');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.visual-persistent-caret')).display === 'none');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(dir, 'editor.png'), fullPage: true });
    console.log('PASS: editable table cells, row/column tools, table insertion, strike boundaries and tagged quotes');
    console.log('PASS: image insertion, replacement, undo/redo, native clipboard, file drop and stale document guard');
    console.log('PASS: complete HELP paste/render, misleading HTML rejection, metadata and MD preservation, undo/redo, toolbar and syntax regression');
  } finally { await browser.close(); }
}
if (process.argv.includes('--visual')) visual().catch(error => { console.error(error); process.exitCode = 1; });
