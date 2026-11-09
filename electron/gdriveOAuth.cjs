// ====================================================================
// 📊 [OMD-ELECTRON-gdriveOAuth-0001] electron/gdriveOAuth.cjs
// 🎯 @KICK  : Electron 데스크톱 앱 구글 드라이브 무음 갱신 및 루프백 PKCE 인증 모듈
// 🛡️ @GUARD : Rule 1(소스 상단 주석 기록), Rule 2(대문자 코드값)
// 🚨 @PATCH : **2026-11-08** — [Google Drive 인증 완료 탭 닫기 개선 및 앱 전면 포커스]: 브라우저 보안 정책으로 인한 window.close() 차단 시 UI 안내(Ctrl+W) 반응형 피드백 보강 및 인증 완료 시 데스크톱 창 자동 전면(setAlwaysOnTop 일시 토글) 팝업
// 🚨 @PATCH : **2026-10-24** — [구글 드라이브 연결 실패 후 재접속 불가 버그 완전 해결 및 이전 인증 자동 정리]:
//             1) 이전 인증 진행 중(authenticating) 새 인증 요청 인입 시 기존 루프백 서버 및 타이머를 즉시 강제 종료(cancelCurrentAuth)하고 즉각 새 인증을 수용하도록 개편 (5분 대기 잠금 결함 완전 해소)
//             2) 타임아웃을 120초로 현실화하고 실패/취소 시 서버 자원 즉시 반환
// ====================================================================

const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

function registerDriveOAuth({ ipcMain, app, shell, safeStorage, getWindow }) {
  let authenticating = null, renewing = null;
  let cancelCurrentAuth = null;
  const filename = () => path.join(app.getPath('userData'), 'gdrive-oauth-session.enc');
  const origin = () => !app.isPackaged && process.env.NO_SERVER !== 'true' ? 'http://localhost:3100' : 'https://onrivi.com';
  const trusted = event => event.sender === getWindow()?.webContents;
  const read = async () => {
    try { return JSON.parse(safeStorage.decryptString(await fs.readFile(filename()))); } catch { return null; }
  };
  async function post(base, route, body, session) {
    if (!['http://localhost:3100', 'https://onrivi.com'].includes(base)) throw new Error('인증 서버 주소가 올바르지 않습니다.');
    const response = await fetch(`${base}/api/gdrive/oauth/${route}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base, ...(session ? { Authorization: `Bearer ${session}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok) { const error = new Error(result.error || 'Google Drive 인증 요청에 실패했습니다.'); error.code = result.code; throw error; }
    return result;
  }
  ipcMain.handle('gdrive:request-auth', async (event, options) => {
    if (!trusted(event)) throw new Error('허용되지 않은 인증 요청입니다.');
    const standalone = options?.isStandalone === true;

    // 이전 인증이 남아있다면 5분 동안 튕기지 않고 즉시 안전하게 취소 후 새 인증 개시
    if (cancelCurrentAuth) {
      try { cancelCurrentAuth(); } catch {}
      cancelCurrentAuth = null;
      authenticating = null;
    }

    if (!safeStorage.isEncryptionAvailable()) throw new Error('운영체제의 인증 정보 암호화 저장소를 사용할 수 없습니다.');
    authenticating = new Promise((resolve, reject) => {
      const base = origin(), state = crypto.randomBytes(32).toString('base64url'), verifier = crypto.randomBytes(32).toString('base64url');
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
      let finished = false, exchanging = false, timer;
      const finish = (error, result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        cancelCurrentAuth = null;
        try { server.close(); } catch {}
        if (error) reject(error); else {
          resolve(result);
          const win = getWindow();
          if (win && !win.isDestroyed()) {
            if (win.isMinimized()) win.restore();
            win.setAlwaysOnTop(true);
            win.show();
            win.focus();
            win.setAlwaysOnTop(false);
          }
        }
      };

      cancelCurrentAuth = () => {
        if (finished) return;
        finish(new Error('새로운 인증 요청으로 인해 이전 요청이 취소되었습니다.'));
      };

      const server = http.createServer(async (request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Referrer-Policy', 'no-referrer');
        const url = new URL(request.url, 'http://127.0.0.1');
        const ticket = url.searchParams.get('code');
        if (request.method !== 'GET' || url.pathname !== '/callback' || url.searchParams.get('state') !== state || !/^[\w-]{43}$/.test(ticket || '') || exchanging) {
          response.writeHead(400); response.end('Invalid OAuth callback'); return;
        }
        exchanging = true;
        try {
          const tokens = await post(base, 'exchange', { ticket, verifier });
          if (!/^[\w-]{43}$/.test(tokens.session_token || '') || !tokens.access_token) throw new Error('인증 응답이 올바르지 않습니다.');
          if (!standalone) await fs.writeFile(filename(), safeStorage.encryptString(JSON.stringify({ origin: base, session: tokens.session_token })), { mode: 0o600 });
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Google Drive 연결 완료 - 온리비 어서</title>
<style>
body{font:15px/1.6 system-ui,-apple-system,sans-serif;color:#1e293b;margin:0;padding:24px;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box}
main{max-width:440px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:36px 30px;text-align:center;box-shadow:0 10px 25px -5px rgba(15,23,42,.06)}
h1{font-size:22px;margin:0 0 12px;color:#0f172a;font-weight:700}
p{color:#475569;margin:0 0 24px;font-size:15px;line-height:1.6}
.btn{font:inherit;font-weight:600;padding:10px 26px;border-radius:8px;border:none;background:#1d4ed8;color:#ffffff;cursor:pointer;transition:all .15s ease;display:inline-block}
.btn:hover{background:#1e40af}
.btn:active{transform:scale(0.98)}
.guide{font-size:13px;color:#64748b;margin:18px 0 0;background:#f1f5f9;padding:12px 14px;border-radius:8px;line-height:1.5}
.kbd{display:inline-block;background:#e2e8f0;border:1px solid #cbd5e1;padding:2px 7px;border-radius:5px;font-family:monospace;font-weight:700;color:#1e293b;font-size:12px}
</style>
</head><body><main id="complete">
<h1>✅ Google Drive에 연결되었습니다.</h1>
<p>온리비 어서에서 작업을 계속하세요.<br>인증이 완료되었으므로 이 탭은 닫으셔도 됩니다.</p>
<button id="close" class="btn" type="button">탭 닫기</button>
<div id="notice" class="guide">
  닫히지 않으면 <span class="kbd">Ctrl</span> + <span class="kbd">W</span> 또는 탭의 <span class="kbd">×</span> 를 눌러 주세요.
</div>
</main>
<script>
try { history.replaceState(null, '', '/callback'); } catch {}
function closeTab() {
  try { window.open('', '_self', ''); window.close(); } catch (e) {}
  try { window.close(); } catch (e) {}
  try { self.close(); } catch (e) {}
  setTimeout(function() {
    var btn = document.getElementById('close');
    if (btn) {
      btn.innerText = 'Ctrl + W 로 탭 닫기';
      btn.style.background = '#64748b';
    }
  }, 150);
}
document.getElementById('close').addEventListener('click', closeTab);
closeTab();
</script></body></html>`);
          finish(null, { access_token: tokens.access_token, expires_in: tokens.expires_in });
        } catch (error) {
          response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('인증 연결에 실패했습니다. 앱에서 다시 시도해 주세요.'); finish(error);
        }
      });
      server.on('error', error => finish(error));
      timer = setTimeout(() => finish(new Error('Google Drive 인증 시간이 초과되었습니다. 다시 연결해 주세요.')), 120000);
      
      const listen = port => {
        server.once('listening', () => {
          const address = server.address();
          if (address.port < 49152) { finish(new Error('인증용 로컬 포트를 사용할 수 없습니다.')); return; }
          const target = new URL(`${base}/api/gdrive/oauth/start`);
          target.search = new URLSearchParams({ port: String(address.port), state, challenge }).toString();
          void shell.openExternal(target.href).catch(error => finish(error));
        });
        server.listen(port, '127.0.0.1');
      };
      const attempt = () => 49152 + crypto.randomInt(16384);
      listen(attempt());
    }).finally(() => {
      authenticating = null;
      cancelCurrentAuth = null;
    });
    return authenticating;
  });
  ipcMain.handle('gdrive:refresh-auth', async event => {
    if (!trusted(event)) throw new Error('허용되지 않은 인증 요청입니다.');
    if (!renewing) renewing = (async () => {
      const saved = await read();
      if (!saved) return { code: 'REAUTH_REQUIRED' };
      try { return await post(saved.origin, 'refresh', {}, saved.session); }
      catch (error) {
        if (error.code === 'REAUTH_REQUIRED') { await fs.rm(filename(), { force: true }); return { code: error.code }; }
        return { code: 'REFRESH_FAILED' };
      }
    })().finally(() => { renewing = null; });
    return renewing;
  });
  ipcMain.handle('gdrive:disconnect-auth', async event => {
    if (!trusted(event)) return;
    const saved = await read();
    await fs.rm(filename(), { force: true });
    if (saved) { try { await post(saved.origin, 'disconnect', {}, saved.session); } catch { /* Local credentials are already removed. */ } }
  });
}
module.exports = { registerDriveOAuth };
