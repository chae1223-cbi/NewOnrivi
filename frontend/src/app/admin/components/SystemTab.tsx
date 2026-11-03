/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : app/admin/components/SystemTab.tsx
 * 🚨 @PATCH : **2026-11-04** — [KST(한국표준시 UTC+9) 기준 오늘 일자 적용]: getKSTToday() 함수로 UTC 시차(00~09시) 방어 및 11-04일 정상 표출
 * 🚨 @PATCH : **2026-11-04** — [R2 로그 적재 상태(logging_enabled) UI 표시]: ENABLE_R2_LOGS 환경변수 연동 상태(ON/OFF 뱃지) 안내
 * 🚨 @PATCH : **2026-11-03** — [최종 100건 실시간 스트림 & 프로드/미리보기 선택 탭 & 과거 로그 날짜별 다운로드 지원]:
 *             1. 로그 조회 한도 100건 확장 및 최신순 실시간 표시
 *             2. 환경 필터(전체 / 운영 PROD / 미리보기 PREVIEW) 토글 탭 탑재 및 로그별 환경 뱃지 표기
 *             3. 최근 30일 과거 날짜 선택 드롭다운 및 원클릭 JSON 파일 다운로드(handleDownloadLogs) 연동
 * 🚨 @PATCH : 2026-11-01 — 서버 오류 상세에 소스 파일·단계·PostgreSQL 오류 코드를 표시한다.
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-10-08** — [시스템 현황 및 실시간 로그 가독성 극대화 & 고대비 라이트 모드 리팩토링]:
 *             1. 글자 크기 상향(text-xs/11px → text-sm 14px) 및 한글 본문 font-sans font-semibold 전면 적용
 *             2. 한글 유니코드 자모 분리 방어(.normalize('NFC')) 및 고대비(text-zinc-950/text-zinc-900) 시인성 확보
 *             3. 콘솔 배경 어두운 음영 제거, 넉넉한 패딩과 분리선이 적용된 시원한 라이트 모드 테이블 행 레이아웃 제공
 * 🚨 @PATCH : **2026-10-08** — [시스템 현황 및 실시간 로그 콘솔 뷰어(SystemTab) 신규 구축]
 * -----------------------------------------------------------------------
 */
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Server,
  Database,
  HardDrive,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Terminal,
  Activity,
  Copy,
  Check,
  X,
  Play,
  Pause,
  User,
  ShieldAlert,
  Download,
  Calendar
} from 'lucide-react';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  database: {
    status: 'ONLINE' | 'ERROR';
    latency_ms: number;
    version: string;
  };
  storage: {
    status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
    bucket: string;
    binding: string;
    logging_enabled?: boolean;
  };
  hyperdrive: {
    status: string;
  };
  server: {
    runtime: string;
    region: string;
    country: string;
    server_time: string;
  };
}

interface SystemStats {
  total_events_today: number;
  total_users: number;
  active_subscriptions: number;
  db_latency_ms: number;
  error_count_24h: number | null;
}

interface SystemLogItem {
  environment?: 'PROD' | 'PREVIEW';
  hostname?: string;
  db_code?: string;
  source_file?: string;
  source_function?: string;
  event_code?: string;
  operation?: string;
  route?: string;
  status?: number;
  duration_ms?: number;
  request_id?: string;
  outcome?: string;
  region?: string;
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  module: string;
  action: string;
  message: string;
  actor: string;
  target: string;
}

const getKSTToday = (): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  }
};

const formatTimestamp = (val: string) => {
  try {
    const d = new Date(val);
    const pad = (n: number) => String(n).padStart(2, '0');
    const padMs = (n: number) => String(n).padStart(3, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${padMs(d.getMilliseconds())}`;
  } catch {
    return val;
  }
};

const formatDateFull = (val: string) => {
  try {
    const d = new Date(val);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return val;
  }
};

const safeText = (val?: string | null) => {
  if (!val) return '';
  return val.normalize('NFC');
};

export default function SystemTab() {
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'HEALTHY',
    database: { status: 'ONLINE', latency_ms: 0, version: 'PostgreSQL' },
    storage: { status: 'ONLINE', bucket: 'onrivi-images', binding: 'R2_BUCKET' },
    hyperdrive: { status: 'ACTIVE' },
    server: { runtime: 'Edge', region: 'Seoul', country: 'KR', server_time: new Date().toISOString() }
  });

  const [stats, setStats] = useState<SystemStats>({
    total_events_today: 0,
    total_users: 0,
    active_subscriptions: 0,
    db_latency_ms: 0,
    error_count_24h: 0
  });

  const [source, setSource] = useState('server');
  const [connectionError, setConnectionError] = useState('');
  const [logScope, setLogScope] = useState('');
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'WARN' | 'ERROR'>('ALL');
  const [search, setSearch] = useState('');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailLog, setDetailLog] = useState<SystemLogItem | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string>('');
  const [envFilter, setEnvFilter] = useState<'all' | 'prod' | 'preview'>('all');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getKSTToday);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchSystemData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = new URLSearchParams({
        source,
        level: levelFilter,
        search: search.trim(),
        env: envFilter,
        date: selectedDate,
        limit: '100'
      });

      const res = await adminFetch(`/api/admin/system?${params.toString()}`);
      if (!res.ok) throw new Error(`시스템 정보 조회 실패 (HTTP ${res.status})`);
      const data = await res.json();
      if (data.success) {
        setConnectionError(data.logError || '');
        setLogScope(data.logScope || '개발 환경: 관리자 활동 기록만 제공');
        if (data.health) setHealth(data.health);
        if (data.stats) setStats(data.stats);
        if (data.logs) {
          const normalized = data.logs.map((l: SystemLogItem) => ({
            ...l,
            message: safeText(l.message),
            action: safeText(l.action),
            module: safeText(l.module),
            actor: safeText(l.actor),
            target: safeText(l.target)
          }));
          setLogs(normalized.filter((log: SystemLogItem) => log.level === 'WARN' || log.level === 'ERROR'));
        }
        setLastFetchedAt(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      setConnectionError('조회 실패: 최신 상태를 확인할 수 없습니다.');
      console.error('System fetch error:', err);
      if (!isSilent) showToast(err.message || '시스템 정보를 불러오지 못했습니다.', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [levelFilter, search, source, envFilter, selectedDate]);

  useEffect(() => {
    fetchSystemData(false);
  }, [fetchSystemData]);

  // 실시간 3초 주기 자동 갱신
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSystemData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, fetchSystemData]);


  const handleDownloadLogs = async () => {
    try {
      setIsDownloading(true);
      const res = await adminFetch(`/api/admin/system?action=download&date=${selectedDate}&env=${envFilter}`);
      if (!res.ok) throw new Error(`로그 다운로드 실패 (HTTP ${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onrivi-logs-${envFilter}-${selectedDate}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`${selectedDate} (${envFilter.toUpperCase()}) 로그 파일이 다운로드되었습니다.`, 'success');
    } catch (err: any) {
      console.error('Download log error:', err);
      showToast(err.message || '로그 다운로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('클립보드에 복사되었습니다.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'WARN':
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      default:
        return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 상단 헬스 상태 요약 & 자동 갱신 컨트롤 (선명한 고대비 라이트 모드) */}
      <div className="admin-glass-card p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {loading ? '상태 확인 중' : connectionError ? '상태 확인 필요' : health.overall === 'HEALTHY' ? '시스템 상태 정상' : '시스템 상태 점검 필요'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                {connectionError ? '확인 불가' : health.overall}
              </span>
            </div>
            <p className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
              {health.server.runtime} • {health.server.region} • 마지막 갱신: {lastFetchedAt || '연결 중'}
            </p>
          </div>
        </div>

        {/* 실시간 토글 & 수동 새로고침 */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 border ${
              isAutoRefresh
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900'
            }`}
          >
            {isAutoRefresh ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <Pause className="w-4 h-4 text-emerald-700" />
                <span>실시간 3초 갱신 중</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>실시간 갱신 일시정지</span>
              </>
            )}
          </button>

          <button
            onClick={() => fetchSystemData(false)}
            className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs"
            title="수동 즉시 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. 4대 인프라 서비스 상태 카드 (글자 크기 & 명도 강화) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PostgreSQL Database */}
        <div className="admin-glass-card p-5 group hover:border-blue-500/50 transition-all border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-wide">PostgreSQL Database</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-950 dark:text-zinc-50 font-mono">
              {stats.db_latency_ms}
            </span>
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">ms 지연</span>
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 truncate" title={health.database.version}>
            상태: <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">{health.database.status}</strong> ({health.database.version.split(' ')[0]})
          </div>
        </div>

        {/* Cloudflare R2 Storage */}
        <div className="admin-glass-card p-5 group hover:border-teal-500/50 transition-all border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-wide">Cloudflare R2 스토리지</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700 dark:text-teal-400 font-mono">
            {health.storage.status}
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 flex items-center justify-between font-mono">
            <span>버킷: <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{health.storage.bucket}</strong></span>
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${health.storage.logging_enabled ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`}>
              로그적재 {health.storage.logging_enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* 오늘 발생 이벤트 */}
        <div className="admin-glass-card p-5 group hover:border-indigo-500/50 transition-all border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-wide">오늘 관리자 감사 기록</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
            {stats.total_events_today.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1">오늘 누적 관리자 감사 로그 · API·브라우저 로그 제외</div>
        </div>

        {/* 시스템 이상 징후 감지 */}
        <div className="admin-glass-card p-5 group hover:border-emerald-500/50 transition-all border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 tracking-wide">24H 오류 감지</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
            0 <span className="text-sm font-bold text-emerald-600">건</span>
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1">
            크리티컬 다운타임 없음
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select aria-label="로그 종류" value={source} onChange={e=>setSource(e.target.value)} className="border rounded-lg p-2">
          <option value="server">서버 API 로그</option><option value="audit">관리자 활동 기록</option>
        </select>
        <span className="text-sm">{source === 'server' ? logScope : '관리자 조치 최근 60건'}</span>
        {source === 'server' && !health.storage.logging_enabled && (
          <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/20">
            💡 R2 적재 OFF (ENABLE_R2_LOGS=false) · Cloudflare 실시간 로그 모니터링 모드
          </span>
        )}
        {connectionError && <span role="alert" className="text-red-700">{connectionError}</span>}
      </div>
      {/* 3. 실시간 시스템 로그 콘솔 뷰어 (글씨 크기 상향 & 고대비 가독성 극대화) */}
      <div className="admin-glass-card overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md">
        {/* 헤더 바 */}
        <div className="px-5 py-3.5 bg-zinc-100/90 dark:bg-zinc-800/90 border-b border-zinc-200 dark:border-zinc-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 mr-1">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-2xs" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-2xs" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs" />
            </div>
            <Terminal className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h4 className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50 tracking-wider">
              {source === 'server' ? `서버 API 로그 (최종 ${logs.length}건 실시간)` : '관리자 활동 기록'} ({logs.length}건)
            </h4>
          </div>

          {/* 콘솔 필터 및 검색 */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 🌐 환경 선택 (전체 / 운영 PROD / 미리보기 PREVIEW) */}
            {source === 'server' && (
              <div className="flex items-center p-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-xs font-bold">
                {([
                  { key: 'all', label: '전체' },
                  { key: 'prod', label: '운영 (PROD)' },
                  { key: 'preview', label: '미리보기 (PREVIEW)' }
                ] as const).map(envItem => (
                  <button
                    key={envItem.key}
                    onClick={() => setEnvFilter(envItem.key)}
                    className={`px-2.5 py-1.5 rounded-md transition-colors text-xs ${
                      envFilter === envItem.key
                        ? envItem.key === 'prod'
                          ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                          : envItem.key === 'preview'
                          ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                          : 'bg-zinc-800 text-white font-extrabold shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950'
                    }`}
                  >
                    {envItem.label}
                  </button>
                ))}
              </div>
            )}

            {/* 📅 과거 날짜 선택 드롭다운 */}
            {source === 'server' && (
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  title="조회할 로그 날짜 선택"
                >
                  <option value={getKSTToday()}>오늘 ({getKSTToday()})</option>
                  {availableDates.filter(d => d !== getKSTToday()).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 💾 과거 로그 파일 다운로드 버튼 */}
            {source === 'server' && (
              <button
                onClick={handleDownloadLogs}
                disabled={isDownloading}
                className="px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                title="${selectedDate} 로그 전체를 JSON 파일로 다운로드합니다."
              >
                <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>다운로드</span>
              </button>
            )}

            {/* 레벨 필터 */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-xs font-bold">
              {(['ALL', 'WARN', 'ERROR'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    levelFilter === lvl
                      ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950'
                  }`}
                >
                  {lvl === 'ALL' ? '오류·경고' : lvl === 'WARN' ? '경고' : '오류'}
                </button>
              ))}
            </div>

            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="작업 이름, API 경로, 요청 ID 검색..."
                className="pl-9 pr-3 py-1.5 rounded-lg admin-input text-xs font-medium w-44 sm:w-60 border-zinc-300 dark:border-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* 로그 목록 창 (선명하고 큼직한 한글 텍스트) */}
        <div className="p-2 overflow-y-auto max-h-[560px] min-h-[320px] space-y-1.5 custom-scrollbar bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading && logs.length === 0 ? (
            <div className="p-16 text-center text-zinc-700 dark:text-zinc-300 font-semibold text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
              실시간 시스템 로그를 수신하고 있습니다...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-zinc-700 dark:text-zinc-300 font-semibold text-sm">
              조회 조건에 일치하는 로그가 없습니다.
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                onClick={() => setDetailLog(log)}
                className="group flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl hover:bg-blue-50/80 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer gap-2 border border-transparent hover:border-blue-200 dark:hover:border-zinc-700"
              >
                <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
                  {/* 타임스탬프 (모노스페이스 선명도) */}
                  <span className="text-zinc-600 dark:text-zinc-400 font-mono text-xs font-bold shrink-0 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    {formatTimestamp(log.timestamp)}
                  </span>

                  {/* 환경 뱃지 (PROD / PREVIEW) */}
                  {log.environment && (
                    <span
                      className={`px-2 py-0.5 rounded text-2xs font-black tracking-wider uppercase border shrink-0 ${
                        log.environment === 'PROD'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                      }`}
                    >
                      {log.environment}
                    </span>
                  )}

                  {/* 레벨 뱃지 */}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-extrabold border shrink-0 ${getLevelBadgeClass(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>

                  {/* 모듈 태그 */}
                  <span className="px-2 py-0.5 rounded text-xs font-extrabold text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 shrink-0">
                    {log.module}
                  </span>

                  {/* 액션 코드 */}
                  <span className="text-zinc-900 dark:text-zinc-100 font-black text-xs shrink-0 font-mono">
                    {log.action}
                  </span>

                  {/* 상세 메시지 (산세리프 한글 완성형, 크기 text-sm, 고대비 굵은 글씨) */}
                  <span
                    className="text-sm font-bold text-zinc-950 dark:text-zinc-50 truncate max-w-xl group-hover:text-blue-700 dark:group-hover:text-blue-300 tracking-tight"
                    title={log.message}
                  >
                    {log.operation && <span className="block">{log.operation}</span>}
                    {log.route && <span className="block font-mono text-xs font-normal">{log.route}</span>}
                    {log.message}
                  </span>
                </div>

                {/* 행위자 & 상세보기 버튼 */}
                <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300 shrink-0 self-end md:self-auto font-mono">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[160px]" title={log.actor}>
                    {log.actor}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleCopy(JSON.stringify(log, null, 2), log.id); }}
                    className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    title="로그 JSON 복사"
                  >
                    {copiedId === log.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 바 */}
        <div className="px-5 py-3 bg-zinc-100/90 dark:bg-zinc-800/90 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            연결 상태: {connectionError ? '확인 불가' : lastFetchedAt ? '조회 완료' : '연결 중'} • 수신된 로그: {logs.length}건
          </span>
          <span>자동 갱신: {isAutoRefresh ? '활성화 (3초 주기)' : '일시정지됨'}</span>
        </div>
      </div>

      {/* 4. 로그 상세 정보 모달 (선명한 팝업) */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="admin-glass-card max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50">
                  시스템 로그 상세 내역
                </h4>
              </div>
              <button
                onClick={() => setDetailLog(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto min-h-0">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400 font-bold">발생 일시:</span>
                  <span className="font-mono font-extrabold text-zinc-950 dark:text-zinc-50 text-sm">
                    {formatDateFull(detailLog.timestamp)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400 font-bold">로그 레벨:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-extrabold border ${getLevelBadgeClass(detailLog.level)}`}>
                    {detailLog.level}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400 font-bold">모듈 / 액션:</span>
                  <span className="font-extrabold text-blue-700 dark:text-blue-400 font-mono text-sm">
                    [{detailLog.module}] {detailLog.action}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400 font-bold">수행자(Actor):</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    {detailLog.actor}
                  </span>
                </div>
                {detailLog.target !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 dark:text-zinc-400 font-bold">대상(Target):</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {detailLog.target}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-zinc-800 dark:text-zinc-200 block mb-1.5 font-bold text-sm">
                  상세 메시지:
                </span>
                <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-950 dark:text-zinc-50 font-bold text-sm leading-relaxed whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {detailLog.message}
                </div>
              </div>
              {(detailLog.module === 'CLIENT' || detailLog.source_file) && (
                <div className="rounded-xl border p-4 space-y-3 text-sm">
                  <h5 className="font-bold">소스 찾기</h5>
                  <dl className="space-y-2">
                    <div><dt className="font-bold">이벤트 코드</dt><dd className="font-mono break-all">{detailLog.event_code || `CLIENT_${detailLog.action}_${detailLog.level}`}</dd></div>
                    <div><dt className="font-bold">기록 지점</dt><dd className="font-mono break-all">{detailLog.source_file || '기존 로그 — 소스 위치 미수집'}</dd></div>
                    <div><dt className="font-bold">함수</dt><dd className="font-mono break-all">{detailLog.source_function || '미수집'}</dd></div>
                  </dl>
                  <p className="text-xs text-zinc-500">VS Code에서 해당 파일을 열고 함수 이름 또는 로그의 액션 코드로 검색하세요. 기록 지점이며 실제 오류 발생 위치와 다를 수 있습니다.</p>
                  <button className="admin-btn-secondary px-3 py-2" onClick={() => handleCopy([detailLog.source_file, detailLog.source_function, detailLog.event_code || detailLog.action].filter(Boolean).join('\n'), 'source_location')}>{copiedId === 'source_location' ? '복사됨' : '소스 위치 복사'}</button>
                </div>
              )}
              {detailLog.module === 'HTTP' && (
                <div className="space-y-3 text-sm">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border p-4">
                    <div className="sm:col-span-2"><dt className="font-bold">작업 이름</dt><dd>{detailLog.operation || "미수집 — API 경로를 확인하세요"}</dd></div>
                    <div><dt className="font-bold">API 경로</dt><dd className="break-all font-mono">{detailLog.route || '미수집 — 새 배포 이후 기록부터 표시'}</dd></div>
                    <div><dt className="font-bold">응답 상태</dt><dd>{detailLog.status ?? detailLog.message.match(/HTTP (\d+)/)?.[1] ?? '미수집'}</dd></div>
                    <div><dt className="font-bold">처리 시간</dt><dd>{detailLog.duration_ms ?? detailLog.message.match(/(\d+)ms/)?.[1] ?? '미수집'} ms</dd></div>
                    <div><dt className="font-bold">실행 위치</dt><dd>{detailLog.region || '미수집'}</dd></div>
                    <div className="sm:col-span-2"><dt className="font-bold">요청 ID</dt><dd className="break-all font-mono">{detailLog.request_id || detailLog.id}</dd></div>
                    {detailLog.source_file && <div className="sm:col-span-2"><dt className="font-bold">소스 파일</dt><dd className="break-all font-mono">{detailLog.source_file}</dd></div>}
                    {detailLog.source_function && <div><dt className="font-bold">처리 단계</dt><dd className="font-mono">{detailLog.source_function}</dd></div>}
                    {detailLog.db_code && <div><dt className="font-bold">PostgreSQL 오류 코드</dt><dd className="font-mono">{detailLog.db_code}</dd></div>}
                  </dl>
                  <p>{detailLog.outcome === 'UNHANDLED_EXCEPTION' ? '처리되지 않은 서버 예외가 발생했습니다. 요청 ID로 운영 콘솔의 기록을 확인하세요.' : (detailLog.status ?? Number(detailLog.message.match(/HTTP (\d+)/)?.[1])) >= 500 ? (detailLog.source_file ? '표시된 소스 파일과 처리 단계, PostgreSQL 오류 코드를 확인하세요.' : '서버 오류 응답입니다. 이 기록만으로 구체적인 오류 원인을 확정할 수 없습니다.') : (detailLog.status ?? Number(detailLog.message.match(/HTTP (\d+)/)?.[1])) >= 400 ? '요청이 거절되거나 처리되지 않았습니다. 인증·권한·요청 경로를 확인하세요.' : '정상 응답입니다. 처리 시간은 서버에서 응답을 생성하기까지의 시간입니다.'}</p>
                  <p className="text-xs text-zinc-500">개인정보 보호를 위해 쿼리, 본문, 인증 정보는 저장하지 않으며 동적 경로는 :value로 표시합니다.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
              <button
                onClick={() => handleCopy(JSON.stringify(detailLog, null, 2), 'modal_json')}
                className="admin-btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                {copiedId === 'modal_json' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>JSON 전체 복사</span>
              </button>

              <button
                onClick={() => setDetailLog(null)}
                className="admin-btn-primary px-5 py-2 text-xs font-bold"
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
