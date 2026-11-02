// ====================================================================
// 📊 [OMD-UI-CtaSection-0026] CtaSection ➔ CtaSection
// 🎯 @KICK  : Onrivi Author 랜딩페이지 Final CTA 섹션 — AI가 만든 콘텐츠를 당신의 문서로 완성하세요.
// 🛡️ @GUARD : viewport once 옵션 및 간결한 전환 유도
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: CtaSection 배경색을 흰색(#FFFFFF)으로 유지하여 상단 Pricing(#F9FAFC)과 1:1 교차 대비 완성
// 🚨 @PATCH : **2026-09-30** — [랜딩 개편 Final CTA 섹션 구현]:
//             1. Heading: "AI가 만든 콘텐츠를 당신의 문서로 완성하세요."
//             2. Supporting: "작성부터 미리보기, 완성된 문서까지 하나의 작업 흐름으로 연결하세요."
//             3. CTA 버튼: "무료로 시작하기 →"
//             4. 보조 정보: "Windows · Local First · Markdown"
// 🔗 @CALLS : motion.div, Link, ArrowRight, ShieldCheck
// ====================================================================
"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function CtaSection() {
  return (
    <section
      className="py-24 sm:py-32 px-6 relative overflow-hidden bg-[#FFFFFF] dark:bg-[#0A0D14] text-[#0F172A] dark:text-[#E8ECE9] border-t border-[#E2E4F6] dark:border-white/5"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* Subtle Background Glow */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />

      <div className="max-w-[900px] mx-auto text-center relative z-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-white/10 text-[11px] font-extrabold text-[#1d4ed8] dark:text-blue-400 tracking-widest uppercase shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
            ONRIVI AUTHOR
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-[#0F172A] dark:text-white">
            AI가 만든 콘텐츠를<br />
            <span className="text-[#1d4ed8]">당신의 문서로 완성하세요.</span>
          </h2>

          {/* Supporting */}
          <p className="text-base sm:text-xl text-[#475569] dark:text-zinc-300 font-normal leading-relaxed max-w-xl mx-auto">
            작성부터 미리보기, 완성된 문서까지<br className="hidden sm:inline" /> 하나의 작업 흐름으로 연결하세요.
          </p>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="pt-2 flex flex-col items-center justify-center gap-4"
        >
          <Link href="/signup">
            <button className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-base shadow-[0_4px_24px_rgba(29,78,216,0.3)] hover:shadow-[0_6px_30px_rgba(29,78,216,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0">
              무료로 시작하기
              <ArrowRight size={17} />
            </button>
          </Link>

          {/* Auxiliary Proof */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-zinc-400 pt-2">
            <span>Windows</span>
            <span>·</span>
            <span>Local First</span>
            <span>·</span>
            <span>Markdown</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
