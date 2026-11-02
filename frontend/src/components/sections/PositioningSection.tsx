// ====================================================================
// 📊 [OMD-UI-PositioningSection-0001] PositioningSection ➔ PositioningSection
// 🎯 @KICK  : HERO와 Workflow 사이의 여백이 충분한 메시지 브리지 — AI는 콘텐츠를 만들고, Onrivi는 문서를 완성합니다.
// 🛡️ @GUARD : 시각적 장식을 최소화하고 메시지 가치 전달에만 집중
// 🚨 @PATCH : **2026-09-30** — [PositioningSection 배경색 히어로와 동일한 #EFEFFF 적용]: 히어로 섹션과 시각적 통일성을 위해 배경색을 bg-[#EFEFFF]로 변경
// 🚨 @PATCH : **2026-09-30** — [랜딩 개편 Positioning 섹션 신규 구현]:
//             1. 메인 메시지: "AI는 콘텐츠를 만들고, Onrivi는 문서를 완성합니다."
//             2. 서포팅 카피: "AI가 생성한 콘텐츠를 가져와 Markdown으로 편집하고 실제 문서 형태로 완성하세요."
// 🔗 @CALLS : motion.div
// ====================================================================
"use client";

import React from "react";
import { motion } from "framer-motion";

export function PositioningSection() {
  return (
    <section
      id="positioning"
      className="py-20 sm:py-28 bg-[#EFEFFF] dark:bg-[#0A0E18] text-[#0F172A] dark:text-[#E8ECE9] border-b border-[#E2E4F6] dark:border-white/5 relative"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[960px] mx-auto px-6 text-center space-y-5">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-snug"
        >
          AI는 콘텐츠를 만들고,<br className="sm:hidden" />{" "}
          <span className="text-[#1d4ed8]">Onrivi는 문서를 완성합니다.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="text-base sm:text-lg lg:text-xl text-[#475569] dark:text-zinc-300 font-normal leading-relaxed max-w-2xl mx-auto"
        >
          AI가 생성한 초안을 가져와 Markdown으로 자유롭게 편집하고,<br className="hidden sm:inline" />
          사람이 읽고 신뢰할 수 있는 전문적인 문서 형태로 완성하세요.
        </motion.p>
      </div>
    </section>
  );
}
