/**
 * web-build.js
 * Cloudflare Pages 정적 웹 빌드. 배포 API 원본은 저장소 루트 functions/api입니다.
 * Next 개발용 API는 정적 내보내기 동안 임시로 제외하고 빌드 후 복원합니다.
 * 🚨 @PATCH : 2026-11-02 — Cloudflare API 미러 복사를 제거하고 루트 Functions를 단일 원본으로 확정
 */
const { execSync } = require('child_process');
const fs = require('fs');
require('./build-preflight')();
const path = require('path');
// Blog snapshot generation runs before Next.js loads the local build environment.
require('dotenv').config({ path: path.join(__dirname, '.env.local'), override: false, quiet: true });

const APP_DIR = path.join(__dirname, 'src', 'app');
const API_DIR = path.join(APP_DIR, 'api');
const BACKUP_DIR = path.join(__dirname, '_dev_api_backup');

// Cloudflare Pages 정적 내보내기(output: export) 빌드 시 Next.js는 동적 API 라우트 생성을 지원하지 않습니다.
// 실제 서버 API는 Cloudflare Functions(/functions/api/)가 전담하므로,
// API_DIR(/src/app/api/) 내의 모든 엔드포인트를 자동으로 스캔하여 빌드 중 안전하게 임시 백업 및 제외합니다.
const apiEntries = fs.existsSync(API_DIR)
  ? fs.readdirSync(API_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() || dirent.isFile())
      .map(dirent => dirent.name)
  : [];
const DEV_ONLY_ROUTES = apiEntries.map(name => ({ parent: API_DIR, route: name }));

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('[web-build] 정적 빌드 비대상 API 라우트들을 임시 백업 및 제외합니다...');
for (const item of DEV_ONLY_ROUTES) {
  const src = path.join(item.parent, item.route);
  const dest = path.join(BACKUP_DIR, item.route);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    fs.rmSync(src, { recursive: true, force: true });
    console.log(`  - 백업 완료: ${item.route}`);
  }
}

let buildSuccess = false;
const BLOG_SNAPSHOT_PATH = path.join(__dirname, 'src', 'generated', 'blogSnapshot.json');
const BLOG_DETAIL_ROUTE = path.join(APP_DIR, 'blog', '[slug]');
const BLOG_DETAIL_BACKUP = path.join(BACKUP_DIR, 'blog-detail');
let blogDetailRouteExcluded = false;
const originalBlogSnapshot = fs.existsSync(BLOG_SNAPSHOT_PATH)
  ? fs.readFileSync(BLOG_SNAPSHOT_PATH)
  : null;
try {
  execSync('node blog-build-snapshot.js', { stdio: 'inherit', env: process.env });
  // 공개 글이 없으면 정적 생성할 slug도 없다. Next.js는 빈 generateStaticParams를
  // 동적 경로 누락으로 판단하므로 이번 빌드에서만 상세 경로를 제외한다.
  if (JSON.parse(fs.readFileSync(BLOG_SNAPSHOT_PATH, 'utf8')).length === 0) {
    fs.cpSync(BLOG_DETAIL_ROUTE, BLOG_DETAIL_BACKUP, { recursive: true });
    fs.rmSync(BLOG_DETAIL_ROUTE, { recursive: true, force: true });
    blogDetailRouteExcluded = true;
    console.log('[web-build] 공개 글 0개: 블로그 상세 경로 생성을 건너뜁니다.');
  }
  console.log('[web-build] next build 시작...');
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, ASSET_PREFIX: '', NEXT_BUILD_DIR: '.next-web-build' },
  });
  // Next.js의 output:export는 별도 distDir에 정적 결과물을 둔다.
  // Cloudflare Pages가 사용하는 기존 out/ 경로로 성공한 빌드만 복사한다.
  const exportedDir = path.join(__dirname, '.next-web-build');
  const outputDir = path.join(__dirname, 'out');
  if (!fs.existsSync(path.join(exportedDir, 'index.html'))) {
    throw new Error('정적 빌드 결과(index.html)를 찾을 수 없습니다.');
  }
  if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
  fs.cpSync(exportedDir, outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'build-info.json'), JSON.stringify({
    version: require('../package.json').version, target: 'web', builtAt: new Date().toISOString(),
    fixes: ['document-link-path-resolution-v2', 'os-emoji-shortcut-guide'],
  }, null, 2));
  buildSuccess = true;
} catch (err) {
  console.error('[web-build] 빌드 실패:', err.message);
} finally {
  // 빌드 결과물에는 DB 스냅샷을 사용하되 작업 트리의 시드 데이터는 복원한다.
  if (originalBlogSnapshot) fs.writeFileSync(BLOG_SNAPSHOT_PATH, originalBlogSnapshot);
  else if (fs.existsSync(BLOG_SNAPSHOT_PATH)) fs.rmSync(BLOG_SNAPSHOT_PATH);
  if (blogDetailRouteExcluded) {
    fs.cpSync(BLOG_DETAIL_BACKUP, BLOG_DETAIL_ROUTE, { recursive: true });
    console.log('[web-build] 블로그 상세 경로를 복원했습니다.');
  }
  console.log('[web-build] 제외된 라우트들을 원본 위치로 복원합니다...');
  for (const item of DEV_ONLY_ROUTES) {
    const src = path.join(BACKUP_DIR, item.route);
    const dest = path.join(item.parent, item.route);
    if (fs.existsSync(src)) {
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.cpSync(src, dest, { recursive: true });
      console.log(`  - 복원 완료: ${item.route}`);
    }
  }
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  }
}

if (!buildSuccess) process.exit(1);
