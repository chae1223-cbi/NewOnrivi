// ====================================================================
// 📊 [OMD-UI-HeroSection-0024] HeroSection ➔ HeroSection
// 🎯 @KICK  : Onrivi Author 랜딩 HERO — 좌측 핵심 메시지("AI가 만든 글, 바로 문서로 완성하세요") + 우측 무깜빡임(Cross-Fade) 3초 자동 롤링 이미지 슬라이더 복원
// 🛡️ @GUARD : 슬라이더 타이머 메모리 릭 방지(clearInterval) 및 이미지 상시 DOM 적재 기반 깜빡임 원천 차단
// 🚨 @PATCH : **2026-09-30** — [히어로 배경색 사용자 지정 색상(#EFEFFF) 적용]: 첨부된 이미지 기준 고유한 소프트 페리윙클(#EFEFFF) 단색 배경 적용
// 🚨 @PATCH : **2026-09-30** — [우측 시각 영역 3초 자동 롤링 이미지 슬라이더 복원]:
//             1. 우측 영역을 이전의 고화질 슬라이더(5개 핵심 씬, 3초 무깜빡임 Cross-Fade, 캡션 오버레이)로 복원
//             2. 좌측 42:58 비율의 메인 카피("AI가 만든 글, 바로 문서로 완성하세요") 및 버튼, 하단 증거 칩 유지
//             3. 뷰포트 하단 다음 섹션(Positioning) 노출을 위한 최적화된 패딩 유지
// 🔗 @CALLS : motion.div, Link, ArrowRight, Sparkles
// ====================================================================
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroSlide {
  id: number;
  src: string;
  tag: string;
  title: string;
  subtitle: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    src: "/hero-slides/hero-slide-1.jpg",
    tag: "DESKTOP DUAL CANVAS",
    title: "대화면 모니터와 듀얼 캔버스",
    subtitle: "원시 마크다운 소스와 출판 규격의 조판 문서를 실시간 1ms 동기화",
  },
  {
    id: 2,
    src: "/hero-slides/hero-slide-2.jpg",
    tag: "EXECUTIVE STRATEGY",
    title: "비즈니스 기획 및 보고서 집필",
    subtitle: "외부 노트 내보내기 파일의 깨진 표와 서식을 즉시 복원하고 고품질 PDF로 사출",
  },
  {
    id: 3,
    src: "/hero-slides/hero-slide-3.jpg",
    tag: "TEAM COLLABORATION",
    title: "팀 협업과 엔지니어링 지식 공유",
    subtitle: "개발자, 기획자, 리더가 함께 신뢰하는 단 하나의 마크다운 에디터",
  },
  {
    id: 4,
    src: "/hero-slides/hero-slide-4.jpg",
    tag: "FOCUSED MOBILITY",
    title: "어디서나 이어지는 깊은 사유",
    subtitle: "카페, 회의실, 이동 중에도 태블릿과 함께하는 고요한 집필 경험",
  },
  {
    id: 5,
    src: "/hero-slides/hero-slide-5.jpg",
    tag: "INTUITIVE CAPTURE",
    title: "생각의 흐름을 놓치지 않는 기록",
    subtitle: "복잡한 서식 도구 대신 순수한 텍스트 타이핑으로 문서의 뼈대 완성",
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 3초 무깜빡임(Cross-Fade) 자동 롤링 슬라이더
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      className="pt-24 pb-12 sm:pt-28 sm:pb-16 overflow-hidden relative bg-[#EFEFFF] dark:bg-[#0A0E18] text-[#1A1A18] dark:text-[#E8ECE9] border-b border-[#E2E4F6] dark:border-white/5"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* Subtle Top Ambient Glow & Luxury Gradient */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(29,78,216,0.12)_0%,rgba(147,197,253,0.06)_45%,transparent_70%)] pointer-events-none z-0"
      />
      <div
        aria-hidden
        className="absolute -top-24 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_60%)] pointer-events-none z-0"
      />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 relative z-10">
        {/* 2-Column Grid Layout: 42 : 58 비율 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* ======================================================= */}
          {/* Left Column: Eyebrow, H1, Subtitle, CTA & Proof (42%)   */}
          {/* ======================================================= */}
          <div className="lg:col-span-5 text-left space-y-6">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1d4ed8]/10 dark:bg-zinc-800/80 border border-[#1d4ed8]/20 dark:border-white/10 text-xs font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase shadow-2xs">
                <Sparkles size={13} className="text-[#1d4ed8] animate-pulse" />
                AI DOCUMENT AUTHORING
              </div>
            </motion.div>

            {/* H1 Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="tracking-tight font-extrabold text-[#0F172A] dark:text-white"
              style={{
                fontSize: "clamp(34px, 4.0vw, 54px)",
                lineHeight: 1.15,
                letterSpacing: "-0.04em",
              }}
            >
              AI가 만든 글,<br />
              <span className="text-[#1d4ed8]">바로 문서로 완성하세요.</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-[#475569] dark:text-zinc-300 font-normal leading-relaxed text-[16px] sm:text-[18px] tracking-tight max-w-lg"
            >
              Markdown으로 작성하고 실시간으로 확인하세요.<br />
              <strong className="font-semibold text-[#0F172A] dark:text-white">Onrivi Author</strong>가 전문 문서로 완성합니다.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2"
            >
              <Link href="/signup" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-[15px] shadow-[0_4px_20px_rgba(29,78,216,0.25)] hover:shadow-[0_6px_24px_rgba(29,78,216,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                  무료로 시작하기
                  <ArrowRight size={16} />
                </button>
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection("product-experience")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#0F172A] dark:text-zinc-100 font-semibold text-[15px] transition-all"
              >
                기능 살펴보기
              </button>
            </motion.div>

            {/* Bottom Proof Badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="pt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-zinc-400"
            >
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Local First
              </span>
              <span>·</span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Markdown
              </span>
              <span>·</span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Live Preview
              </span>
              <span>·</span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                PDF · EPUB
              </span>
            </motion.div>
          </div>

          {/* ======================================================= */}
          {/* Right Column: Seamless Cross-Fade 3s Image Slider (58%) */}
          {/* ======================================================= */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="lg:col-span-7 relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Slider Container Window Chrome */}
            <div className="relative aspect-[16/10] w-full mx-auto rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E2E4F6] dark:border-white/10 bg-zinc-950 shadow-[0_20px_50px_-15px_rgba(29,78,216,0.18)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] select-none">
              {/* All slides mounted continuously in DOM - Pure CSS Cross-Fade */}
              {HERO_SLIDES.map((s, idx) => {
                const isActive = idx === currentSlide;
                return (
                  <div
                    key={s.id}
                    className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                      isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    <img
                      src={s.src}
                      alt={s.title}
                      className="w-full h-full object-cover select-none transform scale-100 transition-transform duration-1000 ease-out"
                      loading="eager"
                    />
                    {/* Subtle Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />
                  </div>
                );
              })}

              {/* Caption Overlays */}
              {HERO_SLIDES.map((s, idx) => {
                const isActive = idx === currentSlide;
                return (
                  <div
                    key={`caption-${s.id}`}
                    className={`absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-left z-20 select-none transition-all duration-700 ease-in-out ${
                      isActive
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2 pointer-events-none"
                    }`}
                  >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-[10px] sm:text-[11px] font-extrabold text-[#1d4ed8] uppercase tracking-wider mb-2 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                      {s.tag}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight drop-shadow-sm mb-1">
                      {s.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-200/90 font-normal leading-relaxed drop-shadow-xs line-clamp-2">
                      {s.subtitle}
                    </p>
                  </div>
                );
              })}

              {/* Bottom Dot Indicators */}
              <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                {HERO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentSlide ? "w-5 bg-[#1d4ed8]" : "w-1.5 bg-white/50"
                    }`}
                    aria-label={`슬라이드 ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
