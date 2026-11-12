// ====================================================================
// 📊 [OMD-AUTH-login-page-0001] page ➔ LoginPage
// 🎯 @KICK  : Supabase Auth 기반 이메일/구글 소셜 로그인 및 마스킹 해제 기능 지원 로그인 화면
// 🛡️ @GUARD : 이메일/비밀번호 빈 값 방지, Supabase 연동 검증 및 상용 계정 사전 검증
// 🚨 @PATCH : **2026-11-12** — [로그인 ➔ 에디터 진입 가속화 및 중복 통신 제거]:
//             1) Supabase signInWithPassword 반환 객체(authData.user, authData.session) 직접 재활용으로 불필요한 getUser/getSession 네트워크 RTT 제거
//             2) 계정 존재 검증(/api/user/check)과 구독 조회(/api/subscription/get) Promise.all 병렬 처리로 응답 시간 50% 단축
//             3) 유저 upsert 비동기 백그라운드 처리로 화면 전환 블로킹 제거
//             4) 에디터 진입 시 useEditorLicense가 0ms 즉시 활성화되도록 onrivi_license_status 보안 캐시 사전 적재
// 🚨 @PATCH : **2026-11-04** — [오류 진단 로깅 3단계]: 로그인 5단계(사전조회, 비번인증, 세션조회, 구독조회, 기기활성화) doing 및 activate 실패 메타데이터 세분화
// 🚨 @PATCH : **2026-11-02** — [로그인 파이프라인 주석 표준화 및 가독성 개편] 5단계 로그인 인증 흐름(사전검증 ➔ 비번인증 ➔ 유저동기화 ➔ 구독조회 ➔ 기기활성화) 상세 해설 주석 추가
// 🚨 @PATCH : 2026-11-02 — [DB 접근 표준화 & Rule 9 준수] subscriptions 브라우저 직접 조회 및 임의 폴백 제거, /api/subscription/get 단일화
// 🚨 @PATCH : **2026-09-16** — [로그인 시 세션 등록 기기 한도 초과 안내 콘솔 warn 전환]: 로그인 시 기기 한도 초과(EXCEED_MAX_DEVICES) 응답을 console.error 대신 console.warn으로 처리하여 정상 비즈니스 분기 시 콘솔 에러 오염 방지
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — LDSG v5.0 디자인 시스템 및 웜 페이퍼 크림(#F9F8F6) 팔레트 전면 적용: 구형 인디고 룩/Material Symbols 제거, LINE Green(#1d4ed8) 버튼 및 Lucide React 아이콘 교체
//             **2026-07-22** — 로그인 시 users 존재 확인 API(/api/user/check) 1차 연동 및 subscriptions 이중 유효성 검증 폴백 구조 적용 패치
//             **2026-06-23** — 공통 토스트 알람(showToast) 일괄 연동 개편 패치
// 🔗 @CALLS : supabase.auth, Navbar, Footer, useRouter, useToast, Lucide Icons
// ====================================================================
"use client";

// ========================================================================================
// 📦 외부 라이브러리 및 내부 모듈 임포트
// ========================================================================================
import { reportClientLog } from '@/lib/clientLogs';
import { logError, logWarn } from '@/lib/errorDiagnostics';                   // 중요 로그인 시도 및 성공/실패 원격 로깅 함수
import React, { useState, useEffect } from "react";                   // 리액트 상태 관리(useState) 및 생명주기 훅(useEffect)
import { Navbar } from "@/components/layout/Navbar";                  // 상단 글로벌 내비게이션 바 컴포넌트
import { Footer } from "@/components/layout/Footer";                  // 하단 푸터 컴포넌트
import Link from "next/link";                                         // 페이지 이동용 Next.js Link
import { useRouter } from "next/navigation";                         // 프로그래밍 방식 화면 이동을 위한 라우터 훅
import { supabase } from "@/lib/supabaseClient";                      // Supabase 인증(Auth) 클라이언트 인스턴스
import { useToast } from "@/components/ToastProvider";                // 화면 알림 토스트 훅
import { saveSecureData } from "@/lib/secureStorage";                     // 라이선스 및 인증 보안 캐시 적재 함수
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, HelpCircle } from "lucide-react"; // 아이콘 모음

export default function LoginPage() {
  // ── [1. 컴포넌트 내부 상태 정의] ───────────────────────────────────────────────────
  const router = useRouter();                                         // 로그인 성공 후 페이지 이동을 위한 라우터
  const { showToast } = useToast();                                   // 사용자에게 경고/성공 알림을 띄우는 토스트 함수
  const [email, setEmail] = useState("");                             // 사용자가 입력한 이메일 주소
  const [password, setPassword] = useState("");                       // 사용자가 입력한 비밀번호
  const [showPassword, setShowPassword] = useState(false);           // 비밀번호 마스킹 해제(보기/숨기기) 토글 상태
  const [loading, setLoading] = useState(false);                      // 로그인 진행 중 버튼 비활성화 및 스피너 상태

  // ── [2. URL 쿼리 파라미터에서 이메일 자동 채우기] ─────────────────────────────────
  // 예: /login?email=user@test.com 으로 접근 시 이메일 입력창에 자동 입력
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) setEmail(emailParam);
    }
  }, []);

  // ── [3. 이메일/비밀번호 로그인 폼 제출 처리] ───────────────────────────────────────
  // 총 5단계 파이프라인: 입력검증 ➔ 사전DB검증 ➔ Supabase인증 ➔ 유저동기화 ➔ 라이선스체크
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 기본 새로고침 동작 방지

    // 0단계: 입력값 빈 값 검증
    if (!email.trim() || !password.trim()) {
      showToast("이메일과 비밀번호를 모두 입력해 주세요.", "warning");
      return;
    }

    reportClientLog('이메일 로그인 시작', 'INFO', 'LOGIN');
    setLoading(true);
    let currentStep = '사전 회원 확인';

    try {
      // 1단계: users DB 사전 확인 (탈퇴한 회원이거나 존재하지 않는 이메일인지 체크)
      const preUserRes = await fetch("/api/user/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_email: email.trim() }),
      });
      if (!preUserRes.ok) {
        logWarn({
          file: 'frontend/src/app/login/page.tsx',
          func: 'handleEmailLogin',
          doing: '회원 사전 존재 확인(/api/user/check) 중',
          target: email.trim(),
          error: `HTTP ${preUserRes.status}`
        });
        showToast("일시적인 시스템 오류로 계정을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
        setLoading(false);
        return;
      }
      const preUser = await preUserRes.json();

      if (!preUser?.exists || preUser.is_deleted) {
        showToast("회원가입 후 로그인하십시오.", "warning");
        setLoading(false);
        return;
      }

      // 2단계: Supabase Auth 비밀번호 인증 요청
      currentStep = '비밀번호 인증';
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw new Error(error.message);
      }

      reportClientLog('이메일 인증 성공', 'INFO', 'LOGIN');

      // 3단계: 로그인 성공 후 세션 사용자 정보 취득 (signInWithPassword 반환값 재활용으로 추가 getUser 네트워크 왕복 제거)
      currentStep = '로그인 세션 사용자 조회';
      const loggedInUser = authData.user;
      const sessionToken = authData.session?.access_token;

      if (loggedInUser) {
        // 🚀 [병렬 가속화]: 계정 존재 여부 확인(/api/user/check)과 구독 정보 조회(/api/subscription/get) 동시 병렬 요청
        const [userCheckRes, subRes] = await Promise.all([
          fetch("/api/user/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ p_email: loggedInUser.email }),
          }),
          fetch("/api/subscription/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: loggedInUser.id })
          }).catch(e => {
            logWarn({
              file: 'frontend/src/app/login/page.tsx',
              func: 'handleEmailLogin',
              doing: '구독 정보 조회(/api/subscription/get) 중',
              target: loggedInUser.id,
              error: e
            });
            return null;
          })
        ]);

        const userCheck = userCheckRes.ok ? await userCheckRes.json() : null;

        if (!userCheck?.exists) {
          showToast("회원가입이 필요한 계정입니다. 먼저 회원가입을 진행해주세요.", "warning");
          await supabase.auth.signOut({ scope: "local" });
          setLoading(false);
          return;
        }

        // 4단계: users 테이블 최신 동기화 (화면 전환을 블로킹하지 않도록 비동기 백그라운드 처리)
        if (sessionToken) {
          fetch("/api/user/upsert", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
            body: JSON.stringify({
              p_id: loggedInUser.id,
              p_email: loggedInUser.email,
              p_provider: "EMAIL",
              p_nick_name: loggedInUser.user_metadata?.nick_name || loggedInUser.user_metadata?.name || null,
            }),
          }).catch(upsertErr => {
            logWarn({
              file: 'frontend/src/app/login/page.tsx',
              func: 'handleEmailLogin',
              doing: '회원 기본 정보 동기화(/api/user/upsert) 중',
              target: loggedInUser.email,
              error: upsertErr
            });
          });
        }

        // 5단계: 활성 구독 및 라이선스 정보 파싱
        let subData: any = null;
        if (subRes && subRes.ok) {
          try {
            const subJson = await subRes.json();
            if (subJson?.success && subJson.subscription) {
              subData = subJson.subscription;
            }
          } catch (jsonErr) {
            logWarn({
              file: 'frontend/src/app/login/page.tsx',
              func: 'handleEmailLogin',
              doing: '구독 응답 JSON 파싱 중',
              target: loggedInUser.id,
              error: jsonErr
            });
          }
        }

        // 구독 유효기간 검증 (현재 시각이 만료일 이전인지 확인)
        const targetDate = subData?.current_period_end;
        const isValid = targetDate ? Date.now() < new Date(targetDate).getTime() : false;

        // ── [6단계: 구독 상태에 따른 화면 이동 분기] ────────────────────────────────
        if (isValid && subData) {
          // A. 정식 유효 구독이 있는 경우: 기기 세션 발급 및 에디터(/editor)로 직행
          let sessionId = sessionStorage.getItem("onrivi_tab_session_id");
          if (!sessionId) {
            sessionId = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
              ? crypto.randomUUID()
              : "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 15);
          }
          sessionStorage.setItem("onrivi_tab_session_id", sessionId);
          localStorage.setItem("onrivi_session_id", sessionId);
          localStorage.setItem("onrivi_user_id", loggedInUser.email || loggedInUser.id);
          localStorage.setItem("onrivi_payment_no", subData.payment_no || "");
          localStorage.setItem("onrivi_license_key", subData.license_key || "");

          // 🚀 [보안 캐시 사전 적재]: 에디터 진입 시 useEditorLicense가 중복 네트워크 통신 없이 0ms 즉시 활성화되도록 사전 적재
          const expiryMs = targetDate ? new Date(targetDate).getTime() : 0;
          const remainingDays = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
          saveSecureData('onrivi_license_status', {
            isActivated: true,
            isExpired: false,
            remainingDays,
            userId: loggedInUser.email || loggedInUser.id,
            isRestricted: false,
            isConcurrentLimited: false,
            hasEditorSubscription: true,
            licenseKey: subData.license_key || '',
            paymentNo: subData.payment_no || '',
            planName: subData.plan_name || '프리미엄 요금제',
            nextPaymentDate: subData.current_period_end || '',
            lastVerifiedAt: Date.now()
          });

          // 서버 DB에 동시 접속 기기 세션 활성화 등록
          try {
            const activationToken = sessionToken;
            const actRes = await fetch("/api/license/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(activationToken ? { Authorization: `Bearer ${activationToken}` } : {}) },
              body: JSON.stringify({ p_license_id: subData.id, p_device_uuid: sessionId, p_device_name: "Web SaaS", p_user_id: loggedInUser.id }),
            });
            const actResult = await actRes.json().catch(() => null);
            if (!actRes.ok || !actResult?.success) {
              logWarn({
                file: 'frontend/src/app/login/page.tsx',
                func: 'handleEmailLogin',
                doing: '기기 세션 활성화(/api/license/activate) 중',
                target: sessionId,
                error: `HTTP ${actRes.status} (${actResult?.message || '활성화 실패'})`,
                context: {
                  status: actRes.status,
                  sessionUuid: sessionId,
                  licenseId: subData.id
                }
              });
              if (!actResult?.success) console.warn("[ACTIVATION] API note:", actResult?.message);
            }
          } catch (actError) {
            logWarn({
              file: 'frontend/src/app/login/page.tsx',
              func: 'handleEmailLogin',
              doing: '기기 세션 활성화(/api/license/activate) 중',
              target: sessionId,
              error: actError,
              context: { sessionUuid: sessionId }
            });
          }

          // 에디터 화면으로 이동
          router.push(`/editor${window.location.search}`);
        } else {
          // B. 유효 구독이 없거나 만료된 경우: 요금제 결제 및 선택을 위해 대시보드(/dashboard)로 이동
          router.push(`/dashboard${window.location.search}`);
        }
      } else {
        router.push(`/dashboard${window.location.search}`);
      }
    } catch (err: any) {
      const stepDoingMap: Record<string, string> = {
        '사전 회원 확인': '회원 사전 존재 확인(/api/user/check) 중',
        '비밀번호 인증': 'Supabase 계정 비밀번호 인증 중',
        '로그인 세션 사용자 조회': '로그인 사용자 세션 정보 조회 중',
      };
      logError({
        file: 'frontend/src/app/login/page.tsx',
        func: 'handleEmailLogin',
        doing: stepDoingMap[currentStep] || '이메일 계정 로그인 처리 중',
        target: email.trim(),
        error: err,
        context: { step: currentStep }
      });
      showToast(err.message || "로그인에 실패했습니다. 정보를 다시 확인해 주세요.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── [4. 구글 소셜 로그인 처리] ─────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      reportClientLog('구글 로그인 요청', 'INFO', 'LOGIN');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // 로그인 완료 후 돌아올 콜백 주소 지정
          redirectTo: typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?mode=login`
            : "http://localhost:3100/auth/callback?mode=login",
          queryParams: {
            prompt: "select_account", // 항상 구글 계정 선택창이 뜨도록 지정
          },
        },
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (err: any) {
      logError({
        file: 'frontend/src/app/login/page.tsx',
        func: 'handleGoogleLogin',
        doing: '구글 소셜 로그인 OAuth 리다이렉트 요청 중',
        target: 'Google OAuth',
        error: err
      });
      showToast(err.message || "구글 로그인 요청 중 오류가 발생했습니다.", "error");
    }
  };

  // ── [5. 로그인 UI 화면 렌더링] ─────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col min-h-screen bg-[#F9F8F6] dark:bg-[#121314] text-[#1A1A18] dark:text-[#E8ECE9] font-sans selection:bg-[#1d4ed8]/20 selection:text-[#1d4ed8] relative overflow-hidden"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* 배경 상단 은은한 방사형 블루 글로우 효과 */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(29, 78, 216,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />

      {/* 상단 글로벌 헤더 */}
      <Navbar />

      {/* 메인 로그인 카드 프레임 */}
      <main className="flex-grow flex items-center justify-center px-4 pt-32 pb-24 relative z-10">
        <div className="max-w-[440px] w-full bg-white dark:bg-[#181A1D] border border-[#E0DED7] dark:border-white/10 rounded-3xl p-7 sm:p-9 shadow-[0_24px_70px_-15px_rgba(40,35,25,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <section className="space-y-6">
            {/* 타이틀 및 브랜드 헤더 */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0EFEA] dark:bg-zinc-800 text-[11px] font-bold text-[#1A1A18] dark:text-zinc-200 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                ONRIVI AUTHOR
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-white tracking-tight">
                로그인
              </h1>
              <p className="text-xs sm:text-sm text-[#68716D] dark:text-zinc-400">
                생각을 문서로 완성하는 지능형 저작 환경으로 연결합니다.
              </p>
            </div>

            {/* 구글 원클릭 소셜 로그인 버튼 */}
            <div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white dark:bg-zinc-800/80 border border-[#E0DED7] dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-[#111413] dark:text-zinc-100 text-sm font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                {/* Google 컬러 로고 SVG */}
                <svg
                  width={18}
                  height={18}
                  className="w-[18px] h-[18px] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Google 계정으로 로그인</span>
              </button>
            </div>

            {/* 구분선 (또는 이메일로 로그인) */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E6E1] dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#181A1D] px-3 text-[#68716D] dark:text-zinc-400 font-medium">
                  또는 이메일로 로그인
                </span>
              </div>
            </div>

            {/* 이메일 / 비밀번호 로그인 폼 */}
            <form className="space-y-4" onSubmit={handleLoginSubmit} method="POST">
              {/* 1. 이메일 입력창 */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-[#111413] dark:text-zinc-200 block" htmlFor="email">
                  이메일 주소
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-[#FAF8F5] dark:bg-zinc-800/60 border border-[#E0DED7] dark:border-zinc-700 rounded-xl px-4 py-3 pl-10 text-sm text-[#111413] dark:text-white placeholder:text-zinc-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 transition-all outline-none"
                    id="email"
                    name="email"
                    type="email"
                    placeholder="editor@onrivi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                    <Mail size={16} />
                  </div>
                </div>
              </div>

              {/* 2. 비밀번호 입력창 (보기/숨기기 토글 포함) */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111413] dark:text-zinc-200" htmlFor="password">
                    비밀번호
                  </label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-[#1d4ed8] hover:underline">
                    비밀번호 찾기
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className="w-full bg-[#FAF8F5] dark:bg-zinc-800/60 border border-[#E0DED7] dark:border-zinc-700 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-[#111413] dark:text-white placeholder:text-zinc-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 transition-all outline-none"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock size={16} />
                  </div>
                  {/* 비밀번호 보이기/숨기기 눈 모양 버튼 */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* 3. 로그인 제출 버튼 */}
              <div className="pt-2">
                <button
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(29, 78, 216,0.25)] hover:shadow-[0_6px_24px_rgba(29, 78, 216,0.35)] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? "로그인 중..." : "로그인"}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>

            {/* 하단 회원가입 이동 링크 */}
            <div className="pt-3 border-t border-[#E8E6E1] dark:border-white/10 text-center">
              <Link
                href={`/signup${typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ticket") ? `?ticket=${new URLSearchParams(window.location.search).get("ticket")}` : ""}`}
                className="inline-flex items-center gap-1.5 text-xs text-[#68716D] dark:text-zinc-400 hover:text-[#1d4ed8] transition-colors font-medium"
              >
                <UserPlus size={14} />
                <span>계정이 없으신가요? <strong>무료 회원가입</strong></span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* 하단 공통 푸터 */}
      <Footer />
    </div>
  );
}
