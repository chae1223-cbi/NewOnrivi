// ====================================================================
// 📊 [OMD-UI-BetaModal-0033] BetaModal ➔ 프로모션 사전 등록 모달
// 🎯 @KICK  : 랜딩페이지 진입 후 1.5초 뒤 활성 프로모션이 있을 때만 자동 팝업.
//             세션스토리지로 중복 팝업 방지. X 버튼 또는 배경 클릭으로 닫기.
// 🛡️ @GUARD : 활성 프로모션 없으면 렌더링 없음, 새로고침 시 중복 노출 방지
// 🚨 @PATCH : **2026-08-10** — 초기 생성: 랜딩페이지 인라인 폼 → 모달 전환
// 🔗 @CALLS : /api/beta/active-promotion (GET), /api/beta/register (POST)
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRight, Gift } from "lucide-react";

interface Promotion {
  code: string;
  title: string;
  description: string;
  end_date: string | null;
}

export function BetaModal() {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  useModalEscape(open, () => handleClose());

  useEffect(() => {
    // 오늘 이미 닫은 경우 다시 보여주지 않음 (하루 1번)
    const lastDismissed = localStorage.getItem("beta_modal_last_dismissed");
    if (lastDismissed) {
      const today = new Date().toDateString();
      if (lastDismissed === today) return;
    }

    fetch("/api/beta/active-promotion")
      .then(r => r.json())
      .then(data => {
        if (data.promotion) {
          setPromotion(data.promotion);
          setTimeout(() => setOpen(true), 1500);
        }
      })
      .catch(() => {});
  }, []);

  // EventsSection 버튼에서 강제로 모달 열기 가능
  useEffect(() => {
    const handleOpen = () => {
      if (promotion) {
        setOpen(true);
      } else {
        // 프로모션 아직 로드 안됐을 경우 재조회 후 열기
        fetch("/api/beta/active-promotion")
          .then(r => r.json())
          .then(data => {
            if (data.promotion) {
              setPromotion(data.promotion);
              setOpen(true);
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("openBetaModal", handleOpen);
    return () => window.removeEventListener("openBetaModal", handleOpen);
  }, [promotion]);

  const handleClose = () => {
    setOpen(false);
    // 오늘 날짜 저장 → 내일 다시 방문하면 또 보임
    localStorage.setItem("beta_modal_last_dismissed", new Date().toDateString());
  };

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

  if (!promotion) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 딤 */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* 상단 그라데이션 배너 */}
              <div className="relative bg-gradient-to-br from-sky-500 to-blue-600 px-8 pt-10 pb-8 text-white overflow-hidden">
                {/* 장식 원 */}
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />

                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="닫기"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                    <Gift size={12} /> 이벤트 진행 중
                  </span>
                </div>

                <h2 className="text-2xl font-bold leading-snug mb-2">
                  {promotion.title}
                </h2>

                {promotion.description && (
                  <p className="text-sm text-sky-100 leading-relaxed whitespace-pre-line">
                    {promotion.description}
                  </p>
                )}

                {promotion.end_date && (
                  <p className="text-xs text-sky-200 mt-3 font-semibold">
                    🏁 {new Date(promotion.end_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 종료
                  </p>
                )}
              </div>

              {/* 하단 폼 영역 */}
              <div className="px-8 py-6">
                {status === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center py-4"
                  >
                    <CheckCircle2 size={44} className="text-green-500 mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">사전 등록 완료! 🎉</h3>
                    <p className="text-sm text-slate-500">
                      프로모션 혜택 안내를 이메일로 보내드리겠습니다.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-5 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-full transition-colors"
                    >
                      닫기
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 mb-4">
                      이메일 주소를 남겨주시면 출시 즉시 혜택을 보내드립니다.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                      <input
                        type="email"
                        required
                        placeholder="이메일 주소를 입력해주세요"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={status === "loading"}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                      />
                      <button
                        type="submit"
                        disabled={status === "loading" || !email}
                        className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {status === "loading" ? "등록 중..." : (
                          <>사전 등록하기 <ArrowRight size={16} strokeWidth={2.5} /></>
                        )}
                      </button>
                    </form>

                    {status === "error" && (
                      <p className="mt-3 text-xs text-red-500 font-medium text-center">{message}</p>
                    )}

                    <button
                      onClick={handleClose}
                      className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors text-center"
                    >
                      괜찮습니다, 다음에 볼게요
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
