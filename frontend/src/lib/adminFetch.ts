import { supabase } from '@/lib/supabaseClient';

// 관리자 API는 브라우저의 로그인 세션을 서버에서 다시 검증한다.
export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('관리자 로그인이 필요합니다.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
