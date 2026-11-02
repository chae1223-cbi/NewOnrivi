// ====================================================================
// 📊 [OMD-AUTH-login-page-0001] page ➔ LoginPage
// 🎯 @KICK  : Supabase Auth 기반 이메일/구글 소셜 로그인 및 마스킹 해제 기능 지원 로그인 화면
// 🛡️ @GUARD : 이메일/비밀번호 빈 값 방지, Supabase 연동 검증 및 상용 계정 사전 검증
// 🚨 @PATCH : 2026-11-02 — [DB 접근 표준화 & Rule 9 준수] subscriptions 브라우저 직접 조회 및 임의 폴백 제거, /api/subscription/get 단일화
// 🚨 @PATCH : **2026-09-16** — [로그인 시 세션 등록 기기 한도 초과 안내 콘솔 warn 전환]: 로그인 시 기기 한도 초과(EXCEED_MAX_DEVICES) 응답을 console.error 대신 console.warn으로 처리하여 정상 비즈니스 분기 시 콘솔 에러 오염 방지
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — LDSG v5.0 디자인 시스템 및 웜 페이퍼 크림(#F9F8F6) 팔레트 전면 적용: 구형 인디고 룩/Material Symbols 제거, LINE Green(#1d4ed8) 버튼 및 Lucide React 아이콘 교체
//             **2026-07-22** — 로그인 시 users 존재 확인 API(/api/user/check) 1차 연동 및 subscriptions 이중 유효성 검증 폴백 구조 적용 패치
//             **2026-06-23** — 공통 토스트 알람(showToast) 일괄 연동 개편 패치
// 🔗 @CALLS : supabase.auth, Navbar, Footer, useRouter, useToast, Lucide Icons
// ====================================================================
"use client";

import { reportClientLog } from '@/lib/clientLogs';    // 알림 정보 생성
import React, { useState, useEffect } from "react";    // 리엑트 라이브러리 , 리엑터의 기억상자(보관), 리엑터의 감시자(행동)
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, HelpCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) setEmail(emailParam);
    }
  }, []);

  // 로그인 폼 제출 처리
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast("이메일과 비밀번호를 모두 입력해 주세요.", "warning");
      return;
    }

    reportClientLog('이메일 로그인 시작', 'INFO', 'LOGIN');
    setLoading(true);

    try {
      // 0. users 상용 계정 사전 차단 검증
      const preUserRes = await fetch("/api/user/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_email: email.trim() }),
      });
      const preUser = preUserRes.ok ? await preUserRes.json() : null;

      if (!preUser?.exists || preUser.is_deleted) {
        showToast("회원가입 후 로그인하십시오.", "warning");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw new Error(error.message);
      }

      reportClientLog('이메일 인증 성공', 'INFO', 'LOGIN');
      // ==================================================================
      // 로그인 성공 시 라이선스 상태 확인 후 분기 및 로컬 스토리지/세션 동기화
      // ==================================================================
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        const userCheckRes = await fetch("/api/user/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ p_email: loggedInUser.email }),
        });
        const userCheck = userCheckRes.ok ? await userCheckRes.json() : null;

        if (!userCheck?.exists) {
          showToast("회원가입이 필요한 계정입니다. 먼저 회원가입을 진행해주세요.", "warning");
          await supabase.auth.signOut({ scope: "local" });
          setLoading(false);
          return;
        }

        // 1. users 동기화 및 14일 무료 체험(APPRENTICE) 자동 발급 보장
        const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
        if (sessionToken) {
          try {
            await fetch("/api/user/upsert", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
              body: JSON.stringify({
                p_id: loggedInUser.id,
                p_email: loggedInUser.email,
                p_provider: "EMAIL",
                p_nick_name: loggedInUser.user_metadata?.nick_name || loggedInUser.user_metadata?.name || null,
              }),
            });
          } catch (upsertErr) {
            console.warn("[LOGIN] /api/user/upsert sync warning:", upsertErr);
          }
        }

        // 2. 활성 구독 및 라이선스 정보 조회 (RLS 우회를 위해 /api/subscription/get 우선 호출)
        let subData: any = null;
        try {
          const subRes = await fetch("/api/subscription/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: loggedInUser.id })
          });
          if (subRes.ok) {
            const subJson = await subRes.json();
            if (subJson?.success && subJson.subscription) {
              subData = subJson.subscription;
            }
          }
        } catch (e) {
          console.warn("[LOGIN] /api/subscription/get error:", e);
        }

        // /api/subscription/get 응답만 신뢰 (규칙 9: 임의 fallback 배제)

        const targetDate = subData?.current_period_end;
        const isValid = targetDate ? Date.now() < new Date(targetDate).getTime() : false;

        if (isValid && subData) {
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

          try {
            const activationToken = (await supabase.auth.getSession()).data.session?.access_token;
            const actRes = await fetch("/api/license/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(activationToken ? { Authorization: `Bearer ${activationToken}` } : {}) },
              body: JSON.stringify({ p_license_id: subData.id, p_device_uuid: sessionId, p_device_name: "Web SaaS", p_user_id: loggedInUser.id }),
            });
            const actResult = await actRes.json();
            if (!actResult.success) console.warn("[ACTIVATION] API note:", actResult.message);
          } catch (actError) {
            console.warn("[ACTIVATION] Fetch note:", actError);
          }
          router.push(`/editor${window.location.search}`);
        } else {
          router.push(`/dashboard${window.location.search}`);
        }
      } else {
        router.push(`/dashboard${window.location.search}`);
      }
    } catch (err: any) {
      reportClientLog(err.message || '이메일 로그인 실패', 'ERROR', 'LOGIN');
      console.error("로그인 에러:", err);
      showToast(err.message || "로그인에 실패했습니다. 정보를 다시 확인해 주세요.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 구글 로그인 처리
  const handleGoogleLogin = async () => {
    try {
      reportClientLog('구글 로그인 요청', 'INFO', 'LOGIN');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?mode=login`
            : "http://localhost:3100/auth/callback?mode=login",
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (err: any) {
      reportClientLog(err.message || '구글 로그인 요청 실패', 'ERROR', 'LOGIN');
      console.error("구글 로그인 에러:", err);
      showToast(err.message || "구글 로그인 요청 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-[#F9F8F6] dark:bg-[#121314] text-[#1A1A18] dark:text-[#E8ECE9] font-sans selection:bg-[#1d4ed8]/20 selection:text-[#1d4ed8] relative overflow-hidden"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* Subtle Ambient Background Glow (LINE Green) */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(29, 78, 216,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />

      <Navbar />

      {/* Main Login Frame */}
      <main className="flex-grow flex items-center justify-center px-4 pt-32 pb-24 relative z-10">
        <div className="max-w-[440px] w-full bg-white dark:bg-[#181A1D] border border-[#E0DED7] dark:border-white/10 rounded-3xl p-7 sm:p-9 shadow-[0_24px_70px_-15px_rgba(40,35,25,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <section className="space-y-6">
            {/* Header */}
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

            {/* Google Login Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white dark:bg-zinc-800/80 border border-[#E0DED7] dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-[#111413] dark:text-zinc-100 text-sm font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
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

            {/* Divider */}
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

            {/* Email / Password Form */}
            <form className="space-y-4" onSubmit={handleLoginSubmit} method="POST">
              {/* Email Input */}
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

              {/* Password Input */}
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
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

            {/* Secondary Link to Signup */}
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

      <Footer />
    </div>
  );
}
