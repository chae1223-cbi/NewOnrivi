/**
 * web-build.js
 * 웹(Cloudflare Pages) 배포용 빌드 스크립트입니다.
 * Cloudflare Functions(frontend/functions)가 실제 API를 처리하므로,
 * Functions가 존재하지 않는 Next.js API 라우트(/api/admin, /api/cron)를
 * 빌드 대상에서 제외하여 정적 내보내기(output:export) 시 발생하는
 * NEXT_STATIC_GEN_BAILOUT 에러를 제거합니다.
 *
 * 🚨 @PATCH 2026-10-04: Next.js output:export 정적 빌드 시 신규/기존 API 라우트(create-file, create-folder, delete, rename, save 등)와의 dynamic=force-dynamic 충돌 에러를 원천 차단하기 위해, src/app/api/ 디렉토리 내의 모든 항목을 자동으로 스캔하여 빌드 시 임시 백업 및 제외하도록 개편
 * 🚨 @PATCH 2026-08-07: Cloudflare Pages는 wrangler.toml의 functions_directory 필드를
 * 지원하지 않으므로 무시됩니다 (빌드 로그에 WARNING 표시).
 * 대신 레포 루트의 /functions/ 디렉토리를 자동으로 탐지하여 배포합니다.
 * 따라서 frontend/functions/api/admin/ 에 있는 admin API Functions는
 * 빌드 전에 루트 functions/api/admin/ 으로 반드시 동기화되어야 합니다.
 *
 * 동작 순서:
 * 1. frontend/functions/api/admin/ → 루트 functions/api/admin/ 동기화 (신규)
 * 2. 제외 대상 라우트를 임시 이동 (_dev_backup/)
 * 3. next build 실행
 * 4. 임시 이동한 폴더 원위치 복원
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

// 🚨 @PATCH 2026-08-07: admin Functions를 루트 /functions/api/admin/ 으로 동기화
// Cloudflare Pages는 functions_directory(wrangler.toml) 필드를 무시하고
// 레포 루트의 /functions/ 디렉토리만 Functions로 배포합니다.
// 따라서 admin Functions가 배포에 포함되려면 이 동기화가 필수입니다.
const FRONTEND_FUNCS_SRC = path.join(__dirname, 'functions');
const ROOT_FUNCS_DEST = path.join(__dirname, '..', 'functions');

if (fs.existsSync(FRONTEND_FUNCS_SRC)) {
  console.log('[web-build] Cloudflare Functions 전체를 루트 /functions/ 로 동기화합니다...');
  // 주의: ROOT_FUNCS_DEST 전체를 rmSync하면 기존 Cloudflare API(device, license 등)가 모두 날아가므로 절대 삭제하면 안 됨!
  if (!fs.existsSync(ROOT_FUNCS_DEST)) {
    fs.mkdirSync(ROOT_FUNCS_DEST, { recursive: true });
  }
  fs.cpSync(FRONTEND_FUNCS_SRC, ROOT_FUNCS_DEST, { recursive: true, force: true });
  console.log('  - 동기화 완료: /functions/ (병합 완료)');
}

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
