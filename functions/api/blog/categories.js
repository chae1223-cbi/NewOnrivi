import { withBlogTransaction, blogJson } from './_db.js';

// BLOG_CATEGORY 공통코드가 블로그 메뉴와 글 등록 선택지의 유일한 원본이다.
export async function onRequestGet({ env }) {
  try {
    const categories = await withBlogTransaction(env, async db => {
      const result = await db.query(`
        SELECT c.code_value AS value, c.code_name AS name,
               (c.is_use AND g.is_use) AS active
        FROM public.common_codes c
        JOIN public.common_code_groups g ON g.group_code = c.group_code
        WHERE c.group_code = 'BLOG_CATEGORY'
        ORDER BY c.sort_order, c.code_value`);
      return result.rows;
    });
    return blogJson({ categories });
  } catch (error) {
    console.error('[blog categories] list failed', error);
    return blogJson({ error: '블로그 분류 조회 실패' }, 500);
  }
}
