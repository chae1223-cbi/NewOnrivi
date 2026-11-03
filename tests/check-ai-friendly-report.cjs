const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ts=require('../frontend/node_modules/typescript');
const compile=file=>ts.transpileModule(fs.readFileSync('frontend/src/'+file,'utf8'),{compilerOptions:{module:1,target:7}}).outputText;
function load(file,resolve=()=>({})){const exports={};vm.runInNewContext(compile(file),{exports,require:resolve,console});return exports;}
const helpers=load('lib/aiFriendlyReport.ts');
assert.equal(helpers.nextReportNumber('**표 3. 현황**\n\n```md\n표 99. 예시\n```','표'),4);
assert.equal(helpers.reportCaption('표',2,'<script>\n*일정*'),'**표 2. \\<script\\> \\*일정\\***');
const profile=load('constants/cssProfile.ts');
assert.equal(profile.DEFAULT_PROFILE.id,'system-1');
const report=profile.SYSTEM_PROFILES.find(p=>p.id==='ai-friendly-report');
assert.ok(report && profile.SYSTEM_PROFILE_IDS.includes(report.id));
assert.ok(report.customCss.includes('order:-1'));
assert.equal(profile.DEFAULT_PROFILE.rules.th['background-color']===report.rules.th['background-color'],false);
let stored={'사용자 분류':{'내 템플릿':{systemPrompt:'보존',userInputTemplate:'입력'}},'AI 친화적 보고서':{'내 점검':{systemPrompt:'사용자 규칙',userInputTemplate:''}}};
const prompts=load('lib/promptTemplates.ts',name=>name==='./aiFriendlyReport'?helpers:{readResourceJson:async()=>stored});
(async()=>{const dictionary=await prompts.getPromptTemplates();assert.equal(dictionary['사용자 분류']['내 템플릿'].systemPrompt,'보존');assert.equal(dictionary['AI 친화적 보고서']['내 점검'].systemPrompt,'사용자 규칙');assert.ok(dictionary['AI 친화적 보고서']['AI 친화적 보고서 점검'].systemPrompt.includes('문서를 변경하지 말고'));assert.ok(prompts.AI_REPORT_TEMPLATES['AI 친화적 보고서 작성'].systemPrompt.includes('Ⅰ., 1., 가., 1), 가)'));console.log('PASS: source captions, next numbers, optional report profile without default mutation, principles, template merge and custom preservation');})().catch(e=>{console.error(e);process.exitCode=1;});
