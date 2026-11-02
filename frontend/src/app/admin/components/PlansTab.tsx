/** 🚨 @PATCH : 2026-11-02 — 관리자 권한 표시를 서버 API로 조회한다. */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Check, X, GripVertical, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

interface PricingPlan {
  id: string;
  plan_code: string;
  sys_type: string;
  tagline: string;
  badge: string;
  is_free: boolean;
  tier_emoji: string;
  price_monthly: number | null;
  price_monthly_usd: number | null;
  price_yearly: number | null;
  price_yearly_usd: number | null;
  features: string[];
  cta: string;
  cta_variant: string;
  is_highlighted: boolean;
  sort_order: number;
  is_active: boolean;
  name?: string; // from common_codes
  environment_name?: string; // from common_codes
}

interface CommonCode {
  code_value: string;
  code_name: string;
}

export default function PlansTab() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminSuper, setIsAdminSuper] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');

  const [planCodes, setPlanCodes] = useState<CommonCode[]>([]);
  const [sysTypes, setSysTypes] = useState<CommonCode[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  
  const defaultForm = {
    plan_code: '',
    sys_type: '',
    tagline: '',
    badge: '',
    is_free: false,
    tier_emoji: '',
    price_monthly: '' as any,
    price_monthly_usd: '' as any,
    price_yearly: '' as any,
    price_yearly_usd: '' as any,
    features: [''] as string[],
    cta: '',
    cta_variant: 'primary',
    is_highlighted: false,
    sort_order: 0,
    is_active: true
  };
  const [form, setForm] = useState(defaultForm);

  const fetchPlans = useCallback(async (token: string) => {
    try {
      const res = await adminFetch('/api/admin/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setPlans(json);
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      showToast(err.message || '요금제를 불러오지 못했습니다.', 'error');
    }
  }, []);

  const fetchDropdownCodes = useCallback(async (adminId: string) => {
    try {
      const res = await adminFetch(`/api/admin/common-codes?adminId=${adminId}`);
      const json = await res.json();
      
      if (json.success && json.data) {
        const data = json.data.filter((c: any) => c.is_use === true);
        setPlanCodes(data.filter((c: any) => c.group_code === 'PLAN_NAME'));
        setSysTypes(data.filter((c: any) => c.group_code === 'SYS_TYPE'));
      }
    } catch (err) {
      console.error('Failed to fetch dropdown codes', err);
    }
  }, []);

  const initAuthAndFetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSessionToken(session.access_token);

      const adminId = session.user.id;
      const roleResponse = await adminFetch('/api/admin/role', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const adminData = roleResponse.ok ? await roleResponse.json() : null;
      if (adminData?.admin_role === 'SUPER') {
        setIsAdminSuper(true);
      }

      await fetchPlans(session.access_token);
      await fetchDropdownCodes(adminId);
    } catch (err) {
      showToast('초기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchPlans, fetchDropdownCodes]);

  useEffect(() => {
    initAuthAndFetchData();
  }, [initAuthAndFetchData]);

  const handleSave = async () => {
    if (!form.plan_code || !form.sys_type) {
      showToast('요금제 코드와 시스템 타입을 선택해주세요.', 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        price_monthly: form.price_monthly === '' ? null : Number(form.price_monthly),
        price_monthly_usd: form.price_monthly_usd === '' ? null : Number(form.price_monthly_usd),
        price_yearly: form.price_yearly === '' ? null : Number(form.price_yearly),
        price_yearly_usd: form.price_yearly_usd === '' ? null : Number(form.price_yearly_usd),
        features: form.features.filter(f => f.trim() !== '')
      };

      const res = await adminFetch('/api/admin/plans', {
        method: editingPlan ? 'PATCH' : 'POST',
        headers: { 
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingPlan ? { id: editingPlan.id, ...payload } : payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(`요금제가 성공적으로 ${editingPlan ? '수정' : '생성'}되었습니다.`, 'success');
      setModalOpen(false);
      fetchPlans(sessionToken);
    } catch (err: any) {
      showToast(err.message || '저장에 실패했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 요금제를 삭제하시겠습니까?')) return;
    try {
      const res = await adminFetch(`/api/admin/plans?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      showToast('요금제가 삭제되었습니다.', 'success');
      fetchPlans(sessionToken);
    } catch (err: any) {
      showToast(err.message || '삭제에 실패했습니다.', 'error');
    }
  };

  const openModal = (plan?: PricingPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setForm({
        plan_code: plan.plan_code,
        sys_type: plan.sys_type,
        tagline: plan.tagline || '',
        badge: plan.badge || '',
        is_free: plan.is_free,
        tier_emoji: plan.tier_emoji || '',
        price_monthly: plan.price_monthly ?? '',
        price_monthly_usd: plan.price_monthly_usd ?? '',
        price_yearly: plan.price_yearly ?? '',
        price_yearly_usd: plan.price_yearly_usd ?? '',
        features: plan.features?.length > 0 ? plan.features : [''],
        cta: plan.cta || '',
        cta_variant: plan.cta_variant || 'primary',
        is_highlighted: plan.is_highlighted,
        sort_order: plan.sort_order,
        is_active: plan.is_active
      });
    } else {
      setEditingPlan(null);
      setForm({...defaultForm, sort_order: plans.length + 1});
    }
    setModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-10 text-[var(--admin-text-muted)]">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold font-montserrat text-[var(--admin-text)] tracking-tight">요금제 관리</h1>
          <p className="text-[var(--admin-text-muted)] mt-1">시스템에서 제공하는 플랜 목록과 혜택을 동적으로 관리합니다.</p>
        </div>
        {isAdminSuper && (
          <button 
            onClick={() => openModal()}
            className="px-4 py-2 bg-[var(--admin-primary)] text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> 새 요금제
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="admin-glass-card p-6 flex flex-col relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{plan.tier_emoji}</span>
                <div>
                  <h3 className="text-xl font-bold text-[var(--admin-text)] flex items-center gap-2">
                    {plan.name || plan.plan_code}
                    {!plan.is_active && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">비활성</span>}
                  </h3>
                  <p className="text-sm text-[var(--admin-text-muted)]">{plan.tagline}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${plan.is_free ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                  {plan.is_free ? '무료' : '유료'}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {plan.environment_name || plan.sys_type}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-[var(--admin-background)] rounded-xl border border-[var(--admin-border)]">
              <div>
                <div className="text-xs text-[var(--admin-text-muted)] mb-1">월간 (KRW / USD)</div>
                <div className="font-semibold text-[var(--admin-text)]">
                  {plan.price_monthly ? `₩${plan.price_monthly.toLocaleString()}` : '-'} / {plan.price_monthly_usd ? `$${plan.price_monthly_usd}` : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--admin-text-muted)] mb-1">연간 (KRW / USD)</div>
                <div className="font-semibold text-[var(--admin-text)]">
                  {plan.price_yearly ? `₩${plan.price_yearly.toLocaleString()}` : '-'} / {plan.price_yearly_usd ? `$${plan.price_yearly_usd}` : '-'}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-xs text-[var(--admin-text-muted)] font-medium mb-2 uppercase tracking-wider">제공 혜택 ({plan.features.length})</div>
              <ul className="space-y-1.5 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-[var(--admin-text)] flex items-start gap-2">
                    <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span className="leading-snug line-clamp-2" title={f}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button onClick={() => openModal(plan)} className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:text-blue-500">
                {isAdminSuper ? <Edit2 size={16} /> : <Eye size={16} />}
              </button>
              {isAdminSuper && (
                <button onClick={() => handleDelete(plan.id)} className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--admin-border)] my-auto overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold font-montserrat">
                {editingPlan ? (isAdminSuper ? '요금제 수정' : '요금제 조회') : '새 요금제 생성'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-black/5"><X size={20} /></button>
            </div>
            
            <fieldset disabled={!isAdminSuper} className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0 border-none p-0 m-0 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {/* Left Column: Basic Info & Prices */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">요금제 플랜 (PLAN_NAME)</label>
                    <select 
                      value={form.plan_code} 
                      onChange={e => setForm({...form, plan_code: e.target.value})}
                      disabled={!!editingPlan}
                      className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none"
                    >
                      <option value="">선택하세요</option>
                      {planCodes.map(c => <option key={c.code_value} value={c.code_value}>{c.code_name} ({c.code_value})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">시스템 타입 (SYS_TYPE)</label>
                    <select 
                      value={form.sys_type} 
                      onChange={e => setForm({...form, sys_type: e.target.value})}
                      className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none"
                    >
                      <option value="">선택하세요</option>
                      {sysTypes.map(c => <option key={c.code_value} value={c.code_value}>{c.code_name} ({c.code_value})</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">서브 타이틀 (Tagline)</label>
                  <input 
                    type="text" value={form.tagline} onChange={e => setForm({...form, tagline: e.target.value})}
                    placeholder="예: 평생 무료 읽기 전용"
                    className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">티어 이모지</label>
                    <input type="text" value={form.tier_emoji} onChange={e => setForm({...form, tier_emoji: e.target.value})} placeholder="예: 🥉" className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">배지 텍스트</label>
                    <input type="text" value={form.badge} onChange={e => setForm({...form, badge: e.target.value})} placeholder="예: 🥉" className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none" />
                  </div>
                  <div className="flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={form.is_free} 
                        onChange={e => {
                          const checked = e.target.checked;
                          setForm({
                            ...form, 
                            is_free: checked,
                            ...(checked ? {
                              price_monthly: '',
                              price_monthly_usd: '',
                              price_yearly: '',
                              price_yearly_usd: ''
                            } : {})
                          });
                        }} 
                        className="w-4 h-4 text-blue-600 rounded" 
                      />
                      <span className="text-sm font-medium">무료 요금제 여부</span>
                    </label>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border space-y-4 transition-opacity ${form.is_free ? 'bg-[var(--admin-surface)] border-[var(--admin-border)] opacity-60 pointer-events-none' : 'bg-[var(--admin-background)] border-[var(--admin-border)]'}`}>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    가격 설정 {form.is_free && <span className="text-xs text-blue-400 font-normal">(무료 요금제)</span>}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[var(--admin-text-muted)] mb-1">월간 가격 (원화)</label>
                      <input type="number" value={form.price_monthly} onChange={e => setForm({...form, price_monthly: e.target.value})} disabled={form.is_free} placeholder="예: 3000" className="w-full px-3 py-2 bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-lg border border-[var(--admin-border)] focus:border-blue-500 outline-none disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--admin-text-muted)] mb-1">월간 가격 (외화 USD)</label>
                      <input type="number" step="0.01" value={form.price_monthly_usd} onChange={e => setForm({...form, price_monthly_usd: e.target.value})} disabled={form.is_free} placeholder="예: 2.99" className="w-full px-3 py-2 bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-lg border border-[var(--admin-border)] focus:border-blue-500 outline-none disabled:opacity-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[var(--admin-text-muted)] mb-1">연간 가격 (원화)</label>
                      <input type="number" value={form.price_yearly} onChange={e => setForm({...form, price_yearly: e.target.value})} disabled={form.is_free} placeholder="예: 30000" className="w-full px-3 py-2 bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-lg border border-[var(--admin-border)] focus:border-blue-500 outline-none disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--admin-text-muted)] mb-1">연간 가격 (외화 USD)</label>
                      <input type="number" step="0.01" value={form.price_yearly_usd} onChange={e => setForm({...form, price_yearly_usd: e.target.value})} disabled={form.is_free} placeholder="예: 29.99" className="w-full px-3 py-2 bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-lg border border-[var(--admin-border)] focus:border-blue-500 outline-none disabled:opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">버튼 텍스트 (CTA)</label>
                    <input type="text" value={form.cta} onChange={e => setForm({...form, cta: e.target.value})} placeholder="예: 구독 시작" className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">버튼 스타일</label>
                    <select value={form.cta_variant} onChange={e => setForm({...form, cta_variant: e.target.value})} className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none">
                      <option value="primary">Primary (강조)</option>
                      <option value="secondary">Secondary (일반)</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_highlighted} onChange={e => setForm({...form, is_highlighted: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-medium">강조(인기) 카드 UI 적용</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-medium">활성화 (표시) 여부</span>
                  </label>
                </div>
              </div>

              {/* Right Column: Features List */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">제공 혜택 (Features)</label>
                  <button 
                    onClick={() => setForm({...form, features: [...form.features, '']})}
                    className="text-xs text-blue-500 hover:text-blue-600 font-semibold flex items-center gap-1"
                  ><Plus size={12}/> 추가</button>
                </div>
                <div className="flex-1 bg-[var(--admin-background)] border border-[var(--admin-border)] rounded-xl p-3 overflow-y-auto max-h-[500px] space-y-2">
                  {form.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <GripVertical size={16} className="text-gray-400 mt-2 cursor-grab shrink-0" />
                      <textarea 
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...form.features];
                          newFeatures[idx] = e.target.value;
                          setForm({...form, features: newFeatures});
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-lg border border-[var(--admin-border)] focus:border-blue-500 outline-none resize-none"
                        rows={2}
                        placeholder="제공할 혜택을 입력하세요"
                      />
                      <button 
                        onClick={() => {
                          const newFeatures = form.features.filter((_, i) => i !== idx);
                          setForm({...form, features: newFeatures});
                        }}
                        className="mt-2 p-1 text-gray-400 hover:text-red-500 shrink-0"
                      ><X size={16}/></button>
                    </div>
                  ))}
                  {form.features.length === 0 && (
                    <div className="text-center py-8 text-sm text-[var(--admin-text-muted)]">
                      등록된 혜택이 없습니다.
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">정렬 순서</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none" />
                </div>
              </div>
            </fieldset>

            <div className="mt-6 pt-4 border-t border-[var(--admin-border)] flex justify-end gap-3 shrink-0">
              <button onClick={() => setModalOpen(false)} className="admin-btn-secondary">
                {isAdminSuper ? '취소' : '닫기'}
              </button>
              {isAdminSuper && (
                <button onClick={handleSave} className="px-5 py-2.5 admin-btn-primary text-white text-sm font-medium rounded-xl transition-colors">
                  {editingPlan ? '변경사항 저장' : '새 요금제 생성'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
