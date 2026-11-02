/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : app/admin/components/SubscriptionDetailModal.tsx
 * -----------------------------------------------------------------------
 * 변경내역
 * 🚨 @PATCH : **2026-09-30** — [구독 및 라이선스 전용 상세 모달 신규 구축]:
 *             1. Modern Technical Editorial 디자인 시스템(Cobalt Authority #1d4ed8) 기반 전용 중앙 모달 구현
 *             2. 사용자 프로필(이메일, 닉네임), 구독 플랜, 상태 Chip, D-Day, 라이선스 키 원클릭 복사, 결제 정보 제공
 *             3. 등록 디바이스 인증 관리(개별/일괄 해제), 구독 이력 타임라인, 운영 감사 로그 완벽 시각화
 *             4. SUPER 관리자 직접 플랜 변경 모달(UserPlanChangeModal) 및 사용자 관리 탭 연동 지원
 * -----------------------------------------------------------------------
 */
'use client';

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Calendar, 
  Shield, 
  Laptop, 
  History, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  Tag, 
  Smartphone, 
  Key, 
  DollarSign, 
  User,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { showToast } from '@/utils/toast';

export type SubscriptionDetailData = {
  current: {
    id: string;
    user_id: string;
    email: string;
    nick_name?: string | null;
    plan_name: string;
    plan_status: string;
    billing_cycle: string;
    grant_type: string;
    license_key?: string | null;
    payment_no?: string | null;
    price_amount?: number | null;
    is_active: boolean;
    current_period_start: string;
    current_period_end: string;
    max_devices: number;
    created_at: string;
    updated_at: string;
    canceled_at?: string | null;
  };
  history: Array<{
    id: string;
    plan_name: string;
    plan_status: string;
    billing_cycle: string;
    is_active: boolean;
    current_period_start: string;
    current_period_end: string;
    created_at: string;
  }>;
  devices: Array<{
    id: string;
    device_name: string;
    device_hint: string;
    activated_at: string;
    deactivated_at: string | null;
    is_active: boolean;
  }>;
  audits: Array<{
    id: string;
    action_type: string;
    reason: string;
    created_at: string;
    admin_email: string | null;
  }>;
};

interface SubscriptionDetailModalProps {
  data: SubscriptionDetailData;
  canManage: boolean;
  onClose: () => void;
  onRequestDeactivate: (action: { deviceId?: string; deviceName?: string }) => void;
  onRequestChangePlan: () => void;
}

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

const getGrantLabel = (grantType: string) => {
  switch (grantType) {
    case 'ADMIN_FREE': return '관리자 무료 제공';
    case 'ADMIN_PAID': return '관리자 유료 부여';
    case 'TRIAL': return '무료 체험';
    case 'UNKNOWN': return '결제 확인 전';
    default: return grantType;
  }
};

export default function SubscriptionDetailModal({
  data,
  canManage,
  onClose,
  onRequestDeactivate,
  onRequestChangePlan,
}: SubscriptionDetailModalProps) {
  useModalEscape(true, onClose);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'devices' | 'history' | 'audits'>('info');

  const { current, history, devices, audits } = data;
  const dday = calculateDDay(current.current_period_end);
  const activeDevices = devices.filter(d => d.is_active);
  const isEndPast = new Date(current.current_period_end).getTime() <= Date.now();

  const isStale = current.is_active && isEndPast;
  const isNormalActive = current.plan_status === 'ACTIVE' && current.is_active && !isEndPast;

  const handleCopyLicenseKey = () => {
    if (!current.license_key) return;
    navigator.clipboard.writeText(current.license_key);
    setCopiedKey(true);
    showToast('라이선스 키가 클립보드에 복사되었습니다.', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="subscription-detail-title"
        className="bg-white dark:bg-zinc-900 border border-[var(--admin-border)] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-[var(--admin-border)] flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1d4ed8]/10 text-[#1d4ed8] dark:bg-[#1d4ed8]/20 dark:text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="subscription-detail-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-50 font-montserrat">
                  구독 및 라이선스 상세
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isStale 
                    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : isNormalActive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : current.plan_status === 'CANCELED'
                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                }`}>
                  {isStale ? '만료 처리 필요' : isNormalActive ? '활성' : current.plan_status === 'CANCELED' ? '취소' : '만료'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {current.email} {current.nick_name && `(${current.nick_name})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={onRequestChangePlan}
                className="admin-btn-primary text-xs px-3 py-1.5 font-medium flex items-center gap-1.5 shadow-xs"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>요금제 변경</span>
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-1 px-6 border-b border-[var(--admin-border)] bg-zinc-50/40 dark:bg-zinc-900 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'info'
                ? 'border-[#1d4ed8] text-[#1d4ed8] dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>구독 & 라이선스 정보</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'devices'
                ? 'border-[#1d4ed8] text-[#1d4ed8] dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>등록 디바이스 ({activeDevices.length}/{current.max_devices})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-[#1d4ed8] text-[#1d4ed8] dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>구독 이력 ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audits')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'audits'
                ? 'border-[#1d4ed8] text-[#1d4ed8] dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>운영 감사 로그 ({audits.length})</span>
          </button>
        </div>

        {/* 모달 본문 영역 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: 구독 & 라이선스 정보 */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* 기본 요약 카드 */}
              <div className="admin-glass-card p-5 space-y-4 rounded-xl">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#1d4ed8]" />
                  구독 플랜 및 라이선스 키
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">현재 요금제</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <Tag className="w-3 h-3" />
                      {current.plan_name}
                    </span>
                  </div>

                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">청구 주기</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {current.billing_cycle || 'NONE'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">부여 유형</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {getGrantLabel(current.grant_type)}
                    </span>
                  </div>

                  {/* 라이선스 키 */}
                  <div className="sm:col-span-2">
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">발급 라이선스 키</span>
                    {current.license_key ? (
                      <div className="flex items-center gap-2">
                        <code className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs font-bold border border-zinc-200 dark:border-zinc-700 tracking-wider">
                          {current.license_key}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyLicenseKey}
                          className="admin-btn-secondary p-1 rounded hover:text-[#1d4ed8]"
                          title="라이선스 키 복사"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-600 dark:text-zinc-400 font-mono text-xs">발급된 키 없음 (Reader 상태)</span>
                    )}
                  </div>

                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">기기 인증 한도</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      최대 {current.max_devices}대 허용
                    </span>
                  </div>
                </div>

                {/* 결제 및 식별 번호 */}
                <div className="pt-3 border-t border-[var(--admin-border)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">주문/결제 식별번호 (Payment No)</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 text-xs break-all">
                      {current.payment_no || '기록 없음'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">구독 ID (UUID)</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 text-xs break-all">
                      {current.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* 구독 기간 및 상태 카드 */}
              <div className="admin-glass-card p-5 space-y-4 rounded-xl">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  구독 기간 및 유효성
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">시작일</span>
                    <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDate(current.current_period_start)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">만료 예정일</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatDate(current.current_period_end)}
                      </span>
                      {dday && (
                        <span className={`px-2 py-0.2 rounded text-[11px] font-bold ${
                          dday.isExpired 
                            ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' 
                            : dday.isUrgent 
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {dday.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">최근 변경일</span>
                    <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {formatDate(current.updated_at)}
                    </span>
                  </div>
                </div>

                {isStale && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>만료일이 도래하였으나 아직 활성 상태로 남아있습니다. 상단 [요금제 변경]을 통해 Reader로 변경하거나 기간을 연장해 주세요.</span>
                  </div>
                )}
              </div>

              {/* 사용자 계정 정보 */}
              <div className="admin-glass-card p-5 space-y-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-600" />
                    연동 계정 정보
                  </h3>
                  <a 
                    href={`/admin?tab=users&userId=${current.user_id}`}
                    className="text-xs text-[#1d4ed8] dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    사용자 관리에서 보기 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-600 dark:text-zinc-400 font-semibold block mb-0.5">이메일</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{current.email}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 dark:text-zinc-400 font-semibold block mb-0.5">닉네임</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{current.nick_name || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 등록 디바이스 인증 관리 */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-500" />
                    등록 디바이스 현황
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    현재 활성화된 기기: {activeDevices.length}대 / 최대 {current.max_devices}대
                  </p>
                </div>

                {canManage && activeDevices.length > 0 && (
                  <button 
                    type="button"
                    className="admin-btn-danger text-xs px-3 py-1.5 font-medium flex items-center gap-1.5"
                    onClick={() => onRequestDeactivate({})}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>모든 기기 일괄 해제</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {devices.length ? (
                  devices.map(device => (
                    <div 
                      key={device.id} 
                      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--admin-border)] bg-zinc-50/70 dark:bg-zinc-800/40 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-zinc-500" />
                          <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
                            {device.device_name || '이름 없는 디바이스'}
                          </span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 text-[11px] bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded">
                            UUID: {device.device_hint}…
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            device.is_active 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                              : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                          }`}>
                            {device.is_active ? '정상 활성' : '해제됨'}
                          </span>
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-400 text-xs">
                          최초 인증: {formatDate(device.activated_at)}
                          {device.deactivated_at && ` · 해제 일시: ${formatDate(device.deactivated_at)}`}
                        </div>
                      </div>

                      {canManage && device.is_active && (
                        <button 
                          type="button"
                          className="admin-btn-secondary text-xs px-3 py-1.5 text-red-600 hover:text-red-700 hover:border-red-300 font-medium shrink-0"
                          onClick={() => onRequestDeactivate({ deviceId: device.id, deviceName: device.device_name })}
                        >
                          기기 해제
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-zinc-600 dark:text-zinc-400 text-xs space-y-1">
                    <Laptop className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">등록된 디바이스가 없습니다.</p>
                    <p>사용자가 데스크톱 앱에서 로그인하면 기기가 자동 등록됩니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 구독 이력 타임라인 */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                과거 요금제 및 구독 변동 기록 ({history.length}건)
              </h3>

              <div className="rounded-xl border border-[var(--admin-border)] overflow-hidden divide-y divide-[var(--admin-border)]">
                {history.length ? (
                  history.map(item => (
                    <div key={item.id} className="p-4 text-xs flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{item.plan_name}</span>
                          <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            {item.billing_cycle || 'NONE'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.is_active 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {item.plan_status}
                          </span>
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-400 text-xs">
                          유효 기간: {formatDateOnly(item.current_period_start)} ~ {formatDateOnly(item.current_period_end)}
                        </div>
                      </div>
                      <span className="text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                        생성: {formatDateOnly(item.created_at)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-600 dark:text-zinc-400 text-xs">
                    과거 구독 이력이 존재하지 않습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: 운영 감사 로그 */}
          {activeTab === 'audits' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                관리자 조치 및 감사 기록 ({audits.length}건)
              </h3>

              <div className="rounded-xl border border-[var(--admin-border)] overflow-hidden divide-y divide-[var(--admin-border)]">
                {audits.length ? (
                  audits.map(log => (
                    <div key={log.id} className="p-4 text-xs bg-white/50 dark:bg-zinc-900/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1d4ed8] dark:text-blue-400 text-xs uppercase tracking-wider">
                          {log.action_type}
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <div className="text-zinc-800 dark:text-zinc-200 font-semibold">
                        조치 관리자: {log.admin_email || '시스템 관리자'}
                      </div>
                      <div className="text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 break-all font-mono leading-relaxed">
                        {log.reason || '사유가 기록되지 않았습니다.'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-600 dark:text-zinc-400 text-xs">
                    기록된 운영 및 감사 로그가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단 푸터 액션 */}
        <div className="px-6 py-4 border-t border-[var(--admin-border)] flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-800/50 shrink-0 text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">
            사용자 ID: <span className="font-mono font-medium">{current.user_id}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary px-4 py-2 font-semibold text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
