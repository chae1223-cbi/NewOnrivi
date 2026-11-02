// ====================================================================
// 📊 [OMD-DEV-CLOUD-API-0001] scripts/dev-cloud-api.cjs
// 🎯 @KICK  : 로컬 Wrangler에서 루트 Cloudflare Functions를 실행한다.
// 🛡️ @GUARD : DB 연결 문자열을 로그나 명령 인수에 노출하지 않고 환경 변수로 전달한다.
// 🚨 @PATCH : 2026-11-02 — frontend/.env.local을 .dev.vars로 자동 동기화하여 Wrangler Functions 바인딩(Supabase 등) 완비
// 🚨 @PATCH : 2026-11-02 — 단일 Cloudflare API 원본과 로컬 Hyperdrive 연결을 설정한다.
// 🔗 @CALLS : wrangler pages dev, frontend/.env.local, .dev.vars
// ====================================================================
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, 'frontend', '.env.local');
const devVarsFile = path.join(root, '.dev.vars');
const assets = path.join(root, 'frontend', 'public');
if (!fs.existsSync(envFile)) throw new Error('frontend/.env.local is required for local Cloudflare API development.');
if (!fs.existsSync(assets)) throw new Error('frontend/public is required.');

// Wrangler Pages Dev는 루트의 .dev.vars 파일에서 Functions 바인딩 환경변수를 읽습니다.
// 프론트엔드의 .env.local을 .dev.vars로 자동 복사하여 항상 최신 설정이 바인딩되도록 합니다.
try {
  fs.copyFileSync(envFile, devVarsFile);
} catch (e) {
  console.warn('[dev-cloud-api] .dev.vars 동기화 경고:', e.message);
}

const localEnv = dotenv.parse(fs.readFileSync(envFile));
if (!localEnv.DATABASE_URL) throw new Error('DATABASE_URL is required in frontend/.env.local.');

const args = ['pages', 'dev', 'frontend/public', '--port', '8788', '--persist-to', 'scratch/wrangler-state'];
const windows = process.platform === 'win32';
const child = spawn(windows ? (process.env.ComSpec || 'cmd.exe') : 'wrangler',
  windows ? ['/d', '/s', '/c', `wrangler ${args.join(' ')}`] : args, {
    cwd: root,
    env: {
      ...process.env,
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: localEnv.DATABASE_URL,
    },
    stdio: 'inherit',
  });
child.on('error', error => {
  console.error('Wrangler failed to start:', error.code || error.name);
  process.exitCode = 1;
});
child.on('exit', code => { process.exitCode = code ?? 1; });
