import helpItems from '@/lib/helpAssets.json';
import landingItems from '@/lib/landingAssets.json';
/** 🚨 @PATCH : 2026-11-02 — 콘텐츠 참조 변경과 관리자 감사 로그를 단일 트랜잭션으로 기록 */
/** 🚨 @PATCH : 2026-10-08 — 사용자 개인 에디터 첨부 제외 공식 콘텐츠(고객 문의 첨부, 기술 블로그 에셋) 통합 관리 API 신규 구축 */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';
import { SYSTEM_MESSAGES } from '@/constants/messages';

function extractFileName(url: string): string {
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

export async function GET(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.user) return NextResponse.json({ success: false, error: auth.error }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const typeFilter = searchParams.get('type') || 'ALL'; // ALL, INQUIRY, BLOG

    // 2. 기술 블로그 공식 에셋 수집
    const blogRows = await sql`
      SELECT 
        r.post_id as source_id,
        r.title as source_title,
        r.author_name as author,
        r.content,
        r.cover_image,
        r.created_at
      FROM public.blog_post_revisions r
      ORDER BY r.created_at DESC
    `;

    const blogItems: any[] = [];
    const seenBlogUrls = new Set<string>();

    for (const rev of blogRows) {
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
    let allItems: any[] = [];
    if (typeFilter === 'HELP') {
        allItems = helpItems;
      } else if (typeFilter === 'LANDING') {
      allItems = landingItems;
    } else if (typeFilter === 'BLOG') {
      allItems = blogItems;
    } else {
      allItems = [...landingItems, ...helpItems, ...blogItems];
    }

    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      total: totalFiltered,
      stats,
      page,
      limit,
      canManage: auth.adminRole === 'SUPER',
      asOf: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[/api/admin/contents] Error fetching contents:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.user) return NextResponse.json({ success: false, error: auth.error }, { status: 403 });

    const body = await req.json();
    const { url, source_id, category, reason } = body;
    if (category !== 'BLOG') return NextResponse.json({success:false,error:'랜딩페이지와 도움말 파일은 소스에서 관리합니다.'},{status:400});

    if (!url) {
      return NextResponse.json({ success: false, error: '삭제할 파일 URL이 누락되었습니다.' }, { status: 400 });
    }

    // 1. DB 참조 정리
    await sql.begin(async tx => {
      if (category === 'INQUIRY' && source_id) {
        await tx`
        UPDATE public.support_inquiries
        SET attachment_urls = array_remove(attachment_urls, ${url})
        WHERE id = ${source_id}::uuid
        `;
      } else if (category === 'BLOG' && source_id) {
        await tx`
        UPDATE public.blog_post_revisions
        SET cover_image = NULL
        WHERE post_id = ${source_id}::uuid AND cover_image = ${url}
        `;
      }

    // 2. 감사 로그 기록
      await tx`
        INSERT INTO public.user_audit_logs (admin_id, action_type, reason, created_at)
        VALUES (${auth.user.id}, 'CONTENT_DELETE', ${`콘텐츠 파일 삭제: [${category || 'ASSET'}] ${extractFileName(url)} (${reason || '불필요한 파일 관리자 삭제'})`}, now())
      `;
    });

    return NextResponse.json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.',
      deleted_url: url
    });
  } catch (error: any) {
    console.error('[/api/admin/contents] Error deleting content:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
