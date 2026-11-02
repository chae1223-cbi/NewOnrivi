const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve('.'),frontend=path.join(root,'frontend'),req=require('node:module').createRequire(path.join(frontend,'package.json')),ts=req('typescript');
const dir=path.join(root,'.tmp/pagination-qa');fs.mkdirSync(dir,{recursive:true});
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(frontend,'src',file),'utf8'),{compilerOptions:{module:1,target:7,jsx:4,esModuleInterop:true}}).outputText;
for(const file of ['lib/browserAccountStorage.ts','lib/defaultWatermark.ts','lib/pageGeometry.ts','lib/paginatedPrint.ts','lib/documentPrintSettings.ts','lib/frontmatter.ts','constants/paperSizes.ts']){
 const out=path.join(dir,file.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,compile(file));
}
const geometry=require(path.join(dir,'lib/pageGeometry')),settings=require(path.join(dir,'lib/documentPrintSettings'));
assert.equal(geometry.resolvePageGeometry({paperSize:'a4',orientation:'landscape'}).width,297);
assert.equal(geometry.resolvePageGeometry({paperSize:'a4'}).contentHeight,261);
assert.throws(()=>geometry.resolvePageGeometry({paperSize:'a4',marginTop:'300mm'}));
const raw='---\ntitle: 保留\ncss_profile: custom\n---\n\n본문';const saved=settings.writePrintSettings(raw,{...settings.DEFAULT_PRINT_SETTINGS,enabled:true,text:'검토용 "<초안>"'});
assert.equal(settings.readPrintSettings(saved).text,'검토용 "<초안>"');assert.ok(saved.includes('title: 保留'));assert.ok(saved.endsWith('본문'));
assert.equal(settings.writePrintSettings(saved,settings.readPrintSettings(saved)),saved);
fs.writeFileSync(path.join(dir,'ts-loader.cjs'),`const ts=require(${JSON.stringify(require.resolve(path.join(frontend,'node_modules/typescript')))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{module:99,target:7,jsx:4,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(dir,'css-loader.cjs'),'module.exports=function(){return "";};');
fs.writeFileSync(path.join(dir,'resourceStub.js'),`exports.saveResourceMedia=async(file,name)=>{window.savedImage={name,size:file.size};return '/media/'+name;};`);
fs.writeFileSync(path.join(dir,'entry.js'),`window.paginate=require('./lib/paginatedPrint').paginatePrintHtml;window.defaults=require('./lib/documentPrintSettings').DEFAULT_PRINT_SETTINGS;window.runExport=require(${JSON.stringify(path.join(frontend,'src/lib/exportHandlers.ts'))}).exportPDF;window.runEpub=require(${JSON.stringify(path.join(frontend,'src/lib/exportHandlers.ts'))}).exportEPUB;window.exportDocx=require(${JSON.stringify(path.join(frontend,'src/lib/exportHandlers.ts'))}).exportDOCX;window.exportHwpx=require(${JSON.stringify(path.join(frontend,'src/lib/exportHandlers.ts'))}).exportHWPX;window.headingNumbering=require(${JSON.stringify(path.join(frontend,'src/lib/headingNumbering.ts'))});window.numbering=require(${JSON.stringify(path.join(frontend,'src/lib/reportNumbering.ts'))});window.reportProfile=require(${JSON.stringify(path.join(frontend,'src/constants/cssProfile.ts'))}).SYSTEM_PROFILES.find(p=>p.id==='ai-friendly-report');
const React=require('react'),{createRoot}=require('react-dom/client'),Guides=require(${JSON.stringify(path.join(frontend,'src/components/DocumentPageGuides.tsx'))}).default,Modal=require(${JSON.stringify(path.join(frontend,'src/components/ExportModal.tsx'))}).default;
window.mountGuides=css=>{
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 function App(){const host=React.useRef(null);return React.createElement('div',{className:'custom-preview-container'},React.createElement('div',{className:'preview-page-sheet',style:{width:'210mm',paddingBottom:'48px'}},React.createElement('section',{className:'visual-document-editor'},React.createElement('div',{style:{position:'relative'}},React.createElement('div',{ref:host},React.createElement('div',{className:'visual-document-surface',style:{boxSizing:'border-box',padding:'18mm 12mm',border:'1px solid'}},React.createElement('p',{},'Last paragraph'))),React.createElement(Guides,{host,style:{paperSize:'a4'},source:'Last paragraph'})))));}
 const div=document.createElement('div');div.style.width='500px';document.body.append(div);createRoot(div).render(React.createElement(App));
};
window.mountModal=(id='one',content='본문')=>{if(!window.modalRoot){const div=document.createElement('div');document.body.append(div);window.modalRoot=createRoot(div);}window.modalRoot.render(React.createElement(Modal,{isOpen:true,onClose(){},onExport(){},isDarkMode:false,documentId:id,documentContent:content,onOpenWatermarkSettings:()=>{window.settingsRequested=true;},onPagePreview:async(settings,signal)=>{await new Promise(resolve=>setTimeout(resolve,100));signal.throwIfAborted();return '<html><body data-onrivi-pages="2">'+settings.text+'</body></html>';}}));};`);
async function main(){
 await new Promise((resolve,reject)=>req('webpack')({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js',publicPath:'/'},resolve:{extensions:['.ts','.tsx','.js'],alias:{'@/lib/resourceMedia':path.join(dir,'resourceStub.js'),'@':path.join(frontend,'src')},fallback:{fs:false,path:false,crypto:false},modules:[path.join(frontend,'node_modules'),'node_modules']},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(dir,'ts-loader.cjs')},{test:/\.css$/,use:path.join(dir,'css-loader.cjs')}]},devtool:false},(error,stats)=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString('errors-only'))):resolve()));
 const server=http.createServer((request,response)=>{
  const policy=fs.readFileSync(path.join(frontend,'public/_headers'),'utf8').split(/\r?\n/).find(line=>line.trim().startsWith('Content-Security-Policy:'))?.trim().slice('Content-Security-Policy:'.length).trim();
  if(policy)response.setHeader('Content-Security-Policy',policy);
  if(request.url==='/pagedjs/paged.polyfill.js'){response.setHeader('Content-Type','application/javascript');response.end(fs.readFileSync(path.join(frontend,'public/pagedjs/paged.polyfill.js')));}
  else if(request.url==='/bundle.js'){response.setHeader('Content-Type','application/javascript');response.end(fs.readFileSync(path.join(dir,'bundle.js')));}
  else if(/^\/[\w.-]+\.js$/.test(request.url)&&fs.existsSync(path.join(dir,request.url.slice(1)))){response.setHeader('Content-Type','application/javascript');response.end(fs.readFileSync(path.join(dir,request.url.slice(1))));}
  else {response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<!doctype html><meta charset="utf-8"><script src="/bundle.js"></script>');}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1100,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  if(process.argv.includes('--guides-only')) {
    const source=fs.readFileSync(path.join(frontend,'src/components/VisualDocumentEditor.tsx'),'utf8');
    const start=source.indexOf('const geom = resolvePageGeometry(pageStyle)');
    const css=source.slice(start).match(/<style>\{`([\s\S]*?)`\}<\/style>/)[1];
    const resolvedCss=new Function('geom','return `'+css+'`;')(geometry.resolvePageGeometry({paperSize:'a4'}));
    await page.evaluate(css=>window.mountGuides(css),resolvedCss);
    await page.waitForFunction(()=>document.querySelector('.visual-document-surface')?.style.getPropertyValue('--onrivi-sheet-min-height'));
    const layout=await page.evaluate(()=>{
      const surface=document.querySelector('.visual-document-surface'),sheet=document.querySelector('.preview-page-sheet');
      return {width:surface.getBoundingClientRect().width,height:surface.getBoundingClientRect().height,padding:getComputedStyle(sheet).paddingBottom};
    });
    assert.ok(Math.abs(layout.width-210*96/25.4)<2,'A4 width must remain physical even in narrow viewport');
    assert.ok(Math.abs(layout.height-297*96/25.4)<3,'Last sheet must complete A4 height');
    assert.equal(layout.padding,'0px','No extra bottom padding outside sheet');
    const edge=await page.locator('.onrivi-page-guides > div').last().evaluate(node=>parseFloat(node.style.top));
    assert.ok(Math.abs(edge-layout.height)<3,'Final paper edge must coincide with sheet bottom');
    await page.screenshot({path:path.join(dir,'guide-layout.png'),fullPage:true});
    console.log('PASS: actual DocumentPageGuides with actual editor sheet CSS retains A4 width, bottom height, and no extra outer padding.');return;
  }
  const html=await page.evaluate(async()=>window.paginate('<html><head><style>body{font:16px/1.6 Arial}p{margin:0 0 12px}</style></head><body><h1>First page</h1><p>Before break</p><div data-onrivi-page-break>나누기</div><div data-onrivi-page-break>나누기</div><h2>Second page</h2><p>After break</p></body></html>',{paperSize:'a5',orientation:'portrait',marginTop:'12mm',marginBottom:'12mm',marginLeft:'10mm',marginRight:'10mm'},{...window.defaults,enabled:true,kind:'text',text:'DRAFT <safe>',excludeFirst:true}));
  fs.writeFileSync(path.join(dir,'preview.html'),html);
  await page.setContent(html);assert.equal(await page.locator('.pagedjs_page').count(),2);
  assert.equal(await page.locator('.onrivi-watermark').count(),1);assert.equal(await page.locator('.pagedjs_page').nth(1).locator('.onrivi-watermark').textContent(),'DRAFT <safe>');
  assert.equal(await page.locator('.onrivi-watermark safe').count(),0);
  await page.pdf({path:path.join(dir,'text.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.screenshot({path:path.join(dir,'preview.png'),fullPage:true});
  const pdfjs=await import(require('node:url').pathToFileURL(path.join(frontend,'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
  const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(path.join(dir,'text.pdf'))),useSystemFonts:true}).promise;
  assert.equal(pdf.numPages,2);
  const first=await (await pdf.getPage(1)).getTextContent(),second=await(await pdf.getPage(2)).getTextContent();
  assert.ok(first.items.some(t=>t.str.includes('Before break')));assert.ok(!first.items.some(t=>t.str.includes('DRAFT')));
  assert.ok(second.items.some(t=>t.str.includes('After break')));assert.ok(second.items.some(t=>t.str.includes('DRAFT')));
  const size=(await pdf.getPage(1)).view;assert.ok(Math.abs(size[2]-148/25.4*72)<2);
  // Reload fixture entry for another pagination pass after viewing standalone output.
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const imageHtml=await page.evaluate(async()=>window.paginate('<p>Landscape page</p><div data-onrivi-page-break></div><p>Next page</p>',{paperSize:'a4',orientation:'landscape'},{...window.defaults,enabled:true,kind:'image',image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWo4AAAAASUVORK5CYII=',rotation:0}));
  await page.setContent(imageHtml);assert.equal(await page.locator('.onrivi-watermark img').count(),2);
  assert.equal(await page.locator('.onrivi-watermark img').first().evaluate(img=>img.complete&&img.naturalWidth>0),true);
  await page.pdf({path:path.join(dir,'image.pdf'),preferCSSPageSize:true,printBackground:true});
  const imagePdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(path.join(dir,'image.pdf')))}).promise;
  assert.equal(imagePdf.numPages,2);assert.ok((await imagePdf.getPage(1)).view[2]>(await imagePdf.getPage(1)).view[3]);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const auto=await page.evaluate(async()=>window.paginate(Array.from({length:80},(_,i)=>'<p>Paragraph '+i+' '+('flowing text '.repeat(15))+'</p>').join(''),{paperSize:'a5'},{...window.defaults}));
  await page.setContent(auto);assert.ok(await page.locator('.pagedjs_page').count()>2);assert.ok((await page.locator('body').textContent()).includes('Paragraph 79'));
  assert.deepEqual(errors,[]);
  // The supplied lesson uses an empty paragraph before a TIP, then tables and a manual break.
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const lesson=await page.evaluate(async()=>{
    const input='<html><head><style>body{font:16px/1.6 Arial}p{margin:0}blockquote{margin:0;padding:12px}table{width:100%}</style></head><body><div style="height:940px">Lesson content</div><p></p><blockquote data-alert-type="tip"><p>TIP</p><p>Domain context determines quality.</p></blockquote><table><tr><td>Finance</td><td>E-Commerce</td></tr></table><div data-onrivi-page-break></div><h2>Summary</h2></body></html>';
    const style={paperSize:'a4',marginTop:'18mm',marginBottom:'18mm'};
    const settings={...window.defaults,enabled:false};
    const html=await window.paginate(input,style,settings);
    return {html,reused:html===await window.paginate(input,style,settings)};
  });
  assert.equal(lesson.reused,true);
  await page.setContent(lesson.html);
  const lessonPages=await page.locator('.pagedjs_page').allTextContents();
  const tipPage=lessonPages.findIndex(text=>text.includes('Domain context'));
  assert.ok(tipPage>0,'TIP should move intact to the next page');
  assert.ok(lessonPages[tipPage].includes('TIP'));
  assert.ok(lessonPages.findIndex(text=>text.includes('Summary'))>tipPage);
  await page.pdf({path:path.join(dir,'lesson.pdf'),preferCSSPageSize:true,printBackground:true});
  const lessonPdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(path.join(dir,'lesson.pdf')))}).promise;
  assert.equal(lessonPdf.numPages,lessonPages.length,'PDF and preview must have the same page count');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const actual=await page.evaluate(async()=>{
   const root=document.createElement('div');root.innerHTML='<div class="markdown-viewer-root"><h1>Real export</h1><p>First section</p><div data-onrivi-page-break>페이지 나누기</div><p>Second section</p></div>';document.body.append(root);
   return window.runExport({previewEl:root,currentFileName:'검증.md',isDarkMode:false,showToast(){},paperSize:'a5',orientation:'landscape',marginTop:'12mm',marginBottom:'12mm',marginLeft:'10mm',marginRight:'10mm',previewOnly:true,printSettings:{...window.defaults,enabled:true,text:'실제 출력'}});
  });
  assert.ok(actual.includes('data-onrivi-pages="2"'));await page.setContent(actual);assert.equal(await page.locator('.onrivi-watermark').count(),2);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const desktop=await page.evaluate(async()=>{
    let captured,saved=false;
    window.electronAPI={showSaveDialog:async()=>({canceled:false,filePath:'fixture.pdf'}),saveBinaryFile:async()=>{saved=true;},printHTMLToPDF:async(html,options)=>{captured={html,options};return new Uint8Array([1]);}};
    const root=document.createElement('div');root.innerHTML='<div class="markdown-viewer-root"><p>Desktop first</p><div data-onrivi-page-break></div><p>Desktop second</p></div>';document.body.append(root);
    await window.runExport({previewEl:root,currentFileName:'검증.md',isDarkMode:false,showToast(){},activeProfile:undefined,paperSize:'a4',orientation:'landscape',printSettings:{...window.defaults,enabled:true,kind:'text',text:'Desktop watermark'}});
    delete window.electronAPI;return {...captured,saved};
  });
  assert.equal(desktop.saved,true);assert.equal(desktop.options.landscape,true);assert.equal(desktop.options.pageSize,'A4');assert.ok(desktop.html.includes('data-onrivi-pages="2"'));assert.ok(desktop.html.includes('Desktop watermark'));
  // Exercise the actual export pipeline, including legacy HR and raw comment markers.
  for (const marker of ['<hr class="page-break">', '<!-- onrivi:page-break -->', '<div data-onrivi-page-break style="break-before:page!important;page-break-before:always!important"></div>']) {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const exported=await page.evaluate(async marker=>{
      const root=document.createElement('div');root.innerHTML='<div class="markdown-viewer-root"><p>Boundary before</p>'+marker+'<p>Boundary after</p></div>';document.body.append(root);
      return window.runExport({previewEl:root,currentFileName:'break.md',isDarkMode:false,showToast(){},paperSize:'a4',previewOnly:true,printSettings:{...window.defaults,enabled:false}});
    },marker);
    await page.setContent(exported);
    const texts=await page.locator('.pagedjs_page').allTextContents();
    assert.equal(texts.length,2,`Manual break must survive export: ${marker}`);
    assert.ok(texts[0].includes('Boundary before'));
    assert.ok(!texts[0].includes('Boundary after'));
    assert.ok(texts[1].includes('Boundary after'));
    const data=await page.pdf({preferCSSPageSize:true,printBackground:true});
    const pdf=await pdfjs.getDocument({data:new Uint8Array(data)}).promise;
    assert.equal(pdf.numPages,2,`Printed PDF must match pagination: ${marker}`);
  }
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const nested=await page.evaluate(async()=>{
    const root=document.createElement('div');root.innerHTML='<section class="visual-document-editor"><div data-editor-controls><select><option>Editor toolbar</option></select></div><div class="onrivi-page-guides">Preview guide label</div><div class="visual-document-surface"><p>Document start</p><div class="markdown-viewer-root"><p>Nested image caption</p></div><div data-onrivi-page-break></div><p>Document end</p></div></section>';document.body.append(root);
    return window.runExport({previewEl:root,currentFileName:'visual.md',isDarkMode:false,showToast(){},paperSize:'a4',previewOnly:true,printSettings:{...window.defaults,enabled:false}});
  });
  await page.setContent(nested);
  const nestedPages=await page.locator('.pagedjs_page').allTextContents();
  assert.equal(nestedPages.length,2,'Nested MarkdownViewer must not replace the full visual document');
  assert.ok(nestedPages[0].includes('Document start'));
  assert.ok(!nestedPages.join('').includes('Editor toolbar'));
  assert.ok(!nestedPages.join('').includes('Preview guide label'));
  assert.ok(nestedPages[1].includes('Document end'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const blankSpaced=await page.evaluate(async()=>{
    const style=document.createElement('style');style.textContent='.visual-document-surface p{margin:0;line-height:24px;font-size:16px}.visual-document-surface p:has(>br.ProseMirror-trailingBreak:only-child){min-height:1em}.visual-document-surface br.ProseMirror-trailingBreak{display:inline!important}';document.head.append(style);
    const root=document.createElement('div');root.innerHTML='<section class="visual-document-editor"><div class="visual-document-surface"><p>Before empty paragraphs</p>'+('<p><br class="ProseMirror-trailingBreak"></p>'.repeat(43))+'<h3>After empty paragraphs</h3></div></section>';document.body.append(root);
    const before=root.innerHTML;
    const html=await window.runExport({previewEl:root,currentFileName:'spacing.md',isDarkMode:false,showToast(){},paperSize:'a4',previewOnly:true,printSettings:{...window.defaults,enabled:false}});
    if(root.innerHTML!==before)throw Error('Export must not mutate live paragraph layout');
    return html;
  });
  await page.setContent(blankSpaced);
  const blankPages=await page.locator('.pagedjs_page').allTextContents();
  assert.ok(blankPages.findIndex(t=>t.includes('After empty paragraphs'))>0,'Enter-created blank paragraphs must retain height in PDF');
  // A near-full page followed by Enter-created blank paragraphs and a manual
  // break must not introduce a content-free page between the two sections.
  for(const fragment of [
    '<div style="height:260mm">Boundary section one</div><p><br></p><p><br></p><div data-onrivi-page-break></div><p><br></p><p>Boundary section two</p>',
    '<p>Boundary section one</p><div data-onrivi-page-break></div><p><br></p><div data-onrivi-page-break></div><p>Boundary section two</p><div data-onrivi-page-break></div>'
  ]) {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const output=await page.evaluate(async fragment=>window.paginate('<html><head><style>p{margin:0;line-height:24px;min-height:24px}</style></head><body>'+fragment+'</body></html>',{paperSize:'a4'},{...window.defaults,enabled:false}),fragment);
    await page.setContent(output);
    const texts=await page.locator('.pagedjs_page').allTextContents();
    assert.equal(texts.length,2,'Manual break must not add a blank page at an automatic boundary');
    assert.ok(texts[0].includes('Boundary section one'));
    assert.ok(texts[1].includes('Boundary section two'));
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await page.pdf({preferCSSPageSize:true}))}).promise;
    assert.equal(pdf.numPages,2,'Native printing must not reapply the consumed break');
  }
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const editorSource=fs.readFileSync(path.join(frontend,'src/components/VisualDocumentEditor.tsx'),'utf8');
  const sheetCss=editorSource.slice(editorSource.indexOf('const geom = resolvePageGeometry(pageStyle)')).match(/<style>\{`([\s\S]*?)`\}<\/style>/)[1];
  const realSheetCss=new Function('geom','return `'+sheetCss+'`;')(geometry.resolvePageGeometry({paperSize:'a4'}));
  const sheetOutput=await page.evaluate(async css=>{
    const style=document.createElement('style');style.textContent=css;document.head.append(style);
    const root=document.createElement('div');root.className='custom-preview-container';root.innerHTML='<section class="visual-document-editor"><div class="visual-document-surface" style="--onrivi-sheet-min-height:3100px"><h2>Sheet first</h2><p>Sheet first content</p><div data-onrivi-page-break></div><h2>Sheet second</h2><p>Sheet second content</p></div></section>';document.body.append(root);
    return window.runExport({previewEl:root,currentFileName:'sheet.md',isDarkMode:false,showToast(){},paperSize:'a4',previewOnly:true,printSettings:{...window.defaults,enabled:false}});
  },realSheetCss);
  await page.setContent(sheetOutput);
  const sheetPdf=await pdfjs.getDocument({data:new Uint8Array(await page.pdf({preferCSSPageSize:true}))}).promise;
  assert.equal(sheetPdf.numPages,2,'Actual editor sheet CSS must not add blank PDF pages');
  await page.emulateMedia({media:'print'});
  const shadows=await page.locator('.pagedjs_sheet,.pagedjs_area,.visual-document-surface').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).boxShadow));
  assert.ok(shadows.length>0 && shadows.every(value=>value==='none'),'Paper and content shadows must not print');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const tableExport=await page.evaluate(async()=>{
    const root=document.createElement('div');root.innerHTML='<section class="visual-document-editor"><div class="visual-document-surface"><table style="width:100%;border-collapse:collapse;border:0"><tbody><tr><td style="font-family:Arial;font-size:19px;line-height:31px;padding:13px 17px;border:0;border-bottom:2px dashed rgb(0,128,0);text-align:right;background-color:rgb(240,245,250)"><p style="margin:0;line-height:31px">Styled table cell</p></td></tr></tbody></table></div></section>';document.body.append(root);
    const props=['fontFamily','fontSize','lineHeight','paddingTop','paddingLeft','borderLeftWidth','borderBottomStyle','borderBottomColor','textAlign','backgroundColor'];
    const css=getComputedStyle(root.querySelector('td'));
    const expected=Object.fromEntries(props.map(p=>[p,css[p]]));
    const html=await window.runExport({previewEl:root,currentFileName:'table.md',isDarkMode:false,showToast(){},paperSize:'a4',previewOnly:true,printSettings:{...window.defaults,enabled:false}});
    return {html,expected,props};
  });
  await page.setContent(tableExport.html);
  const printedStyle=await page.locator('.pagedjs_page td').first().evaluate((node,props)=>{const css=getComputedStyle(node);return Object.fromEntries(props.map(p=>[p,css[p]]));},tableExport.props);
  assert.deepEqual(printedStyle,tableExport.expected,'PDF table styles must match the displayed table, including absent borders');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const epubBytes=await page.evaluate(async()=>{
    let bytes;const errors=[];
    window.electronAPI={showSaveDialog:async()=>({canceled:false,filePath:'table.epub'}),saveBinaryFile:async(path,data)=>{bytes=Array.from(data);}};
    const root=document.createElement('div');root.innerHTML='<div class="markdown-viewer-root"><table style="border-collapse:collapse"><tr><td style="font-size:19px;line-height:31px;padding:13px 17px;border:0;border-bottom:2px dashed rgb(0,128,0);text-align:right;background-color:rgb(240,245,250)">EPUB styled cell</td></tr></table></div>';document.body.append(root);
    try{await window.runEpub({previewEl:root,currentFileName:'table.md',isDarkMode:false,showToast:(text,kind)=>{if(kind==='error')errors.push(text);},paperSize:'a4',printSettings:{...window.defaults,enabled:false}});}finally{delete window.electronAPI;}
    if(!bytes)throw Error(errors.join(';') || 'EPUB not saved');return bytes;
  });
  const epubZip=await req('jszip').loadAsync(Buffer.from(epubBytes));
  const epubChapters=await Promise.all(Object.keys(epubZip.files).filter(name=>/section.*\.xhtml$/.test(name)).map(name=>epubZip.file(name).async('string')));
  const epubTable=epubChapters.join('');
  assert.ok(epubTable.includes('EPUB styled cell'),'Generated EPUB must include the table');
  const epubStyle=await page.evaluate(html=>{
    const doc=new DOMParser().parseFromString(html,'text/html'),cell=doc.querySelector('td');
    return ['fontSize','lineHeight','paddingTop','paddingLeft','borderBottomStyle','textAlign','backgroundColor'].map(key=>cell.style[key]);
  },epubTable);
  assert.deepEqual(epubStyle,['19px','31px','13px','17px','dashed','right','rgb(240, 245, 250)'],'EPUB cell CSS must retain displayed table styles');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const captions=await page.evaluate(async()=>{
    const style=document.createElement('style');style.textContent=window.reportProfile.customCss;document.head.append(style);
    const root=document.createElement('div');root.innerHTML='<div class="markdown-viewer-root"><p><strong>표 1. 추진 일정</strong></p><table><tr><th>단계</th></tr><tr><td>자료 확인</td></tr></table><figure class="onrivi-image-figure"><img alt="그림 1. 처리 흐름" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWo4AAAAASUVORK5CYII="><figcaption>그림 1. 처리 흐름</figcaption></figure></div>';document.body.append(root);
    const original=root.innerHTML;
    const html=await window.runExport({previewEl:root,currentFileName:'report.md',isDarkMode:false,showToast(){},activeProfile:window.reportProfile,previewOnly:true,printSettings:{...window.defaults,enabled:false}});
    let bytes;
    window.electronAPI={showSaveDialog:async()=>({canceled:false,filePath:'report.epub'}),saveBinaryFile:async(path,data)=>bytes=Array.from(data)};
    try {await window.runEpub({previewEl:root,currentFileName:'report.md',isDarkMode:false,showToast(){},activeProfile:window.reportProfile,printSettings:{...window.defaults,enabled:false}});}finally{delete window.electronAPI;}
    if(root.querySelector('figure').firstElementChild.tagName!=='IMG' || root.querySelector('figcaption').textContent!=='그림 1. 처리 흐름')throw Error('Report export changed original caption order');
    return {html,bytes};
  });
  await page.setContent(captions.html);
  assert.equal(await page.locator('.pagedjs_page figure').first().evaluate(node=>node.firstElementChild.tagName),'FIGCAPTION','PDF caption DOM must precede picture');
  const reportZip=await req('jszip').loadAsync(Buffer.from(captions.bytes));
  const reportChapters=(await Promise.all(Object.keys(reportZip.files).filter(n=>/section.*\.xhtml$/.test(n)).map(n=>reportZip.file(n).async('string')))).join('');
  assert.ok(reportChapters.includes('표 1. 추진 일정') && reportChapters.includes('그림 1. 처리 흐름'));
  assert.ok(reportChapters.indexOf('<figcaption')<reportChapters.indexOf('<img'),'EPUB caption must precede picture in reading order');
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const numbered=await page.evaluate(async()=>{
    window.reportProfile={...window.reportProfile,rules:{...window.reportProfile.rules,ol:{...window.reportProfile.rules.ol,'list-style-type':'onrivi-report'}}};
    const style=document.createElement('style');style.textContent=window.numbering.reportNumberingCss(window.reportProfile);document.head.append(style);
    const root=document.createElement('div');root.innerHTML='<div class="markdown-viewer-root"><ol><li><p>Level one</p><ol><li><p>Level two</p><ol><li><p>Level three</p><ol><li><p>Level four</p><ol><li><p>Level five</p></li><li><p>Next five</p></li></ol></li></ol></li></ol></li></ol></li><li><p>Second top</p></li></ol></div>';document.body.append(root);
    const html=await window.runExport({previewEl:root,currentFileName:'numbering.md',isDarkMode:false,showToast(){},activeProfile:window.reportProfile,previewOnly:true,printSettings:{...window.defaults,enabled:false}});
    let epub,docx,hwpx;
    window.electronAPI={showSaveDialog:async()=>({canceled:false,filePath:'fixture'}),saveBinaryFile:async(path,data)=>{if(!epub)epub=Array.from(data);else hwpx=Array.from(data);},saveFileAs:async data=>{docx=data.split(',')[1];return true;}};
    try {
      const options={previewEl:root,currentFileName:'numbering.md',isDarkMode:false,showToast(){},activeProfile:window.reportProfile,printSettings:{...window.defaults,enabled:false}};
      await window.runEpub(options);await window.exportDocx(options);await window.exportHwpx(options);
    }finally{delete window.electronAPI;}
    if(root.querySelector('.onrivi-report-marker'))throw Error('Live editor was mutated');
    return {html,epub,docx,hwpx};
  });
  await page.setContent(numbered.html);
  assert.deepEqual(await page.locator('.pagedjs_page .onrivi-report-marker').allTextContents(),['Ⅰ. ','1. ','가. ','1) ','가) ','나) ','Ⅱ. ']);
  const nPdf=await pdfjs.getDocument({data:new Uint8Array(await page.pdf({preferCSSPageSize:true}))}).promise;
  assert.equal(nPdf.numPages,1,'Report numbering must not add pages');
  const zipReader=req('jszip');
  for(const [kind,bytes,bodyPath] of [['epub',numbered.epub,null],['docx',Buffer.from(numbered.docx,'base64'),'word/document.xml'],['hwpx',numbered.hwpx,'Contents/section0.xml']]) {
    const zip=await zipReader.loadAsync(Buffer.from(bytes));
    const body=bodyPath?await zip.file(bodyPath).async('string'):(await Promise.all(Object.keys(zip.files).filter(n=>/section.*\.xhtml$/.test(n)).map(n=>zip.file(n).async('string')))).join('');
    for(const label of ['Ⅰ.','1.','가.','1)','가)','나)','Ⅱ.'])assert.ok(body.includes(label),kind+' must include '+label);
    if(kind==='docx')assert.ok(!body.includes('<w:numPr>'),'Explicit report labels must not have duplicate Word numbering');
  }
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const headings=await page.evaluate(async()=>{
    const api=window.headingNumbering,profile=JSON.parse(JSON.stringify({...window.reportProfile,headingNumbering:[...window.reportProfile.headingNumbering.slice(0,5),{type:'custom',number:'decimal',prefix:'제',suffix:'장'}]}));
    const number=api.createHeadingNumberer(profile.headingNumbering);
    const sequence=[[1,'Top'],[2,'Section'],[3,'Sub'],[4,'Detail'],[5,'Small'],[5,'Next'],[1,'Next top'],[2,'Reset'],[3,'가. Existing'],[3,'After existing'],[6,'Custom chapter'],[6,'Next custom chapter']];
    const labels=sequence.map(([level,text])=>number(level,text));
    const root=document.createElement('div');root.className='custom-preview-container';
    const markdown=api.syncMarkdownHeadingNumbers(sequence.map(([level,text])=>'#'.repeat(level)+' '+text).join('\n\n'),profile.headingNumbering);
    root.innerHTML='<div class="visual-document-surface">'+markdown.split('\n\n').map(line=>{const match=line.match(/^(#+) (.*)$/);return `<h${match[1].length}>${match[2]}</h${match[1].length}>`;}).join('')+'</div>';
    const style=document.createElement('style');style.textContent=api.headingNumberingCss(profile);document.head.append(style);document.body.append(root);
    const originals=Array.from(root.querySelectorAll('h1,h2,h3,h4,h5'));
    if(getComputedStyle(originals[0],'::before').content!=='none')throw Error('Source heading prefix duplicated by CSS');
    if(getComputedStyle(originals[8],'::before').content!=='none')throw Error('Existing prefix duplicated');
    const before=root.innerHTML;
    const options={previewEl:root,currentFileName:'headings.md',isDarkMode:false,showToast(){},activeProfile:profile,printSettings:{...window.defaults,enabled:false}};
    const html=await window.runExport({...options,previewOnly:true});
    let epub,docx,hwpx;
    window.electronAPI={showSaveDialog:async()=>({canceled:false,filePath:'fixture'}),saveBinaryFile:async(path,data)=>{if(!epub)epub=Array.from(data);else hwpx=Array.from(data);},saveFileAs:async data=>{docx=data.split(',')[1];return true;}};
    try{await window.runEpub(options);await window.exportDocx(options);await window.exportHwpx(options);}finally{delete window.electronAPI;}
    if(root.innerHTML!==before)throw Error('Export mutated source headings');
    return {labels,html,epub,docx,hwpx,liveHtml:style.outerHTML+root.outerHTML};
  });
  assert.deepEqual(headings.labels,['Ⅰ.','1.','가.','1)','가)','나)','Ⅱ.','1.','','나.','제1장','제2장']);
  await page.setContent(headings.liveHtml);
  const livePdf=await pdfjs.getDocument({data:new Uint8Array(await page.pdf())}).promise;
  const liveText=(await (await livePdf.getPage(1)).getTextContent()).items.map(item=>item.str).join(' ');
  for(const label of ['Ⅰ.','Ⅱ.','1.','가.','1)','가)','나)','제1장','제2장'])assert.ok(liveText.includes(label),'Live CSS heading prefix missing '+label);
  await page.setContent(headings.html);
  assert.deepEqual(await page.locator('.pagedjs_page h1').allTextContents(),['Ⅰ. Top','Ⅱ. Next top']);
  for(const [kind,bytes,bodyPath] of [['epub',headings.epub,null],['docx',Buffer.from(headings.docx,'base64'),'word/document.xml'],['hwpx',headings.hwpx,'Contents/section0.xml']]){
    const zip=await zipReader.loadAsync(Buffer.from(bytes));
    const body=bodyPath?await zip.file(bodyPath).async('string'):(await Promise.all(Object.keys(zip.files).filter(n=>/section.*\.xhtml$/.test(n)).map(n=>zip.file(n).async('string')))).join('');
    for(const label of ['Ⅰ.','Ⅱ.','1.','가.','1)','가)','나)','제1장','제2장'])assert.ok(body.includes(label),kind+' heading missing '+label);
    assert.ok(!body.includes('가. 가.'),kind+' duplicated literal heading label');
    if(kind==='epub'){const toc=await zip.file('OEBPS/text/toc.xhtml').async('string');assert.ok(toc.includes('Ⅱ. Next top') && toc.includes('제2장 Next custom chapter'),'EPUB TOC must match numbered headings');}
  }
  console.log('PASS: heading formats, hierarchy reset, literal-label preservation, PDF/EPUB/DOCX/HWPX and EPUB TOC.');
  if(process.argv.includes('--breaks-only')) {console.log('PASS: manual breaks survive actual export and PDF printing (HR, comments, inline styles).');return;}
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(()=>window.mountModal());
  await page.getByRole('button',{name:/쪽 윤곽 미리보기/}).click();
  await page.getByText(/총 2페이지/).waitFor();
  await page.getByRole('button',{name:/환경설정에서 관리/}).click();assert.equal(await page.evaluate(()=>window.settingsRequested),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: shared geometry; metadata preservation; manual/automatic pages; text/image watermark; first-page exclusion; actual PDF page count, paper size, orientation and text');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

