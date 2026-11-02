// ====================================================================
// 📊 [OMD-UI-BlogPostModal-0001] BlogPostModal ➔ 에디터 마크다운 블로그 미리보기 및 즉시 발행 모달
// 🎯 @KICK  : 온리비 어서에서 작성 중인 마크다운을 분석하여 한컴 블로그 스타일 카드 및 아티클로 실시간 미리보고 즉시 블로그에 게시하는 통합 관리 모달
// 🛡️ @GUARD : 포털 렌더링, 키다운 전파 차단(Monaco 충돌 방지), 제목 필수 입력 유효성 검증
// 🚨 @PATCH : **2026-09-26** — [본문 첫 이미지 썸네일 자동 감지]: 마크다운 본문 내 첫 이미지 자동 추출 및 커버 이미지 기본값 설정 연동
// 🚨 @PATCH : **2026-09-26** — [에디터 블로그 초안 저장 기능 표준화]: 일반 사용자의 임의 직발행을 방지하고 관리자 승인 대기 초안(draft)으로 안전하게 저장되도록 버튼 텍스트 및 안내 개선
// 🚨 @PATCH : **2026-09-26** — [에디터 블로그 미리보기 및 발행 모달 신설]: 실시간 블로그 카드 미리보기 탭, 메타데이터 자동 추출 및 원클릭 로컬스토리지 블로그 발행 지원
// 🔗 @CALLS : createPortal, saveBlogDraft, extractPostFromMarkdown, BlogCard
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  BlogPost,
  extractPostFromMarkdown,
  BlogCategory,
} from "@/lib/blogData";
import { useBlogCategories } from "@/lib/blogCategories";
import { saveBlogDraft } from "@/lib/blogApi";
import { BlogCard } from "@/components/blog/BlogCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  Send,
  Eye,
  Settings,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  Image as ImageIcon,
} from "lucide-react";

interface BlogPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  currentFileName?: string;
  isDarkMode?: boolean;
}

export default function BlogPostModal({
  isOpen,
  onClose,
  markdownContent,
  currentFileName = "document.md",
  isDarkMode = false,
}: BlogPostModalProps) {
  useModalEscape(isOpen, onClose);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "preview">("preview");

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BlogCategory>("");
  const allCategories = useBlogCategories();
  const categories = useMemo(() => allCategories.filter(item => item.active), [allCategories]);
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tagsInput, setTagsInput] = useState("마크다운, 팁");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (categories.length) {
      setCategory(current => categories.some(item => item.value === current) ? current : categories[0].value);
    }
  }, [categories]);

  // 모달이 열릴 때 현재 마크다운 본문에서 메타데이터 자동 추출
  useEffect(() => {
    if (isOpen) {
      const extracted = extractPostFromMarkdown(markdownContent, currentFileName);
      setTitle(extracted.title);
      setExcerpt(extracted.excerpt);
      setCoverImage(extracted.coverImage || "");
      setIsSaving(false);
      setIsPublished(false);
      setPublishedSlug("");
    }
  }, [isOpen, markdownContent, currentFileName]);

  if (!isOpen || !mounted) return null;

  // 태그 배열 파싱
  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // 미리보기용 임시 포스트 객체
  const previewPost: BlogPost = {
    id: "preview",
    slug: publishedSlug || "preview-slug",
    title: title || "제목을 입력해주세요",
    excerpt: excerpt || "본문 첫 문단이 여기에 요약문으로 표시됩니다.",
    content: markdownContent,
    category,
    author: "Onrivi Author",
    publishedAt: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    readingTime: `${Math.max(1, Math.ceil(markdownContent.length / 400))}분`,
    coverImage: coverImage || undefined,
    gradientBg: "from-blue-700 via-indigo-700 to-slate-900",
    tags,
  };

  const handlePublish = async () => {
    if (isSaving || isPublished) return;
    if (!categories.some(item => item.value === category)) {
      alert('블로그 분류를 불러온 뒤 선택해 주세요.');
      return;
    }
    if (!title.trim()) {
      alert("포스트 제목을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveBlogDraft({
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: markdownContent,
        category,
        author: "Onrivi Author",
        coverImage: coverImage.trim() || undefined,
        gradientBg: "from-blue-700 via-indigo-700 to-slate-900",
        tags,
        status: "draft", // 기본적으로 관리자 승인 대기 초안(draft)으로 저장
      });

      setIsPublished(true);
      setPublishedSlug(saved.slug);
    } catch (err) {
      alert(err instanceof Error ? err.message : "블로그 초안 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      style={{ overflowY: "auto" }}
      onKeyDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#12151B] text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-[#1d4ed8] dark:text-blue-400">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                기술 블로그 미리보기 및 초안 저장
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                작성 중인 마크다운을 블로그 스타일로 미리보고, 관리자 승인 대기 초안으로 저장합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800 border border-slate-300/40 dark:border-zinc-700 text-xs font-bold">
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "preview"
                    ? "bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                <Eye size={14} />
                <span>미리보기</span>
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "settings"
                    ? "bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
                }`}
              >
                <Settings size={14} />
                <span>메타 설정</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Success Banner */}
          {isPublished && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-900 dark:text-blue-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    블로그 초안(Draft)으로 안전하게 저장되었습니다!
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-300">
                    주소 {publishedSlug} · 관리자 페이지(/admin?tab=blog)에서 초안을 검토하고 선택하여 정식 발행할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/admin?tab=blog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1d4ed8] hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  <ExternalLink size={13} />
                  관리자 페이지로 이동
                </a>
              </div>
            </div>
          )}

          {activeTab === "preview" ? (
            /* PREVIEW TAB */
            <div className="space-y-8">
              {/* 1. Card Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    1. 블로그 메인 화면 카드 미리보기 (Card Preview)
                  </h4>
                  <span className="text-[11px] text-slate-400">실제 블로그 목록에 표시되는 카드 형태</span>
                </div>
                <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800">
                  <BlogCard post={previewPost} />
                </div>
              </div>

              {/* 2. Article Full Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    2. 본문 상세 페이지 미리보기 (Article View)
                  </h4>
                  <span className="text-[11px] text-slate-400">클릭 시 열리는 상세 읽기 페이지</span>
                </div>
                <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs">
                  {/* Category & Title */}
                  <span className="inline-block px-3 py-1 rounded-md text-xs font-extrabold bg-blue-50 dark:bg-blue-950 text-[#1d4ed8] dark:text-blue-400 mb-3">
                    {previewPost.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mb-3">
                    {previewPost.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
                    {previewPost.excerpt}
                  </p>

                  {/* Markdown Body */}
                  <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdownContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SETTINGS TAB */
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  포스트 제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="블로그 글 제목을 입력하세요"
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 focus:outline-hidden focus:border-[#1d4ed8] text-slate-900 dark:text-white"
                />
              </div>

              {/* 분류를 선택하고 주소는 저장 시 DB에서 자동 발급한다. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    카테고리
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 focus:outline-hidden focus:border-[#1d4ed8] text-slate-900 dark:text-white"
                  >
                    <option value="" disabled>분류를 선택해 주세요</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    글 주소
                  </label>
                  <p className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300">
                    {publishedSlug || "저장할 때 자동 발급됩니다. 예: post-000001"}
                  </p>
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  요약문 (카드에 표시되는 2~3줄 설명)
                </label>
                <textarea
                  rows={3}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="글의 핵심 내용을 요약해 주세요"
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 focus:outline-hidden focus:border-[#1d4ed8] text-slate-900 dark:text-white"
                />
              </div>

              {/* Cover Image & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    커버 이미지 URL (선택)
                  </label>
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 focus:outline-hidden focus:border-[#1d4ed8] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    태그 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="마크다운, 가이드, 보고서"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 focus:outline-hidden focus:border-[#1d4ed8] text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/50">
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            글자 수: <span className="font-bold text-slate-700 dark:text-slate-200">{markdownContent.length}자</span> (예상 {previewPost.readingTime})
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
            >
              닫기
            </button>

            <button
              onClick={handlePublish}
              disabled={isSaving || isPublished}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#1d4ed8] hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} />
              <span>{isPublished ? "초안 저장 완료" : isSaving ? "저장 중..." : "블로그 초안으로 저장하기"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
