// ====================================================================
// 📊 [OMD-UI-DocumentResultsSection-0001] DocumentResultsSection ➔ DocumentResultsSection
// 🎯 @KICK  : 하나의 구조화된 콘텐츠에서 다양한 전문 문서(리포트, 기술 문서, 애널리틱스, 전자책, 인쇄물)를 사출하는 결과 다양성 섹션
// 🛡️ @GUARD : 실제 지원되는 포맷(PDF, EPUB, HTML, 이미지 출력)에 한정하여 정직하게 표기
// 🚨 @PATCH : **2026-09-30** — [섹션 순서 변경에 따른 배경색 교차 동기화]: WorkflowSection(화이트) 직후 05번 섹션으로 이동함에 따라 섹션 배경색을 #F9FAFC(연회색)로 변경하고, 내부 4개 카드 및 출력 규격 스트립 배경을 선명한 화이트(bg-white dark:bg-[#16181D])로 전환하여 시각적 입체감 극대화
// 🚨 @PATCH : **2026-09-30** — [DocumentResults 카드 및 스트립 배경색을 #F9FAFC로 변경]: 흰색 섹션 배경 위에서 4개 카드와 하단 출력 규격 스트립이 선명하게 부각되도록 'CORE CAPABILITIES' 섹션 배경색(#F9FAFC)과 동일하게 동기화
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: DocumentResultsSection 배경색을 흰색(#FFFFFF)으로 적용하여 상하 #F9FAFC 섹션과 완벽한 1:1 교차 대비 완성
// 🚨 @PATCH : **2026-09-30** — ['A4 규격 학술 및 계약 문서' 카드를 '이미지 출력(PNG)'으로 교체]: 사용자 요청에 따라 인쇄 카드 대신 SNS/노션/슬랙 공유용 고해상도 PNG 이미지 출력 카드로 개편
// 🚨 @PATCH : **2026-09-30** — [랜딩 개편 Document Results 섹션 신규 구현]:
//             1. 제목: "하나의 콘텐츠, 다양한 문서로."
//             2. Supporting: "하나의 구조화된 콘텐츠에서 다양한 형태의 전문 문서를 완성하세요."
//             3. 다층 레이어 문서(REPORT, TECH SPEC, ANALYTICS, EBOOK, IMAGE) 시각화
//             4. 지원 출력 규격(PDF, EPUB, HTML, PNG Image) 정돈 표기
// 🔗 @CALLS : motion.div, FileText, Book, Code, ImageIcon, Download
// ====================================================================
"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, Book, Code, ImageIcon, Download, Check } from "lucide-react";

interface DocType {
  title: string;
  tag: string;
  format: string;
  desc: string;
  icon: any;
  color: string;
  badgeBg: string;
}

const DOC_TYPES: DocType[] = [
  {
    title: "Executive Business Report",
    tag: "비즈니스 기획 및 성과 보고서",
    format: "PDF 사출",
    desc: "표, 차트, KPI 배지와 목차가 정돈된 경영진 브리핑용 고품질 인쇄 보고서",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
  {
    title: "Technical Specification",
    tag: "엔지니어링 & API 기술 문서",
    format: "PDF / HTML",
    desc: "코드 신택스 하이라이트와 Mermaid 아키텍처 다이어그램이 조화된 표준 문서",
    icon: Code,
    color: "text-teal-600 dark:text-teal-400",
    badgeBg: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
  },
  {
    title: "E-Book & Manual Publication",
    tag: "전자책 & 사용자 설명서",
    format: "EPUB 사출",
    desc: "모바일과 태블릿 리더기 표준 규격에 완벽히 호환되는 출판급 리플로우 전자책",
    icon: Book,
    color: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
  {
    title: "High-Resolution Image Export",
    tag: "웹 공유 & 카드뉴스 제작",
    format: "이미지 출력 (PNG)",
    desc: "SNS, 블로그, 노션 및 슬랙에 서식 깨짐 없이 원클릭으로 공유하는 무손실 고해상도 이미지",
    icon: ImageIcon,
    color: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
  },
];

export function DocumentResultsSection() {
  return (
    <section
      id="document-results"
      className="py-24 sm:py-32 bg-[#F9FAFC] dark:bg-[#0E131F] text-[#0F172A] dark:text-[#E8ECE9] border-b border-[#E2E4F6] dark:border-white/5 relative"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-zinc-800 border border-blue-200 dark:border-white/10 text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase mb-4 shadow-2xs">
            VERSATILE DOCUMENT RESULTS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-[#0F172A] dark:text-white">
            하나의 콘텐츠, 다양한 문서로.
          </h2>
          <p className="text-base sm:text-lg text-[#475569] dark:text-zinc-300 font-normal leading-relaxed">
            단 하나의 구조화된 Markdown 소스로부터<br className="hidden sm:inline" />
            상황과 대상에 꼭 맞는 다양한 형태의 전문 문서를 사출하세요.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DOC_TYPES.map((doc, idx) => {
            const IconComp = doc.icon;
            return (
              <motion.div
                key={doc.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16181D] p-6 flex flex-col justify-between shadow-xs hover:border-[#1d4ed8]/50 hover:shadow-md transition-all text-left group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 flex items-center justify-center shadow-2xs">
                      <IconComp className={`w-5 h-5 ${doc.color}`} />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${doc.badgeBg}`}>
                      {doc.format}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 font-semibold block">
                      {doc.tag}
                    </span>
                    <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white tracking-tight mt-0.5">
                      {doc.title}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {doc.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-200/70 dark:border-zinc-800 text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>규격 사출 지원</span>
                  <span>→</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Output Formats Strip */}
        <div className="mt-14 p-5 rounded-2xl bg-white dark:bg-[#16181D] border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1d4ed8]" />
            <span>출판급 PDF 사출</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1d4ed8]" />
            <span>전자책 EPUB 변환</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1d4ed8]" />
            <span>정적 HTML 번들</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#1d4ed8]" />
            <span>고해상도 PNG 이미지 출력</span>
          </div>
        </div>
      </div>
    </section>
  );
}
