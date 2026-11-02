// ====================================================================
// 📊 [OMD-UI-BlogFeaturedCard-0001] BlogFeaturedCard ➔ 한컴 블로그 스타일 주요 추천 포스트 히어로 배너
// 🎯 @KICK  : 본문 첫 번째 이미지 자동 추출 썸네일 또는 디폴트 커버 이미지 렌더링, 상단 16:9 비주얼 영역과 좌/우 2열 반응형 배너로 주요 게시글을 강조 렌더링
// 🛡️ @GUARD : 반응형 모바일(단일열)/데스크톱(2열) 유연 레이아웃 가드, 이미지 로드 실패 시 디폴트 커버 onError 가드
// 🚨 @PATCH : **2026-09-26** — [첫 번째 이미지 썸네일 및 디폴트 커버 적용]: getPostThumbnail 연동으로 본문 첫 이미지 우선 표출 및 미존재 시 디폴트 커버 노출
// 🔗 @CALLS : Link, BlogPost, getPostThumbnail, DEFAULT_BLOG_COVER
// ====================================================================
"use client";

import React from "react";
import Link from "next/link";
import { BlogPost, getPostThumbnail, DEFAULT_BLOG_COVER } from "@/lib/blogData";
import { categoryName, useBlogCategories } from "@/lib/blogCategories";
import { Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";

interface BlogFeaturedCardProps {
  post: BlogPost;
}

export function BlogFeaturedCard({ post }: BlogFeaturedCardProps) {
  const thumbnailSrc = getPostThumbnail(post);
  const categoryLabel = categoryName(post.category, useBlogCategories());

  return (
    <section className="mb-14 sm:mb-16">
      <Link
        href={`/blog/${post.slug}`}
        className="group block relative bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-zinc-800 shadow-md hover:shadow-2xl transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Visual Banner (7 cols) */}
          <div className="lg:col-span-7 relative aspect-16/9 lg:aspect-auto overflow-hidden bg-slate-900 min-h-[260px] sm:min-h-[340px]">
            <img
              src={thumbnailSrc}
              alt={post.title}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_BLOG_COVER;
              }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0B0F19]/80 backdrop-blur-md text-white border border-white/10 shadow-xs">
                <Sparkles size={13} className="text-amber-300" />
                주요 추천 게시글
              </span>
            </div>
          </div>

          {/* Text Content (5 cols) */}
          <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-between bg-white dark:bg-zinc-900">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-extrabold bg-blue-50 dark:bg-blue-950/60 text-[#1d4ed8] dark:text-blue-400">
                  {categoryLabel}
                </span>
                <span className="text-xs font-semibold text-slate-400">FEATURED ARTICLE</span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 transition-colors leading-tight mb-4">
                {post.title}
              </h2>

              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 leading-relaxed line-clamp-3 mb-6">
                {post.excerpt}
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  {post.publishedAt}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  {post.readingTime}
                </span>
              </div>

              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#1d4ed8] dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                읽어보기
                <ArrowRight size={16} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
