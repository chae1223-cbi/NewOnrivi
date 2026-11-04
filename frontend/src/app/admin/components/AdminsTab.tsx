// 🚨 @PATCH : 2026-11-04 — [SUPER 관리자 전용 권한 변경/회수 가드 강화] currentAdminRole 연동으로 SUPPORT 관리자의 무단 변경 차단 및 안내 배너 표시
// 🚨 @PATCH : 2026-11-04 — [권한 확인창 표시 수정] 관리자 페이지 스크롤·애니메이션 영향을 받지 않도록 확인창을 body에 렌더링
// 🚨 @PATCH : 2026-11-04 — [관리자 권한 해제·삭제 분리] 비활성 상태 표시와 재부여·삭제 메뉴 추가
// 🚨 @PATCH : 2026-11-04 — [관리자 목록 오류 중복 기록 방지] 서버 500 응답은 서버 로그를 기준으로 추적하고 토스트의 별도 오류 로그는 생략
/** 🚨 @PATCH : 2026-11-02 — [보안 리팩토링] 서버 응답의 is_root 플래그 기반 최상위 관리자 판별 지원 */
/** 🚨 @PATCH : 2026-11-02 — [관리자 API 호출 규격 정리] 권한 변경/회수 시 불필요한 targetEmail, adminId 클라이언트 전달 제거 */
/** 🚨 @PATCH : 2026-11-02 — 최상위 관리자 이메일 하드코딩을 제거하고 isRootAdmin(@/constants/admin) 상수 헬퍼로 전환 */
/** 🚨 @PATCH : 2026-09-28 — 관리자 초대·확인 모달 버튼을 공통 보조/위험 작업 디자인 토큰으로 통일 */
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Plus, Search, MoreVertical, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';
import { isRootAdmin } from '@/constants/admin';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  admin_role: string;
  created_at: string;
  is_root?: boolean;
  is_active: boolean;
}

export default function AdminsTab() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('SUPPORT');
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{top: number; right: number} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, isDanger?: boolean, onConfirm: () => void} | null>(null);

  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [currentAdminRole, setCurrentAdminRole] = useState<string | null>(null);

  const handleMenuToggle = (adminId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === adminId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(adminId);
  };

  const fetchAdmins = async () => {
    setLoading(true);
    let serverErrorAlreadyLogged = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentAdminId(session?.user?.id || null);
      try {
        const roleRes = await adminFetch('/api/admin/role', {
          headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
        });
        const roleJson = await roleRes.json();
        setCurrentAdminRole(roleJson.admin_role || null);
      } catch {}

      const res = await adminFetch('/api/admin/admins', {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON: ${text}`);
      }
      
      if (res.ok && json.success) {
        setAdmins(json.data);
      } else {
        serverErrorAlreadyLogged = res.status >= 500;
        throw new Error(json.error || '관리자 목록을 불러오지 못했습니다.');
      }
    } catch (err: any) {
      showToast(err.message || '네트워크 오류가 발생했습니다.', 'error', undefined, serverErrorAlreadyLogged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('이메일을 입력해주세요.', 'error');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await adminFetch('/api/admin/admins', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setInviteModalOpen(false);
        setInviteEmail('');
        fetchAdmins();
      } else {
        showToast(data.error || '초대에 실패했습니다.', 'error');
      }
    } catch (err) {
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const handleChangeRole = (admin: AdminUser, newRole: string) => {
    setConfirmConfig({
      isOpen: true,
      title: `${admin.email}의 권한을 ${newRole}(으)로 변경하시겠습니까?`,
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await adminFetch('/api/admin/admins', {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({ adminTargetId: admin.id, newRole })
          });
          const data = await res.json();
          if (data.success) {
            showToast(data.message, 'success');
            fetchAdmins();
          } else {
            showToast(data.error || '권한 변경에 실패했습니다.', 'error');
          }
        } catch (err) {
          showToast('네트워크 오류가 발생했습니다.', 'error');
        } finally {
          setConfirmConfig(null);
        }
      }
    });
  };

  const handleAccess = (admin: AdminUser, isActive: boolean) => {
    setConfirmConfig({
      isOpen: true,
      title: `${admin.email}의 관리자 권한을 ${isActive ? '다시 부여' : '해제'}하시겠습니까?`,
      isDanger: !isActive,
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await adminFetch('/api/admin/admins', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
            body: JSON.stringify({ adminTargetId: admin.id, isActive })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(data.message, 'success');
            fetchAdmins();
          } else {
            showToast(data.error || '권한 변경에 실패했습니다.', 'error');
          }
        } catch {
          showToast('네트워크 오류가 발생했습니다.', 'error');
        } finally {
          setConfirmConfig(null);
        }
      }
    });
  };

  const handleDelete = (admin: AdminUser) => {
    setConfirmConfig({
      isOpen: true,
      title: `${admin.email}를 관리자 목록에서 삭제하시겠습니까?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await adminFetch(`/api/admin/admins?adminTargetId=${admin.id}`, {
            method: 'DELETE',
            headers: { 
              'Authorization': `Bearer ${session?.access_token || ''}`
            }
          });
          const data = await res.json();
          if (data.success) {
            showToast(data.message, 'success');
            fetchAdmins();
          } else {
            showToast(data.error || '삭제에 실패했습니다.', 'error');
          }
        } catch (err) {
          showToast('네트워크 오류가 발생했습니다.', 'error');
        } finally {
          setConfirmConfig(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-[var(--admin-text)] flex items-center gap-2">
          <ShieldCheck className="text-[var(--admin-primary)]" size={24} />
          관리자 계정 관리
        </h2>
        <button 
          onClick={() => setInviteModalOpen(true)}
          className="bg-[var(--admin-primary)] text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} /> 신규 관리자 초대
        </button>
      </div>

      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--admin-background)] border-b border-[var(--admin-border)]">
                <th className="px-6 py-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">계정 (이메일)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">부여된 권한 (Role)</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">등록일시</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--admin-text-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[var(--admin-primary)] border-t-transparent rounded-full animate-spin"></div>
                      데이터를 불러오는 중입니다...
                    </div>
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--admin-text-muted)]">등록된 관리자가 없습니다.</td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--admin-text)] font-medium">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        !admin.is_active ? 'bg-slate-100 text-slate-700 border border-slate-300' : admin.admin_role === 'SUPER' 
                          ? 'bg-[rgba(155,89,182,0.1)] text-[#9b59b6] border border-[rgba(155,89,182,0.2)]'
                          : 'bg-[rgba(52,152,219,0.1)] text-[var(--admin-primary)] border border-[rgba(52,152,219,0.2)]'
                      }`}>
                        {!admin.is_active ? '권한 해제' : admin.admin_role === 'SUPER' ? '슈퍼 관리자 (SUPER)' : '지원 관리자 (SUPPORT)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--admin-text-muted)]">
                      {new Date(admin.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm relative">
                      <button 
                        onClick={(e) => handleMenuToggle(admin.id, e)}
                        className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] p-2 rounded-md hover:bg-[var(--admin-background)] transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {openMenuId === admin.id && menuPosition && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => { setOpenMenuId(null); setMenuPosition(null); }}></div>
                          <div 
                            style={{ position: 'fixed', top: menuPosition.top, right: menuPosition.right }}
                            className="w-52 bg-[var(--admin-surface)] rounded-md shadow-lg border border-[var(--admin-border)] z-50 py-1 overflow-hidden animate-in slide-in-from-top-2 duration-200"
                          >
                            {admin.is_root || isRootAdmin(admin.email) ? (
                              <div className="px-4 py-3 text-xs text-[var(--admin-text-muted)] text-left flex items-start gap-2 bg-[rgba(241,196,15,0.05)] border-l-2 border-yellow-400">
                                <ShieldAlert size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                                <span>최상위 관리자는 권한 수정 및 삭제가 불가합니다.</span>
                              </div>
                            ) : currentAdminRole !== 'SUPER' ? (
                              <div className="px-4 py-3 text-xs text-[var(--admin-text-muted)] text-left flex items-start gap-2 bg-slate-50 border-l-2 border-slate-400">
                                <ShieldAlert size={14} className="text-slate-500 mt-0.5 shrink-0" />
                                <span>SUPER 관리자만 권한 변경 및 회수가 가능합니다.</span>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => { handleChangeRole(admin, admin.admin_role === 'SUPER' ? 'SUPPORT' : 'SUPER'); setOpenMenuId(null); setMenuPosition(null); }} 
                                  className="w-full text-left px-4 py-2 text-sm text-[var(--admin-text)] hover:bg-[var(--admin-background)] transition-colors"
                                >
                                  {admin.admin_role === 'SUPER' ? 'SUPPORT 등급으로 강등' : 'SUPER 등급으로 승격'}
                                </button>
                                <button
                                  onClick={() => { handleAccess(admin, !admin.is_active); setOpenMenuId(null); setMenuPosition(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-[var(--admin-text)] hover:bg-[var(--admin-background)] transition-colors"
                                >
                                  {admin.is_active ? '권한 해제' : '권한 다시 부여'}
                                </button>
                                <button
                                  onClick={() => { handleDelete(admin); setOpenMenuId(null); setMenuPosition(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-[var(--admin-error)] hover:bg-[rgba(231,76,60,0.1)] transition-colors"
                                >
                                  관리자 권한 회수 (삭제)
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--admin-surface)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-[var(--admin-border)] my-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--admin-border)] shrink-0">
              <h3 className="text-xl font-bold text-[var(--admin-text)] font-montserrat">신규 관리자 등록</h3>
              <p className="text-sm text-[var(--admin-text-muted)] mt-1">온리비에 가입된 회원 이메일로 관리자 권한을 부여합니다.</p>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text)] mb-1">이메일 주소</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-[var(--admin-background)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-[var(--admin-text)] focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text)] mb-1">권한 등급 (Role)</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-[var(--admin-background)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-[var(--admin-text)] focus:outline-none focus:border-[#1d4ed8]"
                >
                  <option value="SUPPORT">지원 관리자 (SUPPORT) - 일반 조회 및 지원</option>
                  <option value="SUPER">슈퍼 관리자 (SUPER) - 모든 권한 허용</option>
                </select>
              </div>
            </div>
            
            <div className="p-4 bg-[var(--admin-background)] flex justify-end gap-3 border-t border-[var(--admin-border)] shrink-0">
              <button 
                onClick={() => { setInviteModalOpen(false); setInviteEmail(''); }}
                className="admin-btn-secondary"
              >
                취소
              </button>
              <button 
                onClick={handleInvite}
                className="px-4 py-2 text-sm font-medium text-white admin-btn-primary rounded-xl transition-colors"
              >
                초대 및 권한 부여
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig?.isOpen && typeof document !== 'undefined' && createPortal(
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--admin-surface)] rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden border border-[var(--admin-border)] my-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto bg-[var(--admin-background)]">
                {confirmConfig.isDanger ? (
                  <ShieldAlert className="text-[var(--admin-error)]" size={24} />
                ) : (
                  <ShieldCheck className="text-[var(--admin-primary)]" size={24} />
                )}
              </div>
              <h3 className="text-lg font-bold text-center text-[var(--admin-text)] mb-2 font-montserrat">권한 관리</h3>
              <p className="text-center text-sm text-[var(--admin-text-muted)] leading-relaxed">
                {confirmConfig.title}
              </p>
            </div>
            
            <div className="p-4 bg-[var(--admin-background)] flex justify-end gap-3 border-t border-[var(--admin-border)] shrink-0">
              <button 
                onClick={() => setConfirmConfig(null)}
                className="admin-btn-secondary flex-1"
              >
                취소
              </button>
              <button 
                onClick={confirmConfig.onConfirm}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  confirmConfig.isDanger 
                    ? 'admin-btn-danger'
                    : 'admin-btn-primary'
                }`}
              >
                확인
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
