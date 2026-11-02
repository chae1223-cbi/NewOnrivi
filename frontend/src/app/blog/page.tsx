// ====================================================================
// 📊 [OMD-PAGE-Blog-0001] blog/page.tsx ➔ 온리비 공식 기술 블로그 메인 화면
// 🎯 @KICK  : 슬림화된 BlogHeader, 본문 내 고성능 검색 인풋, 카드형 기술 블로그 목록, 카테고리 필터링 및 BlogFooter 연동
// 🛡️ @GUARD : Suspense 래핑 기반 SSR 쿼리 파라미터 동기화, 로컬스토리지 동기화 가드 및 검색 결과 빈 상태(Empty State) 예외 처리
// 🚨 @PATCH : **2026-09-26** — [헤더 전체 메뉴 복원 동기화]: 헤더 카테고리 네비게이션에 '전체' 탭 복원 및 메인 검색창과의 연동 동기화
// 🚨 @PATCH : **2026-09-26** — [본문 검색바 탑재 및 카테고리/버튼 정리]: 본문 카테고리 필 및 '직접 글 써보고 게시하기' 버튼 제거, 헤더의 검색을 본문 중앙 검색바로 이전
// 🚨 @PATCH : **2026-09-26** — [블로그 헤더/푸터 블로그 메뉴 재구성 및 랜딩페이지 색상 적용]: BlogHeader 및 BlogFooter 랜딩페이지 색상(#0B0F19) 일원화 반영
// 🔗 @CALLS : BlogHeader, BlogFooter, BlogFeaturedCard, BlogCard, getAllBlogPosts, useBlogCategories
// ====================================================================
"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BlogCategory, getAllBlogPosts } from "@/lib/blogData";
import { categoryName, useBlogCategories } from "@/lib/blogCategories";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { BlogFeaturedCard } from "@/components/blog/BlogFeaturedCard";
import { BlogCard } from "@/components/blog/BlogCard";
import { Sparkles, BookOpen, SearchX, Search, X, PenTool } from "lucide-react";
import Link from "next/link";

function BlogPageContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const queryParam = searchParams.get("search");

  const posts = getAllBlogPosts();
  const categories = useBlogCategories();
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory>("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // URL 파라미터 초기 동기화
  useEffect(() => {
    const matchedCategory = categories.find(category => category.value === categoryParam || category.name === categoryParam);
    setSelectedCategory(matchedCategory?.value || '전체');
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [categoryParam, queryParam, categories]);

  // 검색 및 카테고리 필터링
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchCategory =
        selectedCategory === "전체" || post.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  // 주요 게시글 (Featured) 분리
  const featuredPost = useMemo(() => {
    if (selectedCategory !== "전체" || searchQuery) return null;
    return posts.find((p) => p.isFeatured) || posts[0] || null;
  }, [posts, selectedCategory, searchQuery]);

  // 추천 글만 발행된 경우에도 최신글을 0개로 표시하지 않도록 목록에 남긴다.
  // 다른 글이 있을 때만 추천 글을 그리드에서 분리해 중복 노출을 줄인다.
  const gridPosts = useMemo(() => {
    if (featuredPost && filteredPosts.length > 1 && selectedCategory === "전체" && !searchQuery) {
      return filteredPosts.filter((p) => p.id !== featuredPost.id);
    }
    return filteredPosts;
  }, [filteredPosts, featuredPost, selectedCategory, searchQuery]);

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0D14] text-slate-900 dark:text-slate-100 flex flex-col"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* 1. 글로벌 블로그 상단 헤더 (전체/가이드/인사이트/활용 카테고리 네비게이션) */}
      <BlogHeader
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Intro Sub-Hero */}
        <div className="mb-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase mb-3 shadow-2xs">
            <Sparkles size={13} />
            ONRIVI TECH BLOG & INSIGHTS
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
            온리비 어서의 이야기와 기술
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            온리비 어서의 소개부터 문서 활용법과 기술 이야기까지 한눈에 확인하세요.
          </p>
        </div>

        {/* 2. 본문 검색창 (기존 본문 카테고리 버튼들을 대체하여 배치) */}
        <div className="mb-10 max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="궁금한 마크다운 사용법이나 기술 주제를 검색해 보세요..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl text-sm sm:text-base bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 focus:outline-hidden focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs transition-all"
            />
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                title="검색어 지우기"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* 현재 선택된 카테고리 필터 표시 (필요 시 전체로 복귀 가능) */}
          {selectedCategory !== "전체" && (
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-600 dark:text-zinc-400 font-medium">
              <span>카테고리 필터:</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#1d4ed8] dark:text-blue-400 font-extrabold border border-blue-200 dark:border-blue-900">
                {categoryName(selectedCategory, categories)}
              </span>
              <button
                onClick={() => setSelectedCategory("전체")}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline ml-1 cursor-pointer"
              >
                필터 해제 (전체 글 보기)
              </button>
            </div>
          )}
        </div>

        {/* 3. 주요 게시글 (Featured Banner) */}
        {featuredPost && <BlogFeaturedCard post={featuredPost} />}

        {/* 4. 최신글 헤더 및 카드 그리드 */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                {searchQuery
                  ? `검색 결과 ("${searchQuery}")`
                  : selectedCategory === "전체"
                  ? "최신글"
                  : selectedCategory}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                {gridPosts.length}개
              </span>
            </div>
          </div>

          {/* 카드 목록 */}
          {gridPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {gridPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
              <SearchX size={44} className="mx-auto text-slate-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2">
                {posts.length === 0 ? '아직 발행된 글이 없습니다.' : '일치하는 게시글을 찾을 수 없습니다.'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
                {posts.length === 0
                  ? '새로운 문서가 발행되면 이곳에서 확인할 수 있습니다.'
                  : '검색어를 변경하거나 다른 카테고리를 선택해 보세요.'}
              </p>
              {posts.length > 0 && <button
                onClick={() => {
                  setSelectedCategory("전체");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-[#1d4ed8] hover:bg-blue-100 transition-colors"
              >
                전체 글 목록으로 돌아가기
              </button>}
            </div>
          )}
        </section>

        {/* 5. 하단 CTA 배너 (온리비 소개) */}
        <section className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-4">
              <BookOpen size={13} />
              DOGFOODING & AUTHORING
            </span>
            <h3 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">
              이 블로그의 모든 글은 온리비 어서(Onrivi Author)로 작성되었습니다.
            </h3>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed mb-6 font-normal">
              복잡한 서식 설정 없이 오직 글에만 집중하세요. 에디터에서 작성한 마크다운을 블로그 레이아웃으로 즉시 미리보고 단 1초 만에 깔끔한 웹 아티클로 게시할 수 있습니다.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white text-[#1d4ed8] hover:bg-blue-50 shadow-md transition-all active:scale-95 text-sm"
            >
              온리비 어서 자세히 알아보기 →
            </Link>
          </div>
        </section>
      </main>

      {/* 3. 랜딩페이지 색상(#0B0F19) 및 블로그 메뉴로 구성된 하단 푸터 */}
      <BlogFooter />
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0D14]" />}>
      <BlogPageContent />
    </Suspense>
  );
}
