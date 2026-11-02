/** 🚨 @PATCH : 2026-11-02 — 관리자 권한 표시를 서버 API로 조회한다. */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle2, XCircle, Search, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

interface CodeGroup {
  group_code: string;
  group_name: string;
  description: string;
  sort_order: number;
  is_use: boolean;
}

interface CommonCode {
  id: string;
  group_code: string;
  code_value: string;
  code_name: string;
  description: string;
  sort_order: number;
  is_use: boolean;
}

export default function CodesTab() {
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [isAdminSuper, setIsAdminSuper] = useState(false);
  const [groups, setGroups] = useState<CodeGroup[]>([]);
  const [codes, setCodes] = useState<CommonCode[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);

  // Group Modal State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CodeGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ group_code: '', group_name: '', description: '', sort_order: 0, is_use: true });

  // Code Modal State
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<CommonCode | null>(null);
  const [codeForm, setCodeForm] = useState({ code_value: '', code_name: '', description: '', sort_order: 0, is_use: true });

  const fetchGroups = useCallback(async (adminId: string | null = currentAdminId) => {
    try {
      const res = await adminFetch(`/api/admin/common-codes/groups?adminId=${adminId}`);
      const json = await res.json();
      if (json.success) {
        setGroups(json.data);
      }
    } catch (err) {
      showToast('그룹 목록을 불러오지 못했습니다.', 'error');
    }
  }, [currentAdminId]);

  const initAuthAndFetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id || null;
      setCurrentAdminId(adminId);

      // Fetch user role
      if (adminId) {
        const roleResponse = await adminFetch('/api/admin/role', { headers: { Authorization: `Bearer ${session?.access_token}` } });
        const adminData = roleResponse.ok ? await roleResponse.json() : null;
        if (adminData?.admin_role === 'SUPER') {
          setIsAdminSuper(true);
        }
      }

      await fetchGroups(adminId);
    } catch (err) {
      showToast('초기화 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchGroups]);

  const fetchCodes = useCallback(async (group_code: string) => {
    setCodesLoading(true);
    try {
      const res = await adminFetch(`/api/admin/common-codes?adminId=${currentAdminId}&group_code=${group_code}`);
      const json = await res.json();
      if (json.success) {
        setCodes(json.data);
      }
    } catch (err) {
      showToast('상세 코드 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setCodesLoading(false);
    }
  }, [currentAdminId]);

  useEffect(() => {
    initAuthAndFetchGroups();
  }, [initAuthAndFetchGroups]);

  useEffect(() => {
    if (selectedGroup) {
      fetchCodes(selectedGroup);
    } else {
      setCodes([]);
    }
  }, [selectedGroup, fetchCodes]);

  const handleSaveGroup = async () => {
    if (!isAdminSuper) {
      showToast('SUPER 권한이 필요합니다.', 'error');
      return;
    }
    if (!groupForm.group_code || !groupForm.group_name) {
      showToast('그룹 코드와 명칭을 입력해주세요.', 'error');
      return;
    }

    try {
      const url = '/api/admin/common-codes/groups';
      const method = editingGroup ? 'PATCH' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: currentAdminId, ...groupForm })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        setGroupModalOpen(false);
        fetchGroups();
      } else {
        showToast(json.error, 'error');
      }
    } catch (err) {
      showToast('그룹 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteGroup = async (group_code: string) => {
    if (!isAdminSuper) return;
    if (!confirm(`'${group_code}' 그룹을 정말 삭제하시겠습니까? (하위 코드도 함께 삭제됩니다)`)) return;

    try {
      const res = await adminFetch(`/api/admin/common-codes/groups?adminId=${currentAdminId}&group_code=${group_code}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        if (selectedGroup === group_code) setSelectedGroup(null);
        fetchGroups();
      } else {
        showToast(json.error, 'error');
      }
    } catch (err) {
      showToast('그룹 삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleSaveCode = async () => {
    if (!isAdminSuper) {
      showToast('SUPER 권한이 필요합니다.', 'error');
      return;
    }
    if (!codeForm.code_value || !codeForm.code_name) {
      showToast('코드 값과 명칭을 입력해주세요.', 'error');
      return;
    }

    try {
      const url = '/api/admin/common-codes';
      const method = editingCode ? 'PATCH' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId: currentAdminId, 
          group_code: selectedGroup,
          id: editingCode?.id,
          ...codeForm 
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        setCodeModalOpen(false);
        if (selectedGroup) fetchCodes(selectedGroup);
      } else {
        showToast(json.error, 'error');
      }
    } catch (err) {
      showToast('상세 코드 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteCode = async (id: string, code_value: string) => {
    if (!isAdminSuper) return;
    if (!confirm(`'${code_value}' 코드를 정말 삭제하시겠습니까?`)) return;

    try {
      const res = await adminFetch(`/api/admin/common-codes?adminId=${currentAdminId}&id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        if (selectedGroup) fetchCodes(selectedGroup);
      } else {
        showToast(json.error, 'error');
      }
    } catch (err) {
      showToast('상세 코드 삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-[var(--admin-text-muted)]">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold font-montserrat text-[var(--admin-text)] tracking-tight">공통 코드 관리</h1>
          <p className="text-[var(--admin-text-muted)] mt-1">시스템에서 사용되는 정적 코드(sys_codes)를 관리합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Group Selector */}
        <div className="admin-glass-card p-4 h-fit max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-[var(--admin-text)] uppercase tracking-wider">코드 그룹</h3>
            {isAdminSuper && (
              <button 
                onClick={() => {
                  setEditingGroup(null);
                  setGroupForm({ group_code: '', group_name: '', description: '', sort_order: groups.length + 1, is_use: true });
                  setGroupModalOpen(true);
                }}
                className="text-blue-500 hover:text-blue-600 p-1"
                title="그룹 추가"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {groups.map((group) => (
              <div 
                key={group.group_code}
                className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                  selectedGroup === group.group_code 
                    ? 'bg-[var(--admin-surface-bright)] text-[var(--admin-primary)] font-medium' 
                    : 'text-[var(--admin-text-muted)] hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                onClick={() => setSelectedGroup(group.group_code)}
              >
                <div className="flex flex-col text-left">
                  <span>{group.group_code} {!group.is_use && <span className="text-xs text-red-500 ml-1">(미사용)</span>}</span>
                  <span className="text-xs opacity-70 mt-0.5">{group.group_name}</span>
                </div>
                {isAdminSuper && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGroup(group);
                        setGroupForm({ ...group });
                        setGroupModalOpen(true);
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.group_code);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {groups.length === 0 && <div className="text-xs text-center text-gray-500 py-4">등록된 그룹이 없습니다.</div>}
          </div>
        </div>

        {/* Detail Codes */}
        <div className="md:col-span-2 admin-glass-card p-6 h-fit min-h-[400px]">
          {selectedGroup ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--admin-text)]">{selectedGroup}</h2>
                  <p className="text-sm text-[var(--admin-text-muted)] mt-1">해당 그룹의 상세 코드를 관리합니다.</p>
                </div>
                {isAdminSuper && (
                  <button 
                    onClick={() => {
                      setEditingCode(null);
                      setCodeForm({ code_value: '', code_name: '', description: '', sort_order: codes.length + 1, is_use: true });
                      setCodeModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--admin-surface-bright)] text-[var(--admin-primary)] border border-[var(--admin-border)] rounded-lg text-sm font-medium hover:bg-[var(--admin-border)] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> 코드 추가
                  </button>
                )}
              </div>

              {codesLoading ? (
                <div className="text-center py-10 text-[var(--admin-text-muted)]">불러오는 중...</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[var(--admin-surface-bright)] text-[var(--admin-text-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">코드 값</th>
                        <th className="px-4 py-3 font-semibold">명칭</th>
                        <th className="px-4 py-3 font-semibold">정렬</th>
                        <th className="px-4 py-3 font-semibold">상태</th>
                        {isAdminSuper && <th className="px-4 py-3 font-semibold text-right">관리</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--admin-border)]">
                      {codes.map((code) => (
                        <tr key={code.id} className="hover:bg-[var(--admin-surface-bright)]/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-[var(--admin-text)]">{code.code_value}</td>
                          <td className="px-4 py-3 text-[var(--admin-text)]">{code.code_name}</td>
                          <td className="px-4 py-3 text-[var(--admin-text-muted)]">{code.sort_order}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              code.is_use ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                            }`}>
                              {code.is_use ? '사용중' : '미사용'}
                            </span>
                          </td>
                          {isAdminSuper && (
                            <td className="px-4 py-3 text-right space-x-2">
                              <button 
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                onClick={() => {
                                  setEditingCode(code);
                                  setCodeForm({ ...code });
                                  setCodeModalOpen(true);
                                }}
                              >
                                수 정
                              </button>
                              <button 
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                onClick={() => handleDeleteCode(code.id, code.code_value)}
                              >
                                삭 제
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {codes.length === 0 && (
                        <tr>
                          <td colSpan={isAdminSuper ? 5 : 4} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                            등록된 상세 코드가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--admin-text-muted)] py-20">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>좌측에서 그룹을 선택하면 상세 코드가 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Group Modal */}
      {groupModalOpen && isAdminSuper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-[var(--admin-border)] my-auto overflow-hidden">
            <h3 className="text-xl font-bold mb-4 shrink-0 font-montserrat">{editingGroup ? '그룹 수정' : '새 그룹 생성'}</h3>
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div>
                <label className="block text-sm font-medium mb-1">그룹 코드 (대문자 영문)</label>
                <input 
                  type="text" 
                  value={groupForm.group_code} 
                  onChange={e => setGroupForm({...groupForm, group_code: e.target.value.toUpperCase()})}
                  disabled={!!editingGroup}
                  className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                  placeholder="예: PLAN_TYPE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">그룹 명칭</label>
                <input 
                  type="text" 
                  value={groupForm.group_name} 
                  onChange={e => setGroupForm({...groupForm, group_name: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                  placeholder="예: 결제 요금제 종류"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">상세 설명</label>
                <input 
                  type="text" 
                  value={groupForm.description} 
                  onChange={e => setGroupForm({...groupForm, description: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">정렬 순서</label>
                  <input 
                    type="number" 
                    value={groupForm.sort_order} 
                    onChange={e => setGroupForm({...groupForm, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                  />
                </div>
                <div className="flex flex-col items-center justify-end h-full mt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={groupForm.is_use} 
                      onChange={e => setGroupForm({...groupForm, is_use: e.target.checked})}
                      className="w-4 h-4 rounded text-[#1d4ed8] focus:ring-[#1d4ed8]"
                    />
                    <span className="text-sm font-medium">사용 여부</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-[var(--admin-border)] flex justify-end gap-2 shrink-0">
              <button onClick={() => setGroupModalOpen(false)} className="admin-btn-secondary">취소</button>
              <button onClick={handleSaveGroup} className="px-4 py-2 admin-btn-primary text-white text-sm font-medium rounded-xl">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {codeModalOpen && isAdminSuper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-[var(--admin-border)] my-auto overflow-hidden">
            <h3 className="text-xl font-bold mb-4 shrink-0 font-montserrat">{editingCode ? '상세 코드 수정' : '새 코드 생성'}</h3>
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div>
                <label className="block text-sm font-medium mb-1">코드 값 (대문자 영문)</label>
                <input 
                  type="text" 
                  value={codeForm.code_value} 
                  onChange={e => setCodeForm({...codeForm, code_value: e.target.value.toUpperCase().replace(/\s+/g, '')})}
                  disabled={!!editingCode}
                  className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                  placeholder="예: FREE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">표시 명칭 (한글 등)</label>
                <input 
                  type="text" 
                  value={codeForm.code_name} 
                  onChange={e => setCodeForm({...codeForm, code_name: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                  placeholder="예: 무료 플랜"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">상세 설명</label>
                <input 
                  type="text" 
                  value={codeForm.description} 
                  onChange={e => setCodeForm({...codeForm, description: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">정렬 순서</label>
                  <input 
                    type="number" 
                    value={codeForm.sort_order} 
                    onChange={e => setCodeForm({...codeForm, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-[#1d4ed8] outline-none"
                  />
                </div>
                <div className="flex flex-col items-center justify-end h-full mt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={codeForm.is_use} 
                      onChange={e => setCodeForm({...codeForm, is_use: e.target.checked})}
                      className="w-4 h-4 rounded text-[#1d4ed8] focus:ring-[#1d4ed8]"
                    />
                    <span className="text-sm font-medium">사용 여부</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-[var(--admin-border)] flex justify-end gap-2 shrink-0">
              <button onClick={() => setCodeModalOpen(false)} className="admin-btn-secondary">취소</button>
              <button onClick={handleSaveCode} className="px-4 py-2 admin-btn-primary text-white text-sm font-medium rounded-xl">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
