// ====================================================================
// 📊 [OMD-UI-ProductExperienceSection-0003] ProductExperienceSection ➔ ProductExperienceSection
// 🎯 @KICK  : Onrivi Author 실제 UI 쇼케이스 — SPLIT VIEW(`onrivi/onrivi_randing_spilit.png`), PREVIEW(`onrivi/onrivi_randing_preview.png`), '구현'(실제 시연 비디오 randing_hero.mp4) 3대 모드
// 🛡️ @GUARD : Default 모드는 SPLIT VIEW, 200 OK 정규 이미지 URL 연동 및 비디오 스트리밍 최적화
// 🚨 @PATCH : **2026-09-30** — [섹션 순서 변경에 따른 배경색 교차 동기화]: DocumentResultsSection(#F9FAFC) 직후 06번 섹션으로 이동함에 따라 섹션 배경색을 #FFFFFF(화이트)로 전환하고, 탭 스위처를 연회색(bg-[#F1F5F9] dark:bg-[#16181D])으로 정돈하여 완벽한 상하 1:1 교차 대비 달성
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: ProductExperienceSection 배경색을 사용자 지정 #F9FAFC(연회색)로 적용하여 Workflow(화이트)와 1:1 교차 대비 완성
// 🚨 @PATCH : **2026-09-30** — [비디오 초기 검은 화면(Black Screen) 방지 패치]:
//             1. poster="onrivi_randing_spilit.png" 속성 지정으로 버퍼링 중 검은 화면 대신 UI 썸네일 즉시 노출
//             2. 비디오 DOM 상시 마운트(Pre-mount) 및 백그라운드 preload="auto"로 탭 전환 즉시 0초 재생
//             3. 첫 프레임 검은 구간 스킵(#t=0.05 및 onLoadedData currentTime 설정) 및 bg-[#0F172A] 테마 배경 통일
// 🚨 @PATCH : **2026-09-30** — [이미지 404 수정 및 '구현' 비디오 탭 개편]:
//             1. 이미지 404 해결: /onrivi/ 경로 포함한 정규 URL(https://onrivi.com/api/image/onrivi/onrivi_randing_spilit.png, onrivi_randing_preview.png)로 교체
//             2. 'EDIT' 탭 제거 및 '구현' 탭으로 전환하여 클릭 시 실제 시연 비디오(randing_hero.mp4) 풀스크린 재생 연동
//             3. Mac-style 윈도우 프레임 및 상단 1ms LIVE SYNC 인디케이터 유지
// 🔗 @CALLS : motion.div, useState, Columns, Eye, Video
// ====================================================================
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Columns, Eye, Video } from "lucide-react";

export function ProductExperienceSection() {
  const [viewMode, setViewMode] = useState<"split" | "preview" | "demo">("split");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (viewMode === "demo") {
      if (videoRef.current) {
        if (videoRef.current.currentTime < 0.05) {
          videoRef.current.currentTime = 0.05;
        }
        videoRef.current.play().catch(() => {});
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [viewMode]);

  return (
    <section
      id="product-experience"
      className="py-24 sm:py-32 bg-[#FFFFFF] dark:bg-[#0A0D14] text-[#0F172A] dark:text-[#E8ECE9] border-b border-[#E2E4F6] dark:border-white/5 relative overflow-hidden"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100/70 dark:bg-zinc-800 border border-blue-200 dark:border-white/10 text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase mb-4 shadow-2xs">
            REAL-TIME DOCUMENT AUTHORING
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-[#0F172A] dark:text-white">
            작성하면서, 결과를 바로 확인하세요.
          </h2>
          <p className="text-base sm:text-lg text-[#475569] dark:text-zinc-300 font-normal leading-relaxed">
            Markdown을 작성하는 동시에 실제 A4 문서 결과를 확인하세요.<br className="hidden sm:inline" />
            편집과 미리보기를 오갈 필요가 없습니다.
          </p>
        </div>

        {/* View Mode Switcher Tabs (SPLIT VIEW | PREVIEW | 구현) */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#F1F5F9] dark:bg-[#16181D] border border-[#E2E4F6] dark:border-white/10 shadow-xs gap-1.5">
            {/* 1. SPLIT VIEW (기본) */}
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "split"
                  ? "bg-[#1d4ed8] text-white shadow-xs"
                  : "text-[#64748B] dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <Columns size={16} />
              <span>SPLIT VIEW</span>
              <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-full font-extrabold ${
                viewMode === "split"
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              }`}>
                기본
              </span>
            </button>

            {/* 2. PREVIEW */}
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "preview"
                  ? "bg-[#1d4ed8] text-white shadow-xs"
                  : "text-[#64748B] dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <Eye size={16} />
              <span>PREVIEW</span>
            </button>

            {/* 3. 구현 (실제 시연 비디오 재생) */}
            <button
              type="button"
              onClick={() => setViewMode("demo")}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "demo"
                  ? "bg-[#1d4ed8] text-white shadow-xs"
                  : "text-[#64748B] dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <Video size={16} />
              <span>구현</span>
              <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-full font-extrabold ${
                viewMode === "demo"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
              }`}>
                영상
              </span>
            </button>
          </div>
        </div>

        {/* Interactive App Window Container */}
        <div className="rounded-2xl sm:rounded-3xl border border-[#CBD5E1] dark:border-white/10 bg-white dark:bg-[#13161C] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] overflow-hidden">
          {/* Mac-style Window Top Bar */}
          <div className="bg-[#F1F5F9] dark:bg-[#1E293B] border-b border-[#CBD5E1] dark:border-white/10 px-4 py-3 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#EF4444] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block" />
              <span className="ml-3 font-mono font-bold text-zinc-600 dark:text-zinc-300 text-xs">
                {viewMode === "split" && "Onrivi Author — Split View (Markdown ↔ Live A4 Document)"}
                {viewMode === "preview" && "Onrivi Author — Publication Preview Mode"}
                {viewMode === "demo" && "Onrivi Author — Live Demonstration Video"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <span className="hidden sm:inline">A4 Standard Format</span>
              <span className="inline-flex items-center gap-1 text-[#1d4ed8] dark:text-blue-400 font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#1d4ed8] animate-pulse" />
                1ms LIVE SYNC
              </span>
            </div>
          </div>

          {/* Window Content */}
          <div className="relative w-full bg-[#0F172A] overflow-hidden">
            {/* 1. SPLIT VIEW MODE (onrivi_randing_spilit.png) */}
            {viewMode === "split" && (
              <div className="w-full bg-[#0F172A] flex items-center justify-center overflow-hidden animate-fadeIn">
                <img
                  src="https://onrivi.com/api/image/onrivi/onrivi_randing_spilit.png"
                  alt="Onrivi Author Split View 화면"
                  className="w-full h-auto object-cover select-none"
                  loading="eager"
                />
              </div>
            )}

            {/* 2. PREVIEW MODE (onrivi_randing_preview.png) */}
            {viewMode === "preview" && (
              <div className="w-full bg-[#0F172A] flex items-center justify-center overflow-hidden animate-fadeIn">
                <img
                  src="https://onrivi.com/api/image/onrivi/onrivi_randing_preview.png"
                  alt="Onrivi Author Preview 화면"
                  className="w-full h-auto object-cover select-none"
                  loading="eager"
                />
              </div>
            )}

            {/* 3. 구현 MODE (onrivi/randing_hero.mp4 동영상) */}
            {/* ⚡ 비디오 DOM 상시 마운트 + 포스터 + #t=0.05로 첫 프레임 검은 화면 완벽 방어 */}
            <div
              className={`relative aspect-[16/9] w-full bg-[#0F172A] items-center justify-center overflow-hidden ${
                viewMode === "demo" ? "flex" : "hidden"
              }`}
            >
              <video
                ref={videoRef}
                key="onrivi-randing-hero-video"
                loop
                muted
                playsInline
                controls
                preload="auto"
                poster="https://onrivi.com/api/image/onrivi/onrivi_randing_spilit.png"
                className="w-full h-full object-cover"
                onLoadedMetadata={(e) => {
                  if (e.currentTarget.currentTime < 0.05) {
                    e.currentTarget.currentTime = 0.05;
                  }
                }}
                onLoadedData={(e) => {
                  if (e.currentTarget.currentTime < 0.05) {
                    e.currentTarget.currentTime = 0.05;
                  }
                }}
                src="https://onrivi.com/api/image/onrivi/randing_hero.mp4?v=20260930_latest#t=0.05"
              >
                <source src="https://onrivi.com/api/image/onrivi/randing_hero.mp4?v=20260930_latest#t=0.05" type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
