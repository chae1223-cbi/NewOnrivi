const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const profileApi={};Function('exports','require',compile(fs.readFileSync('frontend/src/constants/cssProfile.ts','utf8')))(profileApi,()=>({normalizeBookLayout:()=>undefined}));
const {normalizeCssProfile,resolveCssProfile,DEFAULT_PROFILE}=profileApi;
function findNode(file,predicate){const source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let match;const visit=node=>{if(predicate(node))match=node;ts.forEachChild(node,visit);};visit(tree);assert.ok(match);return match.getText(tree);}
const updateExpression=findNode('frontend/src/components/CssStyleForm.tsx',node=>ts.isVariableDeclaration(node)&&node.name.getText()==='updateTableFontSize');
const applySize=(profile,value)=>{
 let updated;
 Function('currentProfile','getTagRules','triggerUpdate','isSystemProfile',compile('const '+updateExpression+'; updateTableFontSize('+JSON.stringify(value)+');'))(
   resolveCssProfile(profile),tag=>({...DEFAULT_PROFILE.rules[tag],...resolveCssProfile(profile).rules[tag]}),next=>updated=next,false);
 return updated;
};
const generateSource=findNode('frontend/src/lib/exportHandlers.ts',node=>ts.isFunctionDeclaration(node)&&node.name?.text==='generateExportCss');
const exporter={};Function('exports','normalizeCssProfile','DEFAULT_PROFILE','PRINT_TABLE_FLOW_CSS',compile(generateSource))(exporter,normalizeCssProfile,DEFAULT_PROFILE,'');
const raw={...structuredClone(DEFAULT_PROFILE),id:'qa-table-font',pageStyle:{...DEFAULT_PROFILE.pageStyle,fontSize:'20px'},rules:{...DEFAULT_PROFILE.rules,table:{...DEFAULT_PROFILE.rules.table,'font-size':'15px'},th:{'font-size':'15px'},td:{'font-size':'15px'}}};
const inherited=applySize(raw,'');
for(const tag of ['table','th','td'])assert.equal(inherited.rules[tag]['font-size'],'inherit');
const saved=resolveCssProfile(JSON.parse(JSON.stringify(inherited)));
for(const tag of ['table','th','td'])assert.equal(saved.rules[tag]['font-size'],'inherit');
const missing=structuredClone(inherited);for(const tag of ['table','th','td'])delete missing.rules[tag]['font-size'];
assert.equal(resolveCssProfile(missing).rules.table['font-size'],'inherit');
const direct=applySize(inherited,'18px');assert.equal(resolveCssProfile(direct).rules.table['font-size'],'18px');
const main=fs.readFileSync('frontend/src/components/MainEditorApp.tsx','utf8');
const start=main.indexOf('    const tableHasFontSize = prof.rules.table');
const stop=main.indexOf('    // 📊 표 정교화 보정',start);
assert.ok(start>0&&stop>start);
const previewCss=Function('prof','ps','css',main.slice(start,stop)+';return css;')(saved,saved.pageStyle,'');
assert.ok(previewCss.includes('font-size: 20px !important'));
(async()=>{
 const browser=await req('playwright-core').chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<style id="profile"></style><div class="custom-preview-container"><div style="font-size:15px"><table><thead><tr><th>헤더</th></tr></thead><tbody><tr><td>본문</td></tr></tbody></table></div></div>');
  const check=async(css,size)=>{await page.evaluate(css=>document.getElementById('profile').textContent=css,css);const sizes=await page.locator('table,th,td').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).fontSize));assert.deepEqual(sizes,[size,size,size]);};
  await check(exporter.generateExportCss(raw),'15px');
  await check(exporter.generateExportCss(saved),'20px');
  await check(previewCss,'20px');
  await check(exporter.generateExportCss({...saved,pageStyle:{...saved.pageStyle,fontSize:'22px'}}),'22px');
  await check(exporter.generateExportCss(direct),'18px');
  await page.setContent('<style id="profile"></style><div class="custom-preview-container"><div style="font-size:15px"><blockquote><p>인용구</p></blockquote><div class="codeblock-area"><pre><code>code</code></pre></div><span class="katex">수식</span></div></div>');
  const controls=['blockquote','codeBlock','math'];
  const audit=structuredClone(saved);
  for(const tag of controls) audit.rules[tag]={'font-size':'inherit'};
  const blockStart=main.indexOf('  // Resolve base-size controls');
  const blockEnd=main.indexOf('    const tableHasFontSize',blockStart);
  const actualPreview=compile('function render(prof,ps){let css="";'+main.slice(blockStart,blockEnd)+';return css;}');
  const renderPreview=Function(actualPreview+';return render;')();
  for(const mode of ['missing','inherit','18px']) {
   for(const tag of controls) {if(mode==='missing')delete audit.rules[tag]['font-size'];else audit.rules[tag]['font-size']=mode;}
   for(const base of ['20px','22px']) {
    audit.pageStyle.fontSize=base;
    const normalized=resolveCssProfile(JSON.parse(JSON.stringify(audit)));
    for(const tag of controls)assert.equal(normalized.rules[tag]['font-size'],mode==='18px'?'18px':'inherit');
    for(const css of [exporter.generateExportCss(normalized),renderPreview(normalized,normalized.pageStyle)]) {
     await page.evaluate(css=>document.getElementById('profile').textContent=css,css);
     const sizes=await page.locator('blockquote,blockquote p,pre,pre code,.katex').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).fontSize));
     assert.deepEqual(sizes,Array(5).fill(mode==='18px'?'18px':base));
    }
   }
  }
  console.log('PASS: quote/code/math missing and inherited sizes follow 20px/22px document size; explicit 18px survives save and preview/export');
  console.log('PASS: base-size toggle persists through normalization/save; preview/export tables and cells use 20px, follow 22px base changes, and retain direct 18px');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
