// 🚨 @PATCH : 2026-11-02 — 관리자 블로그 DB 예외 원문 대신 공통 안전 오류와 요청 ID를 반환
import { checkAdminAuth, adminServerError } from './_shared.js';
import { withBlogTransaction, requireBlogCategory, blogJson } from '../blog/_db.js';

function verifiedAdminToken(request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.aal === 'aal2';
  } catch { return false; }
}

async function requireAdmin(request, env) {
  const result = await checkAdminAuth(request, env, ['SUPER', 'SUPPORT']);
  if (result.error) return { error: result.error, status: result.status };
  if (!verifiedAdminToken(request)) return { error: 'MFA authentication required', status: 403 };
  return { user: result.user };
}

function toClientPost(row) {
  const date = row.published_at || row.revision_created_at;
  return {
    id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt,
    content: row.content, category: row.category, author: row.author_name,
    coverImage: row.cover_image || undefined, tags: row.tags || [],
    isFeatured: row.is_featured, status: row.desired_public ? 'published' : 'draft',
    deploymentStatus: row.deployment_status,
    publishedAt: date ? new Date(date).toISOString().slice(0, 10).replace(/-/g, '.') : '',
    readingTime: `${Math.max(1, Math.ceil((row.content || '').length / 400))}분`,
  };
}

// ====================================================================
// 📊 [OMD-IO-0042] frontend/functions/api/admin/blog.js ➔ onRequestGet
// 🎯 @KICK  : MFA를 통과한 관리자에게 서버 원본의 초안·공개 대상 목록을 제공한다.
// 🛡️ @GUARD : Service Role 자격증명을 브라우저에 보내지 않는다.
// 🔗 @CALLS : requireAdmin(), withBlogTransaction(), Client.query(), blogJson()
// ====================================================================
export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return blogJson({ error: auth.error }, auth.status);
    const rows = await withBlogTransaction(env, async db => {
      const result = await db.query(`
        SELECT p.*, r.title, r.excerpt, r.content, r.cover_image, r.tags,
               r.author_name, r.created_at AS revision_created_at
        FROM public.blog_posts p
        JOIN public.blog_post_revisions r ON r.id = p.target_revision_id
        WHERE p.deleted_at IS NULL ORDER BY p.updated_at DESC`);
      return result.rows;
    });
    return blogJson({ posts: rows.map(toClientPost) });
  } catch (error) {
    return adminServerError(request, error, 'functions/api/admin/blog.js', 'list_posts');
  }
}

// ====================================================================
// 📊 [OMD-IO-0043] frontend/functions/api/admin/blog.js ➔ onRequestPost
// 🎯 @KICK  : 여러 글의 발행·비공개·영구 삭제를 단일 DB 트랜잭션으로 적용한다.
// 🛡️ @GUARD : 모든 ID를 잠근 뒤 일치 여부를 검사하여 일부만 변경되는 상태를 막는다.
// 🔗 @CALLS : requireAdmin(), withBlogTransaction(), Client.query(), fetch(), blogJson()
// ====================================================================
export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return blogJson({ error: auth.error }, auth.status);
    const body = await request.json();
    const action = String(body.action || '');
    if (action === 'create-draft') {
      const post = body.post || {};
      const title = String(post.title || '').trim();
      const excerpt = String(post.excerpt || '').trim();
      const content = String(post.content || '');
      const category = String(post.category || '');
      const coverImage = String(post.coverImage || '').trim() || null;
      const tags = Array.isArray(post.tags) ? post.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 20) : [];
      if (!title || title.length > 200 || !content.trim() || content.length > 300000 ||
          excerpt.length > 600 ||
          (coverImage && coverImage.length > 2048)) {
        return blogJson({ error: '문서 제목, 분류 또는 본문을 확인해 주세요.' }, 400);
      }
      const created = await withBlogTransaction(env, async db => {
        await requireBlogCategory(db, category);
        const inserted = await db.query(
          'INSERT INTO public.blog_posts (author_id, category) VALUES ($1, $2) RETURNING id, slug',
          [auth.user.id, category],
        );
        const postId = inserted.rows[0].id;
        const revision = await db.query(
          `INSERT INTO public.blog_post_revisions
            (post_id, title, excerpt, content, cover_image, tags, author_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [postId, title, excerpt, content, coverImage, tags, 'Onrivi Author'],
        );
        await db.query('UPDATE public.blog_posts SET target_revision_id = $2 WHERE id = $1',
          [postId, revision.rows[0].id]);
        return { id: postId, slug: inserted.rows[0].slug };
      });
      return blogJson({ post: created }, 201);
    }
    if (action === 'retry-deploy') {
      if (!env.CLOUDFLARE_PAGES_DEPLOY_HOOK) return blogJson({ error: '배포 훅이 설정되지 않았습니다.' }, 503);
      const response = await fetch(env.CLOUDFLARE_PAGES_DEPLOY_HOOK, { method: 'POST' });
      return response.ok ? blogJson({ deployment: 'requested' }, 202)
        : blogJson({ error: '배포 재요청 실패' }, 502);
    }
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(String))] : [];
    if (!['publish', 'unpublish', 'delete'].includes(action) || ids.length < 1 || ids.length > 100 ||
        ids.some(id => !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))) {
      return blogJson({ error: '잘못된 작업 요청입니다.' }, 400);
    }
    await withBlogTransaction(env, async db => {
      const locked = await db.query(
        'SELECT id, target_revision_id FROM public.blog_posts WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL FOR UPDATE',
        [ids],
      );
      if (locked.rows.length !== ids.length || locked.rows.some(row => !row.target_revision_id)) {
        const error = new Error('일부 게시글이 없거나 초안이 비어 있습니다.');
        error.status = 409;
        throw error;
      }
      if (action === 'publish') {
        await db.query(`UPDATE public.blog_posts SET desired_public = true,
          deployment_status = 'pending', published_at = COALESCE(published_at, now()),
          updated_at = now() WHERE id = ANY($1::uuid[])`, [ids]);
      } else if (action === 'unpublish') {
        await db.query(`UPDATE public.blog_posts SET desired_public = false,
          deployment_status = CASE WHEN live_revision_id IS NULL THEN 'draft' ELSE 'pending' END,
          updated_at = now() WHERE id = ANY($1::uuid[])`, [ids]);
      } else {
        // 개정 이력과 글을 같은 트랜잭션에서 명시적으로 삭제한다.
        // 기존 슬러그도 즉시 해제하며, 실패하면 withBlogTransaction이 전체 삭제를 롤백한다.
        await db.query('DELETE FROM public.blog_post_revisions WHERE post_id = ANY($1::uuid[])', [ids]);
        const deleted = await db.query(
          'DELETE FROM public.blog_posts WHERE id = ANY($1::uuid[]) RETURNING id', [ids],
        );
        if (deleted.rows.length !== ids.length) {
          const error = new Error('일부 게시글을 삭제하지 못했습니다.');
          error.status = 409;
          throw error;
        }
      }
    });

    // HTTP 배포는 DB 트랜잭션에 포함할 수 없다. 요청이 실패해도 pending 상태를 보존해 재시도한다.
    if (!env.CLOUDFLARE_PAGES_DEPLOY_HOOK) {
      return blogJson({ updated: ids.length, deployment: 'not_configured' }, 202);
    }
    try {
      const response = await fetch(env.CLOUDFLARE_PAGES_DEPLOY_HOOK, { method: 'POST' });
      return blogJson({ updated: ids.length, deployment: response.ok ? 'requested' : 'retry_required' }, 202);
    } catch {
      return blogJson({ updated: ids.length, deployment: 'retry_required' }, 202);
    }
  } catch (error) {
    if (error.status === 409) return blogJson({ error: error.message }, 409);
    if (error.code === '23505') return blogJson({ error: '이미 사용 중인 글 주소입니다.' }, 409);
    return adminServerError(request, error, 'functions/api/admin/blog.js', 'change_posts');
  }
}
