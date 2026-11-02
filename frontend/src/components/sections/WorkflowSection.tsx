// ====================================================================
// 📊 [OMD-UI-WorkflowSection-0001] WorkflowSection ➔ WorkflowSection
// 🎯 @KICK  : Onrivi Author 5단계 Workflow 인포그래픽 — INPUT SOURCE → AI PROCESSING → STRUCTURED CONTENT → ONRIVI AUTHOR → DOCUMENT
// 🛡️ @GUARD : 반응형 스크롤/그리드 지원 및 절차명과 매체명 동시 표기
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: WorkflowSection부터 흰색(#FFFFFF)과 첨부 연회색(#F9FAFC) 1:1 교차 시스템 적용 (Workflow: #FFFFFF 시작)
// 🚨 @PATCH : **2026-09-30** — [Workflow 파이프라인 보라-연두 2색 교차 테마 및 세부내역 시작 높이 통일]:
//             1. 1~5단계 카드를 '보라 ➔ 연두 ➔ 보라 ➔ 연두 ➔ 보라' 2색 교차 테마로 개편
//             2. 상단 헤더 영역 최소 높이(min-h-[84px]) 고정으로 모든 카드의 세부내역 시작선을 STEP 01과 동일하게 수평 정렬
//             3. STEP 02 타이틀 'AI PROCESSING' 명확화 및 각 단계별 5개 세부 항목 균형 배치
// 🚨 @PATCH : **2026-09-30** — [랜딩 개편 Workflow 5단계 섹션 신규 구현]:
// 🔗 @CALLS : motion.div, FileText, Cpu, Code2, Layout, BookOpen, ArrowRight
// ====================================================================
"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileInput, Cpu, FileCode2, Layout, FileCheck, ArrowRight, ArrowDown } from "lucide-react";

interface WorkflowStep {
  step: string;
  title: string;
  desc: string;
  items: string[];
  icon: any;
  color: string;
  bg: string;
  border: string;
  dotColor: string;
}

const STEPS: WorkflowStep[] = [
  {
    step: "01",
    title: "INPUT SOURCE",
    desc: "다양한 소스 수집",
    items: ["AI 생성 내용", "메모 / 아이디어", "웹 문서 / 자료", "Excel / CSV", "PDF / 기존 문서"],
    icon: FileInput,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50/70 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    dotColor: "bg-purple-400 dark:bg-purple-500",
  },
  {
    step: "02",
    title: "AI PROCESSING",
    desc: "지능형 분석 및 전처리",
    items: ["외부 LLM 원시 텍스트", "핵심 내용 분석 & 추출", "문맥 논리 구조화", "체계적 초안 생성", "불필요한 군더더기 제거"],
    icon: Cpu,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-400 dark:bg-emerald-500",
  },
  {
    step: "03",
    title: "STRUCTURED CONTENT",
    desc: "표준 마크다운 변환",
    items: ["Markdown 서식", "Heading (H1~H6)", "List & Checklist", "Table & Grid", "Image Asset"],
    icon: FileCode2,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50/70 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    dotColor: "bg-purple-400 dark:bg-purple-500",
  },
  {
    step: "04",
    title: "ONRIVI AUTHOR",
    desc: "실시간 조판 및 완성",
    items: ["Focus Edit 모드", "Split View 듀얼 싱크", "Live A4 Preview", "CSS Profile 스타일링", "실시간 목차 자동 구성"],
    icon: Layout,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/90 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-600",
    dotColor: "bg-emerald-500 dark:bg-emerald-400",
  },
  {
    step: "05",
    title: "DOCUMENT",
    desc: "전문 출판 규격 사출",
    items: ["고품질 PDF 사출", "전자책 EPUB 사출", "웹 공유 PNG 이미지", "A4 용지 규격 인쇄", "로컬 파일 영구 소장"],
    icon: FileCheck,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50/70 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    dotColor: "bg-purple-400 dark:bg-purple-500",
  },
];

export function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="py-24 sm:py-32 bg-[#FFFFFF] dark:bg-[#0A0D14] text-[#0F172A] dark:text-[#E8ECE9] border-b border-[#E2E4F6] dark:border-white/5 relative"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-white/10 text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase mb-4 shadow-2xs">
            WORKFLOW PIPELINE
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-[#0F172A] dark:text-white">
            아이디어에서 완성된 문서까지
          </h2>
          <p className="text-base sm:text-lg text-[#475569] dark:text-zinc-300 font-normal leading-relaxed">
            다양한 소스의 정보를 AI와 Markdown을 거쳐<br className="hidden sm:inline" /> 하나의 완성된 전문 문서로 연결합니다.
          </p>
        </div>

        {/* 5-Step Pipeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative">
          {STEPS.map((s, idx) => {
            const IconComp = s.icon;
            const isHighlight = s.step === "04";

            return (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className={`relative rounded-2xl p-5 border flex flex-col justify-start transition-all duration-200 group h-full ${s.bg} ${s.border} ${
                  isHighlight 
                    ? "ring-2 ring-emerald-500 shadow-md dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                    : "hover:shadow-xs hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                {/* Header (모든 카드 높이를 min-h-[82px]로 균일 고정하여 아래 구분선 및 세부내역 시작선을 완벽 일치) */}
                <div className="min-h-[82px] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 shadow-2xs">
                      STEP {s.step}
                    </span>
                    <IconComp className={`w-5 h-5 ${s.color}`} />
                  </div>

                  <div className="pt-2">
                    <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                      {s.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                </div>

                {/* Items List (모든 카드가 STEP 01과 100% 동일한 수평 높이에서 시작) */}
                <div className="mt-4 pt-4 border-t border-zinc-200/80 dark:border-white/10 space-y-2 flex-1">
                  {s.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#334155] dark:text-zinc-300 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dotColor} shrink-0`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Arrow Connector for Desktop (Steps 1 to 4) */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 items-center justify-center shadow-xs text-zinc-400">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Flow Summary Caption */}
        <div className="mt-12 text-center text-xs sm:text-sm font-semibold text-[#64748B] dark:text-zinc-400 flex flex-wrap items-center justify-center gap-2">
          <span>입력 (Input)</span>
          <span>→</span>
          <span>처리 (AI Processing)</span>
          <span>→</span>
          <span>전달 (Markdown)</span>
          <span>→</span>
          <span className="text-[#1d4ed8] font-bold">작성 (Onrivi Author)</span>
          <span>→</span>
          <span className="text-emerald-600 font-bold">출력 (Document)</span>
        </div>
      </div>
    </section>
  );
}
