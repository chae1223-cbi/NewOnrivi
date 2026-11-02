import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import 'katex/dist/katex.min.css';

import { ToastProvider } from "@/components/ToastProvider";

const WebSessionRevocationGuard = dynamic(
  () => import("@/components/WebSessionRevocationGuard").then((mod) => mod.WebSessionRevocationGuard),
  { ssr: false }
);

// ====================================================================
// 📊 [OMD-CORE-layout-0002] layout ➔ metadata
// 🎯 @KICK  : Next.js Metadata 객체 - 페이지 제목, 설명, 아이콘 경로 설정
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : **2026-10-15** — [파비콘(/favicon.ico) 404 오류 해결 및 표준 메타데이터 아이콘 연동]:
//             1) 브라우저 기본 /favicon.ico 요청 시 404 리소스 로드 실패를 방지하기 위해 public/ 및 app/에 표준 favicon.ico 에셋 배치
//             2) layout.tsx metadata.icons에 favicon.ico 표준 icon/shortcut 및 apple-touch-icon 정밀 연동
// 🚨 @PATCH : **2026-10-02** — [WebSessionRevocationGuard Supabase 지연 로드 연동]: 루트 layout.js 번들에서 2.8MB Supabase 라이브러리 및 하위 의존성을 완전히 분리하여 첫 화면 진입 및 새로고침 시 번들 eval 파싱 지연 및 layout.js:500 SyntaxError 원천 차단
// 🚨 @PATCH : **2026-09-30** — [WebSessionRevocationGuard 동적 지연 로드(dynamic ssr:false) 적용]: 루트 layout.js 번들에서 670KB Supabase 라이브러리를 분리하여 브라우저 eval 파싱 지연 및 SyntaxError 원천 차단, 첫 화면 즉시 렌더링 보장
// 🚨 @PATCH : **2026-09-26** — [SEO 메타데이터 외부 노트 내보내기 서식 복원 키워드 보강]: description 및 keywords에 마크다운 서식 깨짐 복원, 마크다운 표 복원, 외부 노트 내보내기 호환 키워드 반영 (네이버 권장 80자 이내 78자 최적화)
// 🚨 @PATCH : **2026-09-24** — [브라우저 자동번역기(Google Translate) React DOM 충돌(removeChild/insertBefore) 원천 방어 패치 탑재]: Node.prototype.removeChild 및 insertBefore 안전 가드 주입, html/meta notranslate 지정 및 NotFoundError 크래시 필터링 적용
// 🚨 @PATCH : **2026-09-23** — [네이버 서치어드바이저 SEO 메타데이터 규격 최적화]: 네이버 권장 글자수(제목 40자 이내, 설명 80자 이내, OG제목 40자 이내)에 맞춰 title(38자), description(76자), openGraph/twitter title(33자) 정밀 최적화
// 🚨 @PATCH : **2026-09-23** — [네이버 서치어드바이저 소유확인 메타태그 연동]: naver-site-verification(08215f3797f7f99a9dfe413b0ac38d58) 헤드 메타태그 추가 및 HTML 인증 파일 탑재
// 🔗 @CALLS : 없음
// ====================================================================
export const metadata: Metadata = {
  metadataBase: new URL('https://onrivi.com'),
  title: "Onrivi Author - 마크다운 뷰어 & 에디터 | 온리비 어서",
  description: "한글 오류와 서식 깨짐 없는 마크다운 에디터. 외부 노트 내보내기 완벽 호환, 수식·다이어그램 지원, 맞춤 서식 PDF/EPUB 출판 및 보안 제공.",
  keywords: ["마크다운", "마크다운 에디터", "마크다운 뷰어", "마크다운 서식 깨짐 복원", "마크다운 표 복원", "마크다운 내보내기 호환", "마크다운viewer", "마크다운edit", "마크다운문서viwer", "Markdown Viewer", "Markdown Edit", "Markdown Editor", "Onrivi Author", "온리비어서", "Local-First", "로컬우선", "KaTeX", "Mermaid", "RAG전처리", "PDF변환", "EPUB출판", "1인개발"],
  authors: [{ name: "Onrivi (온리비) 채병익" }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Onrivi Author - 완벽한 마크다운 뷰어 & 에디터",
    description: "한글 오류와 서식 깨짐 없는 마크다운 에디터. 외부 노트 내보내기 완벽 호환, 수식·다이어그램 지원, 맞춤 서식 PDF/EPUB 출판 및 보안 제공.",
    url: 'https://onrivi.com',
    siteName: 'Onrivi Author',
    images: [
      {
        url: 'https://onrivi.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Onrivi Author Preview',
      }
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Onrivi Author - 완벽한 마크다운 뷰어 & 에디터",
    description: "한글 오류와 서식 깨짐 없는 마크다운 에디터. 외부 노트 내보내기 완벽 호환, 수식·다이어그램 지원, 맞춤 서식 PDF/EPUB 출판 및 보안 제공.",
    images: ['https://onrivi.com/og-image.png'],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon_onriveauther.png?v=1" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon_onriveauther.png?v=1",
  }
};

// ====================================================================
// 📊 [OMD-CORE-layout-0001] layout ➔ RootLayout
// 🎯 @KICK  : Next.js 루트 레이아웃 - 전역 HTML 구조, CSP, 폰트, Mermaid 설정 및 ToastProvider 래핑
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : **2026-09-16** — [CSP connect-src webpack: 가상 프로토콜 허용]: Next.js 개발 모드(next dev)에서 브라우저 개발자 도구가 소스맵(webpack://_N_E/...) 요청 시 CSP connect-src 차단 에러 방지를 위해 webpack: 스키마 추가
// 🚨 @PATCH : **2026-09-16** — [CSP connect-src Edge 확장(extension:) 및 브라우저 확장 프로그램 허용 확장]: extension:, edge-extension:, chrome-extension:, https://onrivi.com, https://*.onrivi.com을 connect-src에 추가하여 Edge 및 Chrome 확장 프로그램 충돌 로그 및 외부 연결 차단 콘솔 에러 완전 해결
// 🚨 @PATCH : **2026-09-16** — [CSP connect-src 포트 3100 및 blob: localhost 허용 확장]: dev 포트(3100), localhost/127.0.0.1 와일드카드, blob:, Ollama(11434) 및 AI 엔드포인트를 connect-src에 보강하여 CSP 연결 차단 콘솔 오류 영구 해결
// 🚨 @PATCH : **2026-09-16** — 크롬 확장 프로그램(Chrome Extension) 비동기 메시지 채널 조기 종료 및 서드파티 VM 에러(startTime 등) 무해한 콘솔 에러 필터 가드 강화
// 🚨 @PATCH : **2026-10-04** — [Cloudflare Pages _headers CSP 동기화 — GIS 스크립트 로드 차단 해결]: layout.tsx의 CSP meta 태그에는 이미 포함된 https://accounts.google.com이 public/_headers의 script-src, frame-src, child-src, connect-src에 누락되어 웹 배포 환경에서 GIS 인증 스크립트 로드가 차단되는 문제를 _headers에 동일하게 추가하여 해결; www.gstatic.com, googleusercontent.com도 style-src/img-src에 추가
//           : **2026-10-03** — [구글 드라이브 GIS 연동을 위한 CSP 정책 확장]: Content-Security-Policy 내 script-src, frame-src, child-src에 https://accounts.google.com 추가 및 connect-src에 https://accounts.google.com, https://www.googleapis.com 추가하여 구글 로그인 및 드라이브 API 통신 정상화
//           : **2026-09-12** — 크롬 확장 프로그램(Chrome Extension) 비동기 메시지 채널 조기 종료로 인한 무해한 unhandledrejection 콘솔 에러 필터 가드 탑재
//           : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용: Plus Jakarta Sans, Inter, JetBrains Mono 구글 웹폰트 사전 로드 및 연동
//           : **2026-09-05** — 파비콘 경로를 상대경로(./)에서 절대경로(/icon_onriveauther.png?v=1)로 변경하여 /login 등 중첩 라우트 진입 시 404 리소스 로드 에러 방지 | CSP script-src 'self' 차단으로 mermaid.min.js <script defer> 복원 (2026-06-18); Next.js hydration이 <script>를 제거하여 dynamic load 방식으로 전환, plain script defer 제거 (2026-06-18) | **2026-06-20** — 백엔드 API(포트 5000) 연동을 위해 CSP connect-src에 http://localhost:5000 추가 허용
//           : **2026-06-23** — Cloudflare Web Analytics 억까 차단 방지를 위해 script-src 목록에 https://static.cloudflareinsights.com 정밀 추가
// 🔗 @CALLS : ToastProvider
// ====================================================================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self' app: media: media-local:; script-src 'self' app: 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://maps.gstatic.com https://maps.googleapis.com https://static.cloudflareinsights.com https://translate.googleapis.com https://accounts.google.com; style-src 'self' app: 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://translate.googleapis.com https://www.gstatic.com; font-src 'self' app: https://fonts.gstatic.com https://cdn.jsdelivr.net data:; img-src 'self' app: data: blob: http: https: file: media: media-local: https://www.gstatic.com https://*.googleusercontent.com; connect-src 'self' app: data: blob: ws: wss: https: http: extension: edge-extension: chrome-extension: webpack: http://localhost:* http://127.0.0.1:* http://localhost:3100 http://localhost:3000 http://localhost:4000 http://localhost:5000 http://localhost:11434 http://127.0.0.1:3100 http://127.0.0.1:3000 http://127.0.0.1:4000 http://127.0.0.1:5000 media: media-local: https://onrivi.com https://*.onrivi.com https://fonts.googleapis.com https://fonts.gstatic.com https://maps.googleapis.com https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://translate.googleapis.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://accounts.google.com https://www.googleapis.com; child-src 'self' app: blob: media: media-local: https: https://maps.google.com https://www.google.com https://accounts.google.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://maps.google.com https://www.google.com https://accounts.google.com; media-src 'self' app: media: media-local: blob: https:;"
        />
        <meta name="color-scheme" content="light" />
        <meta name="naver-site-verification" content="08215f3797f7f99a9dfe413b0ac38d58" />
        <link rel="icon" href="/icon_onriveauther.png?v=1" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Onrivi Author",
              "alternateName": ["온리비 어서", "Onrivi", "마크다운 뷰어", "마크다운 에디터", "마크다운viewer", "마크다운edit", "마크다운문서viwer"],
              "operatingSystem": "Windows, Web",
              "applicationCategory": "DeveloperApplication, ProductivityApplication",
              "offers": {
                "@type": "Offer",
                "price": "3000",
                "priceCurrency": "KRW",
                "priceValidUntil": "2027-12-31"
              },
              "description": "마크다운 작성(Markdown Edit)과 인쇄소 품질의 뷰어/출판 서식을 결합한 로컬 우선(Local-First) 저작 플랫폼. KaTeX, Mermaid, JSON 서식 프로필 및 AI 연동 지원.",
              "url": "https://onrivi.com",
              "author": {
                "@type": "Person",
                "name": "채병익 (Chae Byeong-ik)"
              }
            })
          }}
        />
        {/* 브라우저 번역기(Google Translate) DOM 조작 충돌 방어 및 확장프로그램 에러 필터링 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                /* 1. Google Translate 등 외부 DOM 조작 시 React removeChild/insertBefore 크래시 방어 */
                if (typeof Node === 'function' && Node.prototype) {
                  var origRemoveChild = Node.prototype.removeChild;
                  Node.prototype.removeChild = function(child) {
                    if (child && child.parentNode !== this) {
                      if (child.parentNode && typeof child.parentNode.removeChild === 'function') {
                        return child.parentNode.removeChild(child);
                      }
                      return child;
                    }
                    return origRemoveChild.apply(this, arguments);
                  };

                  var origInsertBefore = Node.prototype.insertBefore;
                  Node.prototype.insertBefore = function(newNode, referenceNode) {
                    if (referenceNode && referenceNode.parentNode !== this) {
                      if (referenceNode.parentNode && typeof referenceNode.parentNode.insertBefore === 'function') {
                        return referenceNode.parentNode.insertBefore(newNode, referenceNode);
                      }
                      return newNode;
                    }
                    return origInsertBefore.apply(this, arguments);
                  };
                }

                /* 2. 무해한 크롬 확장프로그램 및 removeChild/NotFoundError 콘솔 오염 및 에러 바운더리 억제 */
                var filterMsg = function(msg) {
                  if (!msg || typeof msg !== 'string') return false;
                  return msg.indexOf('A listener indicated an asynchronous response') !== -1 ||
                         msg.indexOf('message channel closed before a response was received') !== -1 ||
                         msg.indexOf('startTime') !== -1 ||
                         msg.indexOf('removeChild') !== -1 ||
                         msg.indexOf('NotFoundError') !== -1 ||
                         msg.indexOf('The node to be removed is not a child of this node') !== -1;
                };
                window.addEventListener('unhandledrejection', function(e) {
                  var m = (e && e.reason && (e.reason.message || e.reason)) ? String(e.reason.message || e.reason) : '';
                  if (filterMsg(m)) {
                    e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                  }
                });
                window.addEventListener('error', function(e) {
                  var m = (e && (e.message || (e.error && e.error.message))) ? String(e.message || e.error.message) : '';
                  if (filterMsg(m)) {
                    e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                  }
                });
              }
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <WebSessionRevocationGuard />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
