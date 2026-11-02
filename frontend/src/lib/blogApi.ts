import { supabase } from '@/lib/supabaseClient';
import type { BlogPost } from '@/lib/blogData';

async function blogRequest<T>(url: string, body?: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('블로그 초안을 저장하려면 로그인해 주세요.');
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `블로그 요청 실패 (${response.status})`);
  return result as T;
}

// ====================================================================
// 📊 [OMD-IO-0044] frontend/src/lib/blogApi.ts ➔ 블로그 서버 API 호출
// 🎯 @KICK  : 에디터 초안과 관리자 발행 요청을 브라우저 로컬 저장소 대신 서버로 보낸다.
// 🛡️ @GUARD : 로그인 토큰 부재와 API 오류를 호출자에게 전달해 허위 성공 표시를 막는다.
// 🔗 @CALLS : supabase.auth.getSession(), fetch(), Response.json()
// ====================================================================
export const saveBlogDraft = (post: Partial<BlogPost>) =>
  blogRequest<{ id: string; slug: string; revisionId: string; status: 'draft' }>('/api/blog/drafts', post);

export const getAdminBlogPosts = async () =>
  (await blogRequest<{ posts: BlogPost[] }>('/api/admin/blog')).posts;

export const changeBlogPublication = (action: 'publish' | 'unpublish' | 'delete', ids: string[]) =>
  blogRequest<{ updated: number; deployment: 'requested' | 'retry_required' | 'not_configured' }>(
    '/api/admin/blog', { action, ids },
  );

export const retryBlogDeployment = () =>
  blogRequest<{ deployment: 'requested' }>('/api/admin/blog', { action: 'retry-deploy' });

export const createAdminBlogDraft = (post: Pick<BlogPost,
  'title' | 'excerpt' | 'content' | 'category' | 'tags'>) =>
  blogRequest<{ post: { id: string; slug: string } }>('/api/admin/blog', { action: 'create-draft', post });
