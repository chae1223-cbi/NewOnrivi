// ====================================================================
// 📊 [OMD-ADMIN-BlogTab-0001] BlogTab ➔ 온리비 기술 블로그 관리 및 선택 발행 센터
// 🎯 @KICK  : 에디터에서 작성된 초안(Draft)을 검토하고 체크박스로 선택하여 공식 블로그(onrivi.com/blog)에 선택 발행, 비공개 전환, 삭제하는 관리자 통제 센터
// 🛡️ @GUARD : 비인가 임의 발행 차단, 체크박스 다중 일괄 처리, 실시간 미리보기 모달, 고대비 UI 시인성 보장
// 🚨 @PATCH : **2026-09-28** — [관리자 모달 버튼 통일]: 블로그 미리보기·삭제 확인 모달의 기본/보조/위험 버튼을 공통 디자인 시스템으로 교체
// 🚨 @PATCH : **2026-09-26** — [미리보기 모달 마크다운 소스 뷰어 지원]: 관리자 미리보기 모달 내 '문서 뷰' ↔ '마크다운으로 보기' 전환 탭 추가
// 🚨 @PATCH : **2026-09-26** — [기술 블로그 관리 탭 신설]: 초안 목록 선택 일괄 발행(Publish), 공개 글 비공개(초안) 전환, 카드 및 본문 실시간 모달 뷰어 제공
// 🔗 @CALLS : getAdminBlogPosts, changeBlogPublication, BlogCard
// ====================================================================
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BlogPost } from "@/lib/blogData";
import { getAdminBlogPosts, changeBlogPublication, retryBlogDeployment } from "@/lib/blogApi";
import { BlogCard } from "@/components/blog/BlogCard";
import BlogDocumentImport from "./BlogDocumentImport";
import { categoryName, useBlogCategories } from "@/lib/blogCategories";
import { showToast } from "@/utils/toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Send,
  Eye,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  RotateCcw,
  FileText,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Search,
  FileCode,
} from "lucide-react";

export default function BlogTab() {
  const categories = useBlogCategories();
  const [drafts, setDrafts] = useState<BlogPost[]>([]);
  const [published, setPublished] = useState<BlogPost[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"drafts" | "published">("drafts");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasPendingDeployment, setHasPendingDeployment] = useState(false);

  // Selection states
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [selectedPublishedIds, setSelectedPublishedIds] = useState<string[]>([]);

  // Preview Modal
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [previewMode, setPreviewMode] = useState<"rendered" | "markdown">("rendered");

  // Delete Confirmation Modal
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const posts = await getAdminBlogPosts();
      setHasPendingDeployment(posts.some(post => post.deploymentStatus === 'pending' || post.deploymentStatus === 'failed'));
      setDrafts(posts.filter(post => post.status === 'draft'));
      setPublished(posts.filter(post => post.status === 'published'));
      setSelectedDraftIds([]);
      setSelectedPublishedIds([]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '블로그 목록 조회 실패', 'error');
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("onrivi:blog-posts-updated", handleUpdate);
    return () => {
      window.removeEventListener("onrivi:blog-posts-updated", handleUpdate);
    };
  }, [loadData]);

  const handleRetryDeployment = async () => {
    try {
      await retryBlogDeployment();
      showToast('블로그 배포를 다시 요청했습니다.', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '배포 재요청 실패', 'error');
    }
  };

  // Drafts selection helpers
  const handleToggleDraft = (id: string) => {
    setSelectedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllDrafts = () => {
    if (selectedDraftIds.length === filteredDrafts.length) {
      setSelectedDraftIds([]);
    } else {
      setSelectedDraftIds(filteredDrafts.map((d) => d.id));
    }
  };

  // Published selection helpers
  const handleTogglePublished = (id: string) => {
    setSelectedPublishedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPublished = () => {
    if (selectedPublishedIds.length === filteredPublished.length) {
      setSelectedPublishedIds([]);
    } else {
      setSelectedPublishedIds(filteredPublished.map((p) => p.id));
    }
  };

  // Publish Selected Drafts
  const handlePublishSelected = async () => {
    if (selectedDraftIds.length === 0) {
      showToast("발행할 초안을 선택해주세요.", "warning");
      return;
    }

    try {
      const result = await changeBlogPublication('publish', selectedDraftIds);
      showToast(result.deployment === 'requested'
        ? `${selectedDraftIds.length}개 글의 공개 배포를 요청했습니다.`
        : '글은 저장됐지만 배포 요청이 필요합니다. 배포 설정을 확인해 주세요.', 'info');
      await loadData();
      setActiveSubTab("published");
    } catch (error) {
      showToast(error instanceof Error ? error.message : '발행 처리 실패', 'error');
    }
  };

  // Unpublish Selected
  const handleUnpublishSelected = async () => {
    if (selectedPublishedIds.length === 0) {
      showToast("비공개(초안)로 전환할 글을 선택해주세요.", "warning");
      return;
    }

    try {
      const result = await changeBlogPublication('unpublish', selectedPublishedIds);
      showToast(result.deployment === 'requested'
        ? `${selectedPublishedIds.length}개 글의 비공개 배포를 요청했습니다.`
        : '비공개 상태는 저장됐지만 배포 요청이 필요합니다.', 'info');
      await loadData();
      setActiveSubTab("drafts");
    } catch (error) {
      showToast(error instanceof Error ? error.message : '비공개 처리 실패', 'error');
    }
  };

  const handleSingleAction = async (action: 'publish' | 'unpublish', post: BlogPost) => {
    try {
      const result = await changeBlogPublication(action, [post.id]);
      showToast(result.deployment === 'requested'
        ? `'${post.title}' 글의 ${action === 'publish' ? '공개' : '비공개'} 배포를 요청했습니다.`
        : '변경은 저장됐지만 배포 요청이 필요합니다.', 'info');
      setPreviewPost(null);
      await loadData();
      setActiveSubTab(action === 'publish' ? 'published' : 'drafts');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '게시글 상태 변경 실패', 'error');
    }
  };

  // Single Delete
  const confirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      const result = await changeBlogPublication('delete', [deleteConfirmTarget.id]);
      showToast(result.deployment === 'requested'
        ? `'${deleteConfirmTarget.title}' 글과 개정 이력을 DB에서 삭제하고 공개 페이지 재배포를 요청했습니다.`
        : '글과 개정 이력은 DB에서 삭제됐습니다. 공개 페이지는 배포를 다시 요청해 주세요.', 'info');
      await loadData();
      setDeleteConfirmTarget(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '삭제 처리 실패', 'error');
    }
  };

  // Filtered lists based on search
  const filteredDrafts = drafts.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryName(d.category, categories).toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPublished = published.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryName(p.category, categories).toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-[#1d4ed8] dark:text-blue-400">
              <BookOpen size={22} />
            </span>
            <h1 className="text-[28px] font-extrabold text-zinc-950 dark:text-white tracking-tight">
              기술 블로그 관리
            </h1>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 mt-1 text-sm font-medium">
            마크다운 문서를 초안으로 등록하거나 에디터 초안을 검토한 뒤 선택하여 공개 배포합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPendingDeployment && (
            <button onClick={() => { void handleRetryDeployment(); }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200">
              배포 다시 요청
            </button>
          )}
          <a
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700/60 shadow-xs transition-colors"
          >
            <ExternalLink size={15} className="text-[#1d4ed8]" />
            <span>공식 블로그 바로가기 ↗</span>
          </a>
        </div>
      </div>

      <BlogDocumentImport onSaved={loadData} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Drafts KPI */}
        <div
          onClick={() => setActiveSubTab("drafts")}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeSubTab === "drafts"
              ? "bg-amber-500/10 border-amber-500/40 shadow-xs ring-2 ring-amber-500/20"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              게시 대기 초안 (Drafts)
            </span>
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-3xl font-black text-zinc-950 dark:text-white font-mono">
            {drafts.length}
            <span className="text-xs font-normal text-zinc-500 ml-1">건</span>
          </p>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-2">
            관리자 검토 및 선택 발행 필요
          </p>
        </div>

        {/* Published KPI */}
        <div
          onClick={() => setActiveSubTab("published")}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeSubTab === "published"
              ? "bg-[#1d4ed8]/10 border-[#1d4ed8]/40 shadow-xs ring-2 ring-[#1d4ed8]/20"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              공개 설정 글 (배포 대기 포함)
            </span>
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#1d4ed8] dark:text-blue-400">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-3xl font-black text-zinc-950 dark:text-white font-mono">
            {published.length}
            <span className="text-xs font-normal text-zinc-500 ml-1">건</span>
          </p>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-2">
            최종 공개 여부는 Cloudflare 배포 완료 후 확인
          </p>
        </div>

        {/* Total KPI */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              전체 블로그 콘텐츠
            </span>
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <FileText size={16} />
            </span>
          </div>
          <p className="text-3xl font-black text-zinc-950 dark:text-white font-mono">
            {drafts.length + published.length}
            <span className="text-xs font-normal text-zinc-500 ml-1">건</span>
          </p>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-2">
            초안 {drafts.length}건 + 발행 {published.length}건
          </p>
        </div>
      </div>

      {/* Main Tab Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {/* Tab Header & Search / Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/60 dark:bg-zinc-950/40">
          {/* Sub Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-zinc-800 border border-slate-300/40 dark:border-zinc-700 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab("drafts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeSubTab === "drafts"
                  ? "bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-2xs font-extrabold"
                  : "text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white"
              }`}
            >
              <Clock size={14} />
              <span>게시 대기 초안 ({drafts.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("published")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeSubTab === "published"
                  ? "bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-white shadow-2xs font-extrabold"
                  : "text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>공개 발행 글 ({published.length})</span>
            </button>
          </div>

          {/* Search Input & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목, 카테고리, 태그 검색..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-[#1d4ed8]"
              />
            </div>

            {/* Action Buttons depending on tab */}
            {activeSubTab === "drafts" ? (
              <button
                onClick={handlePublishSelected}
                disabled={selectedDraftIds.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-[#1d4ed8] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-all active:scale-95"
              >
                <Send size={13} />
                <span>
                  선택한 글 공식 블로그에 발행 ({selectedDraftIds.length})
                </span>
              </button>
            ) : (
              <button
                onClick={handleUnpublishSelected}
                disabled={selectedPublishedIds.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-all active:scale-95"
              >
                <RotateCcw size={13} />
                <span>
                  선택한 글 비공개 전환 ({selectedPublishedIds.length})
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Content Table */}
        {activeSubTab === "drafts" ? (
          /* DRAFTS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-950/60 text-zinc-700 dark:text-zinc-300 font-extrabold">
                  <th className="p-4 w-10 text-center">
                    <button
                      onClick={handleSelectAllDrafts}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      title="전체 선택"
                    >
                      {filteredDrafts.length > 0 &&
                      selectedDraftIds.length === filteredDrafts.length ? (
                        <CheckSquare size={17} className="text-[#1d4ed8]" />
                      ) : (
                        <Square size={17} />
                      )}
                    </button>
                  </th>
                  <th className="p-4">글 정보 (제목 / 슬러그 / 요약)</th>
                  <th className="p-4 w-32">카테고리</th>
                  <th className="p-4 w-28">작성자</th>
                  <th className="p-4 w-28">저장일</th>
                  <th className="p-4 w-36 text-center">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredDrafts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-12 text-center text-zinc-600 dark:text-zinc-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Clock size={28} className="text-zinc-400" />
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                          게시 대기 중인 초안(Draft)이 없습니다.
                        </p>
                        <p className="text-xs text-zinc-500">
                          온리비 에디터(/editor)에서 마크다운을 작성한 뒤 상단 메뉴에서{" "}
                          <span className="font-bold text-[#1d4ed8]">
                            [블로그 초안으로 저장하기]
                          </span>
                          를 실행하면 이곳에 대기 목록으로 표시됩니다.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDrafts.map((draft) => {
                    const isSelected = selectedDraftIds.includes(draft.id);
                    return (
                      <tr
                        key={draft.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleDraft(draft.id)}
                            className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare size={17} className="text-[#1d4ed8]" />
                            ) : (
                              <Square size={17} />
                            )}
                          </button>
                        </td>

                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-zinc-950 dark:text-white hover:text-[#1d4ed8] transition-colors cursor-pointer"
                                onClick={() => setPreviewPost(draft)}
                              >
                                {draft.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                                초안 대기
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-1">
                              {draft.excerpt}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                              <span>slug: {draft.slug}</span>
                              <span>•</span>
                              <span>{draft.readingTime}</span>
                              {draft.tags?.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-700 dark:text-blue-400 font-bold">
                                    #{draft.tags.join(" #")}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                            {categoryName(draft.category, categories)}
                          </span>
                        </td>

                        <td className="p-4 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {draft.author}
                        </td>

                        <td className="p-4 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {draft.publishedAt}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPreviewPost(draft)}
                              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title="미리보기"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => { void handleSingleAction('publish', draft); }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-[#1d4ed8] dark:text-blue-400 hover:bg-blue-100 transition-colors"
                              title="지금 단건 발행"
                            >
                              발행
                            </button>

                            <button
                              onClick={() =>
                                setDeleteConfirmTarget({ id: draft.id, title: draft.title })
                              }
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* PUBLISHED TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-950/60 text-zinc-700 dark:text-zinc-300 font-extrabold">
                  <th className="p-4 w-10 text-center">
                    <button
                      onClick={handleSelectAllPublished}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      title="전체 선택"
                    >
                      {filteredPublished.length > 0 &&
                      selectedPublishedIds.length === filteredPublished.length ? (
                        <CheckSquare size={17} className="text-[#1d4ed8]" />
                      ) : (
                        <Square size={17} />
                      )}
                    </button>
                  </th>
                  <th className="p-4">공개 설정 글 정보 (제목 / 슬러그 / 요약)</th>
                  <th className="p-4 w-32">카테고리</th>
                  <th className="p-4 w-28">작성자</th>
                  <th className="p-4 w-28">발행일</th>
                  <th className="p-4 w-36 text-center">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredPublished.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-12 text-center text-zinc-600 dark:text-zinc-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={28} className="text-zinc-400" />
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                          발행된 글이 없습니다.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPublished.map((post) => {
                    const isSelected = selectedPublishedIds.includes(post.id);
                    return (
                      <tr
                        key={post.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleTogglePublished(post.id)}
                            className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare size={17} className="text-[#1d4ed8]" />
                            ) : (
                              <Square size={17} />
                            )}
                          </button>
                        </td>

                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-zinc-950 dark:text-white hover:text-[#1d4ed8] transition-colors cursor-pointer"
                                onClick={() => setPreviewPost(post)}
                              >
                                {post.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-[#1d4ed8] dark:text-blue-400">
                                {post.deploymentStatus === 'live' ? '배포 완료' : '배포 대기'}
                              </span>
                              {post.isFeatured && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                                  추천 포스트
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-1">
                              {post.excerpt}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                              <span>slug: {post.slug}</span>
                              <span>•</span>
                              <span>{post.readingTime}</span>
                              {post.tags?.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-700 dark:text-blue-400 font-bold">
                                    #{post.tags.join(" #")}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950 text-[#1d4ed8] dark:text-blue-400">
                            {categoryName(post.category, categories)}
                          </span>
                        </td>

                        <td className="p-4 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {post.author}
                        </td>

                        <td className="p-4 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {post.publishedAt}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {post.deploymentStatus === 'live' && <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-[#1d4ed8] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              title="공식 블로그에서 열기"
                            >
                              <ExternalLink size={15} />
                            </a>}

                            <button
                              onClick={() => setPreviewPost(post)}
                              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              title="미리보기"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => { void handleSingleAction('unpublish', post); }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                              title="비공개(초안)로 전환"
                            >
                              비공개
                            </button>

                            <button
                              onClick={() =>
                                setDeleteConfirmTarget({ id: post.id, title: post.title })
                              }
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#1d4ed8]">
                  <Sparkles size={16} />
                </span>
                <span className="text-sm font-extrabold text-zinc-950 dark:text-white">
                  블로그 포스트 실시간 미리보기
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {previewPost.status === "draft" ? "초안 대기" : "공개 발행"}
                </span>
              </div>

              <button
                onClick={() => setPreviewPost(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Card Preview */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-3">
                  1. 카드 렌더링 미리보기
                </h4>
                <div className="max-w-sm mx-auto p-3 bg-slate-50 dark:bg-zinc-950/50 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800">
                  <BlogCard post={previewPost} />
                </div>
              </div>

              {/* Full Article Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    2. 상세 아티클 본문 미리보기
                  </h4>
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
                    <button
                      onClick={() => setPreviewMode("rendered")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                        previewMode === "rendered"
                          ? "bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-white shadow-2xs font-extrabold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <Eye size={12} />
                      <span>문서 뷰</span>
                    </button>
                    <button
                      onClick={() => setPreviewMode("markdown")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                        previewMode === "markdown"
                          ? "bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-white shadow-2xs font-extrabold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <FileCode size={12} />
                      <span>마크다운으로 보기</span>
                    </button>
                  </div>
                </div>

                {previewMode === "rendered" ? (
                  <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                    <span className="inline-block px-3 py-1 rounded-md text-xs font-extrabold bg-blue-50 dark:bg-blue-950 text-[#1d4ed8] mb-3">
                      {categoryName(previewPost.category, categories)}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white mb-2">
                      {previewPost.title}
                    </h2>
                    <p className="text-xs text-zinc-500 pb-3 mb-4 border-b border-slate-100 dark:border-zinc-800">
                      작성자: {previewPost.author} • {previewPost.publishedAt} • 소요 시간: {previewPost.readingTime}
                    </p>
                    <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {previewPost.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-zinc-800 bg-[#0B0F19] text-slate-100 shadow-xl">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b border-white/10 text-xs font-mono text-zinc-300">
                      <div className="flex items-center gap-2">
                        <FileCode size={13} className="text-[#60a5fa]" />
                        <span>{previewPost.slug}.md</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-sans">
                        {previewPost.content.length}자 • UTF-8 Markdown
                      </span>
                    </div>
                    <pre className="p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap select-all text-slate-200">
                      <code>{previewPost.content}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/50">
              <span className="text-xs text-zinc-500">
                slug: <code className="font-mono text-zinc-700 dark:text-zinc-300">{previewPost.slug}</code>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewPost(null)}
                  className="admin-btn-secondary"
                >
                  닫기
                </button>
                {previewPost.status === "draft" && (
                  <button
                    onClick={() => { void handleSingleAction('publish', previewPost); }}
                    className="admin-btn-primary"
                  >
                    <Send size={13} />
                    <span>공개 배포 요청</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                포스트를 완전히 삭제하시겠습니까?
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">
              선택한 포스트{" "}
              <strong className="text-zinc-900 dark:text-white">
                &quot;{deleteConfirmTarget.title}&quot;
              </strong>
              (이)가 DB에서 개정 이력과 함께 영구 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="admin-btn-secondary"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="admin-btn-danger"
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
