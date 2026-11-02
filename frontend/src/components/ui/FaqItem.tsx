// ====================================================================
// 📊 [OMD-UI-FaqItem-0010] FaqItem ➔ FaqItem
// 🎯 @KICK  : 클릭 시 질문의 아코디언 접기/열기 인터랙션을 구현하는 FAQ 개별 항목 컴포넌트
// 🛡️ @GUARD : AnimatePresence 와 motion.div를 활용해 CSS 트랜지션 시 자연스러운 레이아웃 변화 보장
// 🚨 @PATCH : **2026-09-11** — 랜딩페이지 섹션 교차(#FFFFFF / #EFEFFF) 배경 및 헤어라인 보더(#E2E4F6) 적용
//             **2026-09-11** — 랜딩페이지 서피스 배경 Primary #DCE1FF 대응 흰색 카드 및 헤어라인 보더(#C5CEF8) 적용
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 패치
// 🔗 @CALLS : framer-motion, lucide-react
// ====================================================================
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import type { FAQ } from "@/lib/constants";

interface FaqItemProps {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
}

export function FaqItem({ faq, isOpen, onToggle }: FaqItemProps) {
  return (
    <div
      className="border border-[#E2E4F6] dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs text-[#111413] dark:text-zinc-200"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between transition-colors text-left bg-transparent"
      >
        <span
          className="font-bold text-sm sm:text-base text-on-surface"
          style={{ fontFamily: "Pretendard, sans-serif" }}
        >
          {faq.question}
        </span>
        {isOpen ? (
          <Minus className="w-5 h-5 text-[#1d4ed8] shrink-0" />
        ) : (
          <Plus className="w-5 h-5 text-text-secondary shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div
              className="px-6 pb-5 pt-3 text-sm text-[#2D3748] dark:text-zinc-300 leading-relaxed border-t border-[#E2E4F6] dark:border-white/10"
              style={{
                fontFamily: "Pretendard, sans-serif",
              }}
            >
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
