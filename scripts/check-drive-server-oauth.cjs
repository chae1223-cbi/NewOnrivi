// ====================================================================
// 📊 [OMD-SCRIPT-drive-oauth-check-0001] scripts/check-drive-server-oauth.cjs
// 🎯 @KICK  : Google Drive 서버 사이드 OAuth 및 토큰/세션 라이프사이클 E2E 단위 검증 스크립트
// 🛡️ @GUARD : PKCE 검증, AES-GCM 스토리지 암호화, CSRF 방어, 다중 오리진 동적 바인딩, 일회성 티켓 소비 무결성
// 🚨 @PATCH : 2026-11-03 — Cloudflare Pages 프리뷰 서브도메인(dev01) 동적 허용 및 미승인 오리진 차단 테스트 케이스 추가 및 표준 주석 완비
// 🚨 @PATCH : 2026-10-15 — 최초 구글 드라이브 OAuth 단위 검증 테스트 스위트 구축
// 🔗 @CALLS : functions/api/gdrive/_oauth.js (handleDriveOAuth)
// ====================================================================

const fs = require('node:fs'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const source = fs.readFileSync('functions/api/gdrive/_oauth.js', 'utf8');
const originalFetch = global.fetch, originalNow = Date.now;
let now = originalNow(), tokenCalls = [], invalidGrant = false;
Date.now = () => now;
const objects = new Map();

// ─── [테스트 픽스처 환경 정의] ──────────────────────────────────────────
const env = {
  GOOGLE_CLIENT_ID: 'fixture-client',
  GOOGLE_CLIENT_SECRET: 'fixture-secret',
  GOOGLE_DRIVE_REDIRECT_URI: 'https://onrivi.com/api/gdrive/oauth/callback',
  R2_BUCKET: {
    put: async (key, value) => objects.set(key, value),
    get: async key => objects.has(key) ? { text: async () => objects.get(key) } : null,
    delete: async key => objects.delete(key)
  }
};

// ─── [Google OAuth Token API 모킹] ────────────────────────────────────
global.fetch = async (url, options) => {
  assert.equal(url, 'https://oauth2.googleapis.com/token');
  const params = new URLSearchParams(options.body);
  tokenCalls.push(params);
  if (invalidGrant) return Response.json({ error: 'invalid_grant' }, { status: 400 });
  assert.equal(params.get('client_secret'), 'fixture-secret');
  return Response.json({
    access_token: `fixture-access-${tokenCalls.length}`,
    expires_in: 3600,
    ...(params.get('grant_type') === 'authorization_code' ? { refresh_token: 'fixture-refresh-NEVER-EXPOSE' } : {})
  });
};

const cookieValue = (response, name) => response.headers.getSetCookie().find(v => v.startsWith(name + '='))?.split(';')[0];

(async () => {
  const { handleDriveOAuth: handle } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const request = (route, options = {}) => handle(new Request(`https://onrivi.com/api/gdrive/${route}`, options), env);

  // ─── 1. 환경 변수 누락 가드 검증 (503 Service Unavailable) ───
  assert.equal((await handle(new Request('https://onrivi.com/api/gdrive/oauth/start'), {})).status, 503);

  // ─── 2. OAuth Start 요청 및 PKCE/State 쿠키 검증 ─────────────
  const browserState = 'b'.repeat(43);
  const start = await request('oauth/start?browser_state=' + browserState);
  assert.equal(start.status, 302);
  const google = new URL(start.headers.get('Location'));
  assert.equal(google.searchParams.get('access_type'), 'offline');
  assert.equal(google.searchParams.get('code_challenge_method'), 'S256');
  const stateCookie = cookieValue(start, 'onrivi_drive_oauth_state');
  assert.ok(stateCookie && !stateCookie.includes('fixture-secret'));

  // ─── 3. State 불일치 CSRF 공격 차단 검증 (400 Bad Request) ───
  const state = google.searchParams.get('state');
  assert.equal((await request(`oauth/callback?code=fixture&state=wrong`, { headers: { Cookie: stateCookie } })).status, 400);

  // ─── 4. 인가 코드 교환 및 세션 쿠키 발급 검증 ────────────────
  const callback = await request(`oauth/callback?code=fixture&state=${state}`, { headers: { Cookie: stateCookie } });
  assert.equal(callback.status, 200);
  const body = await callback.text();
  let popupClosed = false;
  const callbackScript = body.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  Function('window', callbackScript)({ opener: null, close: () => { popupClosed = true; } });
  assert.equal(popupClosed, true, 'callback closes even when COOP severed the opener');
  assert.ok(body.includes('fixture-access-1'));
  assert.ok(!body.includes('fixture-refresh'));
  const session = cookieValue(callback, 'onrivi_drive_session');
  assert.ok(session);

  // ─── 5. 브라우저 COOP 폴링 상태(status) 검증 ─────────────────
  const status = state => request('oauth/status', { method: 'POST', headers: { Origin: 'https://onrivi.com', Cookie: session, 'Content-Type': 'application/json' }, body: JSON.stringify({ state }) });
  assert.equal((await status('wrong')).status, 202);
  assert.equal((await (await status(browserState)).json()).access_token, 'fixture-access-1');
  assert.ok(callback.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));

  // ─── 6. R2 암호화 스토리지 민감정보 노출 차단 검증 ───────────
  for (const ciphertext of objects.values()) {
    assert.ok(!ciphertext.includes('fixture-refresh'));
    assert.ok(!ciphertext.includes('fixture-access'));
  }

  // ─── 7. Origin 헤더 CSRF 검증 및 토큰 갱신(refresh) 검증 ─────
  const post = (route, cookie = session) => request(route, { method: 'POST', headers: { Origin: 'https://onrivi.com', Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await request('oauth/refresh', { method: 'POST', headers: { Origin: 'https://evil.example', Cookie: session } })).status, 403);
  const fresh = await post('oauth/refresh');
  assert.equal((await fresh.json()).access_token, 'fixture-access-1');
  assert.equal(tokenCalls.length, 1);

  // 토큰 만료 임박(3분 전) 시 자동 갱신 및 동시성 중복 호출 방어
  now += 3450000;
  const renewed = await Promise.all([post('oauth/refresh'), post('oauth/refresh')]);
  for (const response of renewed) assert.equal((await response.json()).access_token, 'fixture-access-2');

  // ─── 8. 데스크톱 앱 일회성 티켓 루프백 핸드오프 검증 ─────────
  const verifier = crypto.randomBytes(32).toString('base64url'), desktopState = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const desktopStart = await request(`oauth/start?port=54321&challenge=${challenge}&state=${desktopState}`);
  const desktopGoogle = new URL(desktopStart.headers.get('Location'));
  const desktopCallback = await request(`oauth/callback?code=desktop-code&state=${desktopGoogle.searchParams.get('state')}`, { headers: { Cookie: cookieValue(desktopStart, 'onrivi_drive_oauth_state') } });
  assert.equal(desktopCallback.status, 302);
  const loopback = new URL(desktopCallback.headers.get('Location'));
  assert.equal(loopback.origin, 'http://127.0.0.1:54321');
  assert.equal(loopback.searchParams.get('state'), desktopState);
  assert.ok(!loopback.href.includes('fixture-access'));
  assert.ok(!loopback.href.includes('fixture-refresh'));

  const exchange = proof => request('oauth/exchange', { method: 'POST', headers: { Origin: 'https://onrivi.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket: loopback.searchParams.get('code'), verifier: proof }) });
  assert.equal((await exchange('x'.repeat(43))).status, 401);
  const exchanged = await exchange(verifier);
  const tokens = await exchanged.json();
  assert.equal(exchanged.status, 200);
  assert.ok(tokens.session_token);
  assert.ok(!('refresh_token' in tokens));
  assert.equal((await exchange(verifier)).status, 401, 'tickets are single use');

  // ─── 9. 리프레시 토큰 인가 취소(invalid_grant) 처리 검증 ─────
  now += 3450000;
  invalidGrant = true;
  const expired = await post('oauth/refresh');
  assert.equal(expired.status, 401);
  assert.equal((await expired.json()).code, 'REAUTH_REQUIRED');
  assert.equal((await post('oauth/refresh')).status, 401);
  assert.equal((await request('oauth/start?port=80')).status, 400);

  // ─── 10. 세션 해제(disconnect) 검증 ─────────────────────────
  assert.equal((await post('oauth/disconnect')).status, 200);
  invalidGrant = false;

  // ─── 11. 다른 계정 대상 단독(standalone) 저장 세션 격리 검증 ─
  const workspaceStart = await request('oauth/start?browser_state=' + browserState);
  const workspaceCallback = await request('oauth/callback?code=workspace&state=' + new URL(workspaceStart.headers.get('Location')).searchParams.get('state'), { headers: { Cookie: cookieValue(workspaceStart, 'onrivi_drive_oauth_state') } });
  const workspaceSession = cookieValue(workspaceCallback, 'onrivi_drive_session');
  const workspaceAccess = 'fixture-access-' + tokenCalls.length;
  const saveState = 'z'.repeat(43);
  const saveStart = await request('oauth/start?standalone=1&browser_state=' + saveState);
  const saveCallback = await request('oauth/callback?code=other-account&state=' + new URL(saveStart.headers.get('Location')).searchParams.get('state'), { headers: { Cookie: cookieValue(saveStart, 'onrivi_drive_oauth_state') } });
  assert.equal(cookieValue(saveCallback, 'onrivi_drive_session'), undefined, 'save-target authentication cannot replace workspace cookie');
  const saveCookie = cookieValue(saveCallback, 'onrivi_drive_session_' + saveState);
  assert.ok(saveCookie);
  const savedAccess = 'fixture-access-' + tokenCalls.length;
  const saveStatus = await request('oauth/status', { method: 'POST', headers: { Origin: 'https://onrivi.com', Cookie: workspaceSession + '; ' + saveCookie }, body: JSON.stringify({ state: saveState, standalone: true }) });
  assert.equal((await saveStatus.json()).access_token, savedAccess);
  assert.equal((await (await post('oauth/refresh', workspaceSession)).json()).access_token, workspaceAccess);

  // ─── 12. Cloudflare Pages 프리뷰(dev01) 서브도메인 동적 바인딩 검증 ───
  const previewReq = (route, options = {}) => handle(new Request(`https://dev01.onriviauthor.pages.dev/api/gdrive/${route}`, options), env);
  const previewStart = await previewReq('oauth/start?browser_state=' + browserState);
  assert.equal(previewStart.status, 302, 'preview subdomain should be allowed dynamically');
  const previewGoogle = new URL(previewStart.headers.get('Location'));
  assert.equal(previewGoogle.searchParams.get('redirect_uri'), 'https://dev01.onriviauthor.pages.dev/api/gdrive/oauth/callback');

  // ─── 13. 미승인 외부 악의적 오리진 차단(400 Bad Request) 검증 ───
  const evilReq = await handle(new Request('https://malicious-site.com/api/gdrive/oauth/start?browser_state=' + browserState), env);
  assert.equal(evilReq.status, 400, 'unauthorized origin should be blocked');

  console.log('PASS: other-account save authentication and COOP polling preserve the workspace refresh session');
  console.log('PASS: Cloudflare Pages preview subdomain (dev01) dynamic redirect URI & evil origin defense');
  console.log('PASS: OAuth state/PKCE, encrypted storage, cookie session, CSRF, real refresh grant, concurrent deduplication, desktop one-use handoff, revoked grant, disconnect');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  global.fetch = originalFetch;
  Date.now = originalNow;
});
