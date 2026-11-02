// ====================================================================
// 📊 [OMD-UI-LocalFirstSection-0001] LocalFirstSection ➔ LocalFirstSection
// 🎯 @KICK  : Onrivi Author의 핵심 철학인 Local First 원칙 — 내 문서는 내 컴퓨터에 안전하게 저장·관리
// 🛡️ @GUARD : 과장된 보안 주장 대신 실제 로컬 저장 및 오프라인 구동 구조를 정직하게 시각화
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: LocalFirstSection 배경색을 흰색(#FFFFFF)으로 적용하여 상하 #F9FAFC 섹션과 완벽한 1:1 교차 대비 완성
// 🚨 @PATCH : **2026-09-30** — [우측 모의 UI를 실제 Windows 탐색기 & Onrivi 연동 이미지(/onrivi_local_workspace.png)로 교체]: 로컬 1:1 실시간 직결 및 프라이버시 가치 시각적 극대화
// 🚨 @PATCH : **2026-09-30** — [랜딩 개편 Local First 섹션 신규 구현]:
//             1. Heading: "내 문서는, 내 컴퓨터에."
//             2. Supporting: "외부 클라우드 의존 없이, 내 로컬 환경에서 문서를 안전하게 작성하고 영구적으로 보관하세요."
//             3. YOUR COMPUTER 로컬 파일 시스템 및 오프라인 영구 소장 다이어그램 시각화
// 🔗 @CALLS : motion.div, HardDrive, ShieldCheck, WifiOff
// ====================================================================
"use client";

import React from "react";
import { motion } from "framer-motion";
import { HardDrive, ShieldCheck, WifiOff } from "lucide-react";

export function LocalFirstSection() {
  return (
    <section
      id="local-first"
      className="py-24 sm:py-32 bg-[#FFFFFF] dark:bg-[#0E131F] text-[#0F172A] dark:text-[#E8ECE9] border-b border-[#E2E4F6] dark:border-white/5 relative"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-zinc-800 border border-blue-200 dark:border-white/10 text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase shadow-2xs">
              DATA PRIVACY & SOVEREIGNTY
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-[#0F172A] dark:text-white">
              내 문서는, 내 컴퓨터에.
            </h2>

            <p className="text-base sm:text-lg text-[#475569] dark:text-zinc-300 font-normal leading-relaxed">
              작성 중인 문서와 이미지는 외부 클라우드 서버에 강제로 업로드되지 않습니다.<br />
              내 PC의 로컬 폴더에 순수 텍스트 파일(.md)로 직접 저장되어, 서비스 종료 걱정 없이 평생 안전하게 소장할 수 있습니다.
            </p>

            <div className="space-y-3.5 pt-2 text-sm text-[#334155] dark:text-zinc-300 font-medium">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#1d4ed8]">
                  <HardDrive className="w-4 h-4" />
                </div>
                <span>내 파일 시스템(로컬 디렉토리)에 1:1 직결 저장</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#1d4ed8]">
                  <WifiOff className="w-4 h-4" />
                </div>
                <span>인터넷 연결이 끊긴 비행기나 카페에서도 100% 정상 작동</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#1d4ed8]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>기밀 보고서 및 개인 메모의 외부 유출 가능성 원천 차단</span>
              </div>
            </div>
          </div>

          {/* Right Visual Column: Real Local Workspace & Explorer Showcase */}
          <div className="lg:col-span-6 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative w-full max-w-[560px] rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-white/10 shadow-[0_20px_50px_-15px_rgba(29,78,216,0.15)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] group bg-white dark:bg-zinc-900"
            >
              <img
                src="/onrivi_local_workspace.png"
                alt="Onrivi Author 로컬 파일 시스템 및 Windows 탐색기 실시간 1:1 연동 화면"
                className="w-full h-auto object-cover select-none group-hover:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
