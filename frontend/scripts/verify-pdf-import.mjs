import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const compile = name => ts.transpileModule(fs.readFileSync(new URL('../src/lib/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {pdfTextBlocks,pdfImageBoxes,serializePdfBlocks} = await import(url(compile('pdfImportLayout.ts').replace('./pdfImportText',url(compile('pdfImportText.ts')))));
const run = (str,x,y,h=12,width=str.length*6) => ({str,transform:[h,0,0,h,x,y],height:h,width});
assert.equal(pdfTextBlocks([run('제목',0,100,18),run('충분히 긴 일반 본문 문장입니다',0,50)])[0].markdown,'## 제목');
assert.equal(pdfTextBlocks([run('스마트',0,80,12,90),run('농업',0,60,12,90)])[0].markdown,'스마트농업');
const table = [100,70,40].flatMap((y,i)=>[run(['항목','정의','시행'][i],0,y,10,20),run(['현재','농업','없음'][i],80,y,10,20),run(['개정','AI','6개월'][i],180,y,10,30)]);
assert(pdfTextBlocks(table)[0].markdown.includes('| --- | --- | --- |'));
assert.equal(pdfImageBoxes([1,2,3,4], [[],[100,0,0,100,20,30],[],[]],{save:1,transform:2,paintImageXObject:3,restore:4}).length,1);
assert.equal(serializePdfBlocks([{y:2,markdown:'1. first'},{y:1,markdown:'2. second'}]),'1. first\n2. second');
console.log('PDF layout fixture checks passed');
if(process.argv[2]) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2]))}).promise;
  let output='',headings=0,tables=0,images=0;
  for(let i=1;i<=pdf.numPages;i++) {
    const page=await pdf.getPage(i), content=await page.getTextContent(), operators=await page.getOperatorList();
    const allBoxes=pdfImageBoxes(operators.fnArray,operators.argsArray,pdfjs.OPS);
    const boxes=allBoxes.filter(box=>content.items.filter(item=>item.str?.trim()&&item.transform[4]>=box.x&&item.transform[4]<box.x+box.width&&item.transform[5]>=box.y&&item.transform[5]<box.y+box.height).reduce((n,item)=>n+item.str.length,0)<40);
    const blocks=pdfTextBlocks(content.items,allBoxes.filter(b=>!boxes.includes(b)));
    headings+=blocks.filter(b=>/^#{1,6} /.test(b.markdown)).length;
    tables+=blocks.filter(b=>b.markdown.startsWith('|')).length;
    images+=boxes.length;
    for (const rotation of [0,90,180,270]) {
      const viewport=page.getViewport({scale:2,rotation});
      for (const box of boxes) {
        const a=viewport.convertToViewportPoint(box.x,box.y), b=viewport.convertToViewportPoint(box.x+box.width,box.y+box.height);
        assert([...a,...b].every(Number.isFinite));
        assert(Math.abs(a[0]-b[0])>0 && Math.abs(a[1]-b[1])>0);
      }
    }
    output+=serializePdfBlocks(blocks)+'\n\n';
  }
  assert(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(output));
  assert(headings>0); assert(tables>0); assert(images>0);
  assert(output.includes('총정리'));
  assert(output.includes('명확히 했습니다.'));
  assert(!output.includes('2. 확히'));
  assert(output.includes('```text'));
  assert(output.includes('<strong>온리비 어서(Onrivi Author)</strong>'));
  assert(!output.includes('다 이어그램'));
  assert(output.includes('되지 않았거든요'));
  assert(output.includes('늦어지거나 인증'));
  assert(output.includes('문구로만 정의'));
  for(const text of ['정부 표준화','법적 근거','정책 지원','클라우드 소프트웨어','아이소메트릭','지으며','농가의']) assert(output.includes(text),text);
  const summary=output.split('## 3. 바쁜 분들을 위한 3줄 요약')[1].split('## 4.')[0];
  assert(!summary.includes('\n\n2.'));
  for(const text of ['정책적 디테일','두고, 정중앙','트랙터, 다관절','기계 독점','컬러가 어우러진','텍스트 없음']) assert(output.includes(text),text);
  assert(!output.includes('정책 적'));
  console.log(JSON.stringify({pages:pdf.numPages,headings,tables,images}));
  const index=output.indexOf('|'); console.log(output.slice(index,index+800));
  await pdf.cleanup();
}
