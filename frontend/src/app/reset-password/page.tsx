// ====================================================================
// 📊 [OMD-AUTH-reset-password-0001] page ➔ ResetPasswordPage
// 🎯 @KICK  : Supabase Auth 기반 새로운 비밀번호 변경 입력창 및 패스워드 재설정 화면
// 🛡️ @GUARD : 비밀번호 영문소문자/숫자/특수문자 조합 8~20자 유효성, 비밀번호 확인 일치성 검증 가드
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — LDSG v5.0 디자인 시스템 및 웜 페이퍼 크림(#F9F8F6) 팔레트 전면 적용: 구형 인디고 룩/Material Symbols 제거, LINE Green(#1d4ed8) 버튼, 실시간 유효성 체크 뱃지 및 Lucide React 아이콘 교체
//             **2026-09-28** — password_resets 기록은 DB 트랜잭션으로 처리하고, Supabase Auth 비밀번호 변경은 별도 외부 작업으로 처리
//             **2026-06-28** — 비밀번호 변경 성공 시 즉시 signOut() 호출하여 메일 복구 링크 일회성 파괴
//             **2026-06-23** — 공통 토스트 알람(showToast) 일괄 연동 개편 패치
// 🔗 @CALLS : /api/password/confirm, supabase.auth, Navbar, Footer, useRouter, useToast, Lucide Icons
// ====================================================================
"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";
import { Lock, Eye, EyeOff, Check, ArrowRight, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 세션 정보 (URL hash에서 복원)
  const [sessionAccessToken, setSessionAccessToken] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // 실시간 유효성 체크 상태
  const [hasMinLength, setHasMinLength] = useState(false);
  const [hasLowercase, setHasLowercase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecialChar, setHasSpecialChar] = useState(false);
  const [isPasswordMatched, setIsPasswordMatched] = useState(false);

  useEffect(() => {
    setHasMinLength(password.length >= 8 && password.length <= 20);
    setHasLowercase(/[a-z]/.test(password));
    setHasNumber(/\d/.test(password));
    setHasSpecialChar(/[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]/.test(password));
  }, [password]);

  useEffect(() => {
    setIsPasswordMatched(password === confirmPassword && confirmPassword.length > 0);
  }, [password, confirmPassword]);

  const isFormValid = hasMinLength && hasLowercase && hasNumber && hasSpecialChar && isPasswordMatched;

  // URL hash에서 Supabase Auth 세션 복원 및 access_token 추출
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ data, error }) => {
          if (error) {
            console.error("[RESET-PW] 세션 복원 실패:", error.message);
          } else if (data?.session) {
            setSessionAccessToken(data.session.access_token);
            setSessionEmail(data.session.user?.email || null);
          }
        });
        return;
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionAccessToken(session.access_token);
        setSessionEmail(session.user?.email || null);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      showToast("비밀번호 요건을 모두 충족하고 일치해야 합니다.", "warning");
      return;
    }

    setLoading(true);

    try {
      let accessToken = sessionAccessToken;
      let email = sessionEmail;

      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
        email = session?.user?.email || email;
      }

      if (!email) {
        const { data: { user } } = await supabase.auth.getUser();
        email = user?.email || null;
      }

      const res = await fetch("/api/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_email: email,
          p_new_password: password,
          p_access_token: accessToken,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "비밀번호 변경에 실패했습니다.");
      }

      await supabase.auth.signOut({ scope: "local" });

      showToast("비밀번호가 성공적으로 변경되었습니다! 새 비밀번호로 로그인해 주세요.", "success");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      console.error("비밀번호 재설정 실패:", err);
      showToast(err.message || "비밀번호 재설정 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
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

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-4 pt-32 pb-24 relative z-10">
        <div className="max-w-[440px] w-full bg-white dark:bg-[#181A1D] border border-[#E0DED7] dark:border-white/10 rounded-3xl p-7 sm:p-9 shadow-[0_24px_70px_-15px_rgba(40,35,25,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <section className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0EFEA] dark:bg-zinc-800 text-[11px] font-bold text-[#1A1A18] dark:text-zinc-200 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                NEW CREDENTIALS
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-white tracking-tight">
                새 비밀번호 설정
              </h1>
              <p className="text-xs sm:text-sm text-[#68716D] dark:text-zinc-400">
                새로 사용할 안전한 비밀번호를 입력해 주세요.
              </p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit} method="POST">
              {/* New Password Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-[#111413] dark:text-zinc-200 block" htmlFor="password">
                  새 비밀번호
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

                {/* Requirements Checklist */}
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

              {/* Confirm New Password Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-[#111413] dark:text-zinc-200 block" htmlFor="confirm-password">
                  새 비밀번호 확인
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-[#FAF8F5] dark:bg-zinc-800/60 border border-[#E0DED7] dark:border-zinc-700 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-[#111413] dark:text-white placeholder:text-zinc-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 transition-all outline-none"
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="새 비밀번호 다시 입력"
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
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(29, 78, 216,0.25)] hover:shadow-[0_6px_24px_rgba(29, 78, 216,0.35)] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? "변경 처리 중..." : "비밀번호 변경 완료"}</span>
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
                <ArrowLeft size={14} />
                <span>로그인 화면으로 이동</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
