// ====================================================================
// 📊 [OMD-UI-EventsSection-0034] EventsSection ➔ 랜딩페이지 진행 중 이벤트 섹션
// 🎯 @KICK  : Supabase promotions 테이블에서 현재 활성 프로모션을 조회하여
//             카드 형태로 노출. 사전 등록 버튼 클릭 시 BetaModal 팝업 트리거.
// 🛡️ @GUARD : 활성 프로모션 없으면 섹션 자체를 렌더링하지 않음
// 🚨 @PATCH : **2026-08-10** — 초기 생성
// 🔗 @CALLS : /api/beta/active-promotion (GET), CustomEvent 'openBetaModal'
// ====================================================================
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Clock, ArrowRight, Calendar } from "lucide-react";

interface Promotion {
  code: string;
  title: string;
  description: string;
  end_date: string | null;
  start_date?: string | null;
}

function useCountdown(endDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!endDate) return;

    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        style={{
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "0.75rem",
          width: 56,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 800,
          color: "#fff",
          fontFamily: "'Montserrat', 'Inter', sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 4, fontWeight: 600, letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}

export function EventsSection() {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const countdown = useCountdown(promotion?.end_date ?? null);

  useEffect(() => {
    fetch("/api/beta/active-promotion")
      .then(r => r.json())
      .then(data => {
        if (data.promotion) setPromotion(data.promotion);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openModal = () => {
    window.dispatchEvent(new CustomEvent("openBetaModal"));
  };

  if (loading || !promotion) return null;

  const startLabel = promotion.start_date
    ? new Date(promotion.start_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : null;
  const endLabel = promotion.end_date
    ? new Date(promotion.end_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : null;

  return (
    <section style={{ padding: "64px 24px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* 섹션 타이틀 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: "center", marginBottom: 32 }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 14px",
              borderRadius: 9999,
              background: "rgba(14,165,233,0.10)",
              color: "#006591",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              marginBottom: 12,
            }}
          >
            <Gift size={13} /> 진행 중인 이벤트
          </span>
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            지금 바로 참여할 수 있는 혜택이 있습니다
          </h2>
        </motion.div>

        {/* 이벤트 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #006591 50%, #0f172a 100%)",
            borderRadius: "1.5rem",
            overflow: "hidden",
            boxShadow: "0 24px 48px rgba(14,165,233,0.25)",
          }}
        >
          {/* 장식 원 */}
          <div style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", bottom: -30, left: -30, width: 140, height: 140, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />

            <div style={{ padding: "40px 40px 32px", position: "relative", zIndex: 1 }}>
              {/* 배지 & 기간 */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 9999, color: "#fff", fontSize: 11, fontWeight: 700 }}>
                  🎁 EARLYBIRD EVENT
                </span>
                {(startLabel || endLabel) && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                    <Calendar size={12} />
                    {startLabel && `${startLabel} `}{endLabel && `~ ${endLabel}`}
                  </span>
                )}
              </div>

              {/* 제목 & 설명 */}
              <h3 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.3 }}>
                {promotion.title}
              </h3>
              {promotion.description && (
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.80)", lineHeight: "24px", maxWidth: 520, whiteSpace: "pre-line", marginBottom: 28 }}>
                  {promotion.description}
                </p>
              )}

              {/* 카운트다운 + 버튼 */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
                {/* 카운트다운 */}
                {promotion.end_date && !countdown.expired && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Clock size={12} style={{ color: "rgba(255,255,255,0.6)" }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: "0.04em" }}>
                        이벤트 종료까지
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <CountdownUnit value={countdown.days} label="일" />
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>:</span>
                      <CountdownUnit value={countdown.hours} label="시간" />
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>:</span>
                      <CountdownUnit value={countdown.minutes} label="분" />
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>:</span>
                      <CountdownUnit value={countdown.seconds} label="초" />
                    </div>
                  </div>
                )}
                {countdown.expired && (
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>이벤트가 종료되었습니다.</span>
                )}

                {/* CTA 버튼 */}
                {!countdown.expired && (
                  <button
                    onClick={openModal}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 28px",
                      background: "#fff",
                      color: "#006591",
                      fontWeight: 800,
                      fontSize: 15,
                      borderRadius: 9999,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      marginTop: promotion.end_date ? 0 : 0,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.20)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
                    }}
                  >
                    지금 사전 등록하기 <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
