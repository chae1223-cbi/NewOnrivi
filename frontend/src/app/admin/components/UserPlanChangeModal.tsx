/** 🚨 @PATCH : 2026-11-01 — 서버 오류 토스트에 요청 ID를 표시해 관리자 로그와 연결 */
/** 🚨 @PATCH : 2026-10-08 — 사용자 ID 방어 처리 강화 */
/** 🚨 @PATCH : 2026-09-28 — SUPER 관리자 수동 변경에서 플랜·무료/유료·사용기간·필수 사유를 각각 지정 */
'use client';

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

type Plan = {
  plan_code: string;
  name?: string;
  sys_type: string;
  is_free: boolean;
  is_active: boolean;
  price_monthly: number | null;
  price_yearly: number | null;
};

type User = { id: string; email: string; plan: string; plan_code: string; billing_cycle?: string };

function defaultCycle(plan: Plan): string {
  if (plan.plan_code === 'READER') return 'NONE';
  if (plan.is_free) return 'TRIAL';
  return Number(plan.price_monthly) > 0 ? 'MONTHLY' : 'YEARLY';
}

export default function UserPlanChangeModal({ user, onClose, onChanged }: {
  user: User | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  useModalEscape(Boolean(user), onClose);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planCode, setPlanCode] = useState('');
  const [billingCycle, setBillingCycle] = useState('NONE');
  const [grantType, setGrantType] = useState<'' | 'FREE' | 'PAID'>('');
  const [durationValue, setDurationValue] = useState(30);
  const [durationUnit, setDurationUnit] = useState<'DAY' | 'MONTH' | 'YEAR'>('DAY');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const selected = useMemo(() => plans.find(plan => plan.plan_code === planCode), [plans, planCode]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setPlanCode(user.plan_code);
    setBillingCycle('NONE');
    setGrantType('');
    setDurationValue(30);
    setDurationUnit('DAY');
    setReason('');
    setLoading(true);
    adminFetch('/api/admin/plans')
      .then(async response => {
        if (!response.ok) throw new Error('요금제 목록을 불러오지 못했습니다.');
        return response.json();
      })
      .then((data: Plan[]) => {
        if (!active) return;
        const available = data.filter(plan => plan.is_active);
        setPlans(available);
        const current = available.find(plan => plan.plan_code === user.plan_code);
        if (current?.is_free) setGrantType('FREE');
        const currentCycle = String(user.billing_cycle || '').toUpperCase();
        setBillingCycle(current && ['NONE', 'TRIAL', 'MONTHLY', 'YEARLY'].includes(currentCycle)
          ? currentCycle : current ? defaultCycle(current) : 'NONE');
      })
      .catch(error => { if (active) showToast(error.message, 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || saving) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, saving, onClose]);

  if (!user) return null;

  const submit = async () => {
    if (!selected || !grantType || reason.trim().length < 3 || saving ||
        (selected.plan_code !== 'READER' && (!Number.isInteger(durationValue) || durationValue < 1))) return;
    setSaving(true);
    try {
      const response = await adminFetch('/api/admin/users/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id || (user as any).user_id, planCode, billingCycle, grantType,
          durationValue: selected.plan_code === 'READER' ? 0 : durationValue,
          durationUnit: selected.plan_code === 'READER' ? 'NONE' : durationUnit,
          reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const requestId = result.requestId || response.headers.get('X-Request-ID');
        throw new Error(`${result.message || '요금제 변경에 실패했습니다.'}${requestId ? ` (오류번호: ${requestId})` : ''}`);
      }
      showToast('요금제를 변경했습니다. 기존 편집 세션은 종료되었습니다.', 'success');
      onChanged();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '요금제 변경에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="admin-plan-change-title" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--admin-border-light)] bg-white p-6 my-auto">
        <h2 id="admin-plan-change-title" className="text-xl font-bold text-[var(--admin-text)]">사용자 요금제 변경</h2>
        <p className="mt-2 text-sm text-[var(--admin-text-muted)] break-all">{user.email} · 현재 {user.plan}</p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          관리자 수동 변경입니다. 유료를 선택해도 이 화면에서는 결제·수납이 처리되지 않습니다. 기존 편집 세션은 종료됩니다.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="admin-user-plan" className="block mb-1.5 text-sm">변경할 요금제</label>
            <select id="admin-user-plan" value={planCode} disabled={loading || saving}
              onChange={event => {
                const next = plans.find(plan => plan.plan_code === event.target.value);
                setPlanCode(event.target.value);
                if (next) {
                  setBillingCycle(defaultCycle(next));
                  setGrantType(next.is_free ? 'FREE' : '');
                  setDurationValue(next.is_free ? 7 : 30);
                  setDurationUnit('DAY');
                }
              }} className="w-full min-h-10 px-3">
              {!selected && <option value="">요금제를 선택하세요</option>}
              {plans.map(plan => <option key={plan.plan_code} value={plan.plan_code}>
                {plan.name || plan.plan_code} ({plan.sys_type})
              </option>)}
            </select>
          </div>
          <div>
            <label htmlFor="admin-user-plan-grant-type" className="block mb-1.5 text-sm">제공 구분</label>
            <select id="admin-user-plan-grant-type" value={grantType} disabled={saving || !selected || selected.is_free}
              onChange={event => setGrantType(event.target.value as '' | 'FREE' | 'PAID')}
              className="w-full min-h-10 px-3">
              {!selected?.is_free && <option value="">제공 구분을 선택하세요</option>}
              <option value="FREE">무료 제공 (관리자 혜택)</option>
              {!selected?.is_free && <option value="PAID">유료 이용 (결제·수납 별도)</option>}
            </select>
          </div>
          {selected && !selected.is_free && (
            <div>
              <label htmlFor="admin-user-plan-cycle" className="block mb-1.5 text-sm">요금제 기준 주기</label>
              <select id="admin-user-plan-cycle" value={billingCycle} disabled={saving}
                onChange={event => setBillingCycle(event.target.value)} className="w-full min-h-10 px-3">
                {Number(selected.price_monthly) > 0 && <option value="MONTHLY">1개월</option>}
                {Number(selected.price_yearly) > 0 && <option value="YEARLY">1년</option>}
              </select>
            </div>
          )}
          {selected?.plan_code === 'READER' && (
            <p className="text-sm text-[var(--admin-text-muted)]">Reader로 변경하면 현재 구독이 종료되고 읽기 전용으로 전환됩니다.</p>
          )}
          {selected && selected.plan_code !== 'READER' && (
            <div>
              <label htmlFor="admin-user-plan-duration" className="block mb-1.5 text-sm">사용기간</label>
              <div className="flex gap-2">
                <input id="admin-user-plan-duration" type="number" min={1} max={durationUnit === 'DAY' ? 3650 : durationUnit === 'MONTH' ? 120 : 10}
                  value={durationValue} disabled={saving} onChange={event => setDurationValue(Number(event.target.value))}
                  className="w-full min-w-0 px-3" />
                <select aria-label="사용기간 단위" value={durationUnit} disabled={saving}
                  onChange={event => { setDurationUnit(event.target.value as 'DAY' | 'MONTH' | 'YEAR'); setDurationValue(1); }}
                  className="w-28 shrink-0 px-3">
                  <option value="DAY">일</option>
                  <option value="MONTH">개월</option>
                  <option value="YEAR">년</option>
                </select>
              </div>
              {selected.is_free && <p className="mt-1 text-xs text-[var(--admin-text-muted)]">무료 이상 요금제 이력이 있으면 다시 부여할 수 없습니다.</p>}
            </div>
          )}
          <div>
            <label htmlFor="admin-user-plan-reason" className="block mb-1.5 text-sm">변경 사유</label>
            <textarea id="admin-user-plan-reason" value={reason} maxLength={500} disabled={saving}
              onChange={event => setReason(event.target.value)} rows={3}
              placeholder="감사 기록에 남길 사유를 3자 이상 입력하세요" className="w-full p-3" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--admin-border)] pt-4">
          <button type="button" onClick={onClose} disabled={saving} className="admin-btn-secondary">취소</button>
          <button type="button" onClick={submit} disabled={loading || saving || !selected || !grantType || reason.trim().length < 3 ||
            (selected.plan_code !== 'READER' && (!Number.isInteger(durationValue) || durationValue < 1 ||
              durationValue > (durationUnit === 'DAY' ? 3650 : durationUnit === 'MONTH' ? 120 : 10)))}
            className="admin-btn-primary">{saving ? '변경 중…' : '요금제 변경'}</button>
        </div>
      </div>
    </div>
  );
}
