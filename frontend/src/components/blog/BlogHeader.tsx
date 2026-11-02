// ====================================================================
// 📊 [OMD-UI-BlogHeader-0001] BlogHeader ➔ 블로그 전용 글로벌 상단 네비게이션 헤더
// 🎯 @KICK  : 공통코드 BLOG_CATEGORY를 읽어 블로그 분류 메뉴와 홈페이지 이동 링크를 제공한다.
// 🛡️ @GUARD : sticky 상단 고정, 스크롤 배경 블러 및 상세 페이지와 메인 페이지 간 카테고리 전환 안전 라우팅
// 🚨 @PATCH : **2026-09-26** — [헤더 전체 메뉴 복원]: 사용자 요청에 따라 헤더 카테고리 네비게이션에 '전체' 탭 복원 반영 (전체, 마크다운 가이드, 기술 인사이트, 사용자 활용)
// 🚨 @PATCH : **2026-09-26** — [블로그 헤더 간소화 및 메뉴 재정돈]: 헤더에서 검색창, '글쓰기' 버튼 제거하고 카테고리와 홈 링크로 슬림화
// 🚨 @PATCH : **2026-09-26** — [블로그 헤더 랜딩페이지 색상 적용]: 랜딩페이지(#0B0F19, border-white/10) 컬러 스킴 적용
// 🔗 @CALLS : Link, useRouter, BlogCategory, useBlogCategories
// ====================================================================
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlogCategory } from "@/lib/blogData";
import { useBlogCategories } from "@/lib/blogCategories";
import { Home } from "lucide-react";

interface BlogHeaderProps {
  selectedCategory?: BlogCategory;
  onSelectCategory?: (category: BlogCategory) => void;
}

export function BlogHeader({
  selectedCategory = "전체",
  onSelectCategory,
}: BlogHeaderProps) {
  const router = useRouter();

  const headerCategories = [{ value: '전체', name: '전체' }, ...useBlogCategories().filter(category => category.active)];

  const handleCategoryClick = (category: BlogCategory) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    } else {
      if (category === "전체") {
        router.push("/blog");
      } else {
        router.push(`/blog?category=${encodeURIComponent(category)}`);
      }
    }
  };

  return (
    <header
      className="sticky top-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
      style={{
        fontFamily: "Pretendard, LineSeed, sans-serif",
      }}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-[76px] gap-4">
          {/* Logo & Blog Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/blog" className="flex items-center gap-2.5 group">
              <img
                src="/icon.png"
                alt="Onrivi"
                className="h-8 w-8 rounded-lg shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="font-extrabold text-[19px] text-white tracking-tight">
                Onrivi <span className="text-[#60a5fa] font-black">Blog</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block w-px h-4 bg-white/20" />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-[#1d4ed8]/20 text-[#60a5fa] border border-[#1d4ed8]/40 tracking-wider uppercase">
              TECH INSIGHTS
            </span>
          </div>

          {/* Desktop Blog Category Menus */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3">
            {headerCategories.map((category) => {
              const isActive = selectedCategory === category.value;
              return (
                <button
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className={`px-4 py-2 rounded-xl text-[14px] font-bold tracking-tight transition-all ${
                    isActive
                      ? "bg-[#1d4ed8] text-white shadow-xs font-black"
                      : "text-zinc-300 hover:text-white hover:bg-white/10 font-semibold"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Homepage Link */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Home size={15} />
              <span>홈페이지</span>
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Category Scroll Bar */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 border-t border-white/10">
          {headerCategories.map((category) => {
            const isActive = selectedCategory === category.value;
            return (
              <button
                key={category.value}
                onClick={() => handleCategoryClick(category.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#1d4ed8] text-white shadow-xs font-black"
                    : "text-zinc-400 hover:text-white hover:bg-white/10 font-semibold"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
