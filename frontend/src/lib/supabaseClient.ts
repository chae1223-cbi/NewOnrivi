// ====================================================================
// 📊 [OMD-AUTH-supabaseClient-0001] supabaseClient.ts ➔ createNoopClient
// 🎯 @KICK  : Supabase URL 및 ANON KEY 환경변수 미설정 시에도 런타임 오류가 발생하지 않도록 대체용 Noop 클라이언트 인스턴스 생성 및 제공
// 🛡️ @GUARD : 환경변수 부재 여부(isPlaceholder)를 감지하여 온전한 Mock Auth 객체(getSession, onAuthStateChange 등 포함) 및 체이닝 쿼리 Proxy 반환
// 🚨 @PATCH : **2026-06-21** — Supabase Auth 미설정 상태에서 Navbar.tsx 등 컴포넌트 마운트 시 auth.getSession, auth.onAuthStateChange 누락으로 발생하는 Type 에러 예방을 위한 완전한 Mock Auth 객체 구현 패치
//             **2026-06-21** — 환경변수가 비어있지 않더라도 유효한 HTTP/HTTPS URL 형식이 아닐 경우 크래시 방지를 위해 URL 형식 유효성 검사 추가 패치
// 🔗 @CALLS : createClient, SupabaseClient
// ====================================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// URL이 실제 유효한 HTTP/HTTPS 형식인지 검사 (플레이스홀더 텍스트 방어)
const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isPlaceholder = !supabaseUrl || !supabaseAnonKey || !isValidHttpUrl(supabaseUrl);

function createNoopClient(): SupabaseClient {
  const thenable = { then: (resolve: any) => resolve({ data: null, error: null }) };
  const query: any = new Proxy(thenable, {
    get: (target, prop) => {
      if (prop === 'then') return target.then;
      if (prop === 'select') return () => query;
      if (prop === 'eq') return () => query;
      if (prop === 'single') return () => query;
      if (prop === 'limit') return () => query;
      if (prop === 'order') return () => query;
      if (prop === 'on') return () => channel;
      if (prop === 'subscribe') return () => channel;
      return () => query;
    },
  });
  const channel: any = new Proxy({}, {
    get: () => () => channel,
  });
  return {
    channel: () => channel,
    removeChannel: () => {},
    from: () => query,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signUp: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signInWithOAuth: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      updateUser: async () => ({ data: null, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
    },
    realtime: {} as any,
    rpc: () => query,
    schema: () => query,
  } as any;
}

const createSupabaseClient = () => {
  if (isPlaceholder) return createNoopClient();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const supabase = createSupabaseClient();
