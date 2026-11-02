/**
 * @type {import('next').NextConfig}
 * 🚨 @PATCH : **2026-10-02** — [프로덕션 소스맵 비활성화로 번들 다이어트]: productionBrowserSourceMaps를 false로 전환하여 빌드 산출물 용량 약 18MB 절감
 */
// 💡 데스크탑(Electron) 빌드 시 NEXT_BUILD_TARGET=desktop 환경변수가 주입됩니다.
// 개발 전용 API 라우트(/api/view, /api/upload-pasted-image)는 정적 내보내기(output:export)와
// 호환되지 않으므로, 데스크탑 빌드 시에만 해당 라우트를 빌드 대상에서 완전히 제외합니다.
const isDesktopBuild = process.env.NEXT_BUILD_TARGET === 'desktop';
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // 웹 배포 빌드와 실행 중인 개발 서버가 같은 .next 파일을 덮어쓰지 않도록 분리한다.
  distDir: process.env.NEXT_BUILD_DIR || (isDev ? '.next-dev' : (isDesktopBuild ? '.next-desktop' : '.next-web-build')),
  ...(isDev && !isDesktopBuild ? {} : { output: 'export' }), // 개발 환경에서는 API 라우트 활성화를 위해 export 제외
  productionBrowserSourceMaps: false, // 프로덕션 빌드 용량 최적화 (소스맵 제외)
  assetPrefix: process.env.ASSET_PREFIX !== undefined ? process.env.ASSET_PREFIX : '', // cloudflare/web: (기본) '', desktop: ASSET_PREFIX=./
  images: {
    unoptimized: true, // ?적 빌드 ????지 최적??경고 방?
  },
  reactStrictMode: false, // ??? ?로고침 ??충돌 ?화??해 ?시 비활?화
  generateBuildId: async () => {
    // 매 빌드 타임의 타임스탬프를 ID로 사용하여 브라우저 정적 파일 캐시 강제 무력화(Bust)
    return `build-${new Date().getTime()}`;
  },
  webpack: (config, { dev, isServer, webpack }) => {
    // Windows ?일 ?금 ?슈 ?화??한 ?팩 캐시 비활?화 (개발 모드 ?용)
    if (dev && !isServer) {
      config.cache = false;
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
        'node:module': false,
        'node:sqlite': false,
        'node:fs': false,
        'node:path': false,
        'node:crypto': false,
      };
      config.externals = [...(config.externals || []), 'node:sqlite', 'node:module'];
    }

    // ?�적 ?�보?�기�??�해 추출??CSS ?�의 ?��? ?�트 URL ?�정
    if (!isServer) {
      class FixCssFontUrlsPlugin {
        apply(compiler) {
          compiler.hooks.thisCompilation.tap('FixCssFontUrls', (compilation) => {
            compilation.hooks.processAssets.tap(
              {
                name: 'FixCssFontUrls',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER,
              },
              (assets) => {
                for (const [name, asset] of Object.entries(assets)) {
                  if (name.endsWith('.css')) {
                    let source = asset.source();
                    if (typeof source === 'string' && source.includes('url(_next/static/media/')) {
                      source = source
                        .replace(/url\(_next\/static\/media\//g, 'url(../media/')
                        .replace(/url\('_next\/static\/media\//g, "url('../media/")
                        .replace(/url\("_next\/static\/media\//g, 'url("../media/');
                      compilation.updateAsset(
                        name,
                        new webpack.sources.RawSource(source)
                      );
                    }
                  }
                }
              }
            );
          });
        }
      }
      config.plugins.push(new FixCssFontUrlsPlugin());
    }


    return config;
  },
};

module.exports = nextConfig;
