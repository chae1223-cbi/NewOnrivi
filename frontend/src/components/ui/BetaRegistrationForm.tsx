// ====================================================================
// 📊 [OMD-UI-BetaRegistrationForm-0032] BetaRegistrationForm ➔ 동적 프로모션 사전 등록 폼
// 🎯 @KICK  : Supabase promotions 테이블에서 현재 활성(is_active=true) 프로모션을 동적으로 가져와
//             랜딩페이지에 노출. 활성 프로모션이 없으면 폼 자체를 렌더링하지 않음.
// 🛡️ @GUARD : 기간 만료된 프로모션 자동 숨김, 중복 이메일 방지
// 🚨 @PATCH : **2026-08-10** — 초기 생성
//             **2026-08-10** — 하드코딩 문구 제거, 동적 프로모션 렌더링으로 교체
// 🔗 @CALLS : /api/beta/register (POST), /api/beta/active-promotion (GET)
// ====================================================================
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface Promotion {
  code: string;
  title: string;
  description: string;
  end_date: string | null;
}

export function BetaRegistrationForm() {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loadingPromo, setLoadingPromo] = useState(true);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/beta/active-promotion")
      .then(r => r.json())
      .then(data => {
        if (data.promotion) setPromotion(data.promotion);
      })
      .catch(() => {})
      .finally(() => setLoadingPromo(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@") || !promotion) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/beta/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, promotion_code: promotion.code }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(data.message || "등록 중 오류가 발생했습니다.");
      }
    } catch {
      setStatus("error");
      setMessage("서버와 통신할 수 없습니다.");
    }
  };

  // 로딩 중이거나 활성 프로모션이 없으면 렌더링하지 않음
  if (loadingPromo || !promotion) return null;

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white border border-green-200 rounded-3xl max-w-lg mx-auto mb-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <CheckCircle2 size={44} className="text-green-500 mb-3" />
        <h3 className="text-xl font-bold text-green-900 mb-1">사전 등록 완료! 🎉</h3>
        <p className="text-sm text-green-700 text-center leading-relaxed">
          이메일 주소가 정상적으로 등록되었습니다.<br />
          프로모션 혜택 안내를 이메일로 보내드리겠습니다.
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center max-w-lg mx-auto mb-16 px-6 py-8 bg-gradient-to-b from-sky-50 to-white border border-sky-200 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden"
      >
        {/* 장식용 글로우 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-sky-400/10 blur-2xl rounded-full pointer-events-none" />

        <div className="mb-6 text-center relative z-10">
          <span className="inline-block px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-full mb-3 shadow-sm border border-sky-200">
            🎁 이벤트 진행 중
          </span>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {promotion.title}
          </h3>
          {promotion.description && (
            <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line">
              {promotion.description}
            </p>
          )}
          {promotion.end_date && (
            <p className="text-xs text-sky-500 font-semibold mt-2">
              🏁 {new Date(promotion.end_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 종료
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full relative flex items-center shadow-md hover:shadow-lg rounded-full bg-white border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent transition-all z-10"
        >
          <input
            type="email"
            required
            placeholder="이메일 주소를 입력해주세요"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === "loading"}
            className="w-full py-4 pl-6 pr-[120px] sm:pr-[140px] text-slate-700 outline-none bg-transparent placeholder-slate-400 text-sm sm:text-base font-medium"
          />
          <button
            type="submit"
            disabled={status === "loading" || !email}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-sky-500 hover:bg-sky-600 text-white px-4 sm:px-6 rounded-full text-sm font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {status === "loading" ? "등록 중..." : (
              <>사전 등록 <ArrowRight size={16} strokeWidth={2.5} /></>
            )}
          </button>
        </form>

        {status === "error" && (
          <p className="mt-4 text-sm text-red-500 font-semibold z-10">{message}</p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
