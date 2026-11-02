const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=require('../frontend/node_modules/typescript');
const main=fs.readFileSync('frontend/src/components/MainEditorApp.tsx','utf8');
const hooks=fs.readFileSync('frontend/src/hooks/useEditorHandlers.ts','utf8');
const syncStart=main.indexOf('    // 모드 전환 전 에디터 내용을');
const syncEnd=main.indexOf('    setPreviewModeRaw(',syncStart);
const sync=ts.transpile(main.slice(syncStart,syncEnd),{target:7});
const prepareStart=hooks.indexOf('  const prepareEditorForExport =');
const prepareEnd=hooks.indexOf('\n  // 날짜',prepareStart);
const prepare=ts.transpile(hooks.slice(prepareStart,prepareEnd),{target:7});
const before='before\n\nold position\n';
const adjusted='before\n\n<!-- onrivi:page-break -->\n\nafter\n';
// Execute the actual export routing case: opening/closing the PDF modal must
// not unmount the visual editor or reset its undo/spacing state.
const routeStart=main.indexOf("        // Export uses the existing read-only renderer");
const routeEnd=main.indexOf('      // 보기/제어 관련',routeStart);
const route=main.slice(routeStart,routeEnd).replace(/\n\s*}\s*$/, '');
for(const type of ['OPEN_EXPORT','PRINT']) {
 let switches=0,opened=0,printed=0;
 const pending={current:null};
 new Function('type','directEditEnabled','previewRef','pendingVisualExportRef','setDirectEditEnabled','setPreviewMode','previewMode','handlers',route)(type,true,{current:{querySelector(){return {};}}},pending,()=>switches++,()=>switches++,'preview',{openExport(){opened++;},print(){printed++;}});
 assert.equal(switches,0,'PDF route must retain live visual editor');
 assert.equal(pending.current,null);
 assert.equal(opened,type==='OPEN_EXPORT'?1:0);assert.equal(printed,type==='PRINT'?1:0);
}
(async()=>{
 for(const initialMode of ['both','preview']){
  const contentRef={current:adjusted},previewModeRef={current:initialMode},editorRef={current:{getValue(){return before;}}};
  let mounted=true,reads=0;
  const previewRef={current:{querySelector(){return mounted?{}:null;}}};
  const updateContent=value=>{contentRef.current=value;};
  new Function('editorRef','previewModeRef','previewRef','previewDebounceRef','contentRef','setContent',sync)(editorRef,previewModeRef,previewRef,{current:null},contentRef,updateContent);
  assert.equal(contentRef.current,adjusted,'Opening export must not restore stale Monaco source');
  mounted=false;previewModeRef.current='preview';
  editorRef.current.getValue=()=>{reads++;return before;};
  const run=new Function('editorRef','previewModeRef','previewRef','contentRef','updateContent','waitForExportContent','showToast','document','requestAnimationFrame',prepare+';return prepareEditorForExport();');
  const result=await run(editorRef,previewModeRef,previewRef,contentRef,updateContent,async(root,expected)=>assert.equal(expected,adjusted),()=>{}, {createElement(){return {style:{},focus(){},blur(){},remove(){}}},body:{appendChild(){}}},cb=>cb());
  assert.equal(result,true);assert.equal(reads,0);assert.equal(contentRef.current,adjusted,'Saving PDF after visual editor unmount must retain manual breaks');
 }
 console.log('PASS: both/preview -> read-only export modal -> PDF save preserves adjusted document, without reading hidden stale Monaco.');
})().catch(e=>{console.error(e);process.exitCode=1;});
