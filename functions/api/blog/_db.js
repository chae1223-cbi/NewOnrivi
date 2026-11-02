// ====================================================================
// 📊 [OMD-IO-0041] functions/api/blog/_db.js
// 🎯 @KICK  : 블로그 전용 DB 헬퍼 (공통 트랜잭션 _db.js 래핑 및 카테고리 검증)
// 🛡️ @GUARD : 공통 모듈 _db.js를 기반으로 동작하며, 블로그 전용 BLOG_CATEGORY 유효성을 검증
// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] 트랜잭션 엔진 및 사용자 인증을 공통 모듈(_db.js)로 승격하고 re-export로 하위 호환성 유지
// 🔗 @CALLS : functions/api/_db.js (withDbTransaction, getAuthUser, apiJson)
// ====================================================================
export {
  withDbTransaction,
  withBlogTransaction,
  getAuthUser,
  getBlogUser,
  apiJson,
  blogJson
} from '../_db.js';

/**
 * 글에 저장하는 분류 코드는 활성 BLOG_CATEGORY 공통코드여야 합니다.
 */
export async function requireBlogCategory(db, category) {
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(category)) {
    const error = new Error('유효한 블로그 분류를 선택해 주세요.');
    error.status = 400;
    throw error;
  }
  const result = await db.query(`
    SELECT 1 FROM public.common_codes c
    JOIN public.common_code_groups g ON g.group_code = c.group_code
    WHERE c.group_code = 'BLOG_CATEGORY' AND c.code_value = $1
      AND c.is_use = true AND g.is_use = true`, [category]);
  if (!result.rows.length) {
    const error = new Error('사용할 수 없는 블로그 분류입니다. 공통코드를 확인해 주세요.');
    error.status = 400;
    throw error;
  }
}
