-- 블로그 분류를 공통코드(BLOG_CATEGORY)로 이관한다. Supabase SQL Editor에서 한 번 실행한다.
-- 기존 게시글의 분류, 코드 등록, FK 연결을 하나의 트랜잭션으로 처리한다.
BEGIN;

INSERT INTO public.common_code_groups (group_code, group_name, description, sort_order, is_use)
VALUES ('BLOG_CATEGORY', '블로그 분류', '공개 메뉴와 게시글 등록에서 함께 사용하는 분류', 30, true)
ON CONFLICT (group_code) DO UPDATE SET group_name = EXCLUDED.group_name,
  description = EXCLUDED.description, is_use = true;

INSERT INTO public.common_codes
  (group_code, code_value, code_name, description, sort_order, is_use)
VALUES
  ('BLOG_CATEGORY', 'ONRIVI_INTRO', '온리비어서란?', '제품 소개와 시작 안내', 1, true),
  ('BLOG_CATEGORY', 'ONRIVI_TECH', '온리비어서의 기술', '마크다운 가이드와 기술 이야기', 2, true),
  ('BLOG_CATEGORY', 'USER_USE', '사용자 활용', '사용 사례와 활용법', 3, true)
ON CONFLICT (group_code, code_value) DO UPDATE SET
  code_name = EXCLUDED.code_name, description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order, is_use = true;

-- 기존 문서가 고정된 한글 분류를 저장했으므로 안정적인 코드값으로 변환한다.
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_category_check;
UPDATE public.blog_posts SET category = CASE category
  WHEN '마크다운 가이드' THEN 'ONRIVI_TECH'
  WHEN '기술 인사이트' THEN 'ONRIVI_TECH'
  WHEN '온리비어서의 기술' THEN 'ONRIVI_TECH'
  WHEN '온리비어서란?' THEN 'ONRIVI_INTRO'
  WHEN '사용자 활용' THEN 'USER_USE'
  ELSE category END;

-- 기존 소개 글은 소개 분류로, 마크다운 기본 문법 글은 기술 분류로 정돈한다.
UPDATE public.blog_posts SET category = 'ONRIVI_INTRO'
WHERE slug = 'introducing-onrivi-author' AND category = 'USER_USE';

-- common_codes의 복합 유일키를 참조해 DB에서도 미등록 분류 저장을 차단한다.
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS category_group text NOT NULL DEFAULT 'BLOG_CATEGORY';
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_category_group_check;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_category_group_check
  CHECK (category_group = 'BLOG_CATEGORY');
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_category_common_code_fkey;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_category_common_code_fkey
  FOREIGN KEY (category_group, category)
  REFERENCES public.common_codes (group_code, code_value) ON UPDATE RESTRICT ON DELETE RESTRICT;

COMMIT;
