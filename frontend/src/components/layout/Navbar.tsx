// ====================================================================
// 📊 [OMD-UI-Navbar-0020] Navbar ➔ Navbar
// 🎯 @KICK  : 상단 고정식 내비게이션 바로, 테마 스위처와 Supabase Auth 로그인 유무에 따른 동적 버튼/사용자 이메일 노출 및 로그아웃 기능 지원
// 🛡️ @GUARD : Supabase Auth 세션 상태를 실시간 감지하여 hydration 미스매치 방지 및 안전한 로그아웃 예외 처리
// 🚨 @PATCH : **2026-09-30** — [헤더 네비게이션 메뉴 명칭 및 순서 갱신]: 사용자 요청에 따라 '문서 결과'를 '문서작성Flow(#document-results)'로 변경하고 섹션 위치 스왑에 맞추어 메뉴 순서를 '문서작성Flow' ➔ '제품 소개'로 정돈
// 🚨 @PATCH : **2026-09-30** — [로그아웃 방어 로직 강화]: 서버 세션 해제 실패나 세션 ID 누락 시에도 로컬 인증 세션(Supabase Auth & Session Storage)이 무조건 정상 정리되도록 2중 안전 가드 적용
// 🚨 @PATCH : **2026-09-30** — [TransformationSection 제거에 따른 네비게이션 메뉴 현행화]: '활용 사례(#transformation)'를 '문서 결과(#document-results)'로 갱신
// 🚨 @PATCH : **2026-09-30** — [랜딩페이지 네비게이션 메뉴 현행화]: 구현계획서 3번 항목에 맞추어 헤더 메뉴를 '제품 소개(#product-experience)', '주요 기능(#features)', '활용 사례(#transformation)', '요금 안내(#pricing)'로 최신화
// 🚨 @PATCH : **2026-09-26** — [상단 헤더(Navbar) 블로그 링크 제거]: 사용자 요청에 따라 랜딩페이지 네비게이션 바에서 블로그 링크 제거 및 깔끔한 원본 유지
// 🚨 @PATCH : **2026-09-17** — [로그아웃 시 환경설정(Gemini API 키 등) 영구 보존 및 선별적 세션 정리]: clearAuthSessionStorage 연동으로 API 키 및 사용자 설정 삭제 결함 해결
// 🚨 @PATCH : **2026-09-11** — 헤더(Navbar) 딥 네이비(#0B0F19) 진한 색상 및 고대비 화이트/코발트 UI 적용
//             **2026-09-11** — 랜딩페이지 섹션 교차(#FFFFFF / #EFEFFF) 배경 및 헤어라인 보더(#E2E4F6) 적용
//             **2026-09-05** — 로그아웃(handleLogout) 시 onrivi_* 및 sb-* 로컬스토리지 전량 파기로 계정 간 세션 오염 원천 차단 및 p_user_id 전달 연동
//             **2026-09-03** — Onrivi Author Premium V2 랜딩페이지 개편: 헤더 높이(76px) 및 최대폭(1240px) 최적화, 단일 Primary CTA 중심 정돈 및 LDSG v5.0 글래스모피즘 표준 적용
//             **2026-08-27** — 비로그인 상태 헤더 우측 영역에 '즉시 체험하기' 버튼을 추가하고, 클릭 시 로컬 스토리지 게스트 플래그(onrivi_guest_mode)를 셋업하여 복잡한 로그인/가입 없이 브라우저 가상 스페이스 에디터로 즉시 진입하도록 액션 탑재; **2026-06-28** — 데스크톱 앱(Electron) 환경 진입 시 웹 상단 헤더가 레이아웃을 해쳐 에디터 집중을 방해하지 않도록 렌더링 무조건 스킵(return null) 가드 패치; 비밀번호 재설정(/reset-password) 화면 진입 시 임시 토큰으로 로그인 상태의 헤더 UI가 노출되지 않도록 강제 필터링 우회 패치
//             **2026-06-23** — 로그아웃 시 license_activations 직접 delete DML을 Supabase Stored Procedure (deactivate_session_on_logout RPC) 호출 방식으로 위임 개편 패치
//             **2026-06-22** — Luminous Arctic 디자인 시스템 라이트모드 적용 패치 (글래스모피즘 Navbar, Inter 폰트, Ice Blue 액센트); 비로그인 상태 진입 경로 제거(로그인/시작하기 버튼 숨김) 패치; 헤더에 비로그인용 '시작하기' 버튼 복원 패치
//             **2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 및 Supabase Auth 연동 패치; 깨진 logo 이미지 아이콘을 /icon.png로 변경; 다운로드 네비게이션 링크 제거 대응 패치
//             **2026-08-10** — 진행 중 이벤트 동적 뱃지 링크 추가 (활성 프로모션 없으면 숨김)
// 🔗 @CALLS : window.electronAPI, supabase.auth, supabase.rpc, Button, useRouter, clearAuthSessionStorage
// ====================================================================
"use client";

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import React, { useState, useEffect } from "react";  // useState, useEffect : 상태관리 hook 
import { NAV_LINKS, SITE_NAME } from "@/lib/constants"; //NAV_LINKS, SITE_NAME : 상수들 
import Link from "next/link"; // next/link : 페이지 이동
import { useRouter } from "next/navigation"; // useRouter : 페이지 이동
import { supabase } from "@/lib/supabaseClient"; // supabase : 데이터베이스 연동
import { clearAuthSessionStorage } from "@/lib/authSessionHelper";
import { logoutCurrentWebSession } from "@/lib/logoutWebSession";
import toast from 'react-hot-toast';

// =====================================================================
// 인터페이스 선언 
// NavbarContent : Navbar 컴포넌트의 props를 정의하는 타입
// navLinks : 네비게이션 링크
// dashboardLabel : 대시보드 페이지 이동
// editorLabel : 에디터 페이지 이동
// logoutLabel : 로그아웃 버튼
// startLabel : 시작하기 버튼 
// 인터페이스 타입 선언 끝
// =====================================================================
export interface NavbarContent {
  navLinks: { label: string; href: string }[];
  dashboardLabel: string;
  editorLabel: string;
  logoutLabel: string;
  startLabel: string;
}

// =====================================================================
// 네비게이션 구현 
// Navbar 컴포넌트는 사용자가 로그인했는지 여부에 따라 다른 UI를 표시합니다.
//  - 로그아웃 상태 : '시작하기' 버튼과 '로그인' 버튼을 표시합니다.
//  - 로그인 상태 : '대시보드', '에디터', '로그아웃' 버튼을 표시합니다.
// =====================================================================
export function Navbar({ content }: { content?: NavbarContent }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasActivePromo, setHasActivePromo] = useState(false);
  const [isTryoutGuideOpen, setIsTryoutGuideOpen] = useState(false);

  const handleInstantTry = () => {
    setIsTryoutGuideOpen(true);
  };

  // =====================================================================
  // 네비게이션 컴포넌트의 생명 주기 동안 필요한 초기화 및 이벤트 리스너 설정
  // =====================================================================
  useEffect(() => {
    setMounted(true); // mounted : 컴포넌트가 마운트되었음을 true로 설정

    // 비밀번호 재설정 페이지(/reset-password)에서는 임시 세션이 활성화되므로 Navbar의 로그인 상태를 강제로 비활성화
    const isResetPasswordPage = typeof window !== "undefined" && window.location.pathname.includes("/reset-password"); // isResetPasswordPage : 비밀번호 재설정 페이지 여부 

    if (isResetPasswordPage) { // 비밀번호 재설정 페이지인 경우
      setIsLoggedIn(false); // 로그인 상태를 false로 설정
      setUserEmail(null); // 사용자 이메일을 null로 설정
    } else { // 비밀번호 재설정 페이지가 아닌 경우
      supabase.auth.getSession().then(({ data: { session } }) => { // Supabase Auth 세션 정보를 가져옴 
        if (session?.user) { // 세션에 사용자 정보가 있는 경우
          setUserEmail(session.user.email || null); // 사용자 이메일을 설정 
          setIsLoggedIn(true); // 로그인 상태를 true로 설정
        }
      });
    }

    // =====================================================================
    // Supabase Auth 상태 변경 시 처리
    // =====================================================================
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { // auth state change : 로그인, 로그아웃, 세션 만료 등authStateChange 이벤트 구독 
      if (isResetPasswordPage) { // 비밀번호 재설정 페이지인 경우 
        setUserEmail(null); // 사용자 이메일을 null로 설정 
        setIsLoggedIn(false); // 로그인 상태를 false로 설정 
      } else if (session?.user) { // 세션에 사용자 정보가 있는 경우
        setUserEmail(session.user.email || null); // 사용자 이메일을 설정 
        setIsLoggedIn(true); // 로그인 상태를 true로 설정
      } else { // 세션에 사용자 정보가 없는 경우
        setUserEmail(null); // 사용자 이메일을 null로 설정 
        setIsLoggedIn(false); // 로그인 상태를 false로 설정 
      }
    });

    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);

    // 진행 중인 이벤트 여부 확인
    fetch("/api/beta/active-promotion")
      .then(r => r.json())
      .then(data => { if (data.promotion) setHasActivePromo(true); })
      .catch(() => {});

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // =====================================================================
  // 로그아웃 처리
  // =====================================================================
  const handleLogout = async () => {
    try {
      try {
        await logoutCurrentWebSession();
      } catch (sessionErr) {
        console.warn("[Navbar] 웹 세션 서버 해제 건너뜀:", sessionErr);
      }
      // 🚨 @PATCH : 2026-09-17 환경설정(Gemini API 키 등)을 안전하게 보존하고 인증 세션만 선별 삭제
      try {
        await supabase.auth.signOut({ scope: 'local' }); // 인증 토큰을 지우기 전에 로그아웃
      } finally {
        clearAuthSessionStorage();
      }
      setUserEmail(null); // 사용자 이메일을 null로 설정 
      setIsLoggedIn(false); // 로그인 상태를 false로 설정 
      router.push("/"); // 메인 페이지로 이동
    } catch (e) { // catch : 예외 처리를 위한 블록 
      console.error("[Navbar] 로그아웃 에러:", e); // 에러 로그 출력
      toast.error(e instanceof Error ? e.message : '로그아웃 중 문제가 발생했습니다.');
    }
  };

  // 서버와 브라우저의 첫 렌더는 같아야 한다. 마운트 후에만 Electron 환경을 판정해 헤더를 숨긴다.
  const isDesktop = mounted && typeof window !== "undefined" && (
    !!(window as any).electronAPI ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    new URLSearchParams(window.location.search).get('env') === 'desktop'
  );
  if (isDesktop) return null;

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0B0F19]/95 backdrop-blur-md border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
          : "bg-[#0B0F19] border-b border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
      }`}
      style={{
        fontFamily: "Pretendard, LineSeed, sans-serif",
      }}
    >
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center h-[76px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <img src="/icon.png" alt={SITE_NAME} className="h-8 w-8 rounded-lg shadow-xs group-hover:scale-105 transition-transform" />
            <span className="font-extrabold text-[19px] text-white tracking-tight">
              {SITE_NAME}
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-9">
            {(content?.navLinks ?? NAV_LINKS).map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[14px] font-medium text-zinc-300 hover:text-white transition-colors tracking-tight"
              >
                {link.label}
              </a>
            ))}

            {/* 진행 중인 이벤트 — 활성 프로모션 있을 때만 노출 */}
            {hasActivePromo && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("openBetaModal"))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#60a5fa] bg-[#1d4ed8]/20 border border-[#1d4ed8]/40 rounded-full px-3 py-1 hover:bg-[#1d4ed8]/30 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
                진행 중인 이벤트
              </button>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {mounted && (
              isLoggedIn && userEmail ? (
                <>
                  <span className="hidden lg:block text-xs font-medium text-zinc-400 max-w-[140px] truncate">
                    {userEmail}
                  </span>
                  <Link href="/dashboard">
                    <button className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-white/20 hover:bg-white/10 text-white transition-all">
                      {content?.dashboardLabel ?? "대시보드"}
                    </button>
                  </Link>
                  <Link href="/editor">
                    <button className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-sm transition-all">
                      {content?.editorLabel ?? "에디터"}
                    </button>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-medium text-zinc-400 hover:text-white transition-colors px-1"
                  >
                    {content?.logoutLabel ?? "로그아웃"}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/login"
                    className="text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors px-2 py-1.5"
                  >
                    로그인
                  </Link>
                  <button 
                    onClick={handleInstantTry} 
                    className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 text-[13px] font-semibold rounded-xl text-zinc-200 border border-white/20 hover:bg-white/10 transition-all"
                  >
                    즉시 체험하기
                  </button>
                  <Link href="/signup">
                    <button className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-sm shadow-[#1d4ed8]/30 hover:shadow-md hover:shadow-[#1d4ed8]/50 transition-all">
                      {content?.startLabel ?? "무료로 시작하기"}
                    </button>
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      {/* ⏱️ 게스트 체험판 이용 가이드 안내 모달 */}
      {isTryoutGuideOpen && (() => {
        const isAlreadyExpired = typeof window !== 'undefined' && (
          localStorage.getItem('onrivi_guest_expired') === 'Y' ||
          parseInt(localStorage.getItem('onrivi_guest_try_count') || '0', 10) >= 5
        );
        return (
          <div className="fixed inset-0 h-screen w-screen z-[9999] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4 select-none animate-fadeIn" translate="no">
            <div className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-7 shadow-2xl text-left transform scale-100 transition-all duration-300 scrollbar-none">
              {isAlreadyExpired ? (
                <>
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><span>⚠️</span> 체험 접속 횟수 초과 안내</span>
                    {typeof window !== 'undefined' && (
                      window.location.hostname.includes('localhost') || 
                      window.location.hostname.includes('127.0.0.1') || 
                      window.location.port === '3100' ||
                      process.env.NODE_ENV === 'development'
                    ) && (
                      <button
                        onClick={() => {
                          localStorage.removeItem('onrivi_guest_expired');
                          localStorage.removeItem('onrivi_guest_start_time');
                          localStorage.setItem('onrivi_guest_try_count', '0');
                          setIsTryoutGuideOpen(false);
                        }}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline bg-transparent border-none cursor-pointer font-normal flex-shrink-0"
                        title="개발자 전용 체험 횟수 초기화"
                      >
                        테스트용 리셋
                      </button>
                    )}
                  </h3>
                  
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">
                    이미 동일 브라우저당 허용되는 <strong>최대 5회 즉시 체험</strong> 접속 횟수를 모두 소진하셨습니다.
                    <br /><br />
                    기존에 작성하셨던 가상 공간의 임시 원고는 안전하게 로컬 브라우저에 임시 보존 중입니다. 계속해서 원고를 이어서 작성하고, 무제한 클라우드 백업 및 AI 어시스턴트를 온전히 사용하시려면 <strong>정식 회원으로 가입하여 사용</strong>해 주세요!
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsTryoutGuideOpen(false)}
                      className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer text-center border-none"
                    >
                      닫기
                    </button>
                    <button
                      onClick={() => {
                        setIsTryoutGuideOpen(false);
                        localStorage.removeItem('onrivi_guest_mode');
                        localStorage.removeItem('onrivi_guest_start_time');
                        router.push("/signup");
                      }}
                      className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-150 shadow-md cursor-pointer text-center border-none"
                    >
                      정식 회원가입
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><span>🚀</span> Onrivi Author 즉시 체험판 안내</span>
                    {typeof window !== 'undefined' && (
                      window.location.hostname.includes('localhost') || 
                      window.location.hostname.includes('127.0.0.1') || 
                      window.location.port === '3100' ||
                      process.env.NODE_ENV === 'development'
                    ) && (
                      <button
                        onClick={() => {
                          localStorage.removeItem('onrivi_guest_expired');
                          localStorage.removeItem('onrivi_guest_start_time');
                          localStorage.setItem('onrivi_guest_try_count', '0');
                          setIsTryoutGuideOpen(false);
                          alert('체험 횟수 및 만료 정보가 초기화되었습니다.');
                        }}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline bg-transparent border-none cursor-pointer font-normal flex-shrink-0"
                        title="개발자 전용 체험 횟수 초기화"
                      >
                        테스트용 리셋
                      </button>
                    )}
                  </h3>
                  
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5">
                    회원가입 없이 브라우저 가상 공간을 통해 에디터의 명품 조판과 렌더링 성능을 즉석에서 검증할 수 있는 체험판 세션입니다.
                  </p>

                  <div className="space-y-3.5 mb-6 text-sm text-zinc-700 dark:text-zinc-300">
                    <div className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <span className="text-lg flex-shrink-0">⏱️</span>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-xs mb-0.5">회당 5분 제한</h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">진입 시 5분 타이머가 기동되며, 만료 시 편집 잠금(읽기전용) 상태로 전환됩니다.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <span className="text-lg flex-shrink-0">🔄</span>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-xs mb-0.5">최대 5회 재접속</h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">새로고침이나 재접속 시 5분이 충전되지만, 동일 브라우저당 최대 5회까지만 허용됩니다.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <span className="text-lg flex-shrink-0">💾</span>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-xs mb-0.5">작성 데이터 보존</h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">재접속 시 기존에 작성해 둔 파일 목록과 디렉토리, 탭 순서는 데이터 유실 없이 그대로 자동 복원됩니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsTryoutGuideOpen(false)}
                      className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer text-center border-none"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        setIsTryoutGuideOpen(false);
                        if (typeof window !== "undefined") {
                          localStorage.setItem("onrivi_guest_mode", "Y");
                          localStorage.setItem("onrivi_workspace_type", "browser");
                          localStorage.removeItem("onrivi_guest_expired");
                          localStorage.removeItem("onrivi_guest_start_time");
                          
                          // 🌟 카운트가 없는 경우에만 0으로 셋팅 (에디터 진입 시 1로 안전 증가)
                          if (!localStorage.getItem("onrivi_guest_try_count")) {
                            localStorage.setItem("onrivi_guest_try_count", "0");
                          }
                          
                          router.push("/editor");
                        }
                      }}
                      className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-150 shadow-md cursor-pointer text-center border-none"
                    >
                      확인하고 체험 시작
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </nav>
  );
}
