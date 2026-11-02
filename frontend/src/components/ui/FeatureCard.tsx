// ====================================================================
// 📊 [OMD-UI-FeatureCard-0011] FeatureCard ➔ FeatureCard
// 🎯 @KICK  : 랜딩페이지 주요 기능 그리드에 배치되는 개별 피처 카드 컴포넌트
// 🛡️ @GUARD : motion.div의 viewport once 옵션을 통해 최초 1회만 애니메이션이 기동되도록 성능 최적화
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 패치
// 🔗 @CALLS : framer-motion
// ====================================================================
"use client";

import { motion } from "framer-motion";
import type { Feature } from "@/lib/constants";

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export function FeatureCard({ feature, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="p-8 rounded-2xl bg-surface-container border border-outline/10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 text-on-surface"
    >
      <h3
        className="font-bold text-lg text-[#1d4ed8] mb-3 tracking-tight"
        style={{ fontFamily: "Pretendard, sans-serif" }}
      >
        {feature.title}
      </h3>
      <p
        className="text-sm text-text-secondary leading-relaxed"
        style={{ fontFamily: "Pretendard, sans-serif" }}
        dangerouslySetInnerHTML={{ __html: feature.description.replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-surface font-bold">$1</strong>') }}
      />
    </motion.div>
  );
}
