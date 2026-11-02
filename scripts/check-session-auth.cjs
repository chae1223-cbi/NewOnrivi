const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');const req=createRequire(path.resolve('frontend/package.json'));
const ts=req('typescript'),{createClient}=req('@supabase/supabase-js');
const source=ts.transpileModule(fs.readFileSync('functions/api/license/_sessionAuth.js','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exported={};Function('exports','require',source)(exported,()=>({createClient}));
const originalFetch=global.fetch;
const url='https://fixture.supabase.co',sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let jwksFetches=0,userFetches=0,publicKey;
global.fetch=async input=>{
  if(String(input).includes('/.well-known/jwks.json')){jwksFetches++;return Response.json({keys:[publicKey]});}
  if(String(input).endsWith('/auth/v1/user')){userFetches++;return Response.json({id:sub,aud:'authenticated',role:'authenticated'});}
  throw Error('Unexpected authentication request');
};
const b64=bytes=>Buffer.from(bytes).toString('base64url');
(async()=>{
  const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  publicKey={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'fixture-key',use:'sig',alg:'ES256'};
  async function token(overrides={}){
    const text=b64(JSON.stringify({alg:'ES256',kid:'fixture-key',typ:'JWT'}))+'.'+b64(JSON.stringify({sub,role:'authenticated',aud:'authenticated',iss:url+'/auth/v1',exp:Math.floor(Date.now()/1000)+3600,...overrides}));
    return text+'.'+b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,Buffer.from(text)));
  }
  const env={NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon'};
  const request=jwt=>new Request('https://onrivi.com/api/license/check-session',{headers:{Authorization:'Bearer '+jwt}});
  const valid=await token();assert.equal((await exported.sessionUser(request(valid),env)).id,sub);
  assert.equal((await exported.sessionUser(request(valid),env)).id,sub);
  assert.equal(jwksFetches,1);assert.equal(userFetches,0,'asymmetric JWT uses cached keys without getUser');
  const other=await token({jti:'another'});assert.equal((await exported.sessionUser(request(other),env)).id,sub);assert.equal(jwksFetches,1);
  const forged=valid.split('.');forged[1]=b64(JSON.stringify({sub,role:'authenticated',aud:'authenticated',iss:url+'/auth/v1',exp:Math.floor(Date.now()/1000)+7200}));
  assert.equal(await exported.sessionUser(request(forged.join('.')),env),null);
  assert.equal(await exported.sessionUser(request(await token({iss:'https://evil.example/auth/v1'})),env),null);
  assert.equal(await exported.sessionUser(request(await token({aud:'other'})),env),null);
  assert.equal(await exported.sessionUser(request(await token({role:'service_role'})),env),null);
  assert.equal(await exported.sessionUser(request(await token({exp:1})),env),null);
  // Legacy HS256 still delegates authenticity to Supabase rather than trusting decoding.
  const legacy=b64(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+b64(JSON.stringify({sub,role:'authenticated',aud:'authenticated',iss:url+'/auth/v1',exp:Math.floor(Date.now()/1000)+3600}))+'.'+b64('fixture-signature');
  assert.equal((await exported.sessionUser(request(legacy),env)).id,sub);
  assert.equal((await exported.sessionUser(request(legacy),env)).id,sub);assert.equal(userFetches,1);
  console.log('PASS: real ES256 signature verification, cached JWKS, verified-claim cache, forged/expired/wrong issuer/audience rejected, legacy Auth fallback');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{global.fetch=originalFetch;});
