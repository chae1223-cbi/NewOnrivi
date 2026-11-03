const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const req = require('node:module').createRequire(path.resolve(__dirname,'../frontend/package.json'));
const ts = req('typescript');
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const exports = cache[name] = {};
  const file = path.resolve(__dirname,'../frontend/src/lib',name+'.ts');
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,
    {exports,require:n=>n.startsWith('./')?load(n.slice(2)):req(n)});
  return exports;
}
const {createVisualDocumentCodec,visualSerializer}=load('visualDocumentCodec');
const {remarkKoreanStrong}=load('remarkKoreanStrong');
for (const [open,close] of [["'","'"],['"','"'],['‘','’'],['“','”'],['「','」'],['(',')']]) {
  const content=open+'문단(Paragraph)'+close;
  const source='마크다운은 **'+content+'**과 구분합니다.';
  const codec=createVisualDocumentCodec(source);
  const strong=[];codec.doc.descendants(node=>{if(node.isText && node.marks.some(m=>m.type.name==='strong'))strong.push(node.text);});
  assert.deepEqual(strong,[content],source);
  const saved=visualSerializer.serialize(codec.doc);
  assert.equal(createVisualDocumentCodec(saved).doc.eq(codec.doc),true,saved);
  const tree={type:'root',children:[{type:'paragraph',children:[{type:'text',value:source,position:{start:{offset:0},end:{offset:source.length}}}]}]};
  remarkKoreanStrong()(tree,{value:source});
  assert.equal(tree.children[0].children.find(node=>node.type==='strong').children[0].value,content);
}
const exact="마크다운은 일반 문서 작성 프로그램과 달리 **'문단(Paragraph)'**과 **'강제 줄바꿈(Soft Break)'**을 명확히 구분하여 처리합니다:";
let count=0;createVisualDocumentCodec(exact).doc.descendants(node=>{if(node.isText&&node.marks.some(m=>m.type.name==='strong'))count++;});
assert.equal(count,2);
for(const source of ["`**'문단'**과`","\\*\\*'문단'\\*\\*과"]){
  createVisualDocumentCodec(source).doc.descendants(node=>assert.ok(!node.marks.some(mark=>mark.type.name==='strong')));
}
console.log('PASS: straight/curly quotes and closing brackets before Korean particles; exact report, codec save/reload and viewer transform; code/escaped literals preserved');
async function codeCases() {
  const url=require('node:url');
  const {unified}=await import(url.pathToFileURL(req.resolve('unified')).href);
  const {default:remarkParse}=await import(url.pathToFileURL(req.resolve('remark-parse')).href);
  const processor=unified().use(remarkParse).use(remarkKoreanStrong);
  for(const source of ['**`Shift + Enter`**를 누릅니다.','**줄 끝에 공백 2칸을 입력하고 `Enter`**를 누릅니다.','**`A`**와 **`B`**를 사용합니다.','**`a ** b`**를 사용합니다.','**`a`와 `b`**를 사용합니다.']) {
    const codec=createVisualDocumentCodec(source);
    let codes=0;
    codec.doc.descendants(node=>{if(node.isText && node.marks.some(mark=>mark.type.name==='code')){assert.ok(node.marks.some(mark=>mark.type.name==='strong'),source);codes++;}});
    assert.ok(codes>0,source);
    assert.ok(createVisualDocumentCodec(visualSerializer.serialize(codec.doc)).doc.eq(codec.doc),source);
    const tree=await processor.run(processor.parse(source),{value:source});
    const visit=(node,strong=false)=>{
      if(node.type==='inlineCode')assert.ok(strong,source);
      if(node.type==='text')assert.ok(!node.value.includes('**'),source);
      for(const child of node.children||[])visit(child,strong||node.type==='strong');
    };
    visit(tree);
  }
  for(const source of ['`**강조**를`','\\*\\*`Enter`\\*\\*를']) {
    const tree=await processor.run(processor.parse(source),{value:source});
    assert.ok(!JSON.stringify(tree).includes('"type":"strong"'),source);
  }
  console.log('PASS: real remark AST and editor codec preserve code inside Korean strong, including multiple spans, literal stars, save/reload and escaped literals');
}
codeCases().catch(error=>{console.error(error);process.exitCode=1;});
