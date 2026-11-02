/** 🚨 @PATCH : 2026-11-02 — 관리자 권한 표시를 서버 API로 조회한다. */
'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export default function FaqsTab() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminSuper, setIsAdminSuper] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [form, setForm] = useState({
    question: '',
    answer: '',
    sort_order: 0,
    is_active: true
  });

  useEffect(() => {
    checkAdminRole();
    fetchFaqs();
  }, []);

  const checkAdminRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const response = await adminFetch('/api/admin/role', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = response.ok ? await response.json() : null;
      if (data?.admin_role === 'SUPER') {
        setIsAdminSuper(true);
      }
    }
  };

  const fetchFaqs = async () => {
    try {
      const res = await adminFetch('/api/faqs?admin=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFaqs(data);
    } catch (err: any) {
      showToast(err.message || 'FAQ 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      showToast('질문과 답변을 모두 입력해주세요.', 'warning');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      if (editingFaq) {
        res = await adminFetch(`/api/faqs/${editingFaq.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(form)
        });
      } else {
        res = await adminFetch('/api/faqs', {
          method: 'POST',
          headers,
          body: JSON.stringify(form)
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(`FAQ가 성공적으로 ${editingFaq ? '수정' : '생성'}되었습니다.`, 'success');
      setModalOpen(false);
      fetchFaqs();
    } catch (err: any) {
      showToast(err.message || '저장에 실패했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 FAQ를 삭제하시겠습니까?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await adminFetch(`/api/faqs/${id}`, {
        method: 'DELETE',
        headers
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error);
      }
      showToast('FAQ가 삭제되었습니다.', 'success');
      fetchFaqs();
    } catch (err: any) {
      showToast(err.message || '삭제에 실패했습니다.', 'error');
    }
  };

  const openModal = (faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setForm({
        question: faq.question,
        answer: faq.answer,
        sort_order: faq.sort_order,
        is_active: faq.is_active
      });
    } else {
      setEditingFaq(null);
      setForm({
        question: '',
        answer: '',
        sort_order: faqs.length > 0 ? Math.max(...faqs.map(f => f.sort_order)) + 1 : 1,
        is_active: true
      });
    }
    setModalOpen(true);
  };

  const handleSortChange = async (faq: FAQ, direction: 'up' | 'down') => {
    const currentIndex = faqs.findIndex(f => f.id === faq.id);
    if (direction === 'up' && currentIndex > 0) {
      const target = faqs[currentIndex - 1];
      await swapSortOrders(faq, target);
    } else if (direction === 'down' && currentIndex < faqs.length - 1) {
      const target = faqs[currentIndex + 1];
      await swapSortOrders(faq, target);
    }
  };

  const swapSortOrders = async (faq1: FAQ, faq2: FAQ) => {
    try {
      await adminFetch(`/api/faqs/${faq1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...faq1, sort_order: faq2.sort_order })
      });
      await adminFetch(`/api/faqs/${faq2.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...faq2, sort_order: faq1.sort_order })
      });
      fetchFaqs();
    } catch (err) {
      showToast('순서 변경에 실패했습니다.', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-[var(--admin-text-muted)]">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold font-montserrat text-[var(--admin-text)] tracking-tight">자주 묻는 질문(FAQ) 관리</h1>
          <p className="text-[var(--admin-text-muted)] mt-1">랜딩 페이지에 노출될 자주 묻는 질문 리스트를 관리합니다.</p>
        </div>
        {isAdminSuper && (
          <button 
            onClick={() => openModal()}
            className="px-4 py-2 bg-[var(--admin-primary)] text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> 새 FAQ 추가
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {faqs.map((faq, index) => (
          <div key={faq.id} className="admin-glass-card p-6 flex flex-col relative group">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    순서: {faq.sort_order}
                  </span>
                  <h3 className="text-lg font-bold text-[var(--admin-text)]">
                    Q. {faq.question}
                  </h3>
                  {!faq.is_active && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      비활성
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--admin-text-muted)] leading-relaxed whitespace-pre-wrap">
                  A. {faq.answer}
                </p>
              </div>
              
              {isAdminSuper && (
                <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1 justify-end mb-2">
                    <button onClick={() => handleSortChange(faq, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded disabled:opacity-30">
                      <ArrowUp size={16} />
                    </button>
                    <button onClick={() => handleSortChange(faq, 'down')} disabled={index === faqs.length - 1} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded disabled:opacity-30">
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(faq)}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      title="수정"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {faqs.length === 0 && (
          <div className="text-center py-10 text-[var(--admin-text-muted)] admin-glass-card">
            등록된 FAQ가 없습니다.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="admin-glass-card w-full max-w-2xl max-h-[90vh] flex flex-col p-6 rounded-2xl my-auto overflow-hidden">
            <h2 className="text-xl font-bold text-[var(--admin-text)] mb-6 shrink-0 font-montserrat">
              {editingFaq ? 'FAQ 수정' : '새 FAQ 추가'}
            </h2>

            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">질문 (Question)</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={e => setForm({...form, question: e.target.value})}
                  className="w-full px-4 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-transparent transition-all"
                  placeholder="예: 결제는 어떻게 하나요?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">답변 (Answer)</label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm({...form, answer: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-transparent transition-all resize-y"
                  placeholder="답변 내용을 입력하세요..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">정렬 순서</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">상태</label>
                  <select
                    value={form.is_active ? 'true' : 'false'}
                    onChange={e => setForm({...form, is_active: e.target.value === 'true'})}
                    className="w-full px-4 py-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)]"
                  >
                    <option value="true">활성 (표시됨)</option>
                    <option value="false">비활성 (숨김)</option>
                  </select>
                </div>
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
                className="px-6 py-2 admin-btn-primary text-white text-sm font-medium rounded-lg transition-colors"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
