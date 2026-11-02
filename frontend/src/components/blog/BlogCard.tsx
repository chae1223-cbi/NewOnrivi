// ====================================================================
// 📊 [OMD-UI-BlogCard-0001] BlogCard ➔ 한컴 블로그 스타일 반응형 포스트 카드
// 🎯 @KICK  : 본문 첫 번째 이미지 자동 추출 썸네일 또는 디폴트 커버 이미지 렌더링, 카테고리 뱃지, 제목 호버 효과, 날짜/읽는시간 메타데이터를 제공하는 카드 UI
// 🛡️ @GUARD : text clamp(제목 2줄, 요약 2줄), 이미지 로드 실패 시 디폴트 커버 폴백 onError 가드
// 🚨 @PATCH : **2026-09-26** — [첫 번째 이미지 썸네일 및 디폴트 커버 적용]: getPostThumbnail 연동으로 본문 첫 이미지 우선 표출 및 미존재 시 디폴트 커버 노출
// 🔗 @CALLS : Link, BlogPost, getPostThumbnail, DEFAULT_BLOG_COVER
// ====================================================================
"use client";

import React from "react";
import Link from "next/link";
import { BlogPost, getPostThumbnail, DEFAULT_BLOG_COVER } from "@/lib/blogData";
import { categoryName, useBlogCategories } from "@/lib/blogCategories";
import { Clock, Calendar } from "lucide-react";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const thumbnailSrc = getPostThumbnail(post);
  const categoryLabel = categoryName(post.category, useBlogCategories());

  return (
    <article className="group relative flex flex-col bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500">
      <Link href={`/blog/${post.slug}`} className="flex flex-col h-full focus:outline-hidden">
        {/* 16:9 Thumbnail Image */}
        <div className="relative w-full aspect-16/9 overflow-hidden bg-slate-900">
          <img
            src={thumbnailSrc}
            alt={post.title}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_BLOG_COVER;
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0B0F19]/80 backdrop-blur-md text-white border border-white/10 shadow-xs">
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between">
          <div>
            {/* Category */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 uppercase tracking-wide">
                {categoryLabel}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug mb-2.5">
              {post.title}
            </h3>

            {/* Excerpt */}
            <p className="text-sm text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
              {post.excerpt}
            </p>
          </div>

          {/* Footer Metadata */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-500 font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <span>{post.publishedAt}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span>{post.readingTime}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
