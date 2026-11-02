-- 온리비 블로그 원본 저장소. Supabase SQL Editor에서 전체를 한 번 실행한다.
-- 함수, 트리거, 저장 프로시저를 만들지 않는다. 스키마 변경은 한 트랜잭션으로 적용된다.
-- common_codes 생성 후 blog_category_common_codes.sql을 실행해 BLOG_CATEGORY FK를 연결한다.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.blog_post_slug_seq AS bigint START WITH 1 MAXVALUE 999999;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL DEFAULT ('post-' || to_char(nextval('public.blog_post_slug_seq'), 'FM000000'))
    UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL, -- BLOG_CATEGORY의 code_value
  is_featured boolean NOT NULL DEFAULT false,
  desired_public boolean NOT NULL DEFAULT false,
  deployment_status text NOT NULL DEFAULT 'draft' CHECK (deployment_status IN ('draft', 'pending', 'live', 'failed')),
  target_revision_id uuid,
  live_revision_id uuid,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL,
  cover_image text,
  tags text[] NOT NULL DEFAULT '{}',
  author_name text NOT NULL DEFAULT 'Onrivi Author',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_public_idx
  ON public.blog_posts (desired_public, deleted_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_author_idx
  ON public.blog_posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS blog_revisions_post_idx
  ON public.blog_post_revisions (post_id, created_at DESC);

-- 공개 페이지는 빌드 시 생성한다. 브라우저의 Supabase Data API 직접 접근은 차단한다.
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_posts FROM anon, authenticated;
REVOKE ALL ON public.blog_post_revisions FROM anon, authenticated;

COMMIT;
