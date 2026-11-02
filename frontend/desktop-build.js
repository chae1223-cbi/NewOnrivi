/**
 * desktop-build.js
 * 데스크탑(Electron) 빌드 시 개발 전용 Next.js API 라우트를 빌드 대상에서 제외합니다.
 * 
 * 동작 순서:
 * 1. 웹 전용 라우트 임시 이동 (_dev_backup/)
 * 2. next build 실행
 * 3. 임시 이동한 폴더 원위치 복원
 * 
 * 🚨 @PATCH : **2026-10-26** — [빌드 시 public/help -> out/help 및 docs/help 미러 자동 동기화 보강]:
 *             1) 데스크톱 정적 빌드 완료 후 public/help 최신 문서를 out/help 및 docs/help에 자동 동기화하여 온리비어서에서 편집한 도움말이 재빌드 시 초기화되는 결함 영구 방어
 * 🚨 @PATCH : **2026-10-25** — [이전 빌드 잔여 청크(Ghost Chunks) 자동 소탕 파이프라인 신설]:
 *             1) Next.js 빌드 시 해시가 변경되어 out/_next/static/chunks에 이전 빌드 파일들이 끝없이 누적되던 결함(254개 파일, 약 98.6MB) 해결
 *             2) .next-desktop 정적 번들을 out으로 동기화한 직후, 최신 빌드에 존재하지 않는 과거 청크 및 이전 빌드 디렉터리를 자동 비교·소탕하여 패키징 용량 대폭 절감
 * 🚨 @PATCH : **2026-10-18** — [Windows 파일 잠금 EBUSY 방어 및 out 정적 번들 덮어쓰기 복사]: out 디렉터리 rmSync 선행 삭제를 걷어내고 cpSync({ force: true })로 직접 덮어써 실행 중인 프로세스(Electron) 잠금으로 인한 복사 실패 및 404 방어
 * 🚨 @PATCH : **2026-10-11** — [.next-desktop 산출물 out 복사 및 최신화 누락 버그 해결]: NEXT_BUILD_DIR(.next-desktop)로 export된 정적 번들을 out 디렉터리로 복사하는 단계가 누락되어 데스크톱 Electron(NO_SERVER=true)이 과거 빌드를 바라보던 결함 완전 수정
 * 🚨 @PATCH : **2026-10-11** — [타 빌드 잔여 캐시(.next-dev, .next-web-build) 선행 소탕 추가]: Next.js 타입 검사 시 이전 개발/웹 빌드 캐시의 types 참조로 인한 라우트 격리 컴파일 실패 원천 차단
 * 🚨 @PATCH : **2026-10-02** — [빌드 산출물 자동 소탕(Purge) 탑재]: out 디렉터리 내 잔여 소스맵(.map), 테스트 파일, 임시/더미 에셋 자동 소탕 추가
 * 🚨 @PATCH : **2026-09-30** — [데스크톱 정적 빌드 안정화] Next.js 14 정적 내보내기(export) 워커 간 manifest 탐색 불일치(PageNotFoundError: /)를 유발하던 NEXT_BUILD_DIR 분리를 걷어내고 기본 .next 단일 빌드로 정상 복원
 * 🚨 @PATCH : **2026-09-26** — [데스크톱 빌드 캐시 자동 정리] .next 빌드 캐시 선행 삭제 로직 추가로 청크 불일치 오류 방지
 * 🚨 @PATCH : **2026-09-26** — [데스크톱 빌드 격리] DEV_ONLY_ROUTES에 /blog 라우트 추가하여 데스크톱 번들 빌드 안정화
 * 🚨 @PATCH : **2026-09-23** — [데스크톱 빌드 실패 해결] DEV_ONLY_ROUTES에 /knowledge 웹 리다이렉트 라우트 추가 및 빌드 후 public/icons 정적 에셋 동기화 보강
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('./build-preflight')();

const APP_DIR = path.join(__dirname, 'src', 'app');
const API_DIR = path.join(APP_DIR, 'api');
const BACKUP_DIR = path.join(__dirname, '_dev_api_backup');

// 임시 이동 대상 라우트들 정의
const DEV_ONLY_ROUTES = [
  { parent: APP_DIR, route: 'admin' },
  { parent: APP_DIR, route: 'api' },
  { parent: APP_DIR, route: 'auth' },
  { parent: APP_DIR, route: 'blog' },
  { parent: APP_DIR, route: 'contact' },
  { parent: APP_DIR, route: 'dashboard' },
  { parent: APP_DIR, route: 'docs' },
  { parent: APP_DIR, route: 'forgot-password' },
  { parent: APP_DIR, route: 'knowledge' },
  { parent: APP_DIR, route: 'login' },
  { parent: APP_DIR, route: 'privacy' },
  { parent: APP_DIR, route: 'reset-password' },
  { parent: APP_DIR, route: 'signup' },
  { parent: APP_DIR, route: 'terms' },
  { parent: APP_DIR, route: 'test' },
  { parent: APP_DIR, route: 'sitemap.ts' }
];

// 1. 개발 전용 API 라우트 및 SaaS 라우트들을 백업 폴더로 복사 후 원본 삭제
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('[desktop-build] 데스크톱 컴파일 비대상 웹 라우트들을 임시 백업 및 제외합니다...');
for (const item of DEV_ONLY_ROUTES) {
  const src = path.join(item.parent, item.route);
  const dest = path.join(BACKUP_DIR, item.route);
  if (fs.existsSync(src)) {
    // 윈도우 파일잠금(EPERM) 우회를 위해 rename 대신 cpSync -> rmSync 적용
    fs.cpSync(src, dest, { recursive: true });
    fs.rmSync(src, { recursive: true, force: true });
    console.log(`  - 백업 완료: ${item.route}`);
  }
}

// 2. Next.js 빌드 실행
let buildSuccess = false;
try {
  const cacheDirsToClean = [
    path.join(__dirname, '.next-desktop'),
    path.join(__dirname, '.next-dev'),
    path.join(__dirname, '.next-web-build')
  ];
  for (const cDir of cacheDirsToClean) {
    if (fs.existsSync(cDir)) {
      try {
        fs.rmSync(cDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }
  console.log('[desktop-build] next build 시작...');
  execSync('npx next build', { stdio: 'inherit', env: { ...process.env, ASSET_PREFIX: './', NEXT_BUILD_TARGET: 'desktop', NEXT_BUILD_DIR: '.next-desktop' } });
  buildSuccess = true;
} catch (err) {
  console.error('[desktop-build] 빌드 실패:', err.message);
} finally {
  // 3. 백업 폴더에서 원위치 복원 (빌드 성공/실패 상관없이 항상 복원)
  console.log('[desktop-build] 제외된 라우트들을 원본 위치로 복원합니다...');
  for (const item of DEV_ONLY_ROUTES) {
    const src = path.join(BACKUP_DIR, item.route);
    const dest = path.join(item.parent, item.route);
    if (fs.existsSync(src)) {
      // 복원 시에도 기존 찌꺼기 제거 후 cpSync
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.cpSync(src, dest, { recursive: true });
      console.log(`  - 복원 완료: ${item.route}`);
    }
  }
  // 백업 디렉토리 정리
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  }
}

if (buildSuccess) {
  // 🛡️ [데스크톱 정적 번들 최신화] NEXT_BUILD_DIR(.next-desktop) 정적 결과를 out 디렉터리로 복사
  try {
    const exportedDir = path.join(__dirname, '.next-desktop');
    const outputDir = path.join(__dirname, 'out');
    if (fs.existsSync(exportedDir)) {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.cpSync(exportedDir, outputDir, { recursive: true, force: true });
      console.log('[desktop-build] .next-desktop -> out 정적 번들 복사 및 최신화 완료');

      // 🛡️ [과거 빌드 잔여 청크(Ghost Chunks) 소탕]
      //    Next.js 빌드 시 해시가 변경되어 out/_next/static/chunks에 이전 빌드 파일들이 누적되는 결함을 방지
      try {
        const srcNextDir = path.join(exportedDir, '_next');
        const destNextDir = path.join(outputDir, '_next');
        if (fs.existsSync(srcNextDir) && fs.existsSync(destNextDir)) {
          function getRelFiles(dir, base = '') {
            let res = [];
            for (const f of fs.readdirSync(dir)) {
              const full = path.join(dir, f);
              const rel = path.join(base, f);
              if (fs.statSync(full).isDirectory()) res = res.concat(getRelFiles(full, rel));
              else res.push({ full, rel });
            }
            return res;
          }
          const validFiles = new Set(getRelFiles(srcNextDir).map(x => x.rel));
          const existingFiles = getRelFiles(destNextDir);
          let purgedCount = 0;
          for (const f of existingFiles) {
            if (!validFiles.has(f.rel)) {
              try {
                fs.unlinkSync(f.full);
                purgedCount++;
              } catch (_) {}
            }
          }
          function removeEmptyDirs(dir) {
            try {
              const entries = fs.readdirSync(dir);
              for (const e of entries) {
                const full = path.join(dir, e);
                if (fs.statSync(full).isDirectory()) {
                  removeEmptyDirs(full);
                  if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
                }
              }
            } catch (_) {}
          }
          removeEmptyDirs(destNextDir);
          if (purgedCount > 0) {
            console.log(`[desktop-build] 이전 빌드 잔여 청크 ${purgedCount}개 자동 소탕 완료`);
          }
        }
      } catch (cleanStaleErr) {
        console.warn('[desktop-build] 이전 빌드 잔여 청크 소탕 경고:', cleanStaleErr.message);
      }
    }
  } catch (copyOutErr) {
    console.error('[desktop-build] out 디렉터리 복사 오류:', copyOutErr.message);
  }

  try {
    const publicIconsDir = path.join(__dirname, 'public', 'icons');
    const outIconsDir = path.join(__dirname, 'out', 'icons');
    if (fs.existsSync(publicIconsDir) && fs.existsSync(path.join(__dirname, 'out'))) {
      if (!fs.existsSync(outIconsDir)) {
        fs.mkdirSync(outIconsDir, { recursive: true });
      }
      fs.cpSync(publicIconsDir, outIconsDir, { recursive: true });
      console.log('[desktop-build] public/icons -> out/icons 동기화 완료');
    }
  } catch (copyErr) {
    console.warn('[desktop-build] out/icons 동기화 경고:', copyErr.message);
  }

  try {
    const publicHelpDir = path.join(__dirname, 'public', 'help');
    const outHelpDir = path.join(__dirname, 'out', 'help');
    const docsHelpDir = path.join(__dirname, '..', 'docs', 'help');
    if (fs.existsSync(publicHelpDir)) {
      if (fs.existsSync(path.join(__dirname, 'out'))) {
        if (!fs.existsSync(outHelpDir)) fs.mkdirSync(outHelpDir, { recursive: true });
        fs.cpSync(publicHelpDir, outHelpDir, { recursive: true, force: true });
        console.log('[desktop-build] public/help -> out/help 동기화 완료');
      }
      if (fs.existsSync(docsHelpDir)) {
        fs.cpSync(publicHelpDir, docsHelpDir, { recursive: true, force: true });
        console.log('[desktop-build] public/help -> docs/help 미러 동기화 완료');
      }
    }
  } catch (helpCopyErr) {
    console.warn('[desktop-build] out/help 동기화 경고:', helpCopyErr.message);
  }

  // 🛡️ [용량 최적화 및 보안] out 디렉터리 내 불필요한 .map, 테스트 파일, 임시 에셋 자동 소탕
  try {
    const outDir = path.join(__dirname, 'out');
    if (fs.existsSync(outDir)) {
      function purgeFiles(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            purgeFiles(fullPath);
          } else {
            const nameLower = entry.name.toLowerCase();
            if (
              nameLower.endsWith('.map') ||
              nameLower.startsWith('users_image_') ||
              nameLower.includes('.test.') ||
              nameLower.includes('.spec.')
            ) {
              fs.rmSync(fullPath, { force: true });
            }
          }
        }
      }
      purgeFiles(outDir);
      console.log('[desktop-build] out 디렉터리 내 소스맵(.map) 및 테스트/더미 에셋 자동 소탕 완료');
    }
  } catch (purgeErr) {
    console.warn('[desktop-build] out 디렉터리 소탕 경고:', purgeErr.message);
  }
}

if (!buildSuccess) process.exit(1);
