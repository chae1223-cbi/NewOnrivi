const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const req=require('node:module').createRequire(path.resolve('frontend/package.json')),ts=req('typescript');
const source=fs.readFileSync('frontend/src/lib/gdrive/googleDriveClient.ts','utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const makeStorage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};};
const local=makeStorage(),session=makeStorage(),intervals=new Map();let index=0,gesture=true,opens=0,fetchHandler,expired=0;
const window=Object.assign(new EventTarget(),{location:{origin:'http://localhost:3100'},open:()=>{
  assert.ok(gesture,'authentication popup must be reserved before awaiting an old-token probe');opens++;
  return {document:{title:'',body:{textContent:''}},location:{replace(value){this.url=value;}},close(){this.closed=true;}};
}});
window.addEventListener('onrivi:drive_auth_expired',()=>expired++);
const exportsObject={};
Function('exports','require','window','document','localStorage','sessionStorage','fetch','setTimeout','clearTimeout','setInterval','clearInterval',output)(exportsObject,id=>
  id==='@/lib/browserAccountStorage'?{browserAccountStorage:local,browserAccountSessionStorage:session}:
  id==='@/lib/resourceSettings'?{getResourceSettings:()=>({kind:'drive'}),saveResourceSettings:()=>{}}:
  id==='@/constants/cssProfile'?{SYSTEM_PROFILES:[],isSystemProfileId:()=>false}:
  id==='./activeTokenRenewal'?{startActiveTokenRenewal:()=>()=>{}}:req(id),
  window,{visibilityState:'visible'},local,session,(...args)=>fetchHandler(...args),()=>++index,()=>{},fn=>{intervals.set(++index,fn);return index;},id=>intervals.delete(id));
(async()=>{
  const key='onrivi_gdrive_access_token';local.setItem(key,'old-token');
  let respond;fetchHandler=()=>new Promise(resolve=>respond=resolve);
  const previous=exportsObject.findDriveFolder('old-token','profiles','parent');
  local.setItem(key,'new-token');respond(new Response('',{status:401}));
  await assert.rejects(previous);assert.equal(local.getItem(key),'new-token');assert.equal(expired,0);
  fetchHandler=async()=>new Response('',{status:401});
  await assert.rejects(exportsObject.findDriveFolder('new-token','profiles','parent'));
  assert.equal(local.getItem(key),null);assert.equal(expired,1);
  gesture=true;const prepared=exportsObject.prepareGoogleDriveAuth();assert.equal(opens,1);
  gesture=false;const auth=prepared.request();
  const before=opens;
  fetchHandler=async()=>Response.json({access_token:'reconnected-token',expires_in:3600});
  assert.equal(intervals.size,1);
  await [...intervals.values()][0]();
  assert.equal(await auth,'reconnected-token');assert.equal(local.getItem(key),'reconnected-token');
  assert.equal(opens,before);assert.equal(intervals.size,0);
  gesture=true;
  const otherAccount=exportsObject.prepareGoogleDriveAuth({isStandalone:true});
  gesture=false;
  const otherAuth=otherAccount.request();
  fetchHandler=async(url,options)=>{
    if(!url.endsWith('/oauth/status'))return Response.json({});
    assert.equal(JSON.parse(options.body).standalone,true);
    return Response.json({access_token:'other-account-token',expires_in:3600});
  };
  await [...intervals.values()][0]();
  assert.equal(await otherAuth,'other-account-token');
  assert.equal(local.getItem(key),'reconnected-token','other-account save must preserve workspace access token');
  // Require request-token identity at every Drive error call site.
  const tree=ts.createSourceFile('client.ts',source,ts.ScriptTarget.Latest,true);
  const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(tree)==='parseDriveError')assert.equal(node.arguments.length,3,node.getText(tree));ts.forEachChild(node,visit);};visit(tree);
  console.log('PASS: old 401 preserves new credentials, current 401 expires correctly, popup reserved during click, COOP polling completion, all Drive error paths identify their request token');
})().catch(error=>{console.error(error);process.exitCode=1;});
