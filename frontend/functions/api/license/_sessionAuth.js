import { createClient } from '@supabase/supabase-js';

const clients = new Map();
const verified = new Map();
const verifying = new Map();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// getClaims validates asymmetric JWTs against cached JWKS. Legacy HS256 uses
// Supabase Auth; cache only successfully verified claims, never decoded claims.
export async function sessionUser(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token.length > 16384) return null;
  const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Session authentication is not configured');
  const identity = `${url}:${key}`;
  if (!clients.has(identity)) {
    if (clients.size >= 8) clients.delete(clients.keys().next().value);
    clients.set(identity, createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init = {}) => fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(10000) }) } }));
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity + token))), byte => byte.toString(16).padStart(2, '0')).join('');
  const cached = verified.get(hash);
  if (cached && cached.until > Date.now()) return { id: cached.sub };
  if (!verifying.has(hash)) {
    const operation = (async () => {
      const { data, error } = await clients.get(identity).auth.getClaims(token);
      if (error) {
        if (error.status >= 500 || error.name === 'AuthRetryableFetchError') throw new Error('Authentication temporarily unavailable');
        return null;
      }
      const claims = data?.claims;
      if (!claims || !UUID.test(claims.sub || '') || claims.role !== 'authenticated' ||
          claims.iss !== url.replace(/\/$/, '') + '/auth/v1' ||
          !(claims.aud === 'authenticated' || Array.isArray(claims.aud) && claims.aud.includes('authenticated')) ||
          !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) return null;
      for (const [key, value] of verified) if (value.until <= Date.now()) verified.delete(key);
      if (verified.size >= 1000) verified.delete(verified.keys().next().value);
      verified.set(hash, { sub: claims.sub, until: Math.min(Date.now() + 60000, claims.exp * 1000) });
      return { id: claims.sub };
    })();
    verifying.set(hash, operation);
    operation.finally(() => { verifying.delete(hash); }).catch(() => {});
  }
  return verifying.get(hash);
}
