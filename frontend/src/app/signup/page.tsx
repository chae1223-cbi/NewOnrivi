// ====================================================================
// 📊 [OMD-AUTH-signup-page-0001] page ➔ SignupPage
// 🎯 @KICK  : Supabase Auth 기반 이메일/구글 소셜 가입 및 14일 무료 1대 라이선스 자동 발급 병합 회원가입 화면
// 🛡️ @GUARD : 비밀번호 영문소문자/숫자/특수문자 조합 8~20자 유효성, 비밀번호 확인 일치성 검증 및 소셜 가입 유입 가드
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — LDSG v5.0 디자인 시스템 및 웜 페이퍼 크림(#F9F8F6) 팔레트 전면 적용: 구형 인디고 룩/Material Symbols 제거, LINE Green(#1d4ed8) 버튼, 실시간 유효성 체크 뱃지 및 Lucide React 아이콘 교체
//             **2026-07-22** — users 상용 이관 테이블 동기화 및 provider(EMAIL, GOOGLE) 대문자 코드 동기화 보강 패치
//             **2026-06-23** — 공통 토스트 알람(showToast) 일괄 연동 및 약관 동의 밸리데이션 가드 강화 패치
// 🔗 @CALLS : supabase.auth, supabase.rpc, useToast, Navbar, Footer, useRouter, Lucide Icons
// ====================================================================
"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import { User, Mail, Lock, Eye, EyeOff, Check, ArrowRight, LogIn } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 실시간 유효성 체크 상태
  const [hasMinLength, setHasMinLength] = useState(false);
  const [hasLowercase, setHasLowercase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecialChar, setHasSpecialChar] = useState(false);
  const [isPasswordMatched, setIsPasswordMatched] = useState(false);

  // 이용약관 및 개인정보 동의 상태
  const [agreedTerms, setAgreedTerms] = useState(false);

  useEffect(() => {
    setHasMinLength(password.length >= 8 && password.length <= 20);
    setHasLowercase(/[a-z]/.test(password));
    setHasNumber(/\d/.test(password));
    setHasSpecialChar(/[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]/.test(password));
  }, [password]);

  useEffect(() => {
    setIsPasswordMatched(password === confirmPassword && confirmPassword.length > 0);
  }, [password, confirmPassword]);

  const isFormValid =
    hasMinLength &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar &&
    isPasswordMatched &&
    email.trim().length > 0 &&
    name.trim().length > 0 &&
    agreedTerms;

  // 이메일 회원가입 제출 처리
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedTerms) {
      showToast("이용약관 및 개인정보처리방침에 동의해 주세요.", "warning");
      return;
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast("모든 필수 입력값을 작성해 주세요.", "warning");
      return;
    }

    if (!hasMinLength || !hasLowercase || !hasNumber || !hasSpecialChar) {
      showToast("비밀번호는 영문 소문자, 숫자, 특수문자를 포함해 8~20자여야 합니다.", "warning");
      return;
    }

    if (!isPasswordMatched) {
      showToast("비밀번호가 일치하지 않습니다.", "warning");
      return;
    }

    setLoading(true);

    try {
      // 1. Supabase Auth 가입
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            nick_name: name.trim(),
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const userId = data.user?.id;
      if (!userId) {
        throw new Error("가입 처리 중 사용자 ID를 발급받지 못했습니다.");
      }

      // 2. 세션 확보 및 users/구독 동기화
      const { data: { session } } = await supabase.auth.getSession();
      let activeSession = session || data.session;
      if (!activeSession) {
        try {
          const { data: signData } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });
          activeSession = signData?.session || null;
        } catch (signErr) {
          console.warn("[SIGNUP] auto signInWithPassword note:", signErr);
        }
      }

      if (activeSession) {
        const regRes = await fetch("/api/user/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.access_token}` },
          body: JSON.stringify({
            p_id: userId,
            p_email: email.trim(),
            p_provider: "EMAIL",
            p_nick_name: name.trim(),
          }),
        });

        if (!regRes.ok) throw new Error(`[API 호출 실패] 서버 상태: ${regRes.status}`);
        const regResult = await regRes.json();
        if (!regResult.success) throw new Error(regResult.message);

        // 3. 14일 무료 체험(APPRENTICE) 구독 확인 및 세션 즉시 활성화
        let subData: any = null;
        try {
          const subRes = await fetch("/api/subscription/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
          });
          if (subRes.ok) {
            const subJson = await subRes.json();
            if (subJson?.success && subJson.subscription) {
              subData = subJson.subscription;
            }
          }
        } catch (subErr) {
          console.warn("[SIGNUP] /api/subscription/get error:", subErr);
        }

        if (subData) {
          let sessionId = sessionStorage.getItem("onrivi_tab_session_id");
          if (!sessionId) {
            sessionId = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
              ? crypto.randomUUID()
              : "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 15);
          }
          sessionStorage.setItem("onrivi_tab_session_id", sessionId);
          localStorage.setItem("onrivi_session_id", sessionId);
          localStorage.setItem("onrivi_user_id", email.trim() || userId);
          localStorage.setItem("onrivi_payment_no", subData.payment_no || "");
          localStorage.setItem("onrivi_license_key", subData.license_key || "");

          try {
            await fetch("/api/license/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeSession.access_token}` },
              body: JSON.stringify({ p_license_id: subData.id, p_device_uuid: sessionId, p_device_name: "Web SaaS", p_user_id: userId }),
            });
          } catch (actErr) {
            console.warn("[SIGNUP] activate error:", actErr);
          }

          showToast("회원가입 완료! 14일 무료 체험(Apprentice)이 시작되었습니다.", "success");
          setTimeout(() => {
            router.push(`/editor${window.location.search}`);
          }, 1000);
          return;
        }
      }

      showToast("회원가입이 완료되었습니다! 로그인 후 14일 무료 체험을 시작해 주세요.", "success");

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAgreedTerms(false);

      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const ticketUrl = params.get("ticket");
        if (ticketUrl) {
          router.push(`/login?ticket=${ticketUrl}`);
        } else {
          router.push("/login");
        }
      }, 1500);
    } catch (err: any) {
      console.error("회원가입 에러:", err);
      showToast(err.message || "가입에 실패했습니다. 형식 오류를 확인해 주세요.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!agreedTerms) {
      showToast("이용약관 및 개인정보처리방침 동의는 필수입니다.", "warning");
      return;
    }
    if (name.trim()) {
      if (typeof window !== "undefined") {
        localStorage.setItem("onrivi_signup_nick_name", name.trim());
      }
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?mode=signup`
            : "http://localhost:3100/auth/callback?mode=signup",
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.error("구글 소셜 가입 에러:", err);
      showToast(err.message || "구글 회원가입 요청 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-[#F9F8F6] dark:bg-[#121314] text-[#1A1A18] dark:text-[#E8ECE9] font-sans selection:bg-[#1d4ed8]/20 selection:text-[#1d4ed8] relative overflow-hidden"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* Subtle Ambient Background Glow */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(29, 78, 216,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />

      <Navbar />

      {/* Main Signup Frame */}
      <main className="flex-grow flex items-center justify-center px-4 pt-32 pb-24 relative z-10">
        <div className="max-w-[460px] w-full bg-white dark:bg-[#181A1D] border border-[#E0DED7] dark:border-white/10 rounded-3xl p-7 sm:p-9 shadow-[0_24px_70px_-15px_rgba(40,35,25,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <section className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0EFEA] dark:bg-zinc-800 text-[11px] font-bold text-[#1A1A18] dark:text-zinc-200 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                14 DAYS FREE TRIAL
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-white tracking-tight">
                회원가입
              </h1>
              <p className="text-xs sm:text-sm text-[#68716D] dark:text-zinc-400">
                신규 가입 즉시 14일간 모든 편집 기능을 무료로 체험하실 수 있습니다.
              </p>
            </div>

            {/* 1. Terms Agreement Box (Top) */}
            <div className="bg-[#FAF8F5] dark:bg-zinc-800/40 border border-[#E0DED7] dark:border-zinc-700 p-3.5 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-left">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#1d4ed8] focus:ring-[#1d4ed8] accent-[#1d4ed8]"
                  id="agree-checkbox"
                />
                <span className="text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                  <Link href="/terms" target="_blank" className="text-[#1d4ed8] font-bold hover:underline">
                    이용약관
                  </Link>{" "}
                  및{" "}
                  <Link href="/privacy" target="_blank" className="text-[#1d4ed8] font-bold hover:underline">
                    개인정보처리방침
                  </Link>
                  의 내용을 충분히 이해하였으며 이에 동의합니다.{" "}
                  <span className="text-red-500 font-bold">(필수)</span>
                </span>
              </label>
            </div>

            {/* 2. Nickname Input */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-[#111413] dark:text-zinc-200 block" htmlFor="name">
                활동명 (별명)
              </label>
              <div className="relative">
                <input
                  className="w-full bg-[#FAF8F5] dark:bg-zinc-800/60 border border-[#E0DED7] dark:border-zinc-700 rounded-xl px-4 py-3 pl-10 text-sm text-[#111413] dark:text-white placeholder:text-zinc-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 transition-all outline-none"
                  id="name"
                  name="name"
                  type="text"
                  placeholder="예: 김어서, 마크다운마스터"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                  <User size={16} />
                </div>
              </div>
            </div>

            {/* 3. Google Signup Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignup}
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
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google 계정으로 빠른 가입</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E6E1] dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#181A1D] px-3 text-[#68716D] dark:text-zinc-400 font-medium">
                  또는 이메일로 가입
                </span>
              </div>
            </div>

            {/* Email Registration Form */}
            <form className="space-y-4" onSubmit={handleRegisterSubmit} noValidate method="POST">
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
                <label className="text-xs font-bold text-[#111413] dark:text-zinc-200 block" htmlFor="password">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-[#FAF8F5] dark:bg-zinc-800/60 border border-[#E0DED7] dark:border-zinc-700 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-[#111413] dark:text-white placeholder:text-zinc-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 transition-all outline-none"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="8~20자 영문소문자, 숫자, 특수문자 조합"
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

                {/* Real-time Password Requirements Checklist */}
                {password.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 pt-2 text-[11px]">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${hasMinLength ? "bg-[#1d4ed8]/10 text-[#1d4ed8] font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                      <Check size={12} strokeWidth={hasMinLength ? 3 : 2} />
                      <span>8~20자 길이</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${hasLowercase ? "bg-[#1d4ed8]/10 text-[#1d4ed8] font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                      <Check size={12} strokeWidth={hasLowercase ? 3 : 2} />
                      <span>영문 소문자</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${hasNumber ? "bg-[#1d4ed8]/10 text-[#1d4ed8] font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                      <Check size={12} strokeWidth={hasNumber ? 3 : 2} />
                      <span>숫자 포함</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${hasSpecialChar ? "bg-[#1d4ed8]/10 text-[#1d4ed8] font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                      <Check size={12} strokeWidth={hasSpecialChar ? 3 : 2} />
                      <span>특수문자 포함</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-[#111413] dark:text-zinc-200 block" htmlFor="confirm-password">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-[#FAF8F5] dark:bg-zinc-800/60 border border-[#E0DED7] dark:border-zinc-700 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-[#111413] dark:text-white placeholder:text-zinc-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 transition-all outline-none"
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock size={16} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] font-semibold pt-1 ${isPasswordMatched ? "text-[#1d4ed8]" : "text-red-500"}`}>
                    {isPasswordMatched ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(29, 78, 216,0.25)] hover:shadow-[0_6px_24px_rgba(29, 78, 216,0.35)] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? "가입 처리 중..." : "14일 무료 체험 시작하기"}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>

            {/* Back to Login Link */}
            <div className="pt-3 border-t border-[#E8E6E1] dark:border-white/10 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-[#68716D] dark:text-zinc-400 hover:text-[#1d4ed8] transition-colors font-medium"
              >
                <LogIn size={14} />
                <span>이미 계정이 있으신가요? <strong>로그인</strong></span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
