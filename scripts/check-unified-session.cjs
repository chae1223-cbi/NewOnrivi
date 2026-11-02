const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const {checkSession,SESSION_QUERY}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('functions/api/license/_session.js','utf8')).toString('base64'));
  const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},body={p_device_uuid:'device-fixture'};
  let calls=0,fixture={activation_id:'session',activation_active:true,eligible:true,plan_name:'REGULAR',idle_expired:false};
  const query=async(text,params)=>{calls++;assert.equal(text,SESSION_QUERY);assert.deepEqual(params,['device-fixture',null,user.id]);return fixture?[fixture]:[];};
  let response=await checkSession(body,user,query);assert.equal(response.data.reason,'ACTIVE');assert.equal(response.data.has_session,true);assert.equal(calls,1);
  fixture.idle_expired=true;response=await checkSession(body,user,query);assert.equal(response.data.has_session,true,'idle alone does not revoke a still-authorized row');
  fixture.activation_active=false;response=await checkSession(body,user,query);assert.equal(response.data.reason,'RESTRICTED');assert.equal(response.data.has_session,false);
  fixture.eligible=false;response=await checkSession(body,user,query);assert.equal(response.data.reason,'PLAN_EXPIRED');assert.equal(response.data.is_terminated,false);
  fixture=null;response=await checkSession(body,user,query);assert.equal(response.data.reason,'TERMINATED');assert.equal(response.data.is_terminated,true);
  const before=calls;assert.equal((await checkSession({p_device_uuid:''},user,query)).status,400);assert.equal((await checkSession(body,null,query)).status,401);assert.equal(calls,before);
  assert.ok(SESSION_QUERY.includes("interval '55 seconds'"));assert.ok(SESSION_QUERY.includes('ELSE a.is_active END'),'heartbeat cannot re-enable a revoked row');
  for(const name of ['_session.js','_sessionAuth.js','check-session.js'])assert.equal(fs.readFileSync('functions/api/license/'+name,'utf8').replace(/\r\n/g,'\n'),fs.readFileSync('frontend/functions/api/license/'+name,'utf8').replace(/\r\n/g,'\n'));
  for(const name of ['functions/api/license/activate.js','frontend/functions/api/license/activate.js','frontend/src/lib/db/queries/licenseQueries.ts'])assert.ok(fs.readFileSync(name,'utf8').includes("interval '5 minutes'"));
  const guard=fs.readFileSync('frontend/src/components/WebSessionRevocationGuard.tsx','utf8');assert.ok(!guard.includes('/api/device/session-status'));assert.ok(guard.includes("'/api/license/check-session'"));
  console.log('PASS: unified session states, idle/revoked distinction, ownership parameter, one SQL statement, throttled writes, 5-minute lease and deploy/local parity');
})().catch(error=>{console.error(error);process.exitCode=1;});
