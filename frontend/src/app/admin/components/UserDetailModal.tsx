/** 🚨 @PATCH : 2026-09-28 — 사용자 상세 모달에 SUPER 관리자 요금제 변경과 관리자 수동 무료/유료 표시 적용 */
import { useModalEscape } from '@/hooks/useModalEscape';
import React from 'react';
import { X, User, Calendar, CreditCard, Laptop, MonitorSmartphone } from 'lucide-react';

interface Device {
  id: string;
  device_name: string;
  activated_at: string;
}

interface UserDetailProps {
  user: any; // { email, nick_name, plan, status, date, last_login, start_date, end_date, devices }
  onClose: () => void;
  onKillSession?: () => void;
  onKillSingleSession?: (deviceId: string) => void;
  onChangePlan?: () => void;
}

export default function UserDetailModal({ user, onClose, onKillSession, onKillSingleSession, onChangePlan }: UserDetailProps) {
  useModalEscape(Boolean(user), onClose);
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 animate-in fade-in overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="admin-user-detail-title" className="bg-[var(--admin-surface)] border border-[var(--admin-border-light)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-[var(--admin-border)] flex justify-between items-center bg-[var(--admin-surface)] shrink-0">
          <h2 id="admin-user-detail-title" className="text-lg font-semibold text-[var(--admin-text)] font-montserrat flex items-center gap-2">
            <User size={20} className="text-[var(--admin-primary)]" />
            사용자 상세 정보
          </h2>
          <button type="button" aria-label="사용자 상세 정보 닫기" onClick={onClose} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors p-1.5 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          {/* Profile Section */}
          <section className="bg-[var(--admin-bg)] rounded-xl p-5 border border-[var(--admin-border)]">
            <h3 className="text-[var(--admin-text)] font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
              <User size={16} /> 프로필 정보
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[var(--admin-text-muted)] text-xs mb-1">이메일</p>
                <p className="text-[var(--admin-text)] text-sm font-medium break-all">{user.email}</p>
              </div>
              <div>
                <p className="text-[var(--admin-text-muted)] text-xs mb-1">닉네임</p>
                <p className="text-[var(--admin-text)] text-sm font-medium">{user.nick_name}</p>
              </div>
              <div>
                <p className="text-[var(--admin-text-muted)] text-xs mb-1">상태</p>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                  user.status === 'SUSPENDED' ? 'bg-red-50 text-red-700' :
                  user.status === 'DELETED' ? 'bg-slate-100 text-slate-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {user.status === 'ACTIVE' ? '정상' :
                   user.status === 'SUSPENDED' ? '정지됨' :
                   user.status === 'DELETED' ? '탈퇴' : user.status}
                </span>
              </div>
              <div>
                <p className="text-[var(--admin-text-muted)] text-xs mb-1">마지막 접속</p>
                <p className="text-[var(--admin-text)] text-sm font-medium tabular-nums">{user.last_login}</p>
              </div>
            </div>
          </section>

          {/* Plan Section */}
          <section className="bg-[var(--admin-bg)] rounded-xl p-5 border border-[var(--admin-border)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[var(--admin-text)] font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} /> 플랜 정보
              </h3>
              {onChangePlan && <button type="button" onClick={onChangePlan} className="admin-btn-secondary">요금제 변경</button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[var(--admin-text-muted)] text-xs mb-1">현재 플랜</p>
                <span className="px-2 py-1 bg-blue-50 text-blue-800 text-xs font-semibold rounded-full border border-blue-100 inline-block">
                  {user.plan}
                </span>
                {user.admin_grant_type && <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                  관리자 {user.admin_grant_type === 'FREE' ? '무료 제공' : '유료 이용 (결제 별도)'}
                </p>}
              </div>
              <div>
                <p className="text-[var(--admin-text-muted)] text-xs mb-1 flex items-center gap-1">
                  <Calendar size={12} /> 시작일
                </p>
                <p className="text-[var(--admin-text)] text-sm font-medium tabular-nums">{user.start_date !== '-' ? user.start_date : '기록 없음'}</p>
              </div>
              <div>
                <p className="text-[var(--admin-text-muted)] text-xs mb-1 flex items-center gap-1">
                  <Calendar size={12} /> 만료일
                </p>
                <p className="text-[var(--admin-text)] text-sm font-medium tabular-nums">{user.end_date !== '-' ? user.end_date : '무제한'}</p>
              </div>
            </div>
          </section>

          {/* Devices Section */}
          <section className="bg-[var(--admin-bg)] rounded-xl p-5 border border-[var(--admin-border)]">
            <h3 className="text-[var(--admin-text)] font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
              <Laptop size={16} /> 활성화된 접속 환경
            </h3>
            {(!user.devices || user.devices.length === 0) ? (
              <p className="text-[var(--admin-text-muted)] text-sm text-center py-4">활성화된 접속 환경이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {user.devices.map((device: Device, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[var(--admin-background)] rounded-md border border-[var(--admin-border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--admin-surface)] rounded-full">
                        <MonitorSmartphone size={16} className="text-[var(--admin-text-muted)]" />
                      </div>
                      <div>
                        <p className="text-[var(--admin-text)] text-sm font-medium">{device.device_name || '알 수 없는 기기'}</p>
                        <p className="text-[var(--admin-text-muted)] text-xs">활성화: {new Date(device.activated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full uppercase tracking-wider">
                        Active
                      </span>
                      {onKillSingleSession && (
                        <button
                          onClick={() => onKillSingleSession(device.id)}
                          className="p-1.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-error)] hover:bg-red-50 rounded-md transition-colors"
                          title="이 세션 종료하기"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        
        <div className="px-6 py-4 border-t border-[var(--admin-border)] flex flex-wrap justify-between items-center gap-3 bg-[var(--admin-bg)]">
          {onKillSession ? (
            <button
              onClick={() => {
                onKillSession();
                onClose();
              }}
              className="admin-btn-danger"
            >
              <MonitorSmartphone size={16} /> 세션 강제 종료
            </button>
          ) : <div></div>}
          
          <button 
            onClick={onClose}
            className="admin-btn-secondary"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
