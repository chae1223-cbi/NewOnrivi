/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : app/admin/components/AuditTab.tsx
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-10-08** — [관리자 감사 로그(AuditTab) 전용 화면 신규 구축]:
 *             1. 관리자 감사 로그 전체 목록 페이징(20건), 다차원 검색(관리자/대상/사유), 액션 유형별 필터, 기간 필터 지원
 *             2. 4대 핵심 지표 통계 카드(전체 감사 로그, 오늘 발생, 요금제 변경, 보안/권한 제어) 탑재
 *             3. Modern Technical Editorial 디자인 시스템(Cobalt #1d4ed8) 및 고대비(High-Contrast) 시인성 표준 전면 적용
 *             4. 액션별 컬러 배지(보안/권한: Kinetic Coral, 요금제: Intelligence Teal, 계정/일반: Cobalt/Zinc)
 *             5. 로그 상세 조회 모달(사유 전문, 관리자/대상자 UUID 및 일시 복사) 제공
 * -----------------------------------------------------------------------
 */
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Clock,
  CreditCard,
  ShieldAlert,
  Search,
  RefreshCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  User,
  Shield,
  Copy,
  Check
} from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

interface AuditLogItem {
  id: string;
  raw_action: string;
  action_name: string;
  reason: string | null;
  created_at: string;
  admin_id: string | null;
  admin_email: string | null;
  target_user_id: string | null;
  target_email: string | null;
}

interface AuditStats {
  total: number;
  today: number;
  plan_changes: number;
  security_actions: number;
}

const ACTION_OPTIONS = [
  { value: 'ALL', label: '전체 작업 유형' },
  { value: 'PLAN_CHANGE', label: '요금제 변경' },
  { value: 'KILL_SESSION', label: '세션 강제 종료' },
  { value: 'SUSPEND', label: '계정 정지' },
  { value: 'UNBAN', label: '정지 해제' },
  { value: 'ADMIN_INVITE', label: '관리자 초대' },
  { value: 'ADMIN_ROLE_CHANGE', label: '관리자 권한 변경' },
  { value: 'ADMIN_REVOKE', label: '관리자 권한 회수' },
  { value: 'USER_WITHDRAW', label: '회원 탈퇴' }
];

const RANGE_OPTIONS = [
  { value: 'ALL', label: '전체 기간' },
  { value: 'TODAY', label: '오늘' },
  { value: '7D', label: '최근 7일' },
  { value: '30D', label: '최근 30일' }
];

const formatDate = (val?: string | null) => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return val;
  }
};

const getActionBadgeStyle = (rawAction: string) => {
  switch (rawAction) {
    case 'PLAN_CHANGE':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'KILL_SESSION':
    case 'SUSPEND':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30';
    case 'UNBAN':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
    case 'ADMIN_INVITE':
    case 'ADMIN_ROLE_CHANGE':
    case 'ADMIN_REVOKE':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'USER_WITHDRAW':
    case 'USER_DELETE':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30';
    default:
      return 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30';
  }
};

export default function AuditTab() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    total: 0,
    today: 0,
    plan_changes: 0,
    security_actions: 0
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [rangeFilter, setRangeFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // 상세 모달 타겟
  const [detailTarget, setDetailTarget] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        action: actionFilter,
        range: rangeFilter
      });

      const res = await adminFetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`감사 로그 조회 실패 (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.total || 0);
        if (data.stats) {
          setStats({
            total: Number(data.stats.total || 0),
            today: Number(data.stats.today || 0),
            plan_changes: Number(data.stats.plan_changes || 0),
            security_actions: Number(data.stats.security_actions || 0)
          });
        }
      } else {
        throw new Error(data.error || '감사 로그를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Audit fetch error:', err);
      showToast(err.message || '감사 로그를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, rangeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setActionFilter('ALL');
    setRangeFilter('ALL');
    setPage(1);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('클립보드에 복사되었습니다.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* 1. 상단 통계 카드 4종 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 전체 로그 */}
        <div className="admin-glass-card p-5 relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">전체 감사 로그</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">시스템 누적 보안/운영 이력</div>
        </div>

        {/* 오늘 발생 */}
        <div className="admin-glass-card p-5 relative overflow-hidden group hover:border-teal-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">오늘 발생</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {stats.today.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">금일(00시 이후) 관리자 작업</div>
        </div>

        {/* 요금제 변경 */}
        <div className="admin-glass-card p-5 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">요금제 변경</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {stats.plan_changes.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">구독 수동 부여 및 플랜 조정</div>
        </div>

        {/* 보안 및 계정 제어 */}
        <div className="admin-glass-card p-5 relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">보안 / 계정 제어</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {stats.security_actions.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">세션 강제종료, 정지, 관리자 권한</div>
        </div>
      </div>

      {/* 2. 검색 및 필터 컨트롤 바 */}
      <div className="admin-glass-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* 검색창 */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="관리자 이메일, 대상 회원 이메일, 사유 검색..."
              className="admin-input pl-9 pr-20 w-full text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              검색
            </button>
          </form>

          {/* 필터 그룹 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 작업 유형 필터 */}
            <select
              value={actionFilter}
              onChange={e => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="admin-input text-xs font-medium text-zinc-900 dark:text-zinc-100 py-2 px-3"
            >
              {ACTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* 기간 필터 */}
            <select
              value={rangeFilter}
              onChange={e => {
                setRangeFilter(e.target.value);
                setPage(1);
              }}
              className="admin-input text-xs font-medium text-zinc-900 dark:text-zinc-100 py-2 px-3"
            >
              {RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* 초기화 */}
            {(search || actionFilter !== 'ALL' || rangeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="admin-btn-secondary text-xs px-2.5 py-2 flex items-center gap-1 text-zinc-700 dark:text-zinc-300"
                title="필터 초기화"
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

      {/* 3. 감사 로그 테이블 */}
      <div className="admin-glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-[var(--admin-border)] text-zinc-700 dark:text-zinc-300 font-semibold">
              <tr>
                <th className="p-3.5 pl-4 text-xs tracking-wider">발생 일시</th>
                <th className="p-3.5 text-xs tracking-wider">수행 관리자</th>
                <th className="p-3.5 text-xs tracking-wider">작업 유형</th>
                <th className="p-3.5 text-xs tracking-wider">대상 사용자</th>
                <th className="p-3.5 text-xs tracking-wider">사유 및 상세 내역</th>
                <th className="p-3.5 pr-4 text-xs tracking-wider text-right">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-600 dark:text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    감사 로그를 불러오는 중입니다...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-600 dark:text-zinc-400">
                    조회된 감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* 발생 일시 */}
                    <td className="p-3.5 pl-4 whitespace-nowrap font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDate(log.created_at)}
                    </td>

                    {/* 수행 관리자 */}
                    <td className="p-3.5 whitespace-nowrap">
                      {log.admin_email ? (
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                            {log.admin_email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 font-mono text-xs">
                          {log.admin_id ? log.admin_id.slice(0, 8) + '...' : '시스템/알수없음'}
                        </span>
                      )}
                    </td>

                    {/* 작업 유형 배지 */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getActionBadgeStyle(
                            log.raw_action
                          )}`}
                        >
                          {log.action_name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          ({log.raw_action})
                        </span>
                      </div>
                    </td>

                    {/* 대상 사용자 */}
                    <td className="p-3.5 whitespace-nowrap">
                      {log.target_email ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                            {log.target_email}
                          </span>
                        </div>
                      ) : log.target_user_id ? (
                        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {log.target_user_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs">-</span>
                      )}
                    </td>

                    {/* 사유 */}
                    <td className="p-3.5 max-w-md">
                      <p
                        className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-1 font-medium cursor-pointer hover:underline"
                        title={log.reason || '(사유 미입력)'}
                        onClick={() => setDetailTarget(log)}
                      >
                        {log.reason || <span className="text-zinc-400 italic">사유 미입력</span>}
                      </p>
                    </td>

                    {/* 상세보기 버튼 */}
                    <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setDetailTarget(log)}
                        className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="로그 상세 확인"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. 페이지네이션 */}
        <div className="p-4 border-t border-[var(--admin-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="font-medium">
            총 <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">{total.toLocaleString()}</span>건 중{' '}
            <span className="font-mono">{total === 0 ? 0 : (page - 1) * limit + 1}</span>-
            <span className="font-mono">{Math.min(page * limit, total)}</span>건 표시
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
      </div>

      {/* 5. 로그 상세 조회 모달 */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="admin-glass-card max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-[var(--admin-border)]">
            <div className="p-5 border-b border-[var(--admin-border)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">감사 로그 상세 정보</h3>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              {/* 로그 식별자 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)]">
                <span className="text-zinc-500 font-medium">로그 ID</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{detailTarget.id}</span>
                  <button
                    onClick={() => handleCopy(detailTarget.id, 'id')}
                    className="p-1 hover:text-blue-600"
                    title="복사"
                  >
                    {copiedId === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 발생 일시 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)]">
                <span className="text-zinc-500 font-medium">발생 일시</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatDate(detailTarget.created_at)}
                </span>
              </div>

              {/* 작업 유형 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)]">
                <span className="text-zinc-500 font-medium">작업 유형</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getActionBadgeStyle(
                    detailTarget.raw_action
                  )}`}
                >
                  {detailTarget.action_name} ({detailTarget.raw_action})
                </span>
              </div>

              {/* 수행 관리자 */}
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)] space-y-1">
                <div className="text-zinc-500 font-medium">수행 관리자</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {detailTarget.admin_email || '관리자 이메일 없음'}
                </div>
                {detailTarget.admin_id && (
                  <div className="text-[11px] font-mono text-zinc-500">ID: {detailTarget.admin_id}</div>
                )}
              </div>

              {/* 대상 사용자 */}
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)] space-y-1">
                <div className="text-zinc-500 font-medium">대상 사용자</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {detailTarget.target_email || '대상 이메일 없음'}
                </div>
                {detailTarget.target_user_id && (
                  <div className="text-[11px] font-mono text-zinc-500">ID: {detailTarget.target_user_id}</div>
                )}
              </div>

              {/* 사유 전문 */}
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-[var(--admin-border)] space-y-2">
                <div className="text-zinc-500 font-medium">사유 및 상세 내역</div>
                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-[var(--admin-border)] text-zinc-900 dark:text-zinc-100 font-mono text-xs whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                  {detailTarget.reason || '(입력된 사유가 없습니다)'}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--admin-border)] bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end shrink-0">
              <button
                onClick={() => setDetailTarget(null)}
                className="admin-btn-secondary px-4 py-2 text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
