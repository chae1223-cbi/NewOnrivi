const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json'));
const base=path.resolve('frontend'),dir=path.resolve('frontend/.tmp/print-pagination-test');fs.mkdirSync(dir,{recursive:true});
const tsPath=req.resolve('typescript');
fs.writeFileSync(path.join(dir,'loader.cjs'),`const ts=require(${JSON.stringify(tsPath)});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(dir,'entry.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import ExportModal from '@/components/ExportModal';
import {paginatePrintHtml} from '@/lib/paginatedPrint';
import {readPaginationSettings,writePaginationSettings} from '@/lib/documentPaginationSettings';
import {collectPrintCandidates} from '@/lib/printBreaks';
window.testPaginate=paginatePrintHtml;
window.testCandidates=collectPrintCandidates;
const original='# 문서\\n\\n| 제목 | 값 |\\n|---|---|\\n| 첫째 | 1 |\\n| 둘째 | 2 |\\n| 셋째 | 3 |\\n';window.original=original;
const html='<html><head><style>body{font:16px Arial}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #999}p{margin:12px 0}</style></head><body class="custom-preview-container"><div class="markdown-viewer-root"><div class="prose"><h1>문서</h1><table><thead><tr><th>제목</th><th>값</th></tr></thead><tbody><tr><td>첫째</td><td>1</td></tr><tr><td>둘째</td><td>2</td></tr><tr><td>셋째</td><td>3</td></tr></tbody></table><ol start="3"><li>일번</li><li>이번</li><li>삼번</li></ol><blockquote data-alert-type="NOTE"><p>인용 앞</p><p>인용 뒤</p></blockquote><pre><code class="language-js">const first = 1;\\nconst second = 2;\\n</code></pre><p>끝</p></div></div></body></html>';
const style={paperSize:'a4',orientation:'portrait',marginTop:'18mm',marginBottom:'18mm',marginLeft:'12mm',marginRight:'12mm'};
window.fixtureHtml=html;window.fixtureStyle=style;
function App(){const [source,setSource]=React.useState(original),[open,setOpen]=React.useState(true);window.reopen=()=>setOpen(true);window.source=source;
 return <><button onClick={()=>setOpen(true)}>열기</button><textarea id="source" value={source} readOnly/><ExportModal isOpen={open} onClose={()=>setOpen(false)} isDarkMode={false} documentId="test" documentContent={source}
 onPaginationSettingsChange={s=>setSource(previous=>writePaginationSettings(previous,s))}
 onPagePreview={(s,signal,p)=>paginatePrintHtml(html,style,{...s,enabled:false},signal,p)}
 onExport={async (format,s,p)=>{window.exported={format,pagination:p};window.exportHtml=await paginatePrintHtml(html,style,{...s,enabled:false},undefined,p);setOpen(false);}}/></>;
}createRoot(document.getElementById('root')).render(<App/>);
`);
async function run(){
 await new Promise((resolve,reject)=>req('webpack')({mode:'development',entry:path.join(dir,'entry.tsx'),output:{path:dir,filename:'bundle.js'},devtool:false,resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':path.join(base,'src')},modules:[path.join(base,'node_modules'),'node_modules']},module:{rules:[{test:/\.tsx?$/,use:path.join(dir,'loader.cjs')}]},resolveLoader:{modules:[path.join(base,'node_modules')]},infrastructureLogging:{level:'error'}},(error,stats)=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve()));
 const server=http.createServer((request,response)=>{
   if(request.url==='/bundle.js'){response.setHeader('Content-Type','application/javascript; charset=utf-8');return response.end(fs.readFileSync(path.join(dir,'bundle.js')));}
   if(request.url.includes('paged.polyfill.js')){response.setHeader('Content-Type','application/javascript; charset=utf-8');return response.end(fs.readFileSync(path.join(base,'public/pagedjs/paged.polyfill.js')));}
   response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;font:14px system-ui}p,h2{margin:0}.fixed{position:fixed}.inset-0{inset:0}.flex{display:flex}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.shrink-0{flex-shrink:0}.p-4{padding:16px}.gap-2{gap:8px}.w-full{width:100%}.max-w-lg{max-width:512px}.max-w-6xl{max-width:1152px}.overflow-y-auto{overflow-y:auto}button{margin:3px}#source{width:200px;height:80px}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});let page,errors=[];
 try{
  page=await browser.newPage({viewport:{width:1400,height:1050}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'쪽 윤곽 미리보기 펼치기 ▼',exact:true}).click();
  const frame=page.frameLocator('iframe[title="쪽 윤곽 미리보기"]');
  await frame.locator('.pagedjs_page').first().waitFor({timeout:35000});
  assert.equal(await frame.locator('.pagedjs_page').count(),1);
  await page.getByRole('button',{name:'페이지 나누기 조정',exact:true}).click();
  await frame.getByRole('button',{name:'여기부터 다음 페이지: 둘째 2',exact:true}).click();
  await page.getByText('지정한 나누기 1개',{exact:true}).waitFor();
  await page.waitForFunction(()=>!document.body.textContent.includes('페이지를 계산하고 있습니다'));
  await frame.getByRole('button',{name:'나누기 해제',exact:true}).waitFor({timeout:35000});
  assert.equal(await frame.locator('.pagedjs_page').count(),2);
  assert.equal(await page.evaluate(()=>window.source),await page.evaluate(()=>window.original),'preview never edits source');
  assert.equal(await frame.locator('tbody td').count(),6);
  assert.equal(await frame.locator('thead').count(),2);
  assert.equal(await page.getByRole('navigation',{name:'전체 페이지 목록'}).getByRole('button').count(),2);
  await page.getByRole('button',{name:'2페이지로 이동',exact:true}).click();
  assert.equal(await page.getByRole('spinbutton',{name:'이동할 페이지'}).inputValue(),'2');
  const pageFits=await page.evaluate(()=>{
    const iframe=document.querySelector('iframe[title="쪽 윤곽 미리보기"]');
    const page=iframe.contentDocument.querySelectorAll('.pagedjs_page')[1],rect=page.getBoundingClientRect();
    return rect.height<=iframe.clientHeight && rect.top>=-2 && rect.bottom<=iframe.clientHeight+2 && rect.width<=iframe.clientWidth;
  });assert.equal(pageFits,true,'whole-page fit shows the complete selected sheet inside the viewport with real export CSS');
  await page.getByRole('combobox',{name:'미리보기 배율'}).selectOption('50');
  await page.waitForFunction(()=>{
    const button=document.querySelector('iframe[title="쪽 윤곽 미리보기"]')?.contentDocument?.querySelector('button[aria-label="나누기 해제"]');
    return button && Math.abs(button.getBoundingClientRect().width-20)<1;
  });
  const controlWidth=await frame.getByRole('button',{name:'나누기 해제',exact:true}).evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(Math.abs(controlWidth-20)<1,'break buttons retain usable screen size when zoomed: '+controlWidth);
  await page.getByRole('combobox',{name:'미리보기 배율'}).selectOption('page');
  await page.getByRole('combobox',{name:'미리보기 배율'}).selectOption('100');
  await page.getByRole('button',{name:'1페이지로 이동',exact:true}).click();
  const viewport=await page.locator('iframe[title="쪽 윤곽 미리보기"]').boundingBox();
  await page.mouse.move(viewport.x+viewport.width/2,viewport.y+viewport.height/2);
  await page.mouse.wheel(0,350);
  await page.waitForFunction(()=>document.querySelector('iframe[title="쪽 윤곽 미리보기"]').contentWindow.scrollY>100);
  const firstScroll=await page.evaluate(()=>document.querySelector('iframe[title="쪽 윤곽 미리보기"]').contentWindow.scrollY);
  await page.mouse.wheel(0,350);
  await page.waitForFunction(first=>document.querySelector('iframe[title="쪽 윤곽 미리보기"]').contentWindow.scrollY>first+100,firstScroll);
  const scrollbar=await page.evaluate(()=>{
    const doc=document.querySelector('iframe[title="쪽 윤곽 미리보기"]').contentDocument;
    return {overflow:doc.defaultView.getComputedStyle(doc.documentElement).overflowY,content:doc.scrollingElement.scrollHeight,viewport:doc.scrollingElement.clientHeight};
  });assert.equal(scrollbar.overflow,'scroll');assert.ok(scrollbar.content>scrollbar.viewport);
  const scrolled=await page.evaluate(()=>document.querySelector('iframe[title="쪽 윤곽 미리보기"]').contentWindow.scrollY);
  await page.getByRole('button',{name:'조정 마치기',exact:true}).click();
  assert.ok(Math.abs(await page.evaluate(()=>document.querySelector('iframe[title="쪽 윤곽 미리보기"]').contentWindow.scrollY)-scrolled)<2,'changing adjustment mode does not snap scroll to page start');
  await page.getByRole('button',{name:'페이지 나누기 조정',exact:true}).click();
  await page.getByRole('combobox',{name:'미리보기 배율'}).selectOption('page');
  await page.getByRole('button',{name:'실행취소',exact:true}).click();
  await page.getByText('지정한 나누기 1개',{exact:true}).waitFor({state:'detached'});
  await page.waitForFunction(()=>!document.body.textContent.includes('페이지를 계산하고 있습니다'));
  await page.getByRole('button',{name:'다시실행',exact:true}).click();
  await frame.getByRole('button',{name:'나누기 해제',exact:true}).waitFor({timeout:35000});
  await page.setViewportSize({width:1157,height:893});
  await page.getByRole('button',{name:'미리보기 크게 보기',exact:true}).click();
  await page.getByRole('button',{name:'확대 화면 닫기',exact:true}).waitFor();
  const bounds=await page.evaluate(()=>{
    const iframe=document.querySelector('iframe[title="쪽 윤곽 미리보기"]'),button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('인쇄 / PDF 저장'));
    return {height:iframe.clientHeight,bottom:iframe.getBoundingClientRect().bottom,footer:button.getBoundingClientRect().top};
  });assert.ok(bounds.height>250 && bounds.bottom<=bounds.footer+2,'preview fits above the fixed print footer at the reported viewport');
  await page.getByRole('button',{name:'확대 화면 닫기',exact:true}).click();
  await page.getByRole('button',{name:'문서에 적용',exact:true}).click();
  await page.waitForFunction(()=>window.source.includes('onrivi_pagination:'));
  const applied=await page.evaluate(()=>window.source);assert.ok(applied.endsWith(await page.evaluate(()=>window.original)));
  // Removing the break changes only the draft until applied.
  await frame.getByRole('button',{name:'나누기 해제',exact:true}).click();
  await page.getByRole('button',{name:'취소',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.source),applied);
  await page.getByRole('button',{name:'열기',exact:true}).click();
  await page.getByRole('button',{name:'쪽 윤곽 미리보기 펼치기 ▼',exact:true}).click();
  await page.getByRole('button',{name:'페이지 나누기 조정',exact:true}).click();
  await frame.getByRole('button',{name:'나누기 해제',exact:true}).waitFor({timeout:35000});
  assert.equal(await frame.locator('.pagedjs_page').count(),2,'reopening restores saved break');
  await frame.getByRole('button',{name:'여기부터 다음 페이지: 이번',exact:true}).click();
  await page.getByText('지정한 나누기 2개',{exact:true}).waitFor();
  await page.waitForFunction(()=>!document.body.textContent.includes('페이지를 계산하고 있습니다'));
  await frame.getByRole('button',{name:'나누기 해제',exact:true}).first().waitFor({timeout:35000});
  const count=await frame.locator('.pagedjs_page').count();assert.equal(count,3);
  await page.getByRole('spinbutton',{name:'이동할 페이지'}).fill('3');
  assert.equal(await page.getByRole('spinbutton',{name:'이동할 페이지'}).inputValue(),'3');
  await page.getByRole('button',{name:'이전 페이지',exact:true}).click();
  assert.equal(await page.getByRole('spinbutton',{name:'이동할 페이지'}).inputValue(),'2');
  await page.getByRole('button',{name:'인쇄 / PDF 저장',exact:true}).click();
  await page.waitForFunction(()=>Boolean(window.exportHtml),null,{timeout:35000});
  assert.equal(await page.evaluate(()=>window.exported.pagination.breaks.length),2);
  assert.equal(await page.evaluate(()=>Number(window.exportHtml.match(/data-onrivi-pages="(\d+)"/)[1])),count,'preview and print use identical page boundaries');
  assert.equal(await page.evaluate(()=>window.source),applied,'unapplied draft is not persisted by printing');
  const pdfPage=await browser.newPage();await pdfPage.setContent(await page.evaluate(()=>window.exportHtml));
  const pdf=await pdfPage.pdf({preferCSSPageSize:true,printBackground:true});
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,count,'real Chromium PDF page count matches the preview');await pdfPage.close();
  for(const [kind,text] of [['quote','인용 뒤'],['code','const second = 2;']]){
    const result=await page.evaluate(async({kind,text})=>{
      const dom=new DOMParser().parseFromString(window.fixtureHtml,'text/html');
      const anchor=window.testCandidates(dom.querySelector('.prose')).find(c=>c.anchor.kind===kind&&c.anchor.text===text).anchor;
      const html=await window.testPaginate(window.fixtureHtml,window.fixtureStyle,{enabled:false},undefined,{version:1,breaks:[anchor]});
      const output=new DOMParser().parseFromString(html,'text/html');
      return {pages:Number(output.body.dataset.onriviPages),code:Array.from(output.querySelectorAll('pre')).map(n=>n.textContent).join(''),quotes:output.querySelectorAll('blockquote[data-alert-type="NOTE"]').length};
    },{kind,text});
    assert.equal(result.pages,2);
    assert.equal(result.code,'const first = 1;\nconst second = 2;\n');
    if(kind==='quote')assert.equal(result.quotes,2);
  }
  // Desktop and web use the same bundled pagination path.
  const nativeCount=await page.evaluate(async()=>{window.electronAPI={};const html=await window.testPaginate(window.fixtureHtml,window.fixtureStyle,{enabled:false},undefined,window.exported.pagination);return Number(html.match(/data-onrivi-pages="(\d+)"/)[1]);});assert.equal(nativeCount,count);
  assert.deepEqual(errors,[]);
  await page.getByRole('button',{name:'열기',exact:true}).click();
  await page.getByRole('button',{name:'쪽 윤곽 미리보기 펼치기 ▼',exact:true}).click();
  await page.getByRole('button',{name:'페이지 나누기 조정',exact:true}).click();
  await frame.getByRole('button',{name:'나누기 해제',exact:true}).waitFor({timeout:35000});
  await frame.getByRole('button',{name:'나누기 해제',exact:true}).focus();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'문서에 적용',exact:true}).waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.source),applied);
  console.log('PASS: real PagedJS table/list/code/quote adjustment; apply/cancel/undo/reopen/Escape; real PDF page parity; original source preservation');
 }catch(error){console.error('Browser diagnostics:',errors,await page?.locator('body').innerText());throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
