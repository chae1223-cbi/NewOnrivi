/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : app/admin/components/ContentsTab.tsx
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-10-08** — [불필요한 콘텐츠 영구 삭제(DELETE) 기능 및 Cloudflare R2 스토리지 동기화 탑재]:
 *             1. 불필요한 파일 선택/개별 삭제 확인 모달 및 Cloudflare R2 스토리지(onrivi-images) 실시간 객체 제거 연동
 *             2. 랜딩페이지(support_inquiries) 첨부 목록에서 제거 및 관리자 감사 로그(CONTENT_DELETE) 자동 기록
 * 🚨 @PATCH : **2026-10-08** — [사용자 개인 에디터 첨부 제외 공식 콘텐츠 관리(ContentsTab) 신규 구축]:
 *             1. 사용자 개인 마크다운 에디터 첨부 미디어 철저 배제(프라이버시 보호)
 *             2. 서비스 운영 공식 에셋(고객 지원 문의 첨부파일, 기술 블로그 공식 에셋) 통합 관리 대시보드 제공
 *             3. 3대 핵심 통계 카드(총 관리 에셋, 랜딩페이지 파일, 블로그 에셋) 탑재
 *             4. 카드 그리드 뷰(Grid) / 목록 테이블 뷰(Table) 전환 지원
 *             5. 원본 미디어 대형 팝업 모달, URL 클립보드 복사, 원본 새 창 열기, 페이징 지원
 * -----------------------------------------------------------------------
 */
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Files,
  LifeBuoy,
  BookOpen,
  Search,
  RefreshCw,
  RotateCcw,
  LayoutGrid,
  List,
  ExternalLink,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileArchive,
  FileText,
  ShieldCheck,
  Eye,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import HelpManager from './HelpManager';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

interface ContentItem {
  id: string;
  category: 'LANDING' | 'BLOG' | 'HELP';
  category_name: string;
  url: string;
  file_name: string;
  source_title: string;
  source_file?: string;
  read_only?: boolean;
  source_id: string;
  author: string;
  created_at: string | null;
  source_type: 'landing' | 'blog' | 'help';
}

interface ContentStats {
  total: number;
  landing: number;
  help: number;
  blog: number;
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: '전체 콘텐츠' },
  { value: 'LANDING', label: '랜딩페이지 파일' },
  { value: 'HELP', label: '도움말 문서·이미지' },
  { value: 'BLOG', label: '기술 블로그 에셋' }
];

const formatDate = (val?: string | null) => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return val;
  }
};

const fileExtension = (item: ContentItem) => item.file_name.split('.').pop()?.toLowerCase() || 'file';
const isImageUrl = (url: string, name = '') => /\.(jpeg|jpg|png|gif|webp|svg|avif|bmp)$/i.test((name || url).split('?')[0]);
function MediaPreview({item, large = false}: {item: ContentItem; large?: boolean}) {
  const [failed, setFailed] = useState(false);
  const [documentText, setDocumentText] = useState<string>('불러오는 중…');
  useEffect(() => {
    const ext = item.file_name.split('.').pop()?.toLowerCase() || 'file';
    if (!large || item.category !== 'HELP' || ext !== 'md') return;
    const controller = new AbortController();
    setDocumentText('불러오는 중…');
    void fetch(item.url, {signal:controller.signal}).then(response => { if (!response.ok) throw new Error(); return response.text(); }).then(setDocumentText).catch(() => { if (!controller.signal.aborted) setDocumentText('도움말을 불러오지 못했습니다. 원본 열기를 이용하세요.'); });
    return () => controller.abort();
  }, [large, item.url, item.category, item.file_name]);
  useEffect(() => setFailed(false), [item.url]);
  if (large && item.category === 'HELP' && fileExtension(item) === 'md') return <pre className="w-full whitespace-pre-wrap break-words text-sm leading-7 text-zinc-800 dark:text-zinc-200">{documentText}</pre>;
  const image = isImageUrl(item.url, item.file_name);
  if (large && fileExtension(item) === 'mp4') return <video src={item.url} controls preload="metadata" className="max-h-[60vh] max-w-full" />;
  if (image && !failed) return <img src={item.url} alt={item.file_name} loading="lazy" onError={() => setFailed(true)} className={large ? 'max-h-[60vh] max-w-full object-contain' : 'w-full h-full object-contain'} />;
  const Icon = ['zip','7z','rar'].includes(fileExtension(item)) ? FileArchive : FileText;
  return <div className="flex flex-col items-center justify-center gap-2 p-3 text-zinc-600 dark:text-zinc-300"><Icon className="w-10 h-10"/><span className="text-sm font-bold">{fileExtension(item).toUpperCase()}</span><span className="text-xs">{failed ? '이미지를 불러오지 못했습니다' : '원본 열기로 내용을 확인하세요'}</span></div>;
}

export default function ContentsTab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStats>({ total: 0, landing: 0, help: 0, blog: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // 모달 및 삭제 상태
  const [previewTarget, setPreviewTarget] = useState<ContentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchContents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        type: typeFilter
      });

      const res = await adminFetch(`/api/admin/contents?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`콘텐츠 목록 조회 실패 (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
        setTotal(data.total || 0);
        if (data.stats) {
          setStats({
            total: Number(data.stats.total || 0),
            landing: Number(data.stats.landing || 0),
            help: Number(data.stats.help || 0),
            blog: Number(data.stats.blog || 0)
          });
        }
      } else {
        throw new Error(data.error || '콘텐츠 데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Contents fetch error:', err);
      showToast(err.message || '콘텐츠 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents, refreshKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setTypeFilter('ALL');
    setPage(1);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('파일 URL이 복사되었습니다.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 삭제 확정 처리
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await adminFetch('/api/admin/contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: deleteTarget.url,
          source_id: deleteTarget.source_id,
          category: deleteTarget.category,
          reason: deleteReason.trim() || '관리자에 의한 불필요한 파일 삭제'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '파일 삭제에 실패했습니다.');
      }

      showToast('파일이 성공적으로 삭제되었습니다.', 'success');
      setDeleteTarget(null);
      setDeleteReason('');
      if (previewTarget?.id === deleteTarget.id) {
        setPreviewTarget(null);
      }
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(err.message || '파일 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* 프라이버시 정책 배너 */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
              공개 콘텐츠 관리 안내
            </h4>
            <p className="text-xs text-blue-700/90 dark:text-blue-300/80 mt-0.5">
              랜딩페이지 이미지·영상·로고, 도움말 문서·이미지와 기술 블로그 파일을 확인합니다. 랜딩페이지와 도움말 파일은 소스에서 수정하며, 고객 문의 첨부파일과 개인 문서는 표시하지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 1. 상단 통계 카드 3종 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 전체 관리 콘텐츠 */}
        <div
          onClick={() => { setTypeFilter('ALL'); setPage(1); }}
          className={`admin-glass-card p-5 cursor-pointer transition-all ${
            typeFilter === 'ALL' ? 'border-blue-500 shadow-md ring-1 ring-blue-500/30' : 'hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">전체 공개 콘텐츠</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 mt-1">랜딩페이지 및 기술 블로그 파일</div>
        </div>

        {/* 랜딩페이지 파일 */}
        <div
          onClick={() => { setTypeFilter('LANDING'); setPage(1); }}
          className={`admin-glass-card p-5 cursor-pointer transition-all ${
            typeFilter === 'LANDING' ? 'border-teal-500 shadow-md ring-1 ring-teal-500/30' : 'hover:border-teal-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">랜딩페이지 파일</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {stats.landing.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 mt-1">서비스 소개 이미지·영상·로고</div>
        </div>

        <button type="button" onClick={() => { setTypeFilter('HELP'); setPage(1); }} className={`admin-glass-card p-5 text-left ${typeFilter === 'HELP' ? 'border-blue-500 ring-1 ring-blue-500/30' : ''}`}>
          <div className="text-sm font-semibold text-zinc-600">도움말 문서·이미지</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{stats.help.toLocaleString()}</div>
          <div className="text-xs text-zinc-500 mt-1">사용 가이드와 안내 이미지</div>
        </button>
        {/* 기술 블로그 에셋 */}
        <div
          onClick={() => { setTypeFilter('BLOG'); setPage(1); }}
          className={`admin-glass-card p-5 cursor-pointer transition-all ${
            typeFilter === 'BLOG' ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/30' : 'hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">기술 블로그 에셋</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {stats.blog.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 mt-1">공식 블로그 커버 및 본문 미디어</div>
        </div>
      </div>

      {/* 2. 검색 및 컨트롤 바 */}
      <div className="admin-glass-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* 검색창 */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="파일명, 랜딩페이지 사용 위치, 블로그 제목 검색..."
              className="admin-input pl-9 pr-20 w-full text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              검색
            </button>
          </form>

          {/* 컨트롤 그룹 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 유형 셀렉트 */}
            <select
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="admin-input text-xs font-medium text-zinc-900 dark:text-zinc-100 py-2 px-3"
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* 뷰 모드 토글 (그리드 / 테이블) */}
            <div className="flex items-center p-0.5 rounded-lg border border-[var(--admin-border)] bg-zinc-100 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title="카드 그리드 뷰"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title="목록 테이블 뷰"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 초기화 */}
            {(search || typeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="admin-btn-secondary text-xs px-2.5 py-2 flex items-center gap-1 text-zinc-700 dark:text-zinc-300"
                title="초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>초기화</span>
              </button>
            )}

            {/* 새로고침 */}
            <button
              type="button"
              onClick={() => setRefreshKey(k => k + 1)}
              className="admin-btn-secondary text-xs px-2.5 py-2 flex items-center gap-1 text-zinc-700 dark:text-zinc-300"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {typeFilter === 'HELP' && <HelpManager />}
      {/* 3. 콘텐츠 뷰 (그리드 or 테이블) */}
      {loading && items.length === 0 ? (
        <div className="admin-glass-card p-16 text-center text-zinc-600 dark:text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          콘텐츠 목록을 불러오는 중입니다...
        </div>
      ) : items.length === 0 ? (
        <div className="admin-glass-card p-16 text-center text-zinc-600 dark:text-zinc-400">
          조회된 콘텐츠가 없습니다.
        </div>
      ) : viewMode === 'grid' ? (
        /* 카드 그리드 뷰 */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => {
            const isImg = isImageUrl(item.url);
            return (
              <div
                key={item.id}
                className="admin-glass-card overflow-hidden group hover:border-blue-500/50 transition-all flex flex-col"
              >
                {/* 미디어 썸네일 영역 */}
                <div
                  onClick={() => setPreviewTarget(item)}
                  className="relative aspect-video bg-zinc-100 dark:bg-zinc-900 border-b border-[var(--admin-border)] flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  <MediaPreview item={item} />

                  {/* 호버 시 오버레이 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-2 rounded-full bg-white/90 text-zinc-900 hover:scale-110 transition-transform">
                      <Eye className="w-4 h-4" />
                    </span>
                  </div>

                  {/* 분류 배지 */}
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold shadow-xs ${
                      item.category === 'LANDING'
                        ? 'bg-teal-500/90 text-white'
                        : 'bg-indigo-600/90 text-white'
                    }`}
                  >
                    {item.category_name}
                  </span>
                </div>

                {/* 정보 영역 */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h5
                      className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:underline"
                      title={item.file_name}
                      onClick={() => setPreviewTarget(item)}
                    >
                      {item.file_name}
                    </h5>
                    <p
                      className="text-sm text-zinc-600 line-clamp-2 mt-1"
                      title={item.source_title}
                    >
                      {item.category === 'LANDING' ? '랜딩페이지' : item.category === 'HELP' ? '도움말' : '블로그'}: {item.source_title}
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">{item.created_at ? formatDate(item.created_at) : '소스에 포함된 정적 파일'}</p>
                  </div>

                  <div className="pt-2 border-t border-[var(--admin-border)] flex items-center justify-between text-xs text-zinc-500">
                    <span className="truncate max-w-[100px]" title={item.author}>
                      {item.author}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(item.url, item.id)}
                        className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-blue-600"
                        title="URL 복사"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-blue-600"
                        title="새 창에서 열기"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {/* 삭제 버튼 */}
                      <button
                        disabled={item.read_only}
                        onClick={() => setDeleteTarget(item)}
                        className="p-2 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 transition-colors"
                        title={item.read_only ? "소스에서 관리하는 파일입니다" : "콘텐츠 영구 삭제"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 목록 테이블 뷰 */
        <div className="admin-glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-[var(--admin-border)] text-zinc-700 dark:text-zinc-300 font-semibold">
                <tr>
                  <th className="p-3.5 pl-4 text-xs tracking-wider w-14">미리보기</th>
                  <th className="p-3.5 text-xs tracking-wider">파일명</th>
                  <th className="p-3.5 text-xs tracking-wider">구분</th>
                  <th className="p-3.5 text-xs tracking-wider">연결 출처</th>
                  <th className="p-3.5 text-xs tracking-wider">등록자</th>
                  <th className="p-3.5 text-xs tracking-wider">등록 일시</th>
                  <th className="p-3.5 pr-4 text-xs tracking-wider text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {items.map(item => {
                  const isImg = isImageUrl(item.url);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* 미니 썸네일 */}
                      <td className="p-3.5 pl-4">
                        <div
                          onClick={() => setPreviewTarget(item)}
                          className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-[var(--admin-border)] overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80"
                        >
                          <MediaPreview item={item} />
                        </div>
                      </td>

                      {/* 파일명 */}
                      <td className="p-3.5 max-w-xs">
                        <span
                          className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate block cursor-pointer hover:underline"
                          title={item.file_name}
                          onClick={() => setPreviewTarget(item)}
                        >
                          {item.file_name}
                        </span>
                      </td>

                      {/* 구분 배지 */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                            item.category === 'LANDING'
                              ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30'
                              : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          {item.category_name}
                        </span>
                      </td>

                      {/* 연결 출처 */}
                      <td className="p-3.5 max-w-sm">
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate block" title={item.source_title}>
                          {item.source_title}
                        </span>
                      </td>

                      {/* 등록자 */}
                      <td className="p-3.5 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                        {item.author}
                      </td>

                      {/* 등록 일시 */}
                      <td className="p-3.5 whitespace-nowrap text-xs font-mono text-zinc-900 dark:text-zinc-100">
                        {formatDate(item.created_at)}
                      </td>

                      {/* 관리 액션 */}
                      <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopy(item.url, item.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="URL 복사"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="새 창에서 열기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            disabled={item.read_only}
                        onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={item.read_only ? "소스에서 관리하는 파일입니다" : "파일 삭제"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. 페이지네이션 */}
      <div className="p-4 admin-glass-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-700 dark:text-zinc-300">
        <div className="font-medium">
          총 <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">{total.toLocaleString()}</span>개 중{' '}
          <span className="font-mono">{total === 0 ? 0 : (page - 1) * limit + 1}</span>-
          <span className="font-mono">{Math.min(page * limit, total)}</span>개 표시
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-[var(--admin-border)] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="이전 페이지"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-[var(--admin-border)] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="다음 페이지"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. 대형 원본 미리보기 모달 */}
      {previewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="admin-glass-card max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-[var(--admin-border)]">
            <div className="p-4 border-b border-[var(--admin-border)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileImage className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-md">
                  {previewTarget.file_name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewTarget(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {/* 이미지 대형 미리보기 */}
              <div className="min-h-48 rounded-xl border bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center p-4"><MediaPreview item={previewTarget} large /></div>

              {previewTarget.source_file && <div className="p-3 rounded-lg border text-sm"><strong>사용 위치</strong><p className="font-mono break-all mt-1">{previewTarget.source_file}</p><p className="mt-2 text-zinc-600">랜딩페이지와 도움말 파일 교체·삭제는 소스에서 진행합니다.</p></div>}
              {/* 상세 메타 정보 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)] space-y-1">
                  <div className="text-zinc-500">콘텐츠 구분</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    {previewTarget.category_name}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)] space-y-1">
                  <div className="text-zinc-500">등록 일시</div>
                  <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {previewTarget.created_at ? formatDate(previewTarget.created_at) : '소스에 포함된 정적 파일'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)] space-y-1 col-span-1 sm:col-span-2">
                  <div className="text-zinc-500">연결 출처 및 제목</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {previewTarget.source_title}
                  </div>
                  <div className="text-xs text-zinc-500">작성자: {previewTarget.author}</div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)] space-y-1.5 col-span-1 sm:col-span-2">
                  <div className="text-zinc-500 flex items-center justify-between">
                    <span>원본 파일 URL</span>
                    <button
                      onClick={() => handleCopy(previewTarget.url, 'modal_url')}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-xs"
                    >
                      {copiedId === 'modal_url' ? '복사됨!' : 'URL 복사'}
                    </button>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-zinc-900 font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all select-all border border-[var(--admin-border)]">
                    {previewTarget.url}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--admin-border)] bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <a
                  href={previewTarget.url}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-btn-secondary text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>새 창에서 열기</span>
                </a>
                <button
                  disabled={previewTarget.read_only}
                  onClick={() => setDeleteTarget(previewTarget)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>콘텐츠 삭제</span>
                </button>
              </div>

              <button
                onClick={() => setPreviewTarget(null)}
                className="admin-btn-primary px-4 py-2 text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 삭제 확인 다이얼로그 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="admin-glass-card max-w-md w-full shadow-2xl overflow-hidden border border-rose-500/40">
            <div className="p-5 border-b border-[var(--admin-border)] flex items-center gap-3 bg-rose-50/50 dark:bg-rose-950/20">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  콘텐츠 영구 삭제 확인
                </h3>
                <p className="text-xs text-zinc-500">
                  R2 클라우드 스토리지 및 관련 데이터가 영구 삭제됩니다.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 space-y-1">
                <div className="text-zinc-500 font-medium">대상 파일명</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 break-all font-mono">
                  {deleteTarget.file_name}
                </div>
                <div className="text-xs text-zinc-500">
                  출처: {deleteTarget.source_title} ({deleteTarget.category_name})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  삭제 사유 (감사 로그에 기록됨)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="예: 불필요한 테스트 파일, 부적절한 이미지 등"
                  className="admin-input w-full text-xs"
                />
              </div>

              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                ⚠️ 삭제된 파일은 복구할 수 없으며, 랜딩페이지 파일 목록 또는 블로그 글의 해당 미디어 링크가 비활성화됩니다.
              </p>
            </div>

            <div className="p-4 border-t border-[var(--admin-border)] bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteReason(''); }}
                disabled={isDeleting}
                className="admin-btn-secondary px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>영구 삭제</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
