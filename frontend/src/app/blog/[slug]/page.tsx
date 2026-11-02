// ====================================================================
// 📊 [OMD-PAGE-BlogDetail-0001] blog/[slug]/page.tsx ➔ 블로그 아티클 상세 뷰어
// 🎯 @KICK  : 랜딩페이지 딥 네이비(#0B0F19) 색상 시스템 기반 BlogHeader 및 BlogFooter 연동, [문서 뷰] 및 [마크다운으로 보기] 실시간 전환 탭, 원문 마크다운 소스 뷰어 및 원클릭 복사 탑재
// 🛡️ @GUARD : 미존재 슬러그 404 안내, 이미지 로드 실패 시 디폴트 커버 폴백 및 마크다운 복사 토스트 피드백
// 🚨 @PATCH : **2026-10-09** — [블로그 상세 태그 인터랙티브 링크 및 본문/프론트매터 자동 파싱]: getPostTags 신설로 태그 자동 수집, 태그 클릭 시 블로그 목록 검색 연동, 고대비 태그 칩 렌더링
// 🚨 @PATCH : **2026-10-09** — [블로그 아티클 첨부파일 다운로드 허브 UI 및 자동 추출 엔진 탑재]: 프론트매터 및 본문 내 실습 예제(마크다운 원고, 전자책 샘플 EPUB, PDF 등) 첨부파일 자동 인식 및 원클릭 다운로드 카드 섹션 렌더링
// 🚨 @PATCH : **2026-09-26** — [마크다운으로 보기 뷰어 기능 추가]: '문서 뷰' ↔ '마크다운으로 보기' 원클릭 토글 탭, 파일명/글자수 메타 바가 포함된 다크 코드 뷰어 및 마크다운 원문 복사 액션 탑재
// 🚨 @PATCH : **2026-09-26** — [첫 번째 이미지 썸네일/디폴트 커버 및 헤더 슬림화 반영]: getPostThumbnail 적용, 디폴트 커버 폴백, 상단 에디터 열기 버튼 제거
// 🔗 @CALLS : BlogHeader, BlogFooter, getBlogPostBySlug, getAllBlogPosts, getPostThumbnail, DEFAULT_BLOG_COVER, ReactMarkdown, remarkGfm
// ====================================================================
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BlogPost, BlogAttachment, getBlogPostBySlug, getAllBlogPosts, getPostThumbnail, DEFAULT_BLOG_COVER } from "@/lib/blogData";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogQuote } from "@/components/blog/BlogQuote";
import { extractFrontmatter } from "@/lib/frontmatter";
import { categoryName, useBlogCategories } from "@/lib/blogCategories";
import { getBlogProfileClass, hancomBlogCss } from "@/lib/blogProfileStyle";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Clock,
  ArrowLeft,
  Share2,
  Check,
  Tag,
  BookOpen,
  FileCode,
  Eye,
  Copy,
  Paperclip,
  FileDown,
  Download,
} from "lucide-react";


/**
 * 블로그 아티클에서 첨부파일 목록을 추출합니다. (post.attachments, frontmatter, 본문 다운로드 링크)
 */
function getPostAttachments(post: BlogPost, frontmatter: Record<string, any>, content: string): BlogAttachment[] {
  const result: BlogAttachment[] = [];

  // 1. post 객체에 attachments가 있는 경우
  if (Array.isArray(post.attachments) && post.attachments.length > 0) {
    result.push(...post.attachments);
  }

  // 2. 프론트매터에 attachments 필드가 있는 경우
  if (frontmatter && frontmatter.attachments) {
    try {
      const parsed = typeof frontmatter.attachments === 'string'
        ? JSON.parse(frontmatter.attachments)
        : frontmatter.attachments;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.url && !result.some(r => r.url === item.url)) {
            result.push(item);
          }
        }
      }
    } catch {}
  }

  // 3. 본문 내 [다운로드: 파일명 | 크기 | 설명](URL) 또는 [첨부파일: 파일명 | 크기](URL) 구문 자동 추출
  const linkRegex = /\[(?:다운로드|첨부파일|파일첨부):\s*([^\]|]+)(?:\|\s*([^\]|]+))?(?:\|\s*([^\]|]+))?\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const name = match[1]?.trim();
    const part2 = match[2]?.trim();
    const part3 = match[3]?.trim();
    const rawUrl = match[4]?.trim();
    const url = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`) : '';
    if (name && url && !result.some(r => r.url === url)) {
      const isSizePart2 = part2 && /(?:kb|mb|gb|bytes)/i.test(part2);
      const isSizePart3 = part3 && /(?:kb|mb|gb|bytes)/i.test(part3);
      const size = isSizePart2 ? part2 : (isSizePart3 ? part3 : undefined);
      const description = !isSizePart2 && part2 ? part2 : (part3 || undefined);
      result.push({ name, url, size, description });
    }
  }

  return result;
}

/**
 * 블로그 아티클에서 태그 목록을 안전하게 추출 및 병합합니다. (post.tags, frontmatter.tags, 본문 태그)
 */
function getPostTags(post: BlogPost, frontmatter: Record<string, any>, content: string): string[] {
  const tagSet = new Set<string>();

  // 1. post 객체에 tags가 있는 경우
  if (Array.isArray(post.tags)) {
    post.tags.forEach((t) => {
      const clean = t.trim().replace(/^#/, '');
      if (clean) tagSet.add(clean);
    });
  }

  // 2. 프론트매터에 tags 필드가 있는 경우
  if (frontmatter && frontmatter.tags) {
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach((t: any) => {
        if (typeof t === 'string') {
          const clean = t.trim().replace(/^#/, '');
          if (clean) tagSet.add(clean);
        }
      });
    } else if (typeof frontmatter.tags === 'string') {
      const cleaned = frontmatter.tags.replace(/^\[|\]$/g, '');
      cleaned.split(/[,#\s]+/).forEach((t: string) => {
        const clean = t.trim().replace(/^#/, '');
        if (clean) tagSet.add(clean);
      });
    }
  }

  // 3. 본문 내 '태그: #태그1 #태그2' 또는 'Tags: tag1, tag2' 구문 자동 추출
  const tagLines = content.match(/(?:^|\n)(?:태그|Tags?)\s*:\s*([^\n\r]+)/i);
  if (tagLines && tagLines[1]) {
    const rawTokens = tagLines[1].split(/[,#\s]+/);
    rawTokens.forEach((t) => {
      const clean = t.trim().replace(/^#/, '');
      if (clean && clean.length > 0 && !clean.includes(':')) {
        tagSet.add(clean);
      }
    });
  }

  return Array.from(tagSet);
}

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [viewMode, setViewMode] = useState<"rendered" | "markdown">("rendered");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const categories = useBlogCategories();

  useEffect(() => {
    setMounted(true);
    if (!slug) return;

    const currentPost = getBlogPostBySlug(slug);
    setPost(currentPost || null);
    setAllPosts(getAllBlogPosts());
  }, [slug]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMarkdown = () => {
    if (typeof window === "undefined" || !post) return;
    navigator.clipboard.writeText(post.content);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  // 문서 뷰에서는 서식 프로필 등 원고 메타정보를 숨기고, 원본 보기에는 그대로 보존한다.
  const { content: renderedContent, data: frontmatter } = useMemo(() => {
    if (!post) return { content: "", data: {} };
    return extractFrontmatter(post.content);
  }, [post]);

  const tags = useMemo(() => {
    if (!post) return [];
    return getPostTags(post, frontmatter, post.content);
  }, [post, frontmatter]);

  const attachments = useMemo(() => {
    if (!post) return [];
    return getPostAttachments(post, frontmatter, post.content);
  }, [post, frontmatter]);

  // 연관 포스트 (현재 글 제외 최대 3개)
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return allPosts
      .filter((p) => p.id !== post.id && (p.category === post.category || p.tags.some((t) => tags.includes(t.replace(/^#/, '')))))
      .slice(0, 3);
  }, [allPosts, post, tags]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0D14] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d4ed8]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div
        className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0D14] text-slate-900 dark:text-slate-100 flex flex-col"
        style={{ fontFamily: "Pretendard, sans-serif" }}
      >
        <BlogHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-zinc-800 text-[#1d4ed8] flex items-center justify-center mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">게시글을 찾을 수 없습니다</h1>
          <p className="text-slate-500 dark:text-zinc-400 max-w-md mb-6 text-sm">
            요청하신 글이 삭제되었거나 주소가 올바르지 않습니다.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[#1d4ed8] text-white hover:bg-blue-700 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            블로그 목록으로 돌아가기
          </Link>
        </div>
        <BlogFooter />
      </div>
    );
  }

  const thumbnailSrc = getPostThumbnail(post);
  const blogProfileClass = getBlogProfileClass(frontmatter);
  // 페이지 머리말이 문서의 첫 H1을 대신한다. 원본 마크다운은 그대로 보존한다.
  const articleContent = renderedContent.replace(/^\s*#\s+[^\r\n]+(?:\r?\n|$)/, '').trimStart();
  // 첫 본문 이미지가 이미 대표 이미지라면 상세 화면에서 별도 배너를 반복하지 않는다.
  const showCoverBanner = !renderedContent.includes(thumbnailSrc);

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0D14] text-slate-900 dark:text-slate-100 flex flex-col"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* 1. 상단 글로벌 헤더 */}
      <BlogHeader selectedCategory={post.category} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Top Breadcrumb & View Toggle / Share Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-zinc-300 hover:text-[#1d4ed8] dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>← 블로그 목록으로 돌아가기</span>
          </Link>

          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle: [문서 뷰] vs [마크다운으로 보기] */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
              <button
                onClick={() => setViewMode("rendered")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "rendered"
                    ? "bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-white shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="일반 리치 문서 형태로 읽기"
              >
                <Eye size={13} />
                <span>문서 뷰</span>
              </button>
              <button
                onClick={() => setViewMode("markdown")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "markdown"
                    ? "bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-white shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="원본 마크다운 소스로 보기"
              >
                <FileCode size={13} />
                <span>마크다운으로 보기</span>
              </button>
            </div>

            {viewMode === "markdown" ? (
              <button
                onClick={handleCopyMarkdown}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1d4ed8] text-white hover:bg-blue-700 transition-colors shadow-2xs"
                title="마크다운 소스 복사"
              >
                {copiedMarkdown ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedMarkdown ? "복사완료!" : "마크다운 복사"}</span>
              </button>
            ) : (
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                title="링크 복사"
              >
                {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                <span>{copiedLink ? "복사완료!" : "링크 공유"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Article Header */}
        <div className="mb-10 sm:mb-12">
          {/* Breadcrumb Category */}
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 dark:text-zinc-400">
            <Link href="/blog" className="hover:text-[#1d4ed8]">
              블로그
            </Link>
            <span>/</span>
            <span className="text-[#1d4ed8] dark:text-blue-400 font-extrabold">{categoryName(post.category, categories)}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white leading-tight mb-5">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed font-normal mb-6">
            {post.excerpt}
          </p>

          {/* Author & Date Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-slate-200/80 dark:border-zinc-800 text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#1d4ed8] dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                OA
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">{post.author}</span>
                <span className="mx-2 text-slate-300 dark:text-zinc-700">·</span>
                <span>{post.publishedAt}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400" />
              <span>읽는 시간 약 {post.readingTime}</span>
            </div>
          </div>
        </div>

        {/* Featured Visual Banner (첫 번째 이미지 or 디폴트 커버) */}
        {showCoverBanner && <div className="mb-10 rounded-2xl overflow-hidden aspect-16/9 bg-slate-900 shadow-md">
          <img
            src={thumbnailSrc}
            alt={post.title}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_BLOG_COVER;
            }}
            className="w-full h-full object-cover"
          />
        </div>}

        {/* Content Viewer: [문서 뷰] vs [마크다운으로 보기] */}
        {viewMode === "rendered" ? (
          /* 1. 일반 리치 문서 렌더링 뷰 */
          <article className={`${blogProfileClass || 'prose prose-slate lg:prose-lg dark:prose-invert'} max-w-none mb-12 sm:mb-16 leading-relaxed`}>
            {blogProfileClass && <style>{hancomBlogCss}</style>}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                blockquote: ({ children }) => <BlogQuote>{children}</BlogQuote>,
                img: ({ src, alt, ...props }) => {
                  const normalizedSrc = src && !src.startsWith('http') && !src.startsWith('/') ? `/${src}` : src;
                  return (
                    <img
                      src={normalizedSrc}
                      alt={alt || ''}
                      className="rounded-2xl shadow-xs my-6 max-w-full h-auto mx-auto border border-slate-200/80 dark:border-zinc-800"
                      {...props}
                    />
                  );
                },
              }}
            >
              {articleContent}
            </ReactMarkdown>
          </article>
        ) : (
          /* 2. 원본 마크다운 소스 코드 뷰어 */
          <div className="mb-12 sm:mb-16 rounded-2xl overflow-hidden border border-slate-300 dark:border-zinc-800 bg-[#0B0F19] text-slate-100 shadow-xl">
            {/* Code Header Bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-black/50 border-b border-white/10 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                </div>
                <span className="font-bold text-zinc-300 text-xs ml-1 flex items-center gap-1.5">
                  <FileCode size={13} className="text-[#60a5fa]" />
                  {post.slug}.md
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 font-sans hidden sm:inline">
                  {post.content.length}자 • UTF-8 Markdown
                </span>
                <button
                  onClick={handleCopyMarkdown}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {copiedMarkdown ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedMarkdown ? "복사됨!" : "소스 복사"}</span>
                </button>
              </div>
            </div>
            {/* Raw Markdown Pre */}
            <pre className="p-6 sm:p-8 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap select-all text-slate-200 selection:bg-[#1d4ed8]/30">
              <code>{post.content}</code>
            </pre>
          </div>
        )}

        {/* 📥 Attachments Section (첨부파일 다운로드 허브) */}
        {attachments.length > 0 && (
          <div className="mb-12 p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                <Paperclip className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
                <span>첨부파일 및 실습 자료 ({attachments.length})</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">클릭하여 파일 다운로드</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  download={file.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700/80 hover:border-[#1d4ed8] dark:hover:border-blue-500 hover:shadow-xs transition-all duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1d4ed8] dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 transition-colors">
                        {file.name}
                      </p>
                      {file.description && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {file.size && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                        {file.size}
                      </span>
                    )}
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="pt-6 pb-10 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-zinc-400 mr-2">
              <Tag size={14} className="text-[#1d4ed8] dark:text-blue-400" />
              태그:
            </span>
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?search=${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-950/40 text-slate-700 hover:text-[#1d4ed8] dark:text-zinc-300 dark:hover:text-blue-400 border border-slate-200/60 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-2xs group"
                title={`'#${tag}' 태그가 포함된 글 모아보기`}
              >
                <span className="text-[#1d4ed8]/70 dark:text-blue-400/70 font-bold group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400">#</span>
                <span>{tag}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Author Box */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 mb-14 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src="/icon_onriveauther.png?v=1"
            alt="Onrivi Author"
            className="w-14 h-14 rounded-2xl shadow-xs"
          />
          <div className="text-center sm:text-left">
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              온리비 어서(Onrivi Author) 에디토리얼 팀
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              한글 타이핑과 마크다운 저작 환경의 불편함을 해소하고, 생각의 본질에 집중할 수 있는 차세대 로컬 우선 저작 도구를 연구하고 개발합니다.
            </p>
          </div>
        </div>

        {/* Bottom Banner (온리비 소개) */}
        <section className="bg-blue-800 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl mb-16 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-black mb-2">
              이 글처럼 깔끔한 마크다운을 직접 작성해 보세요.
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-lg">
              회원가입 없이 즉시 브라우저에서 사용할 수 있습니다. 서식 깨짐 없는 표와 수식을 온리비에서 경험하세요.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white text-[#1d4ed8] hover:bg-blue-50 shadow-md transition-all active:scale-95 text-sm shrink-0"
          >
            온리비 소개 보기 →
          </Link>
        </section>

        {/* Related Posts Section */}
        {relatedPosts.length > 0 && (
          <section className="pt-10 border-t border-slate-200 dark:border-zinc-800">
            <h3 className="text-xl font-black text-slate-950 dark:text-white mb-6">
              함께 읽으면 좋은 추천 글
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rPost) => (
                <BlogCard key={rPost.id} post={rPost} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 2. 하단 글로벌 푸터 */}
      <BlogFooter />
    </div>
  );
}
