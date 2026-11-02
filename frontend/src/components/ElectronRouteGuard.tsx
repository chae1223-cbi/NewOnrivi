// ====================================================================
// 📊 [OMD-CORE-ElectronRouteGuard-0001] ElectronRouteGuard ➔ ElectronRouteGuard
// 🎯 @KICK  : 데스크톱 앱(Electron) 환경에서 에디터 외 일반 웹 경로(랜딩, 대시보드 등) SPA 이동 시도를 차단하고 외부 웹 브라우저 새창으로 튕겨냄
// 🛡️ @GUARD : window.electronAPI 존재 여부를 확인하여 웹 브라우저 접속 환경인 경우 바이패스(무영향) 가드
// 🚨 @PATCH : **2026-06-28** — 신규 개설: Next.js 클라이언트 사이드 라우팅(Link/push) 데스크톱 이탈 차단 및 브라우저 강제 독립 실행 가드 구현
// 🔗 @CALLS : usePathname, useRouter, window.electronAPI
// ====================================================================
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ElectronRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 1. 데스크톱 앱(Electron) 환경인지 확인
    const isDesktop = typeof window !== "undefined" && !!(window as any).electronAPI;
    if (!isDesktop) return;

    // 2. 내부 서빙 허용 경로 목록 (/editor, /auth/callback)
    const isInternalRoute = pathname.includes("/editor") || pathname.includes("/auth/callback");

    if (!isInternalRoute) {
      // 3. 에디터 밖의 경로(랜딩 /, 대시보드 /dashboard 등)로 나가려 함이 포착됨
      console.log(`[ElectronRouteGuard] SPA 이탈 감지 -> ${pathname}`);

      // 현재 도메인 주소 획득
      const targetUrl = window.location.origin + pathname + window.location.search;

      // 4. 데스크톱 에디터 화면은 강제로 제자리(/editor)로 원복 고정시킵니다.
      router.replace("/editor");

      // 5. 사용자가 가려던 실제 웹사이트 주소는 크롬 등 OS 기본 브라우저 새 창으로 시원하게 실행시켜 줍니다.
      try {
        (window as any).electronAPI.openExternal(targetUrl);
      } catch (err) {
        console.error("[ElectronRouteGuard] 외부 브라우저 호출 실패:", err);
      }
    }
  }, [pathname, router]);

  return null; // 화면을 차지하지 않는 백그라운드 데몬 컴포넌트
}
