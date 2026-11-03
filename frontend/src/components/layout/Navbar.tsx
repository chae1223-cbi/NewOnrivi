// ========================================================================================
// 📊 [OMD-UI-Navbar-0020] Navbar ➔ Navbar
// ----------------------------------------------------------------------------------------
// 🎯 목적 (@KICK): 
//   웹 서비스 최상단에 고정되는 헤더 내비게이션 바로, 브랜드 로고, 주요 메뉴 링크,
//   로그인 상태에 따른 동적 버튼 전환(로그인/체험하기 ↔ 대시보드/에디터/로그아웃)을 총괄합니다.
// 
// 🛡️ 방어 원칙 (@GUARD): 
//   1. Supabase Auth의 세션 상태 변화를 실시간 감지하여 화면 불일치(Hydration Mismatch) 방지
//   2. 데스크톱 앱(Electron) 환경에서는 헤더를 자동 숨김(return null)하여 에디터 집중도 보장
//   3. 비밀번호 재설정(/reset-password) 화면 진입 시 임시 토큰으로 인한 로그인 오인 방지
// 
// 🚨 @PATCH : **2026-11-02** — [체험하기 및 내비게이션 동작 로깅 연동] 즉시 체험하기 클릭, 게스트 체험판 시작, 로그아웃 이벤트에 reportClientLog 및 브라우저 콘솔 로깅 추가
// 🚨 @PATCH : **2026-09-30** — [헤더 네비게이션 메뉴 명칭 및 순서 갱신]: 사용자 요청에 따라 메뉴 순서 정돈
// 🚨 @PATCH : **2026-09-30** — [로그아웃 방어 로직 강화]: 서버 세션 해제 실패 시에도 로컬 브라우저 로그아웃이 무조건 완료되도록 방어
// 🚨 @PATCH : **2026-09-17** — [로그아웃 시 환경설정 영구 보존]: clearAuthSessionStorage 연동으로 사용자 API 키 및 테마 설정 보존
// 🚨 @PATCH : **2026-08-27** — 비로그인 상태 헤더에 '즉시 체험하기' 버튼 추가 및 게스트 모드 연동
// 🔗 @CALLS : window.electronAPI, supabase.auth, clearAuthSessionStorage, logoutCurrentWebSession, reportClientLog
// ========================================================================================

"use client"; // 💡 Next.js 지시어: 브라우저 클라이언트 환경에서 실행되는 컴포넌트임을 선언

// ========================================================================================
// 📦 외부 라이브러리 및 내부 모듈 임포트
// ========================================================================================
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage'; // 계정별로 격리된 로컬스토리지 어댑터
import React, { useState, useEffect } from "react";                                   // 리액트 핵심 라이브러리 및 훅 (상태 관리, 화면 생명주기)
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";                              // 헤더 기본 링크 목록 및 사이트 이름 상수
import Link from "next/link";                                                         // 페이지를 깜빡임 없이 부드럽게 전환하는 Next.js 링크 컴포넌트
import { useRouter } from "next/navigation";                                          // 코드(함수) 안에서 페이지를 이동시킬 때 사용하는 라우터 훅
import { supabase } from "@/lib/supabaseClient";                                      // Supabase 인증 및 클라우드 DB 연동 클라이언트
import { clearAuthSessionStorage } from "@/lib/authSessionHelper";                   // 로그아웃 시 인증 토큰만 선별 삭제하는 세션 청소부 함수
import { logoutCurrentWebSession } from "@/lib/logoutWebSession";                     // 서버에 접속 중인 기기 세션 해제를 요청하는 함수
import { reportClientLog } from "@/lib/clientLogs";                                   // 중요 사용자 동작을 서버로 전송하는 원격 로깅 함수
import toast from 'react-hot-toast';                                                  // 화면 구석에 예쁜 알림 말풍선을 띄워주는 토스트 라이브러리

// ========================================================================================
// 📋 [타입 정의] NavbarContent
// ----------------------------------------------------------------------------------------
// 부모 컴포넌트나 다국어(i18n) 설정에서 헤더 텍스트 문구를 커스텀할 때 전달받는 규격
// ========================================================================================
export interface NavbarContent {
  navLinks: { label: string; href: string }[]; // 상단 메뉴 링크 배열 (예: 제품소개, 기능, 요금안내)
  dashboardLabel: string;                      // 대시보드 버튼 텍스트 (예: "대시보드")
  editorLabel: string;                         // 에디터 바로가기 버튼 텍스트 (예: "에디터")
  logoutLabel: string;                         // 로그아웃 버튼 텍스트 (예: "로그아웃")
  startLabel: string;                          // 비로그인 회원가입 버튼 텍스트 (예: "무료로 시작하기")
}

// ========================================================================================
// 🧭 Navbar 컴포넌트 본체
// ========================================================================================
export function Navbar({ content }: { content?: NavbarContent }) {
  // ── [1. 라우터 및 상태 관리 (State)] ──────────────────────────────────────────────────
  const router = useRouter();                                               // 페이지 이동을 제어하는 리액트 라우터 인스턴스
  const [mounted, setMounted] = useState(false);                            // 브라우저 화면에 완전히 마운트(로딩)되었는지 여부
  const [userEmail, setUserEmail] = useState<string | null>(null);          // 현재 로그인된 사용자의 이메일 주소 (미로그인 시 null)
  const [isLoggedIn, setIsLoggedIn] = useState(false);                      // 로그인 상태 여부 (true: 회원 UI / false: 게스트 UI)
  const [scrolled, setScrolled] = useState(false);                          // 페이지 스크롤 여부 (스크롤 시 헤더 배경을 반투명하게 전환)
  const [hasActivePromo, setHasActivePromo] = useState(false);              // 현재 진행 중인 할인/이벤트 프로모션이 있는지 여부
  const [isTryoutGuideOpen, setIsTryoutGuideOpen] = useState(false);        // '즉시 체험하기' 이용 안내 가이드 팝업창 열림 여부

  // ── [2. 즉시 체험하기 버튼 클릭 핸들러] ──────────────────────────────────────────────
  const handleInstantTry = () => {
    // 브라우저 개발자 도구에 로그 기록
    console.log('[Navbar] 즉시 체험하기 버튼 클릭 ➔ 안내 가이드 팝업 열림');
    // 서버 원격 로그로 사용자의 체험하기 시도 이벤트 전송
    reportClientLog('상단 헤더 즉시 체험하기 클릭 - 안내 가이드 팝업 오픈', 'INFO', 'USER_NOTICE');
    // 체험 안내 팝업 모달창 활성화
    setIsTryoutGuideOpen(true);
  };

  // ── [3. 컴포넌트 생명주기 및 이벤트 감시 (useEffect)] ───────────────────────────────────
  useEffect(() => {
    // 화면 마운트 완료 표시 (서버와 브라우저 간 HTML 불일치 에러 방어)
    setMounted(true);

    // 💡 [보안 예외 가드] 비밀번호 재설정 페이지(/reset-password)에서는 일회용 복구 토큰으로 접속하므로
    // 정식 로그인된 것처럼 헤더에 이메일이 노출되지 않도록 강제로 비로그인 상태 처리
    const isResetPasswordPage = typeof window !== "undefined" && window.location.pathname.includes("/reset-password");

    if (isResetPasswordPage) {
      setIsLoggedIn(false);
      setUserEmail(null);
    } else {
      // 일반 페이지인 경우 Supabase 서버에서 현재 세션 정보를 확인하여 상태 초기화
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUserEmail(session.user.email || null);
          setIsLoggedIn(true);
        }
      });
    }

    // ── [실시간 인증 상태 감시자 구독] ────────────────────────────────────────────────
    // 사용자가 다른 탭에서 로그인하거나 로그아웃하면 헤더 UI가 즉각 반응하여 자동으로 바뀜
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isResetPasswordPage) {
        setUserEmail(null);
        setIsLoggedIn(false);
      } else if (session?.user) {
        // 로그인 성공 시: 사용자 이메일 셋업 및 로그인 상태 true
        setUserEmail(session.user.email || null);
        setIsLoggedIn(true);
      } else {
        // 로그아웃 시: 이메일 비우고 로그인 상태 false
        setUserEmail(null);
        setIsLoggedIn(false);
      }
    });

    // ── [스크롤 감지 리스너] ──────────────────────────────────────────────────────────
    // 사용자가 스크롤을 12px 이상 내리면 scrolled 상태를 true로 변경하여 헤더에 그림자/블러 효과 적용
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);

    // ── [진행 중인 이벤트 배너 확인] ──────────────────────────────────────────────────
    fetch("/api/beta/active-promotion")
      .then(r => r.json())
      .then(data => { if (data.promotion) setHasActivePromo(true); })
      .catch(() => {}); // 통신 오류 시 조용히 무시 (화면 영향 없음)

    // ── [언마운트 시 청소(Clean-up)] ─────────────────────────────────────────────────
    // 컴포넌트가 사라질 때 메모리 누수를 방지하기 위해 구독 및 스크롤 리스너 해제
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // ── [4. 로그아웃 처리 핸들러] ────────────────────────────────────────────────────────
  const handleLogout = async () => {
    console.log('[Navbar] 사용자 로그아웃 처리 시작 (계정:', userEmail || '미인증', ')');
    reportClientLog(`사용자 로그아웃 요청 (${userEmail || '알수없음'})`, 'INFO', 'LOGIN');

    try {
      // 1단계: 서버에 접속 중으로 등록된 현재 탭의 기기 세션 해제 요청 (실패해도 로컬 로그아웃은 계속 진행)
      try {
        await logoutCurrentWebSession();
      } catch (sessionErr) {
        console.warn("[Navbar] 웹 세션 서버 해제 건너뜀:", sessionErr);
      }

      // 2단계: Supabase Auth 인증 토큰 로그아웃 수행 후, 사용자 환경설정(Gemini 키 등)은 남겨두고 토큰만 청소
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } finally {
        clearAuthSessionStorage(); // 로컬 저장소 세션 토큰 선별 파기
      }

      // 3단계: 리액트 상태 초기화
      setUserEmail(null);
      setIsLoggedIn(false);

      // 4단계: 메인 랜딩 페이지(/)로 화면 이동
      router.push("/");
    } catch (e) {
      // 오류 발생 시 콘솔 기록 및 사용자에게 토스트 알림 표시
      console.error("[Navbar] 로그아웃 에러:", e);
      toast.error(e instanceof Error ? e.message : '로그아웃 중 문제가 발생했습니다.');
    }
  };

  // ── [5. 데스크톱 앱(Electron) 예외 차단 가드] ─────────────────────────────────────────
  // 일렉트론 데스크톱 앱 창 내부에서는 전용 윈도우 타이틀바를 사용하므로,
  // 웹 전용 상단 헤더가 레이아웃을 방해하지 않도록 아예 렌더링을 건너뜁니다 (return null).
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
                          
                          console.log('[Navbar] 게스트 체험판 이용 승인 ➔ /editor 이동');
                          reportClientLog('게스트 체험판 시작 승인 - /editor 이동', 'INFO', 'USER_NOTICE');
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
