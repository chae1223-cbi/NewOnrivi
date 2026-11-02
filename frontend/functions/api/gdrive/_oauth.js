// Shared by Cloudflare Pages Functions and the local Next.js server.
// Refresh tokens never leave this server. Stored records are AES-GCM encrypted.
const encoder = new TextEncoder();
const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unbase64 = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const random = () => base64(crypto.getRandomValues(new Uint8Array(32)));
const digest = async text => base64(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
const sessionCookie = 'onrivi_drive_session';
const stateCookie = 'onrivi_drive_oauth_state';
const noCache = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...noCache, 'Content-Type': 'application/json', ...extra } });
const cookies = request => Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(value => value.trim().split('=' )).filter(parts => parts.length === 2));
function cookie(name, value, maxAge, secure) {
  return `${name}=${value}; Path=/api/gdrive; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
async function encryptionKey(env) {
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', encoder.encode(`onrivi-drive-v1:${env.GOOGLE_CLIENT_SECRET}`)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(env, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `${base64(iv)}.${base64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(env), encoder.encode(JSON.stringify(data))))}`;
}
async function open(env, value) {
  const [iv, body] = value.split('.');
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(iv) }, await encryptionKey(env), unbase64(body))));
}
async function store(env, key, data) { await env.R2_BUCKET.put(`_drive-oauth/${key}`, await seal(env, data)); }
async function load(env, key) {
  const object = await env.R2_BUCKET.get(`_drive-oauth/${key}`);
  if (!object) return null;
  try { const value = await open(env, await object.text()); return value.expires > Date.now() ? value : null; } catch { return null; }
}
function page(text, script = '', headers = {}) {
  const nonce = random();
  return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>Google Drive 연결</title><body><p>${text}</p>${script ? `<script nonce="${nonce}">${script}</script>` : ''}</body></html>`, {
    headers: (() => {
      const result = new Headers(headers);
      for (const [name, value] of Object.entries({ ...noCache, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'` })) result.set(name, value);
      return result;
    })()
  });
}
async function googleToken(env, params) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...params }),
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    console.error('[Google OAuth Token Error]', response.status, result);
    const error = new Error(result.error === 'invalid_grant' ? 'REAUTH_REQUIRED' : (result.error_description || result.error || 'TOKEN_REQUEST_FAILED'));
    error.reauth = result.error === 'invalid_grant';
    error.details = result;
    throw error;
  }
  return result;
}
function safeScript(data) { return JSON.stringify(data).replace(/</g, '\\u003c'); }
const refreshes = new Map();
export async function handleDriveOAuth(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_DRIVE_REDIRECT_URI || !env.R2_BUCKET) {
    return json({ error: 'Google Drive 서버 OAuth 설정이 필요합니다.', code: 'OAUTH_NOT_CONFIGURED' }, 503);
  }
  const url = new URL(request.url), redirect = new URL(env.GOOGLE_DRIVE_REDIRECT_URI);
  const origin = redirect.origin, secure = redirect.protocol === 'https:';
  if (url.origin !== origin) return json({ error: '인증 서버 주소가 설정과 다릅니다.' }, 400);
  const route = url.pathname.replace(/^\/api\/gdrive\//, '');
  const requestCookies = cookies(request);
  try {
    if (route === 'oauth/start' && request.method === 'GET') {
      const port = url.searchParams.get('port'), challenge = url.searchParams.get('challenge'), desktopState = url.searchParams.get('state');
      const browserState = url.searchParams.get('browser_state');
      if (browserState && !/^[\w-]{43}$/.test(browserState)) return json({ error: '인증 요청이 올바르지 않습니다.' }, 400);
      if (port && (!/^\d+$/.test(port) || Number(port) < 49152 || Number(port) > 65535 || !/^[\w-]{43}$/.test(challenge || '') || !/^[\w-]{43}$/.test(desktopState || ''))) return json({ error: '데스크톱 인증 요청이 올바르지 않습니다.' }, 400);
      const state = random(), verifier = random();
      const payload = await seal(env, { state, verifier, port, challenge, desktopState, browserState, standalone: url.searchParams.get('standalone') === '1', expires: Date.now() + 600000 });
      const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      target.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirect.href,
        response_type: 'code', access_type: 'offline', prompt: 'select_account consent', state,
        code_challenge: await digest(verifier), code_challenge_method: 'S256',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
      }).toString();
      return new Response(null, { status: 302, headers: { ...noCache, Location: target.href, 'Set-Cookie': cookie(stateCookie, payload, 600, secure) } });
    }
    if (route === 'oauth/callback' && request.method === 'GET') {
      let state;
      try { state = await open(env, requestCookies[stateCookie] || ''); } catch { return page('인증 요청이 만료되었습니다. 앱에서 다시 연결해 주세요.'); }
      if (state.expires <= Date.now() || state.state !== url.searchParams.get('state')) return json({ error: '인증 요청 검증에 실패했습니다.' }, 400);
      if (url.searchParams.has('error')) return page('Google Drive 연결이 취소되었습니다. 이 창을 닫고 다시 시도해 주세요.', '', { 'Set-Cookie': cookie(stateCookie, '', 0, secure) });
      const code = url.searchParams.get('code');
      if (!code) return json({ error: '인증 코드가 없습니다.' }, 400);
      const tokens = await googleToken(env, { code, grant_type: 'authorization_code', redirect_uri: redirect.href, code_verifier: state.verifier });
      if (!tokens.refresh_token) return page('자동 연장 권한을 받지 못했습니다. 다시 연결하여 접근 권한을 허용해 주세요.');
      const session = random();
      await store(env, `sessions/${await digest(session)}`, { refreshToken: tokens.refresh_token, accessToken: tokens.access_token, browserState: state.browserState,
        accessExpires: Date.now() + Number(tokens.expires_in || 3600) * 1000, expires: Date.now() + 90 * 86400000 });
      const headers = new Headers(noCache);
      headers.append('Set-Cookie', cookie(stateCookie, '', 0, secure));
      if (state.port) {
        const ticket = random();
        await store(env, `tickets/${await digest(ticket)}`, { session, challenge: state.challenge, expires: Date.now() + 60000 });
        headers.set('Location', `http://127.0.0.1:${state.port}/callback?code=${ticket}&state=${state.desktopState}`);
        return new Response(null, { status: 302, headers });
      }
      // Saving to another account must not replace the workspace refresh session.
      headers.append('Set-Cookie', cookie(state.standalone ? `${sessionCookie}_${state.browserState}` : sessionCookie, session, state.standalone ? 600 : 90 * 86400, secure));
      const message = { type: 'onrivi:drive-oauth', access_token: tokens.access_token, expires_in: Number(tokens.expires_in) || 3600 };
      return page('Google Drive 연결이 완료되었습니다. 이 창을 닫아도 됩니다.',
        `try{if(window.opener)window.opener.postMessage(${safeScript(message)},${safeScript(origin)});}finally{window.close();}`, headers);
    }
    if (request.method !== 'POST') return json({ error: '지원하지 않는 요청입니다.' }, 405);
    // Cookie sessions require same-origin requests; desktop sessions use a bearer capability.
    const bearer = request.headers.get('Authorization')?.match(/^Bearer ([\w-]{43})$/)?.[1];
    if (!bearer && request.headers.get('Origin') !== origin) return json({ error: '요청 출처가 올바르지 않습니다.' }, 403);
    if (Number(request.headers.get('Content-Length') || 0) > 4096) return json({ error: '요청이 너무 큽니다.' }, 413);
    if (route === 'oauth/exchange') {
      const { ticket, verifier } = await request.json();
      if (!/^[\w-]{43}$/.test(ticket || '') || !/^[\w-]{43}$/.test(verifier || '')) return json({ error: '인증 교환 요청이 올바르지 않습니다.' }, 400);
      const key = `tickets/${await digest(ticket)}`, record = await load(env, key);
      if (!record || record.challenge !== await digest(verifier)) return json({ error: '인증 교환이 만료되었습니다.' }, 401);
      await env.R2_BUCKET.delete(`_drive-oauth/${key}`);
      const session = await load(env, `sessions/${await digest(record.session)}`);
      if (!session) return json({ error: '인증 세션이 만료되었습니다.' }, 401);
      return json({ access_token: session.accessToken, expires_in: Math.max(1, Math.floor((session.accessExpires - Date.now()) / 1000)), session_token: record.session });
    }
    const statusInput = route === 'oauth/status' ? await request.json() : null;
    const selectedCookie = statusInput?.standalone && /^[\w-]{43}$/.test(statusInput.state || '') ? `${sessionCookie}_${statusInput.state}` : sessionCookie;
    const sessionId = bearer || requestCookies[selectedCookie];
    if (route === 'oauth/status' && !sessionId) return json({ pending: true }, 202);
    if (!/^[\w-]{43}$/.test(sessionId || '')) return json({ code: 'REAUTH_REQUIRED', error: 'Google Drive를 다시 연결해 주세요.' }, 401);
    const key = `sessions/${await digest(sessionId)}`;
    if (route === 'oauth/status') {
      const input = statusInput, session = await load(env, key);
      if (!session || !input.state || session.browserState !== input.state) return json({ pending: true }, 202);
      return json({ access_token: session.accessToken, expires_in: Math.max(1, Math.floor((session.accessExpires - Date.now()) / 1000)) });
    }
    if (route === 'oauth/disconnect') {
      await env.R2_BUCKET.delete(`_drive-oauth/${key}`);
      return json({ success: true }, 200, { 'Set-Cookie': cookie(sessionCookie, '', 0, secure) });
    }
    if (route !== 'oauth/refresh') return json({ error: '경로를 찾지 못했습니다.' }, 404);
    if (!refreshes.has(key)) {
      const operation = (async () => {
        const session = await load(env, key);
        if (!session) return json({ code: 'REAUTH_REQUIRED', error: 'Google Drive를 다시 연결해 주세요.' }, 401);
        try {
          if (session.accessExpires - Date.now() <= 180000) {
            const tokens = await googleToken(env, { grant_type: 'refresh_token', refresh_token: session.refreshToken });
            session.accessToken = tokens.access_token;
            session.accessExpires = Date.now() + Number(tokens.expires_in || 3600) * 1000;
            if (tokens.refresh_token) session.refreshToken = tokens.refresh_token;
            await store(env, key, session);
          }
          return json({ access_token: session.accessToken, expires_in: Math.max(1, Math.floor((session.accessExpires - Date.now()) / 1000)) });
        } catch (error) {
          if (error.reauth) await env.R2_BUCKET.delete(`_drive-oauth/${key}`);
          return json({ code: error.reauth ? 'REAUTH_REQUIRED' : 'REFRESH_FAILED', error: 'Google Drive 인증을 갱신하지 못했습니다.' }, error.reauth ? 401 : 502);
        }
      })();
      refreshes.set(key, operation);
      operation.finally(() => { if (refreshes.get(key) === operation) refreshes.delete(key); }).catch(() => {});
    }
    return (await refreshes.get(key)).clone();
  } catch (error) {
    console.error('[Google OAuth Handle Error]', error);
    return json({ error: 'Google Drive 인증 처리에 실패했습니다.', details: error.message || String(error), code: 'OAUTH_FAILED' }, 502);
  }
}
