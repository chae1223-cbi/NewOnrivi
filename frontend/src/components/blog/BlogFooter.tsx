// ====================================================================
// 📊 [OMD-UI-BlogFooter-0001] BlogFooter ➔ 블로그 전용 글로벌 하단 푸터
// 🎯 @KICK  : 랜딩페이지와 일원화된 딥 네이비(#0B0F19) 색상 시스템 기반, 블로그 전용 메뉴(카테고리 목록, 서비스 바로가기, 정책 및 사업자 고지)를 재구성하여 제공하는 푸터 컴포넌트
// 🛡️ @GUARD : 링크 호버 전환 트랜지션, 반응형 그리드 및 사업자 정보 글래스 카드 탑재
// 🚨 @PATCH : **2026-09-26** — [블로그 푸터 신설]: 랜딩페이지 컬러 스킴(#0B0F19, border-white/10) 적용 및 블로그 카테고리(마크다운 가이드/기술 인사이트/사용자 활용) 중심 메뉴 재구성
// 🔗 @CALLS : Link, COMPANY_INFO, SITE_NAME
// ====================================================================
"use client";

import React from "react";
import Link from "next/link";
import { COMPANY_INFO, SITE_NAME } from "@/lib/constants";
import { useBlogCategories } from "@/lib/blogCategories";

export function BlogFooter() {
  const currentYear = new Date().getFullYear();
  const categories = useBlogCategories().filter(category => category.active);

  return (
    <footer
      className="bg-[#0B0F19] border-t border-white/10 pt-14 pb-8 text-[#E8ECE9]"
      style={{
        fontFamily: "Pretendard, LineSeed, sans-serif",
      }}
    >
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Info & Socials */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/icon.png" alt="Onrivi" className="w-8 h-8 rounded-lg shadow-xs" />
              <span className="font-extrabold text-base text-white tracking-tight">
                Onrivi <span className="text-[#60a5fa] font-black">Blog</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              생각은 마크다운으로, 결과물은 출판 규격 문서로. 온리비 어서(Onrivi Author) 공식 기술 및 실무 가이드 블로그입니다.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.youtube.com/@Onrivi-d4p"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#ff4444] transition-colors"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span>유튜브</span>
              </a>
              <a
                href="https://blog.naver.com/onrivi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#03c75a] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
                <span>네이버 블로그</span>
              </a>
            </div>
          </div>

          {/* Column 1: 블로그 카테고리 */}
          <div className="col-span-1">
            <h4 className="font-bold text-[13px] text-white mb-3.5 tracking-tight">
              블로그 카테고리
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/blog"
                  className="text-zinc-300 hover:text-[#60a5fa] transition-colors"
                >
                  전체 글 보기
                </Link>
              </li>
              {categories.map(category => (
                <li key={category.value}>
                  <Link href={`/blog?category=${encodeURIComponent(category.value)}`}
                    className="text-zinc-300 hover:text-[#60a5fa] transition-colors">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: 서비스 바로가기 */}
          <div className="col-span-1">
            <h4 className="font-bold text-[13px] text-white mb-3.5 tracking-tight">
              온리비 서비스
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/"
                  className="text-zinc-300 hover:text-[#60a5fa] transition-colors"
                >
                  온리비 홈페이지
                </Link>
              </li>
              <li>
                <Link
                  href="/editor"
                  className="text-zinc-300 hover:text-[#60a5fa] transition-colors font-semibold"
                >
                  웹 에디터 시작하기
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="text-zinc-300 hover:text-[#60a5fa] transition-colors"
                >
                  주요 기능 소개
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-zinc-300 hover:text-[#60a5fa] transition-colors"
                >
                  도움말 센터
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 & 4: 사업자 정보 & 정책 */}
          <div className="col-span-2 md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[13px] text-white tracking-tight">
                사업자 고지 정보
              </h4>
              <div className="flex items-center gap-3 text-xs">
                <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">
                  이용약관
                </Link>
                <span className="text-zinc-600">·</span>
                <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">
                  개인정보처리방침
                </Link>
                <span className="text-zinc-600">·</span>
                <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors">
                  문의하기
                </Link>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border border-white/10"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] leading-relaxed">
                {COMPANY_INFO.map(([label, value]) => (
                  <div key={label} className="flex gap-1.5">
                    <span className="text-zinc-400 shrink-0">{label}:</span>
                    <span className="text-zinc-200 font-medium truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <p>
            &copy; {currentYear} Onrivi Author Tech Blog. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span>Powered by Onrivi Author Local-First Typography Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
