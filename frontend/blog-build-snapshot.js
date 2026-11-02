/** 웹 정적 빌드가 사용할 공개 블로그 데이터 스냅샷을 한 읽기 트랜잭션에서 생성한다. */
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (process.env.BLOG_USE_LOCAL_SNAPSHOT === '1') {
      console.log('[blog-build] 로컬 스냅샷 모드: 기존 스냅샷을 사용합니다.');
      return;
    }
    throw new Error('DATABASE_URL이 필요합니다. 로컬 빈 목록 빌드는 BLOG_USE_LOCAL_SNAPSHOT=1을 지정하세요.');
  }
  const db = new Client({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_CA_CERT
      ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true }
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await db.connect();
  let posts;
  try {
    await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result = await db.query(`
      SELECT p.id, p.slug, p.category, p.is_featured, p.published_at,
             r.title, r.excerpt, r.content, r.cover_image, r.tags, r.author_name
      FROM public.blog_posts p
      JOIN public.blog_post_revisions r ON r.id = p.target_revision_id
      WHERE p.desired_public = true AND p.deleted_at IS NULL
      ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC`);
    posts = result.rows.map(row => ({
      id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt,
      content: row.content, category: row.category, author: row.author_name,
      publishedAt: row.published_at
        ? new Date(row.published_at).toISOString().slice(0, 10).replace(/-/g, '.') : '',
      readingTime: `${Math.max(1, Math.ceil(row.content.length / 400))}분`,
      coverImage: row.cover_image || undefined, tags: row.tags || [],
      isFeatured: row.is_featured, status: 'published',
    }));
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    await db.end();
  }
  const output = path.join(__dirname, 'src', 'generated', 'blogSnapshot.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(posts, null, 2) + '\n');
  console.log(`[blog-build] 공개 글 ${posts.length}개 스냅샷 생성`);
}

main().catch(error => { console.error('[blog-build]', error); process.exit(1); });
