const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const req=require('module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const exportsObject={};
new Function('exports','require',ts.transpileModule(fs.readFileSync('frontend/src/lib/exportFonts.ts','utf8'),{compilerOptions:{module:1,target:7}}).outputText)(exportsObject,()=>({getLocalFontSources:()=>[],rememberLocalFontSources:()=>{}}));
const fake='data:font/ttf;base64,AAAA';
let rules=[400,900,700,600,300,500,100].map(weight=>`@font-face{font-family:"Noto Sans KR";font-weight:${weight};src:url("${fake}");font-style:normal;}`);
rules.push(`@font-face{font-family:"Noto Sans KR";font-weight:400;src:url("data:font/ttf;base64,BBBB");font-style:normal;}`);
if(process.argv.includes('--attached')){
 const html=fs.readFileSync('C:/Users/chae1/Downloads/HELP-02_에디터_화면_구성과_3단_레이아웃 (1).html','utf8');
 rules=Array.from(html.matchAll(/@font-face\s*\{[^}]*\}/gi)).map(m=>m[0]).filter(rule=>rule.includes('Noto Sans KR'));
}
const children=[{weight:'700',closest:()=>null}];
const root={weight:'400',closest:()=>null,querySelectorAll:()=>children};
const doc={baseURI:'http://localhost/',fonts:[],defaultView:{getComputedStyle:el=>({fontFamily:'"Noto Sans KR"',fontWeight:el.weight})},styleSheets:[{cssRules:rules.map(cssText=>({cssText}))}],createTreeWalker:()=>({nextNode:()=>false})};root.ownerDocument=doc;
(async()=>{
 const css=await exportsObject.embedExportFonts(root);
 assert.equal((css.match(/@font-face/g)||[]).length,1,'one font file must cover both used weights');
 assert.ok(/font-weight:\s*400 700/.test(css));
 console.log('PASS: only used weights embedded; duplicate weight/source declarations merged. Bytes:',rules.join('\n').length,'->',css.length);
})().catch(e=>{console.error(e);process.exitCode=1;});
