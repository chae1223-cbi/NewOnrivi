-- 새 블로그 글 주소를 post-000001 형식으로 DB에서 자동 발급한다.
-- 기존 글의 주소는 바꾸지 않아 이미 공유된 링크를 보존한다.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.blog_post_slug_seq AS bigint START WITH 1 MAXVALUE 999999;
ALTER SEQUENCE public.blog_post_slug_seq MAXVALUE 999999;

-- 기존 자동번호 주소가 있다면 그 다음 번호부터 시작한다.
SELECT setval('public.blog_post_slug_seq',
  GREATEST((SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END
            FROM public.blog_post_slug_seq), COALESCE((
    SELECT max(substring(slug FROM '^post-([0-9]{6})$')::bigint) + 1
    FROM public.blog_posts
    WHERE slug ~ '^post-[0-9]{6}$'
  ), 1)), false);

ALTER TABLE public.blog_posts ALTER COLUMN slug SET DEFAULT
  ('post-' || to_char(nextval('public.blog_post_slug_seq'), 'FM000000'));

COMMIT;
