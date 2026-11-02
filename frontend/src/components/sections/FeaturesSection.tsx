// ====================================================================
// 📊 [OMD-UI-FeaturesSection-0024] FeaturesSection ➔ FeaturesSection
// 🎯 @KICK  : Onrivi Author 6대 핵심 기능 2×3 Grid — Markdown Editing, Live A4 Preview, AI Workflow, Diagram & Math, Document Styling, Document Output
// 🛡️ @GUARD : 아이콘 + 제목 + 1줄 설명으로 군더더기 없는 명료한 UI 전달
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: FeaturesSection 배경색을 #F9FAFC로 적용하고 내부 카드를 bg-white로 전환하여 고대비 입체감 확보
// 🚨 @PATCH : **2026-09-30** — [랜딩 개편 Core Features 2×3 Grid 구현]:
//             1. 6대 핵심 역량(Markdown Editing, Live A4 Preview, AI Workflow, Diagram & Math, Document Styling, Document Output) 정돈
//             2. Modern Technical Editorial 디자인 시스템(Cobalt Authority #1d4ed8) 적용
// 🔗 @CALLS : motion.div, FileEdit, Eye, Cpu, GitBranch, Palette, FileOutput
// ====================================================================
"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  FileEdit, 
  Eye, 
  Cpu, 
  GitBranch, 
  Palette, 
  FileOutput 
} from "lucide-react";

interface FeatureItem {
  title: string;
  titleKo: string;
  desc: string;
  icon: any;
}

const CORE_FEATURES: FeatureItem[] = [
  {
    title: "Markdown Editing",
    titleKo: "직관적 마크다운 에디팅",
    desc: "기호(#, -, |) 타이핑만으로 구조적인 전문 콘텐츠를 마우스 없이 빠르게 작성합니다.",
    icon: FileEdit,
  },
  {
    title: "Live A4 Preview",
    titleKo: "1ms 실시간 A4 미리보기",
    desc: "작성과 동시에 A4 인쇄 규격의 실제 조판 결과를 화면 전환 없이 실시간으로 확인합니다.",
    icon: Eye,
  },
  {
    title: "AI Workflow",
    titleKo: "AI 생성 콘텐츠 매끄러운 연결",
    desc: "외부 LLM이 생성한 거친 초안을 가져와 문맥을 살린 완성도 높은 문서로 가다듬습니다.",
    icon: Cpu,
  },
  {
    title: "Diagram & Math",
    titleKo: "Mermaid & KaTeX 수식 완벽 지원",
    desc: "코드 블록과 아키텍처 다이어그램, 복잡한 논문 수식을 출판 규격 그대로 렌더링합니다.",
    icon: GitBranch,
  },
  {
    title: "Document Styling",
    titleKo: "CSS Profile 기반 맞춤 서식",
    desc: "검증된 전문 디자인 프로필을 통해 디자이너가 만진 듯한 폰트와 여백을 자동 입힙니다.",
    icon: Palette,
  },
  {
    title: "Document Output",
    titleKo: "출판급 PDF · EPUB 규격 사출",
    desc: "작업을 마친 콘텐츠를 원클릭으로 출판급 PDF, 전자책 EPUB, 인쇄용 문서로 출력합니다.",
    icon: FileOutput,
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 sm:py-32 bg-[#F9FAFC] dark:bg-[#0A0D14] text-[#0F172A] dark:text-[#E8ECE9] border-b border-[#E2E4F6] dark:border-white/5 relative"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-white/10 text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase mb-4 shadow-2xs">
            CORE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-[#0F172A] dark:text-white">
            문서 작성의 본질에 집중한 핵심 기능
          </h2>
          <p className="text-base sm:text-lg text-[#475569] dark:text-zinc-300 font-normal leading-relaxed">
            복잡한 설정 없이, 글 쓰는 사람에게 꼭 필요한 6가지 기능만을 단정하게 담았습니다.
          </p>
        </div>

        {/* 2x3 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {CORE_FEATURES.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#13161C] p-7 flex flex-col justify-between shadow-xs hover:border-[#1d4ed8]/40 hover:shadow-md transition-all text-left group"
              >
                <div className="space-y-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-[#1d4ed8] dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div>
                    <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                      {item.title}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white tracking-tight mt-1">
                      {item.titleKo}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-[#475569] dark:text-zinc-300 font-normal leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
