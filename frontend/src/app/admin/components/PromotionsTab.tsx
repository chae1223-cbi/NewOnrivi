// ====================================================================
// 📊 [OMD-ADMIN-PromotionsTab-0031] PromotionsTab ➔ 관리자 프로모션 관리 탭
// 🎯 @KICK  : 프로모션 마스터(promotions) 생성/수정/삭제 및 신청자(promotion_subscribers) 목록 조회 및 CSV 다운로드
// 🛡️ @GUARD : SUPER 관리자 권한 체크, 기간 자동 상태 표시
// 🚨 @PATCH : 2026-11-02 — 프로모션과 신청자 DB 접근을 관리자 서버 API로 이동
// 🔗 @CALLS : adminFetch, showToast
// ====================================================================
/** 🚨 @PATCH : 2026-09-28 — 프로모션 모달의 닫기 버튼을 관리자 공통 보조 버튼으로 통일 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Download, Users, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

interface Promotion {
  code: string;
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface Subscriber {
  id: string;
  promotion_code: string;
  email: string;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

function getStatus(promo: Promotion): { label: string; color: string } {
  const now = new Date();
  if (!promo.is_active) return { label: '비활성 (숨김)', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  const start = promo.start_date ? new Date(promo.start_date) : null;
  const end = promo.end_date ? new Date(promo.end_date) : null;
  if (start && now < start) return { label: '진행 대기', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  if (end && now > end) return { label: '종료됨', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  return { label: '진행 중', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
}

const emptyForm = {
  code: '',
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  is_active: true,
};

export default function PromotionsTab() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [subscribers, setSubscribers] = useState<Record<string, Subscriber[]>>({});
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminSuper, setIsAdminSuper] = useState(false);

  // 신규 가입자 수 (오늘)
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdminRole();
    fetchPromotions();
  }, []);

  const checkAdminRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const response = await adminFetch('/api/admin/role');
      const data = response.ok ? await response.json() : null;
      if (data?.admin_role === 'SUPER') setIsAdminSuper(true);
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await adminFetch('/api/admin/promotions');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPromotions(data.promotions || []);
      setTotalCount(data.totalCount || 0);
      setTodayCount(data.todayCount || 0);
    } catch (err: any) {
      showToast(err.message || '프로모션 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = useCallback(async (code: string) => {
    if (subscribers[code]) return; // 이미 로드됨
    const response = await adminFetch(`/api/admin/promotions?code=${encodeURIComponent(code)}`);
    if (response.ok) {
      const data = await response.json();
      setSubscribers(prev => ({ ...prev, [code]: data }));
    }
  }, [subscribers]);

  const toggleExpand = (code: string) => {
    if (expandedCode === code) {
      setExpandedCode(null);
    } else {
      setExpandedCode(code);
      fetchSubscribers(code);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      const response = await adminFetch('/api/admin/promotions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...promo, original_code: promo.code, is_active: !promo.is_active })
      });
      if (!response.ok) throw new Error((await response.json()).error);
      showToast(`프로모션이 ${!promo.is_active ? '활성화' : '비활성화'}되었습니다.`, 'success');
      fetchPromotions();
    } catch (err: any) {
      showToast(err.message || '상태 변경에 실패했습니다.', 'error');
    }
  };

  const openModal = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setForm({
        code: promo.code,
        title: promo.title,
        description: promo.description || '',
        start_date: promo.start_date ? promo.start_date.slice(0, 16) : '',
        end_date: promo.end_date ? promo.end_date.slice(0, 16) : '',
        is_active: promo.is_active,
      });
    } else {
      setEditingPromo(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim()) {
      showToast('프로모션 코드와 제목은 필수 항목입니다.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        description: form.description.trim(),
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        is_active: form.is_active,
      };

      const response = await adminFetch('/api/admin/promotions', {
        method: editingPromo ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPromo ? { ...payload, original_code: editingPromo.code } : payload)
      });
      if (!response.ok) throw new Error((await response.json()).error);

      showToast(`프로모션이 ${editingPromo ? '수정' : '생성'}되었습니다.`, 'success');
      setModalOpen(false);
      fetchPromotions();
    } catch (err: any) {
      showToast(err.message || '저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`"${code}" 프로모션을 삭제하면 연결된 신청자 데이터도 모두 삭제됩니다. 계속하시겠습니까?`)) return;
    try {
      const response = await adminFetch(`/api/admin/promotions?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error);
      showToast('프로모션이 삭제되었습니다.', 'success');
      fetchPromotions();
    } catch (err: any) {
      showToast(err.message || '삭제에 실패했습니다.', 'error');
    }
  };

  const handleDownloadCSV = (code: string) => {
    const list = subscribers[code];
    if (!list || list.length === 0) {
      showToast('다운로드할 신청자 데이터가 없습니다.', 'warning');
      return;
    }
    const header = ['번호', '이메일', '신청일시', '발송여부', '발송일시'];
    const rows = list.map((s, i) => [
      i + 1,
      s.email,
      new Date(s.created_at).toLocaleString('ko-KR'),
      s.is_sent ? 'Y' : 'N',
      s.sent_at ? new Date(s.sent_at).toLocaleString('ko-KR') : '-'
    ]);
    const csvContent = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion_${code}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${list.length}명의 신청자 데이터를 다운로드했습니다.`, 'success');
  };

  if (loading) {
    return <div className="text-center py-10 text-[var(--admin-text-muted)]">로딩 중...</div>;
  }

  const activePromo = promotions.find(p => p.is_active);

  return (
    <div className="space-y-6 pb-20">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold font-montserrat text-[var(--admin-text)] tracking-tight">프로모션 관리</h1>
          <p className="text-[var(--admin-text-muted)] mt-1">
            랜딩페이지에 노출할 이벤트를 직접 만들고, 신청자를 관리합니다.
          </p>
        </div>
        {isAdminSuper && (
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-[var(--admin-primary)] text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus size={16} /> 새 프로모션 만들기
          </button>
        )}
      </div>

      {/* 상단 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="admin-glass-card p-5">
          <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">총 누적 신청자</p>
          <p className="text-3xl font-bold font-montserrat text-[var(--admin-text)]">{totalCount.toLocaleString()} <span className="text-base font-normal text-[var(--admin-text-muted)]">명</span></p>
        </div>
        <div className="admin-glass-card p-5">
          <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">오늘 신규 신청</p>
          <p className="text-3xl font-bold font-montserrat text-[var(--admin-text)]">{todayCount.toLocaleString()} <span className="text-base font-normal text-[var(--admin-text-muted)]">명</span></p>
        </div>
        <div className="admin-glass-card p-5">
          <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider mb-1">현재 노출 프로모션</p>
          {activePromo ? (
            <p className="text-base font-bold text-emerald-500 truncate mt-1" title={activePromo.title}>
              🟢 {activePromo.title}
            </p>
          ) : (
            <p className="text-base font-medium text-[var(--admin-text-muted)] mt-1">⚫ 없음 (랜딩 폼 숨김)</p>
          )}
        </div>
      </div>

      {/* 프로모션 목록 */}
      <div className="flex flex-col gap-4">
        {promotions.length === 0 ? (
          <div className="text-center py-16 text-[var(--admin-text-muted)] admin-glass-card">
            <p className="text-4xl mb-3">🎁</p>
            <p className="font-medium">등록된 프로모션이 없습니다.</p>
            <p className="text-sm mt-1">우측 상단의 [새 프로모션 만들기] 버튼을 눌러 시작하세요.</p>
          </div>
        ) : (
          promotions.map(promo => {
            const status = getStatus(promo);
            const isExpanded = expandedCode === promo.code;
            const subList = subscribers[promo.code] || [];

            return (
              <div key={promo.code} className="admin-glass-card overflow-hidden">
                {/* 프로모션 헤더 행 */}
                <div className="flex items-start gap-4 p-5">
                  <button
                    onClick={() => toggleExpand(promo.code)}
                    className="mt-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${status.color}`}>
                        {status.label}
                      </span>
                      <code className="text-xs font-mono px-2 py-0.5 bg-[var(--admin-surface)] rounded text-[var(--admin-text-muted)]">
                        {promo.code}
                      </code>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--admin-text)]">{promo.title}</h3>
                    {promo.description && (
                      <p className="text-sm text-[var(--admin-text-muted)] mt-1 line-clamp-1">{promo.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--admin-text-muted)]">
                      {promo.start_date && <span>📅 시작: {new Date(promo.start_date).toLocaleDateString('ko-KR')}</span>}
                      {promo.end_date && <span>🏁 종료: {new Date(promo.end_date).toLocaleDateString('ko-KR')}</span>}
                      {!promo.start_date && !promo.end_date && <span>기간 제한 없음</span>}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* 신청자 수 뱃지 */}
                    <button
                      onClick={() => toggleExpand(promo.code)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--admin-surface)] rounded-lg text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] transition-colors"
                    >
                      <Users size={13} />
                      <span>{subList.length > 0 ? subList.length : '...'}</span>
                    </button>

                    {/* CSV 다운로드 */}
                    <button
                      onClick={() => { fetchSubscribers(promo.code).then(() => setTimeout(() => handleDownloadCSV(promo.code), 300)); }}
                      className="p-2 text-[var(--admin-text-muted)] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title="CSV 다운로드"
                    >
                      <Download size={16} />
                    </button>

                    {/* ON/OFF 토글 */}
                    {isAdminSuper && (
                      <button
                        onClick={() => handleToggleActive(promo)}
                        className={`p-1 rounded-lg transition-colors ${promo.is_active ? 'text-[var(--admin-primary)] hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title={promo.is_active ? '비활성화 (랜딩 폼 숨김)' : '활성화 (랜딩 폼 노출)'}
                      >
                        {promo.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    )}

                    {/* 수정 / 삭제 */}
                    {isAdminSuper && (
                      <>
                        <button onClick={() => openModal(promo)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors" title="수정">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(promo.code)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-colors" title="삭제">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 신청자 목록 (펼쳐지면 표시) */}
                {isExpanded && (
                  <div className="border-t border-[var(--admin-border)] px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
                        <Mail size={14} /> 신청자 목록
                        <span className="ml-1 px-2 py-0.5 bg-[var(--admin-surface)] rounded-full text-xs text-[var(--admin-text-muted)]">
                          {subList.length}명
                        </span>
                      </h4>
                      <button
                        onClick={() => handleDownloadCSV(promo.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        <Download size={13} /> CSV 내보내기
                      </button>
                    </div>

                    {subList.length === 0 ? (
                      <p className="text-center py-6 text-sm text-[var(--admin-text-muted)]">아직 신청자가 없습니다.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[var(--admin-surface)] text-[var(--admin-text-muted)] text-xs font-semibold">
                              <th className="px-4 py-2 text-left w-10">#</th>
                              <th className="px-4 py-2 text-left">이메일</th>
                              <th className="px-4 py-2 text-left">신청일시</th>
                              <th className="px-4 py-2 text-center w-20">발송여부</th>
                              <th className="px-4 py-2 text-left">발송일시</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subList.map((sub, i) => (
                              <tr key={sub.id} className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-surface)] transition-colors">
                                <td className="px-4 py-2.5 text-[var(--admin-text-muted)] text-xs">{i + 1}</td>
                                <td className="px-4 py-2.5 font-medium text-[var(--admin-text)]">{sub.email}</td>
                                <td className="px-4 py-2.5 text-[var(--admin-text-muted)]">{new Date(sub.created_at).toLocaleString('ko-KR')}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sub.is_sent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                    {sub.is_sent ? 'Y' : 'N'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-[var(--admin-text-muted)]">
                                  {sub.sent_at ? new Date(sub.sent_at).toLocaleString('ko-KR') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 생성/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="admin-glass-card w-full max-w-lg max-h-[90vh] flex flex-col p-6 rounded-2xl my-auto overflow-hidden">
            <h2 className="text-xl font-bold text-[var(--admin-text)] mb-6 shrink-0 font-montserrat">
              {editingPromo ? '프로모션 수정' : '새 프로모션 만들기'}
            </h2>

            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">
                  프로모션 코드 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal">(영문 대문자, 신청자 구분용)</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={!!editingPromo}
                  className="w-full px-4 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] font-mono focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="예: PRE_LAUNCH_2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">
                  제목 (랜딩페이지 노출) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-transparent transition-all"
                  placeholder="예: 얼리버드 특별 프로모션"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">
                  설명 문구 (랜딩페이지 노출)
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-transparent transition-all resize-y"
                  placeholder="예: 지금 이메일을 등록하시면 1년 Regular 플랜을 무료로 드립니다."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">시작일</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] text-sm focus:ring-2 focus:ring-[var(--admin-primary)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">종료일</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] text-sm focus:ring-2 focus:ring-[var(--admin-primary)] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg">
                <span className="text-sm font-medium text-[var(--admin-text)]">랜딩페이지 노출 (is_active)</span>
                <button
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`ml-auto transition-colors ${form.is_active ? 'text-[var(--admin-primary)]' : 'text-gray-400'}`}
                >
                  {form.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--admin-border)] shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="admin-btn-secondary"
              >
                닫기
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 admin-btn-primary text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
