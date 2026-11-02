// ====================================================================
// 📊 [OMD-AUTH-forgot-password-0001] page ➔ ForgotPasswordPage
// 🎯 @KICK  : Supabase Auth 기반 비밀번호 재설정 보안 링크 메일 발송 기능 제공 비밀번호 찾기 화면
// 🛡️ @GUARD : 이메일 빈 값 및 오작동 가드, redirectUrl 분기 처리
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — LDSG v5.0 디자인 시스템 및 웜 페이퍼 크림(#F9F8F6) 팔레트 전면 적용: 구형 인디고 룩/Material Symbols 제거, LINE Green(#1d4ed8) 버튼 및 Lucide React 아이콘 교체
//             **2026-09-28** — DB 기록은 트랜잭션으로 처리하고, Supabase 메일 발송은 별도 외부 작업으로 처리
//             **2026-06-23** — 공통 토스트 알람(showToast) 일괄 연동 개편 패치
// 🔗 @CALLS : /api/password/request, Navbar, Footer, Link, useToast, Lucide Icons
// ====================================================================
"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast("가입하신 이메일 주소를 입력해 주세요.", "warning");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "http://localhost:3100/reset-password";

      const res = await fetch("/api/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_email: email.trim(),
          p_redirect_url: redirectUrl,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "요청 처리에 실패했습니다.");
      }

      setSuccess(true);
      showToast("비밀번호 재설정 이메일이 발송되었습니다. 메일함을 확인해 주세요.", "success");
      setEmail("");
    } catch (err: any) {
      console.error("비밀번호 재설정 요청 실패:", err);
      showToast(err.message || "요청 처리에 실패했습니다. 이메일 주소를 다시 확인해 주세요.", "error");
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
                SECURITY RECOVERY
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111413] dark:text-white tracking-tight">
                비밀번호 찾기
              </h1>
              <p className="text-xs sm:text-sm text-[#68716D] dark:text-zinc-400 leading-relaxed">
                가입하신 이메일 주소를 입력하시면<br />비밀번호 재설정 보안 링크를 발송해 드립니다.
              </p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit} method="POST">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-[#111413] dark:text-zinc-200 block" htmlFor="email">
                  가입 이메일 주소
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

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                    success
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-[0_4px_20px_rgba(29, 78, 216,0.25)] hover:shadow-[0_6px_24px_rgba(29, 78, 216,0.35)] active:scale-[0.99]"
                  }`}
                >
                  {loading ? (
                    <span>요청 처리 중...</span>
                  ) : success ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>재설정 링크 발송 완료</span>
                    </>
                  ) : (
                    <>
                      <span>재설정 링크 발송</span>
                      <ArrowRight size={16} />
                    </>
                  )}
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
                <span>로그인 화면으로 돌아가기</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
