/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : app/admin/components/SubscriptionsTab.tsx
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-10-08** — [상단 핵심 통계 카드 6종 일대일 정합 필터링 완벽 연동]:
 *             1. 활성 구독(ACTIVE), 활성 기기(HAS_DEVICES) 카드 클릭 시 통계 지표와 일치하는 조건으로 즉시 필터링 및 토글 지원
 *             2. 카드 선택 시 상태(status) 필터와의 충돌 방지 초기화 및 선택 인디케이터 정상 표시
 * 🚨 @PATCH : **2026-09-30** — [useCallback 의존성 최적화]: load 콜백의 불필요한 refresh 의존성을 load 호출 useEffect로 이전하여 ESLint unnecessary dependency 경고 완전 소거
 * 🚨 @PATCH : **2026-09-30** — [구독 및 라이선스 관리 고도화]: 
 *             1. Modern Technical Editorial 디자인 시스템(Cobalt #1d4ed8) 및 고대비(High-Contrast) 시인성 표준 전면 적용
 *             2. 6대 핵심 지표 통계 카드(활성 구독, 7일/30일 내 만료, 만료 처리 필요, 활성 기기, 기기 초과) 아이콘 및 상태별 컬러 토큰 적용
 *             3. 상태(활성/만료/취소/만료처리필요) 및 부여유형(관리자 무료/유료, 체험) 전용 배지(Chip) 및 D-Day 잔여일 계산기 적용
 *             4. 상세 슬라이드오버 모달 내 SUPER 관리자용 '요금제/구독 직접 변경(UserPlanChangeModal)' 연동 기능 탑재
 *             5. 개별 및 전체 디바이스 해제 확인 모달 UX 개선, 검색 초기화 및 새로고침 액션 추가
 * -----------------------------------------------------------------------
 */
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  Laptop, 
  ShieldAlert, 
  RefreshCw, 
  Search, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ExternalLink, 
  Shield, 
  Calendar, 
  History, 
  FileText,
  Smartphone,
  Tag,
  CreditCard
} from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';
import UserPlanChangeModal from './UserPlanChangeModal';
import SubscriptionDetailModal, { SubscriptionDetailData } from './SubscriptionDetailModal';

type Row = {
  id: string;
  user_id: string;
  email: string;
  plan_name: string;
  plan_status: string;
  billing_cycle: string;
  grant_type: string;
  is_active: boolean;
  current_period_start: string;
  current_period_end: string;
  max_devices: number;
  devices: number;
  updated_at: string;
};

type Stats = {
  active: number;
  expiring_7: number;
  expiring_30: number;
  stale_active: number;
  devices: number;
  over_limit: number;
};

type Detail = SubscriptionDetailData;

// 날짜 포맷 함수
const formatDate = (value?: string | null) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return value;
  }
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return value;
  }
};

// D-Day 계산 함수
const calculateDDay = (endDateStr: string) => {
  if (!endDateStr) return null;
  const end = new Date(endDateStr).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: '만료됨', isExpired: true, days: diffDays };
  if (diffDays === 0) return { label: '오늘 만료', isUrgent: true, days: 0 };
  if (diffDays <= 7) return { label: `D-${diffDays}`, isUrgent: true, days: diffDays };
  return { label: `D-${diffDays}`, isUrgent: false, days: diffDays };
};

// 부여 유형 명칭
const getGrantLabel = (grantType: string) => {
  switch (grantType) {
    case 'ADMIN_FREE': return '관리자 무료';
    case 'ADMIN_PAID': return '관리자 유료';
    case 'TRIAL': return '무료 체험';
    case 'UNKNOWN': return '결제 확인 전';
    default: return grantType;
  }
};

// 상태 판별
const getDetailedStatus = (row: Row) => {
  const isEndPast = new Date(row.current_period_end).getTime() <= Date.now();
  if (row.is_active && isEndPast) {
    return { key: 'STALE_ACTIVE', label: '만료 처리 필요', badgeClass: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' };
  }
  if (row.plan_status === 'ACTIVE' && row.is_active) {
    return { key: 'ACTIVE', label: '활성', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' };
  }
  if (row.plan_status === 'CANCELED') {
    return { key: 'CANCELED', label: '취소', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' };
  }
  return { key: 'EXPIRED', label: '만료', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' };
};

export default function SubscriptionsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [plan, setPlan] = useState('ALL');
  const [grantFilter, setGrantFilter] = useState('ALL');
  const [attention, setAttention] = useState('ALL');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState('');
  const [refresh, setRefresh] = useState(0);

  // 기기 해제 액션 모달
  const [action, setAction] = useState<{ deviceId?: string; deviceName?: string } | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // 구독 상세 내에서 플랜 변경 모달 열기
  const [planChangeUser, setPlanChangeUser] = useState<{
    id: string;
    email: string;
    plan: string;
    plan_code: string;
    billing_cycle?: string;
  } | null>(null);

  // 데이터 로드
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        search,
        status,
        plan,
        grant: grantFilter,
        attention
      });
      const response = await adminFetch(`/api/admin/subscriptions?${params}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '구독 목록을 불러오지 못했습니다.');
      }
      setRows(data.data || []);
      setStats(data.stats || null);
      setTotal(data.total || 0);
      setCanManage(data.canManage === true);
      setAsOf(data.asOf || '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '구독을 불러오지 못했습니다.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, plan, grantFilter, attention]);

  useEffect(() => {
    void load();
  }, [load, refresh]);

  // 상세 모달 데이터 로드
  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    adminFetch(`/api/admin/subscriptions/${detailId}`)
      .then(async r => {
        const data = await r.json();
        return { ok: r.ok, data };
      })
      .then(({ ok, data }) => {
        if (!active) return;
        if (ok && data.success) {
          setDetail(data);
        } else {
          showToast(data.error || '상세 정보를 불러오지 못했습니다.', 'error');
        }
      })
      .catch(() => {
        if (active) showToast('상세 정보를 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => { active = false; };
  }, [detailId, refresh]);

  // 기기 해제 실행
  async function handleDeactivateDevice() {
    if (!detailId || !action || reason.trim().length < 3) return;
    setSaving(true);
    try {
      const response = await adminFetch(`/api/admin/subscriptions/${detailId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: action.deviceId, reason: reason.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '기기 해제 처리에 실패했습니다.');
      }
      showToast(action.deviceId ? '선택한 기기가 해제되었습니다.' : '모든 활성 기기가 해제되었습니다.', 'success');
      setAction(null);
      setReason('');
      setRefresh(v => v + 1);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '기기를 해제하지 못했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('ALL');
    setPlan('ALL');
    setGrantFilter('ALL');
    setAttention('ALL');
    setPage(1);
  };

  // 통계 카드 정의
  const statCards = [
    { 
      label: '활성 구독', 
      value: stats?.active, 
      filter: 'ACTIVE', 
      icon: CheckCircle2, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
      border: 'border-emerald-200 dark:border-emerald-800' 
    },
    { 
      label: '7일 내 만료', 
      value: stats?.expiring_7, 
      filter: 'EXPIRING_7', 
      icon: AlertTriangle, 
      color: 'text-amber-600 dark:text-amber-400', 
      bg: 'bg-amber-50 dark:bg-amber-950/40', 
      border: 'border-amber-200 dark:border-amber-800' 
    },
    { 
      label: '30일 내 만료', 
      value: stats?.expiring_30, 
      filter: 'EXPIRING_30', 
      icon: Clock, 
      color: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-50 dark:bg-blue-950/40', 
      border: 'border-blue-200 dark:border-blue-800' 
    },
    { 
      label: '만료 처리 필요', 
      value: stats?.stale_active, 
      filter: 'STALE_ACTIVE', 
      icon: AlertCircle, 
      color: 'text-rose-600 dark:text-rose-400', 
      bg: 'bg-rose-50 dark:bg-rose-950/40', 
      border: 'border-rose-200 dark:border-rose-800' 
    },
    { 
      label: '활성 기기 합계', 
      value: stats?.devices, 
      filter: 'HAS_DEVICES', 
      icon: Laptop, 
      color: 'text-indigo-600 dark:text-indigo-400', 
      bg: 'bg-indigo-50 dark:bg-indigo-950/40', 
      border: 'border-indigo-200 dark:border-indigo-800' 
    },
    { 
      label: '기기 한도 초과', 
      value: stats?.over_limit, 
      filter: 'OVER_LIMIT', 
      icon: ShieldAlert, 
      color: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-50 dark:bg-red-950/40', 
      border: 'border-red-200 dark:border-red-800' 
    },
  ];

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-montserrat flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-[#1d4ed8]" />
            구독 및 라이선스 관리
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            사용자별 활성 구독, 만료 예정일, 라이선스 디바이스 인증 현황을 종합 모니터링하고 제어합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefresh(v => v + 1)}
            disabled={loading}
            className="admin-btn-secondary flex items-center gap-2 text-sm px-3.5 py-2 font-medium"
            title="목록 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1d4ed8]' : 'text-zinc-600 dark:text-zinc-300'}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 6대 핵심 지표 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((card, idx) => {
          const isSelected = attention === card.filter;
          const IconComp = card.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const next = attention === card.filter ? 'ALL' : card.filter;
                setAttention(next);
                if (next !== 'ALL') {
                  setStatus('ALL');
                }
                setPage(1);
              }}
              className={`p-4 rounded-xl border text-left transition-all duration-200 group relative ${card.bg} ${
                isSelected 
                  ? 'ring-2 ring-[#1d4ed8] border-[#1d4ed8] shadow-sm' 
                  : `${card.border} hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate">{card.label}</span>
                <IconComp className={`w-4 h-4 ${card.color} shrink-0`} />
              </div>
              <div className="text-2xl font-bold font-montserrat tracking-tight text-zinc-900 dark:text-zinc-50">
                {card.value !== undefined ? Number(card.value).toLocaleString() : '-'}
              </div>
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1d4ed8]" />
              )}
            </button>
          );
        })}
      </div>

      {/* 검색 및 필터 패널 */}
      <div className="admin-glass-card p-5 space-y-4">
        <form 
          className="flex flex-wrap items-center gap-2.5" 
          onSubmit={e => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          {/* 검색창 */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              aria-label="이메일 또는 사용자 ID"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="이메일 또는 사용자 ID 검색"
              className="admin-ghost-input pl-9 pr-3 py-2 w-full text-sm font-medium"
            />
          </div>

          <button className="admin-btn-primary px-4 py-2 text-sm font-medium shrink-0" type="submit">
            검색
          </button>

          {/* 구독 상태 */}
          <select
            aria-label="구독 상태"
            className="admin-ghost-input px-3 py-2 text-sm font-medium shrink-0"
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">활성 (ACTIVE)</option>
            <option value="CANCELED">취소 (CANCELED)</option>
            <option value="EXPIRED">만료 (EXPIRED)</option>
          </select>

          {/* 플랜 코드 입력 */}
          <input
            aria-label="플랜 코드"
            className="admin-ghost-input px-3 py-2 text-sm font-medium w-32 shrink-0"
            placeholder="플랜 코드 (예: PRO)"
            value={plan === 'ALL' ? '' : plan}
            onChange={e => {
              setPlan(e.target.value.toUpperCase() || 'ALL');
              setPage(1);
            }}
          />

          {/* 부여 유형 */}
          <select
            aria-label="부여 유형"
            className="admin-ghost-input px-3 py-2 text-sm font-medium shrink-0"
            value={grantFilter}
            onChange={e => {
              setGrantFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">전체 부여 유형</option>
            <option value="ADMIN_FREE">관리자 무료</option>
            <option value="ADMIN_PAID">관리자 유료</option>
            <option value="TRIAL">무료 체험</option>
            <option value="UNKNOWN">결제 확인 전</option>
          </select>

          {/* 조치 대상 필터 */}
          <select
            aria-label="조치 대상"
            className="admin-ghost-input px-3 py-2 text-sm font-medium shrink-0"
            value={attention}
            onChange={e => {
              setAttention(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">전체 조치 대상</option>
            <option value="ACTIVE">활성 구독 (정상 이용)</option>
            <option value="EXPIRING_7">7일 내 만료 예정</option>
            <option value="EXPIRING_30">30일 내 만료 예정</option>
            <option value="STALE_ACTIVE">만료 처리 필요</option>
            <option value="HAS_DEVICES">활성 기기 보유</option>
            <option value="OVER_LIMIT">기기 초과</option>
          </select>

          {/* 초기화 버튼 */}
          {(search || status !== 'ALL' || plan !== 'ALL' || grantFilter !== 'ALL' || attention !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="admin-btn-secondary px-3 py-2 text-sm flex items-center gap-1.5 shrink-0 text-zinc-600 dark:text-zinc-300"
              title="필터 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          )}
        </form>

        {error && (
          <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 border-b border-[var(--admin-border)] font-semibold select-none">
              <tr>
                <th className="p-3.5 pl-4">사용자 (계정)</th>
                <th className="p-3.5">요금제</th>
                <th className="p-3.5">부여 유형</th>
                <th className="p-3.5">구독 상태</th>
                <th className="p-3.5">만료 예정일 (D-Day)</th>
                <th className="p-3.5 text-center">등록 기기</th>
                <th className="p-3.5 pr-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)] bg-white/40 dark:bg-zinc-950/40">
              {rows.map(row => {
                const statusInfo = getDetailedStatus(row);
                const dday = calculateDDay(row.current_period_end);
                const isOverLimit = row.devices > row.max_devices;

                return (
                  <tr 
                    key={row.id} 
                    className="hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 transition-colors"
                  >
                    {/* 사용자 계정 */}
                    <td className="p-3.5 pl-4 font-medium text-zinc-900 dark:text-zinc-100">
                      <button 
                        type="button"
                        onClick={() => setDetailId(row.id)}
                        className="text-[#1d4ed8] dark:text-blue-400 hover:underline font-semibold text-left break-all flex items-center gap-1.5"
                      >
                        {row.email}
                      </button>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                        ID: {row.user_id.slice(0, 8)}…
                      </div>
                    </td>

                    {/* 요금제 */}
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Tag className="w-3 h-3" />
                        {row.plan_name}
                      </span>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {row.billing_cycle || 'NONE'}
                      </div>
                    </td>

                    {/* 부여 유형 */}
                    <td className="p-3.5">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        {getGrantLabel(row.grant_type)}
                      </span>
                    </td>

                    {/* 상태 배지 */}
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                        {statusInfo.key === 'STALE_ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping mr-0.5" />}
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* 만료일 및 잔여일 */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-mono text-zinc-900 dark:text-zinc-200 text-xs">
                        {formatDateOnly(row.current_period_end)}
                      </div>
                      {dday && (
                        <span className={`inline-block text-[11px] font-bold mt-0.5 px-1.5 py-0.2 rounded ${
                          dday.isExpired 
                            ? 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800' 
                            : dday.isUrgent 
                              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400' 
                              : 'text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}>
                          {dday.label}
                        </span>
                      )}
                    </td>

                    {/* 등록 기기 수 */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        isOverLimit 
                          ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/60 dark:text-red-300' 
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}>
                        <Laptop className="w-3.5 h-3.5" />
                        <span>{row.devices} / {row.max_devices}</span>
                      </div>
                    </td>

                    {/* 관리 버튼 */}
                    <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDetailId(row.id)}
                        className="admin-btn-secondary text-xs px-2.5 py-1.5 font-medium hover:border-[#1d4ed8] hover:text-[#1d4ed8] transition-colors"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 빈 상태 */}
        {!loading && rows.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
              조건에 일치하는 구독 및 라이선스 데이터가 없습니다.
            </p>
          </div>
        )}

        {/* 로딩 인디케이터 */}
        {loading && (
          <div className="text-center py-8 text-sm text-zinc-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#1d4ed8]" />
            <span>구독 목록을 불러오는 중입니다…</span>
          </div>
        )}

        {/* 페이지네이션 및 현황 안내 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm pt-2">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            총 <span className="font-bold text-zinc-800 dark:text-zinc-200">{total.toLocaleString()}</span>건의 구독 정보
            {asOf && (
              <span className="ml-2 pl-2 border-l border-zinc-300 dark:border-zinc-700">
                조회 기준: {formatDate(asOf)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="admin-btn-secondary p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              title="이전 페이지"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 py-1 text-zinc-700 dark:text-zinc-300">
              {page} / {Math.max(1, Math.ceil(total / 20))}
            </span>
            <button
              type="button"
              className="admin-btn-secondary p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={page * 20 >= total || loading}
              onClick={() => setPage(p => p + 1)}
              title="다음 페이지"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 구독 및 라이선스 전용 상세 모달 */}
      {detailId && detail && (
        <SubscriptionDetailModal
          data={detail}
          canManage={canManage}
          onClose={() => setDetailId(null)}
          onRequestDeactivate={(actionParam) => setAction(actionParam)}
          onRequestChangePlan={() => {
            setPlanChangeUser({
              id: detail.current.user_id,
              email: detail.current.email,
              plan: detail.current.plan_name,
              plan_code: detail.current.plan_name,
              billing_cycle: detail.current.billing_cycle,
            });
          }}
        />
      )}

      {/* 기기 해제 사유 입력 확인 모달 */}
      {action && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !saving) {
              setAction(null);
              setReason('');
            }
          }}
        >
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-label="기기 해제 확인" 
            className="admin-glass-card bg-white dark:bg-zinc-900 p-6 w-full max-w-md space-y-4 shadow-2xl border border-[var(--admin-border)] rounded-2xl"
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {action.deviceId ? '선택한 기기 라이선스 해제' : '모든 활성 기기 일괄 해제'}
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {action.deviceId 
                ? `[${action.deviceName || '선택한 기기'}]의 라이선스 인증을 비활성화합니다. 해당 기기는 다음 번 라이선스 체크 시 제한사용자 모드로 전환됩니다.`
                : '해당 구독에 등록된 모든 활성 기기의 인증을 해제합니다. 사용자는 데스크톱 앱에서 다시 로그인 및 기기 재등록을 진행해야 합니다.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                해제 사유 입력 <span className="text-red-500">* (3자 이상)</span>
              </label>
              <textarea
                aria-label="해제 사유"
                className="admin-ghost-input w-full p-3 text-xs leading-relaxed min-h-[90px]"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="예: 고객 요청에 의한 기기 초기화, 비정상 다중 기기 접근 차단 등"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="admin-btn-secondary px-4 py-2 text-xs font-semibold"
                disabled={saving}
                onClick={() => {
                  setAction(null);
                  setReason('');
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="admin-btn-danger px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                disabled={saving || reason.trim().length < 3}
                onClick={handleDeactivateDevice}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>처리 중…</span>
                  </>
                ) : (
                  <span>해제 실행</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPER 관리자: 플랜 변경 모달 연동 */}
      {planChangeUser && (
        <UserPlanChangeModal
          user={planChangeUser}
          onClose={() => setPlanChangeUser(null)}
          onChanged={() => {
            setPlanChangeUser(null);
            setRefresh(v => v + 1);
          }}
        />
      )}
    </div>
  );
}
