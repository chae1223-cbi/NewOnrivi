// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { helpItems } from './_helpAssets.js';
import { landingItems } from './_landingAssets.js';
// 🚨 @PATCH : 2026-11-02 — 감사 로그를 인증 사용자 ID로 기록하고 DB 변경과 함께 롤백
// 🚨 @PATCH : 2026-10-08 — 사용자 개인 에디터 첨부 제외 공식 콘텐츠(고객 문의 첨부, 기술 블로그 에셋) 통합 관리 API 신규 구축
import { handleOptions, checkAdminAuth, adminServerError } from './_shared.js';
import { withDbTransaction, apiJson } from '../_db.js';

export const onRequestOptions = handleOptions;

// URL에서 파일명 디코딩 추출 유틸
function extractFileName(url) {
  if (!url) return 'unknown';
  try {
    const parsed = new URL(url);
    const queryName = parsed.searchParams.get('name');
    if (queryName) return decodeURIComponent(queryName);
    const pathname = parsed.pathname;
    const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
    return decodeURIComponent(lastPart) || 'file';
  } catch {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]) || 'file';
  }
}

// URL에서 R2 키 추출 유틸
function extractR2Key(url) {
  if (!url) return null;
  if (url.includes('/api/image/')) {
    const rawKey = url.split('/api/image/')[1].split('?')[0];
    try {
      let key = decodeURIComponent(rawKey);
      if (key.includes('%')) key = decodeURIComponent(key);
      return key;
    } catch {
      return rawKey;
    }
  }
  return null;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const authResult = await checkAdminAuth(request, env, ['SUPER', 'SUPPORT']);
    if (authResult.error) {
      return apiJson({ success: false, error: authResult.error }, authResult.status || 403);
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const typeFilter = url.searchParams.get('type') || 'ALL'; // ALL, INQUIRY, BLOG

    const result = await withDbTransaction(env, async db => {
      // 2. 기술 블로그 공식 에셋 수집 (커버 이미지 및 본문 미디어 에셋)
      const blogRevRes = await db.query(`
        SELECT 
          r.post_id as source_id,
          r.title as source_title,
          r.author_name as author,
          r.content,
          r.cover_image,
          r.created_at
        FROM public.blog_post_revisions r
        ORDER BY r.created_at DESC
      `);

      const blogItems = [];
      const seenBlogUrls = new Set();

      for (const rev of blogRevRes.rows) {
        // 커버 이미지
        if (rev.cover_image && !seenBlogUrls.has(rev.cover_image)) {
          seenBlogUrls.add(rev.cover_image);
          blogItems.push({
            id: `blog_cover_${rev.source_id}`,
            category: 'BLOG',
            category_name: '블로그 커버 에셋',
            url: rev.cover_image,
            file_name: extractFileName(rev.cover_image),
            source_title: rev.source_title || '기술 블로그 커버',
            source_id: rev.source_id,
            author: rev.author || '온리비 팀',
            created_at: rev.created_at,
            source_type: 'blog'
          });
        }

        // 본문 이미지 정규식 매칭 (![...](url))
        if (rev.content) {
          const imgRegex = /!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g;
          let match;
          let imgIdx = 0;
          while ((match = imgRegex.exec(rev.content)) !== null) {
            const imgUrl = match[2];
            if (imgUrl && !seenBlogUrls.has(imgUrl) && !imgUrl.includes('example.com')) {
              seenBlogUrls.add(imgUrl);
              blogItems.push({
                id: `blog_content_${rev.source_id}_${imgIdx++}`,
                category: 'BLOG',
                category_name: '블로그 본문 에셋',
                url: imgUrl,
                file_name: extractFileName(imgUrl),
                source_title: rev.source_title || '기술 블로그 본문',
                source_id: rev.source_id,
                author: rev.author || '온리비 팀',
                created_at: rev.created_at,
                source_type: 'blog'
              });
            }
          }
        }
      }

      // 3. 통계 집계
      const stats = {
        total: landingItems.length + blogItems.length + helpItems.length,
        landing: landingItems.length,
        help: helpItems.length,
        blog: blogItems.length
      };

      // 4. 통합 및 필터링
      let allItems = [];
      if (typeFilter === 'HELP') {
        allItems = helpItems;
      } else if (typeFilter === 'LANDING') {
        allItems = landingItems;
      } else if (typeFilter === 'BLOG') {
        allItems = blogItems;
      } else {
        allItems = [...landingItems, ...helpItems, ...blogItems];
      }

      // 최신순 정렬
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 검색어 필터링
      if (search) {
        allItems = allItems.filter(item =>
          item.file_name.toLowerCase().includes(search) ||
          item.source_title.toLowerCase().includes(search) ||
          item.author.toLowerCase().includes(search) ||
          item.url.toLowerCase().includes(search)
        );
      }

      const totalFiltered = allItems.length;
      const paginatedItems = allItems.slice((page - 1) * limit, page * limit);

      return {
        data: paginatedItems,
        total: totalFiltered,
        stats
      };
    });

    return apiJson({
      success: true,
      data: result.data,
      total: result.total,
      stats: result.stats,
      page,
      limit,
      canManage: authResult.adminData?.admin_role === 'SUPER',
      asOf: new Date().toISOString()
    });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/contents.js', 'list_contents');
  }
}

// 💥 DELETE: 콘텐츠 파일 삭제 및 스토리지/DB 동기화
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;

    const authResult = await checkAdminAuth(request, env, ['SUPER', 'SUPPORT']);
    if (authResult.error) {
      return apiJson({ success: false, error: authResult.error }, authResult.status || 403);
    }

    const body = await request.json();
    const { url, source_id, category, reason } = body;

    if (!url) {
      return apiJson({ success: false, error: '삭제할 파일 URL이 누락되었습니다.' }, 400);
    }

    if (category !== 'BLOG') return apiJson({success:false,error:'랜딩페이지와 도움말 파일은 소스에서 관리합니다.'},400);

    // 1. R2 버킷에서 파일 실제 삭제
    const r2Key = extractR2Key(url);
    if (r2Key && env.R2_BUCKET) {
      try {
        await env.R2_BUCKET.delete(r2Key);
        console.log(`[R2_DELETE] Successfully deleted from R2: ${r2Key}`);
      } catch (r2Err) {
        console.warn(`[R2_DELETE] Failed to delete from R2 (${r2Key}):`, r2Err);
      }
    }

    // 2. 데이터베이스 참조 정리
    await withDbTransaction(env, async db => {
      if (category === 'INQUIRY' && source_id) {
        // 고객 문의 첨부파일 목록에서 해당 URL 제거
        await db.query(`
          UPDATE public.support_inquiries
          SET attachment_urls = array_remove(attachment_urls, $1)
          WHERE id = $2::uuid
        `, [url, source_id]);
      } else if (category === 'BLOG' && source_id) {
        // 블로그 포스트 커버 이미지인 경우 null 처리
        await db.query(`
          UPDATE public.blog_post_revisions
          SET cover_image = NULL
          WHERE post_id = $1::uuid AND cover_image = $2
        `, [source_id, url]);
      }

      // 3. 관리자 감사 로그 기록
      await db.query(`
        INSERT INTO public.user_audit_logs (admin_id, action_type, reason, created_at)
        VALUES ($1, 'CONTENT_DELETE', $2, now())
      `, [
        authResult.user.id,
        `콘텐츠 파일 삭제: [${category || 'ASSET'}] ${extractFileName(url)} (${reason || '불필요한 파일 관리자 삭제'})`
      ]);
    });

    return apiJson({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.',
      deleted_url: url
    });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/contents.js', 'delete_content');
  }
}
