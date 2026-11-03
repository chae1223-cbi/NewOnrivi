// Read-only EXPLAIN: validates schema/types without executing the heartbeat UPDATE.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {Client}=require('pg');
const env=require('dotenv').parse(fs.readFileSync('frontend/.env.local'));
(async()=>{
  assert.ok(env.DATABASE_URL,'Local DATABASE_URL must be configured');
  const {SESSION_QUERY}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('functions/api/license/_session.js','utf8')).toString('base64'));
  const client=new Client({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000,query_timeout:10000});
  try{
    await client.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5s'");
    const plan=await client.query('EXPLAIN '+SESSION_QUERY,['nonexistent-session-fixture',null,'00000000-0000-4000-8000-000000000000']);
    assert.ok(plan.rows.length);
    console.log('PASS: unified SQL schema/types validated with EXPLAIN inside a read-only transaction; no heartbeat UPDATE executed');
  }finally{await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});}
})().catch(error=>{console.error('Session query validation failed:',['42703','42P01','42883','42804','42601'].includes(error.code)?error.message:error.code||error.name);process.exitCode=1;});
