// ====================================================================
// 📊 [OMD-API-gdrive-oauth-0001] functions/api/gdrive/_oauth.js
// 🎯 @KICK  : Google Drive 서버 사이드 OAuth 인증 및 토큰 자동 연장 핸들러
// 🛡️ @GUARD : Cloudflare Pages 미리보기(dev01 등 *.pages.dev) 및 프로덕션/로컬 다중 오리진 동적 허용, 리프레시 토큰 AES-GCM 암호화
// 🚨 @PATCH : 2026-11-04 — [COOP(Cross-Origin-Opener-Policy) 대응 BroadcastChannel 연동]: 구글 OAuth 리디렉션 시 COOP에 의해 window.opener가 단절되더라도 동일 오리진 BroadcastChannel('onrivi-drive-oauth')을 통해 토큰 및 취소 이벤트를 즉시 전달하고 팝업 스스로 닫히도록 개선
// 🚨 @PATCH : 2026-11-04 — [오류 진단 로깅 4단계]: 클라이언트 내부 스택 노출 차단(details 제거) 및 4xx 사전 로깅 정돈
// 🚨 @PATCH : 2026-11-03 — [도메인 환경변수화] GOOGLE_DRIVE_ALLOWED_DOMAINS 환경변수 지원 (미설정 시 기본 도메인 안전 폴백)
// 🚨 @PATCH : 2026-11-03 — [미리보기 오리진 지원] dev01 등 *.onriviauthor.pages.dev 서브도메인의 동적 리디렉션 URI 자동 바인딩
// 🚨 @PATCH : 2026-10-15 — 최초 구글 드라이브 서버 OAuth 커널 구축
// 🔗 @CALLS : Google OAuth 2.0 API, Cloudflare R2 Bucket, Web Crypto API (SubtleCrypto)
// ====================================================================

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
/**
 * ========================================================================================
 * [함수명] cookie - 안전한 세션 쿠키 헤더 문자열을 생성합니다.
 *
 * @param {string} name - 쿠키 식별자 이름
 * @param {string} value - 쿠키에 저장할 세션/상태 값
 * @param {number} maxAge - 쿠키 유효 기간 (초 단위)
 * @param {boolean} secure - HTTPS 환경 전용 Secure 속성 적용 여부
 * @returns {string} HTTP Set-Cookie 헤더 값 문자열
 * ========================================================================================
 */
function cookie(name, value, maxAge, secure) {
  return `${name}=${value}; Path=/api/gdrive; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/**
 * ========================================================================================
 * [함수명] encryptionKey - 환경 변수 시크릿으로부터 SubtleCrypto AES-GCM 대칭키를 파생합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수 (GOOGLE_CLIENT_SECRET 포함)
 * @returns {Promise<CryptoKey>} AES-GCM 암/복호화에 사용할 SubtleCrypto 대칭키
 * ========================================================================================
 */
async function encryptionKey(env) {
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', encoder.encode(`onrivi-drive-v1:${env.GOOGLE_CLIENT_SECRET}`)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * ========================================================================================
 * [함수명] seal - JSON 데이터를 AES-GCM 알고리즘으로 암호화하여 [IV].[암호문] 문자열로 직렬화합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수
 * @param {any} data - 암호화할 원본 JSON 데이터
 * @returns {Promise<string>} Base64URL로 인코딩된 IV와 암호문 결합 문자열
 * ========================================================================================
 */
async function seal(env, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return `${base64(iv)}.${base64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(env), encoder.encode(JSON.stringify(data))))}`;
}

/**
 * ========================================================================================
 * [함수명] open - seal()로 암호화된 문자열을 AES-GCM 알고리즘으로 복호화하여 원본 JSON으로 복원합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수
 * @param {string} value - [IV].[암호문] 결합 문자열
 * @returns {Promise<any>} 복호화된 JSON 객체
 * ========================================================================================
 */
async function open(env, value) {
  const [iv, body] = value.split('.');
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(iv) }, await encryptionKey(env), unbase64(body))));
}

/**
 * ========================================================================================
 * [함수명] store - 데이터를 암호화(seal)하여 Cloudflare R2 버킷에 안전하게 영구 보관합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수 (R2_BUCKET)
 * @param {string} key - R2 버킷 파일 저장 경로 키
 * @param {any} data - 저장할 세션/티켓 데이터
 * @returns {Promise<void>}
 * ========================================================================================
 */
async function store(env, key, data) { await env.R2_BUCKET.put(`_drive-oauth/${key}`, await seal(env, data)); }

/**
 * ========================================================================================
 * [함수명] load - Cloudflare R2 버킷에서 암호화된 레코드를 읽어 복호화하고 만료 여부를 검증합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수 (R2_BUCKET)
 * @param {string} key - R2 버킷 파일 저장 경로 키
 * @returns {Promise<any | null>} 유효 기간 내의 복호화 데이터 또는 만료 시 null
 * ========================================================================================
 */
async function load(env, key) {
  const object = await env.R2_BUCKET.get(`_drive-oauth/${key}`);
  if (!object) return null;
  try { const value = await open(env, await object.text()); return value.expires > Date.now() ? value : null; } catch { return null; }
}

/**
 * ========================================================================================
 * [함수명] page - OAuth 팝업 창에 표시할 보안 HTML Response(CSP Nonce 적용)를 생성합니다.
 *
 * @param {string} text - 브라우저 화면에 표시할 사용자 안내 메시지
 * @param {string} [script=''] - 실행할 인라인 자바스크립트 코드
 * @param {object} [headers={}] - 추가 HTTP 응답 헤더 객체
 * @returns {Response} CSP 및 Nonce가 적용된 text/html HTTP 응답 객체
 * ========================================================================================
 */
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

/**
 * ========================================================================================
 * [함수명] googleToken - 구글 OAuth2 토큰 엔드포인트에 요청을 전송하여 토큰을 교환 또는 연장합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
 * @param {object} params - 토큰 요청 파라미터 맵 (grant_type, code, refresh_token 등)
 * @returns {Promise<object>} 구글 토큰 발급 응답 객체 (access_token, refresh_token 등)
 * @throws {Error} 인가 실패 또는 네트워크 장애 시 예외 발생
 * ========================================================================================
 */
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

/**
 * ========================================================================================
 * [함수명] handleDriveOAuth - 구글 드라이브 OAuth 인증, 콜백, 세션 검증, 자동 연장 메인 라우터
 * Cloudflare Pages Functions 및 로컬 Next.js 개발 서버 양측에서 공용으로 호출됩니다.
 *
 * @param {Request} request - 인입된 Fetch API Request 객체
 * @param {object} env - Cloudflare 바인딩 환경 변수 및 R2 버킷 인스턴스
 * @returns {Promise<Response>} 처리 결과 JSON 또는 HTML Response 객체
 * @throws 400(요청 파라미터 불일치), 401(인증 만료), 403(오리진 불일치), 503(환경변수 미설정)
 *
 * @example
 * // Cloudflare Pages 라우트 진입
 * export const onRequest = ({ request, env }) => handleDriveOAuth(request, env);
 * ========================================================================================
 */
export async function handleDriveOAuth(request, env) {
  // ─── 0. 필수 환경 변수 구성 검증 ─────────────────────────
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_DRIVE_REDIRECT_URI || !env.R2_BUCKET) {
    return json({ error: 'Google Drive 서버 OAuth 설정이 필요합니다.', code: 'OAUTH_NOT_CONFIGURED' }, 503);
  }

  // ─── 1. 접속 도메인 및 리디렉션 URI 동적 검증 ─────────────
  const url = new URL(request.url), configuredRedirect = new URL(env.GOOGLE_DRIVE_REDIRECT_URI);

  // 환경변수(GOOGLE_DRIVE_ALLOWED_DOMAINS)로부터 허용 도메인 파싱 (쉼표 구분, 기본값: onriviauthor.pages.dev,onrivi.com)
  const allowedDomains = (env.GOOGLE_DRIVE_ALLOWED_DOMAINS || 'onriviauthor.pages.dev,onrivi.com')
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(Boolean);

  // 요청 도메인이 허용 목록에 완벽히 일치하거나 해당 도메인의 서브도메인인지 판별 (예: dev01.onriviauthor.pages.dev)
  const isAllowedDomain = allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  const isLocalDev = (url.hostname === '127.0.0.1' || url.hostname === 'localhost') && (configuredRedirect.hostname === 'localhost' || configuredRedirect.hostname === '127.0.0.1');
  const isSameOrigin = url.origin === configuredRedirect.origin;

  // 허용 도메인, 로컬 개발 환경, 동일 오리진 이외의 외부 출처는 엄격 차단 (400 Bad Request)
  if (!isLocalDev && !isAllowedDomain && !isSameOrigin) {
    return json({ error: '인증 서버 주소가 설정과 다릅니다.' }, 400);
  }

  // 허용 도메인(미리보기 서브도메인 포함) 및 로컬 환경인 경우 요청 오리진에 맞추어 리디렉션 URI 동적 매핑
  const redirect = (isAllowedDomain || isLocalDev)
    ? new URL(`${url.origin}${configuredRedirect.pathname}`)
    : configuredRedirect;
  const origin = redirect.origin, secure = redirect.protocol === 'https:';
  const route = url.pathname.replace(/^\/api\/gdrive\//, '');
  const requestCookies = cookies(request);

  try {
    // ─── 2. [GET] oauth/start : 구글 로그인 인증 흐름 개시 ──
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
      if (url.searchParams.has('error')) {
        const cancelMessage = { type: 'onrivi:drive-oauth-error', browserState: state.browserState, error: 'Google Drive 연결이 취소되었습니다.' };
        return page(
          'Google Drive 연결이 취소되었습니다. 이 창을 닫고 다시 시도해 주세요.',
          `try{if(typeof BroadcastChannel!=='undefined'){const bc=new BroadcastChannel('onrivi-drive-oauth');bc.postMessage(${safeScript(cancelMessage)});bc.close();}}catch{}finally{window.close();}`,
          { 'Set-Cookie': cookie(stateCookie, '', 0, secure) }
        );
      }
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
      const message = { type: 'onrivi:drive-oauth', browserState: state.browserState, access_token: tokens.access_token, expires_in: Number(tokens.expires_in) || 3600 };
      return page('Google Drive 연결이 완료되었습니다. 이 창을 닫아도 됩니다.',
        `try{if(typeof BroadcastChannel!=='undefined'){const bc=new BroadcastChannel('onrivi-drive-oauth');bc.postMessage(${safeScript(message)});bc.close();}if(window.opener)window.opener.postMessage(${safeScript(message)},${safeScript(origin)});}catch{}finally{window.close();}`, headers);
    }
    if (request.method !== 'POST') return json({ error: '지원하지 않는 요청입니다.' }, 405);
    // Cookie sessions require same-origin requests; desktop sessions use a bearer capability.
    const bearer = request.headers.get('Authorization')?.match(/^Bearer ([\w-]{43})$/)?.[1];
    const reqOrigin = request.headers.get('Origin');
    const isLocalOrigin = isLocalDev && reqOrigin && (reqOrigin.includes('localhost') || reqOrigin.includes('127.0.0.1'));
    if (!bearer && !isLocalOrigin && reqOrigin !== origin) return json({ error: '요청 출처가 올바르지 않습니다.' }, 403);
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
    return json({ error: 'Google Drive 인증 처리에 실패했습니다.', code: 'OAUTH_FAILED' }, 502);
  }
}
