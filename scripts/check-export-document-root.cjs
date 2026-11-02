const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const req=require('module').createRequire(path.resolve('frontend/package.json'));
const dir=path.resolve('frontend/.tmp/export-document-test'),base=path.resolve('frontend');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'loader.cjs'),`const ts=require(${JSON.stringify(req.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:99,target:7,jsx:2,esModuleInterop:true}}).outputText;`);
fs.writeFileSync(path.join(dir,'entry.ts'),`
import * as handlers from '@/lib/exportHandlers';
import {getExportDocumentRoot} from '@/lib/exportPreparation';
import {embedExportFonts} from '@/lib/exportFonts';
import {generateHwpx} from '@/lib/hwpxGenerator';
import {HELP_PROFILE} from '@/constants/cssProfile';
import {DEFAULT_PRINT_SETTINGS} from '@/lib/documentPrintSettings';
import JSZip from 'jszip';
window.handlers=handlers;window.resolveRoot=getExportDocumentRoot;window.testFonts=embedExportFonts;window.defaultPrintSettings=DEFAULT_PRINT_SETTINGS;
window.testHwpx=async html=>{const root=document.createElement('div');root.innerHTML=html;return await unzip(await (await generateHwpx(root)).arrayBuffer());};
window.files={};window.messages=[];
window.electronAPI={showSaveDialog:async o=>({filePath:o.defaultPath,canceled:false}),
saveBinaryFile:async(name,data)=>{window.files[name]=await unzip(data);if(name.endsWith('.hwpx'))window.hwpxBytes=Array.from(data);if(name.endsWith('.epub'))window.epubBytes=data;},
saveFileAs:async(data,name)=>{window.files[name]=/\.(docx|hwpx)$/.test(name)&&typeof data==='string'?await unzip(Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0))):data;return name;}};
async function unzip(data){const z=await JSZip.loadAsync(data);const result={};for(const name of Object.keys(z.files))if(/\\.(xhtml|xml|opf|css)$/.test(name))result[name]=await z.file(name).async('string');return result;}
window.runExport=async(name,extra={})=>{return await handlers[name]({previewOnly:name==='exportPDF',previewEl:document.querySelector('#preview'),currentFileName:'fixture.md',isDarkMode:false,showToast:(...args)=>window.messages.push(args),paperSize:'a4',orientation:'portrait',marginTop:'18mm',marginBottom:'18mm',marginLeft:'12mm',marginRight:'12mm',activeProfile:window.qaUseHelpProfile?HELP_PROFILE:undefined,dynamicCssString:window.qaUseHelpProfile?handlers.generateExportCss(HELP_PROFILE):undefined,...extra});};
window.readEpub=async()=>{
 const zip=await JSZip.loadAsync(window.epubBytes);const name=Object.keys(zip.files).find(n=>n.endsWith('.xhtml')&&!n.includes('nav'));
 const doc=new DOMParser().parseFromString(await zip.file(name).async('string'),'text/html');
 doc.querySelectorAll('link').forEach(n=>n.remove());const style=doc.createElement('style');
 for(const n of Object.keys(zip.files))if(n.endsWith('.css'))style.textContent+=await zip.file(n).async('string');doc.head.append(style);
 for(const image of Array.from(doc.images)){const entry=Object.keys(zip.files).find(n=>n.endsWith('/'+image.getAttribute('src').split('/').pop()));if(entry)image.src='data:image/png;base64,'+await zip.file(entry).async('base64');}
 return doc.documentElement.outerHTML;
};
`);
const helpFixture=process.argv.includes('--help-fixture');
const markers=helpFixture?['화면 구성과 보기 모드','목적에 맞춘 2대 보기 모드','도움말 전체 목차']:['BEGIN DOCUMENT','Middle value','END DOCUMENT'];
async function main(){
 await new Promise((resolve,reject)=>req('webpack')({mode:'development',entry:path.join(dir,'entry.ts'),output:{path:dir,filename:'bundle.js'},devtool:false,resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':path.join(base,'src')},modules:[path.join(base,'node_modules'),'node_modules']},module:{rules:[{test:/\.tsx?$/,use:path.join(dir,'loader.cjs')}]},infrastructureLogging:{level:'error'}},(e,s)=>e?reject(e):s.hasErrors()?reject(Error(s.toString({all:false,errors:true}))):resolve()));
 let html=`<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px Arial}body:has(.visual-document-editor){overflow:hidden!important;height:100vh!important;max-height:100vh!important}.visual-document-surface[contenteditable="true"] h1::after{content:"H1"}.visual-document-surface{min-height:1400px}.visual-document-editor{width:700px}</style></head><body><div id="preview"><section class="visual-document-editor"><div class="visual-document-surface" contenteditable="true"><h1>BEGIN DOCUMENT</h1><p>First paragraph</p><figure><div class="markdown-viewer-root"><p>IMAGE CAPTION ONLY</p></div></figure><table><tr><th>Middle table</th></tr><tr><td>Middle value</td></tr></table><p>END DOCUMENT</p><div data-editor-controls>EDITOR UI ONLY</div></div></section></div><script src="/bundle.js"></script></body></html>`;
 if(helpFixture){
  const supplied=fs.readFileSync('C:/Users/chae1/Downloads/HELP-02_에디터_화면_구성과_3단_레이아웃 (1).html','utf8');
  html=(process.argv.includes('--with-fonts')?supplied:supplied.replace(/@font-face\s*\{[^}]*\}/gi,'')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
  html=html.replace(/(<body[^>]*>)/,'$1<div id="preview">').replace('</body>','</div><script src="/bundle.js"></script></body>');
 }
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type',q.url.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');r.end(q.url.includes('paged.polyfill.js')?fs.readFileSync(path.join(base,'public/pagedjs/paged.polyfill.js')):q.url.endsWith('.js')?fs.readFileSync(path.join(dir,path.basename(q.url))):html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
 await page.route('https://**',r=>r.abort());await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.runExport);
 if(process.argv.includes('--active-profile'))await page.evaluate(()=>window.qaUseHelpProfile=true);
 assert.equal(await page.evaluate(()=>window.resolveRoot(document.querySelector('#preview')).tagName),'SECTION');
 for(const [fn,ext] of [['exportHTML','html'],['exportEPUB','epub'],['exportDOCX','docx'],['exportHWPX','hwpx']]){
  await page.evaluate(name=>window.runExport(name),fn);const output=await page.evaluate(ext=>window.files['fixture.'+ext],ext);
  assert.ok(output,JSON.stringify(await page.evaluate(()=>window.messages)));
  const text=typeof output==='string'?output:Object.values(output).join('\n');
  for(const marker of markers)assert.ok(text.includes(marker),fn+' missing '+marker);
  assert.ok(!text.includes('EDITOR UI ONLY'),fn+' includes editor UI');
  if(ext==='hwpx'){
    const checked=await page.evaluate(()=>{
      const file=window.files['fixture.hwpx'];
      const xml=new DOMParser().parseFromString(file['Contents/section0.xml'],'application/xml');
      if(xml.querySelector('parsererror'))throw Error('HWPX XML is invalid');
      const normalized=value=>value.replace(/\s+/g,' ').trim();
      const output=normalized(Array.from(xml.getElementsByTagNameNS('http://www.hancom.co.kr/hwpml/2011/paragraph','t')).map(node=>node.textContent).join(''));
      const root=window.resolveRoot(document.querySelector('#preview'));
      const expected=Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,p')).filter(node=>!node.closest('.no-export,[data-editor-controls],style,script')).map(node=>normalized(node.textContent)).filter(Boolean);
      let cursor=0;for(const sentence of expected){const index=output.indexOf(sentence,cursor);if(index<0)throw Error('Missing/out-of-order paragraph: '+sentence);cursor=index+sentence.length;}
      const images=xml.getElementsByTagNameNS('http://www.hancom.co.kr/hwpml/2011/paragraph','pic').length;
      if(images!==root.querySelectorAll('img').length)throw Error('Image count changed');
      return {paragraphs:expected.length,images};
    });
    console.log('PASS: every source paragraph occurs in HWPX document order:',checked);
    const bytes=await page.evaluate(()=>window.hwpxBytes);if(bytes)fs.writeFileSync(path.join(dir,'verified.hwpx'),Buffer.from(bytes));
  }
  console.log('PASS:',fn,'includes whole document, nested caption, table and final paragraph; excludes controls');
 }

 console.log('Starting PDF pagination');
 const rendered=await browser.newPage({viewport:{width:1100,height:700}});await rendered.route('https://**',r=>r.abort());
 await rendered.setContent(await page.evaluate(()=>window.files['fixture.html']));
 assert.equal(await rendered.evaluate(()=>getComputedStyle(document.body).overflowY),'visible');
 await rendered.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 assert.ok(await rendered.evaluate(()=>window.scrollY>0),'exported HTML must scroll');
 assert.equal(await rendered.locator('[contenteditable="true"]').count(),0);
 const badge=await rendered.locator('h1').first().evaluate(el=>getComputedStyle(el,'::after').content);assert.ok(['none','normal','""'].includes(badge),badge);
 assert.ok(await rendered.getByText(markers[2],{exact:true}).count());
 await rendered.close();console.log('PASS: saved HTML scrolls and heading badges are absent');

 const pdfHtml=await page.evaluate(()=>window.runExport('exportPDF'));
 assert.ok(pdfHtml,JSON.stringify(await page.evaluate(()=>window.messages)));
 for(const marker of markers)assert.ok(pdfHtml.includes(marker),'PDF missing '+marker);
 assert.ok(pdfHtml.includes('pagedjs_page'),'PDF must finish pagination');
 const pdfView=await browser.newPage();await pdfView.route('https://**',r=>r.abort());await pdfView.setContent(pdfHtml);
 const pageCount=await pdfView.locator('.pagedjs_page').count();
 assert.ok(pageCount>0);
 const pdf=await pdfView.pdf({preferCSSPageSize:true,printBackground:true});
 fs.writeFileSync(path.join(dir,'verified.pdf'),pdf);
 console.log('PASS: actual Chromium PDF file generated, bytes:',pdf.length,'layout pages:',pageCount);
 await pdfView.close();
 console.log('PASS: PDF full-document pagination completes');
 if(process.argv.includes('--web-print')){
   await page.evaluate(()=>{
     window.electronAPI=undefined;const original=Node.prototype.appendChild;
     Node.prototype.appendChild=function(child){const result=original.call(this,child);if(child instanceof HTMLIFrameElement){child.addEventListener('load',()=>{child.contentWindow.print=()=>{window.qaPrinted=true;window.qaPrintedText=child.contentDocument.body.textContent;};});}return result;};
   });
   await page.evaluate(()=>window.runExport('exportPDF',{previewOnly:false}));
   assert.equal(await page.evaluate(()=>window.qaPrinted),true,JSON.stringify(await page.evaluate(()=>window.messages)));
   console.log('PASS: actual web export reaches browser print()');
   await page.reload();await page.waitForFunction(()=>window.runExport);if(process.argv.includes('--active-profile'))await page.evaluate(()=>window.qaUseHelpProfile=true);
 }
 if(process.argv.includes('--fallback'))await page.evaluate(()=>{
   window.qaBlankNextSvg=true;const original=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(window.qaBlankNextSvg&&image instanceof HTMLImageElement&&image.src.startsWith('data:image/svg+xml')){window.qaBlankNextSvg=false;window.qaSkippedSvg=true;return;}return original.call(this,image,...args);};
 });
 await page.evaluate(()=>window.runExport('exportPNG'));
 const png=await page.evaluate(()=>window.files['fixture.png']);assert.ok(png?.startsWith('data:image/png;base64,'),JSON.stringify(await page.evaluate(()=>window.messages)));
 fs.writeFileSync(path.join(dir,'verified.png'),Buffer.from(png.split(',')[1],'base64'));
 const dimensions=await page.evaluate(async()=>{const image=new Image();image.src=window.files['fixture.png'];await image.decode();return [image.width,image.height];});
 assert.ok(dimensions[0]>500&&dimensions[1]>200,JSON.stringify(dimensions));
 console.log('PASS: PNG produces a real full-document image',dimensions);
 if(process.argv.includes('--fallback'))assert.equal(await page.evaluate(()=>window.qaSkippedSvg),true);
 const aborted=await page.evaluate(async()=>{
   const style=document.createElement('style');style.textContent='@font-face{font-family:ExportSlowFixture;src:url(/slow.woff)}';document.head.append(style);
   const root=document.createElement('div');root.textContent='test';root.style.setProperty('font-family','ExportSlowFixture','important');document.body.append(root);
   const fetchOriginal=window.fetch;let requested=0,cancelled=0;
   window.fetch=(_url,options)=>{requested++;return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>{cancelled++;reject(new DOMException('Aborted','AbortError'));},{once:true});});};
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),50);
   try{await window.testFonts(root,controller.signal);}catch{}finally{clearTimeout(timer);window.fetch=fetchOriginal;root.remove();style.remove();}
   return {requested,cancelled};
 });
 assert.ok(aborted.requested>0&&aborted.cancelled===aborted.requested,JSON.stringify(aborted));
 console.log('PASS: slow font fetch is cancelled instead of continuing after export timeout');
 if(process.argv.includes('--stale-watermark')){
   await page.evaluate(()=>window.runExport('exportEPUB',{printSettings:{...window.defaultPrintSettings,enabled:true,kind:'image',image:'/media/missing.png',imageResource:'old-resource-folder',opacity:15}}));
   const file=await page.evaluate(()=>window.files['fixture.epub']);
   assert.ok(Object.values(file).join('').includes('watermark_image'));
   const reader=await browser.newPage();await reader.route('https://**',r=>r.abort());
   await reader.setContent(await page.evaluate(()=>window.readEpub()));
   await reader.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.decode()));});
   for(const marker of markers)assert.ok((await reader.locator('body').textContent()).includes(marker));
   assert.ok(await reader.locator('img').count()>=3);
   await reader.screenshot({path:path.join(dir,'epub-reader.png'),fullPage:true});
   if(process.argv.includes('--layout-debug'))console.log(await reader.evaluate(()=>{const images=Array.from(document.images).filter(i=>!i.closest('.epub-watermark'));let el=images[images.length-1];const result=[];while(el){const s=getComputedStyle(el);result.push({tag:el.tagName,cls:el.className,height:el.getBoundingClientRect().height,min:s.minHeight,max:s.maxHeight,margin:s.margin,padding:s.padding,inline:el.getAttribute('style')?.slice(0,250)});el=el.parentElement;}return result;}));
   await reader.close();console.log('PASS: EPUB with stale watermark completes and renders readable paragraphs and decoded images');
 }
 const nested=await page.evaluate(async()=>{
   const file=await window.testHwpx('<ol start="5"><li><div><p>OUTER_TITLE</p><div><ul><li><div><p>CHILD_TITLE</p><section><ol start="3"><li><div><p>GRANDCHILD_TEXT</p></div></li></ol></section><p>CHILD_CONTINUATION</p></div></li></ul></div><p>OUTER_CONTINUATION</p><table><tr><td><p>TABLE_TEXT</p></td></tr></table></div></li><li><p>SIBLING_TEXT</p></li></ol>');
   const parser=new DOMParser(),section=parser.parseFromString(file['Contents/section0.xml'],'application/xml'),header=parser.parseFromString(file['Contents/header.xml'],'application/xml');
   if(section.querySelector('parsererror')||header.querySelector('parsererror'))throw Error('Invalid HWPX XML');
   const hp='http://www.hancom.co.kr/hwpml/2011/paragraph',hh='http://www.hancom.co.kr/hwpml/2011/head';
   const paragraphs=Array.from(section.getElementsByTagNameNS(hp,'p')).map(p=>({style:p.getAttribute('paraPrIDRef'),text:Array.from(p.getElementsByTagNameNS(hp,'t')).filter(t=>t.parentElement?.parentElement===p).map(t=>t.textContent).join('')}));
   const styles=Array.from(header.getElementsByTagNameNS(hh,'paraPr')).map(p=>({id:p.getAttribute('id'),left:p.getElementsByTagNameNS(hh,'margin')[0]?.getElementsByTagNameNS('http://www.hancom.co.kr/hwpml/2011/core','left')[0]?.getAttribute('value')}));
   return {paragraphs,styles};
 });
 const joined=nested.paragraphs.map(p=>p.text).join('\n');let previous=-1;
 for(const marker of ['OUTER_TITLE','CHILD_TITLE','GRANDCHILD_TEXT','CHILD_CONTINUATION','OUTER_CONTINUATION','TABLE_TEXT','SIBLING_TEXT']){
   assert.equal(joined.split(marker).length-1,1,marker+' duplicated or missing');const index=joined.indexOf(marker);assert.ok(index>previous,marker+' out of order');previous=index;
 }
 assert.ok(joined.includes('5. OUTER_TITLE'));assert.ok(joined.includes('3. GRANDCHILD_TEXT'));assert.ok(joined.includes('6. SIBLING_TEXT'));
 assert.equal(nested.paragraphs.find(p=>p.text.includes('CHILD_TITLE')).style,'26');
 assert.equal(nested.paragraphs.find(p=>p.text.includes('GRANDCHILD_TEXT')).style,'27');
 assert.ok(nested.styles.some(p=>p.id==='26'));assert.ok(nested.styles.some(p=>p.id==='27'));
 console.log('PASS: HWPX wrapped nested lists retain all descendants, continuation/table order, numbering and registered indentation styles');
 if(!helpFixture)assert.equal(await page.evaluate(()=>document.querySelector('[data-editor-controls]').textContent),'EDITOR UI ONLY');

 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
