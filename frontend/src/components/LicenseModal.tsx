"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  licenseStatus: {
    isActivated: boolean;
    isExpired: boolean;
    isRestricted?: boolean;
    remainingDays: number;
    userId: string;
    licenseKey: string;
    paymentNo?: string;
    planName?: string;
    nextPaymentDate?: string;
  };
  onSuccessActivation: (verifyKey: string, userId: string, paymentNo: string, explicitLicenseKey?: string) => void;
  isDarkMode?: boolean;
}

const maskSecret = (val: string | null | undefined) => {
  if (!val) return '';
  return val.length > 6 ? val.substring(0, 6) + '*'.repeat(val.length - 6) : val;
};

const getPlanDisplayName = (planCode: string | undefined | null) => {
  if (!planCode) return '-';
  const code = planCode.toUpperCase();
  switch (code) {
    case 'ELITEPRO': return 'Elite Pro 플랜';
    case 'REGULAR': return 'Regular 플랜';
    case 'APPRENTICE': return 'Apprentice 플랜';
    case 'FREE': return 'Free 플랜';
    default: return planCode;
  }
};


// ====================================================================
// 📊 [OMD-AUTH-LicenseModal-0004] LicenseModal ➔ LicenseModal
// 🎯 @KICK  : 라이선스 정품 인증 UI - Supabase 직접 수동 인증 (이메일 + 비밀번호 로그인)
// 🛡️ @GUARD : isOpen이 false이면 null 반환
// 🚨 @PATCH : **2026-07-18** — 라이선스 입력 필드 타이핑 시 keydown 이벤트가 전역 document.body로 버블링되어 Monaco 에디터에서 getModifierState 런타임 크래시를 유발하는 현상 해결을 위해 최외각 wrapper에 stopPropagation 가드 추가
//             **2026-06-28** — 웹과 동일한 방식(이메일+비밀번호 로그인)으로 데스크탑 라이선스 자동 연동 개편; 결제번호 입력 제거
//             **2026-06-28** — 백엔드 서버(localhost:5000) 의존 티켓 발급 방식 완전 제거
//             **2026-06-20** — 결제번호(paymentNo) 보안 연동 패치
// 🔗 @CALLS : handleManualActivate, handleCopyText, handleGoToPurchase
// ====================================================================
export default function LicenseModal({
  isOpen,
  onClose,
  deviceId,
  licenseStatus,
  onSuccessActivation,
  isDarkMode
}: LicenseModalProps) {
  useModalEscape(isOpen, onClose);
  const [inputUserId, setInputUserId] = useState(licenseStatus.userId || '');
  const [inputPassword, setInputPassword] = useState('');
  const [sessionData, setSessionData] = useState<{ accessToken: string, refreshToken: string } | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  if (!isOpen) return null;



// ====================================================================
// 📊 [OMD-AUTH-LicenseModal-0001] LicenseModal ➔ handleCopyText
// 🎯 @KICK  : 라이선스 키 텍스트를 클립보드에 복사하고 사용자 피드백 표시
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : clipboard.writeText, setMessage
// ====================================================================
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: `✓ ${label}가 클립보드에 복사되었습니다.`, type: 'success' });
  };

  const isEmailReadOnly = licenseStatus.isActivated || !!licenseStatus.paymentNo;

  const handleVerifyEmail = async () => {
    if (!inputUserId.trim()) {
      setMessage({ text: '가입하신 이메일(유저 ID)을 입력해 주세요.', type: 'error' });
      return;
    }
    if (!inputPassword && !isEmailReadOnly) {
      setMessage({ text: '비밀번호를 입력해 주세요.', type: 'error' });
      return;
    }
    
    setMessage({ text: '계정 정보를 확인 중입니다...', type: 'info' });
    setIsVerifyingEmail(true);
    setIsUserVerified(false);
    setSessionData(null);
    
    try {
      if (!isEmailReadOnly) {
        // 1. 진짜 로그인 시도 (비밀번호 검증 및 토큰 발급)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: inputUserId.trim(),
          password: inputPassword,
        });

        if (authError || !authData.session) {
          setMessage({ text: '로그인 실패: 비밀번호가 일치하지 않거나 없는 계정입니다.', type: 'error' });
          setIsVerifyingEmail(false);
          return;
        }

        // 로그인 성공 시 토큰 저장 (웹 자동 로그인 핸드오프용)
        setSessionData({
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token
        });
      }
      const api = (window as any).electronAPI;
      const isDesktop = !!api;

      if (isDesktop) {
        const verifyRes = await fetch('/api/license/verify-desktop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_email: inputUserId.trim(), p_device_uuid: deviceId })
        });
        const data = verifyRes.ok ? await verifyRes.json() : null;
        const error = !verifyRes.ok ? new Error('서버 오류') : null;

        if (error) throw new Error(error.message);

        if (!data) {
          setMessage({ text: '서버 응답을 받을 수 없습니다.', type: 'error' });
        } else if (data.success || data.code === 'ERR_MAX_DEVICES_EXCEEDED') {
          if (!data.success && data.code === 'ERR_MAX_DEVICES_EXCEEDED') {
            setMessage({ text: '동시 접속 제한을 초과하여 제한 사용자로 접근합니다.', type: 'warning' });
          } else {
            setMessage({ text: `본 계정은 성공적으로 확인되었습니다. (${data.plan_name || 'PRO'} 플랜)`, type: 'success' });
          }
          if (typeof api.saveLicenseFull === 'function') {
            await api.saveLicenseFull({ 
              userId: inputUserId.trim(), 
              lastRunTime: Date.now(),
              nextPaymentDate: data.next_payment_date || data.trial_end_at || '',
              licenseKey: data.license_key || '',
              planName: data.plan_name || ''
            });
          }
          onSuccessActivation('', inputUserId.trim(), data.payment_no || '', data.license_key || '');
          setTimeout(() => {
            onClose();
            window.location.reload(); 
          }, 1500);
        } else if (data.code === 'NO_PLAN') {
          setMessage({ text: '가입된 계정이 확인되었습니다. 구독 페이지로 이동하여 결제를 진행해 주세요.', type: 'warning' });
          setIsUserVerified(true);
        } else {
          setMessage({ text: '등록되지 않은 이메일이거나 활성화된 구독이 없습니다. 회원가입 및 결제를 진행해주세요.', type: 'error' });
        }
      } else {
        const chkRes = await fetch('/api/user/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_email: inputUserId.trim() })
        });
        const data = chkRes.ok ? await chkRes.json() : null;
        const error = !chkRes.ok ? new Error('서버 오류') : null;
        if (error) throw new Error(error.message);

        if (!data || !data.exists) {
          setMessage({ text: '등록되지 않은 이메일입니다. 먼저 회원가입 후 진행해 주세요.', type: 'error' });
        } else {
          setMessage({ text: '✅ 이메일이 확인되었습니다. 구독 페이지로 이동하여 결제를 진행해 주세요.', type: 'success' });
          setIsUserVerified(true);
        }
      }
    } catch (err: any) {
      setMessage({ text: `확인 중 오류가 발생했습니다: ${err.message}`, type: 'error' });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

// ====================================================================
// 📊 [OMD-AUTH-LicenseModal-0003] LicenseModal ➔ handleGoToPurchase
// 🎯 @KICK  : onrivi.com/dashboard 결제/구독 페이지를 OS 기본 브라우저로 직접 오픈
// 🛡️ @GUARD : electronAPI 존재 여부에 따라 openExternal 또는 window.open 분기
// 🚨 @PATCH : **2026-06-28** — 백엔드 티켓 발급 방식(handleOpenRegister) 대체로 신설
// 🔗 @CALLS : electronAPI.openExternal, window.open
// ====================================================================
  const handleGoToPurchase = () => {
    let url = '';
    const userIdVal = isEmailReadOnly ? (licenseStatus.userId || '') : inputUserId;
    const emailParam = userIdVal.trim() ? encodeURIComponent(userIdVal.trim()) : '';
    const deviceParam = deviceId ? encodeURIComponent(deviceId) : '';

    if (sessionData) {
      // 💡 [Saga/Handoff] 보안 토큰을 브라우저 해시 프래그먼트로 안전하게 넘김
      const targetPath = encodeURIComponent(`/dashboard?email=${emailParam}&device=${deviceParam}`);
      url = `https://onrivi.com/auth/handoff#access_token=${sessionData.accessToken}&refresh_token=${sessionData.refreshToken}&redirect=${targetPath}`;
    } else {
      url = `https://onrivi.com/dashboard?email=${emailParam}&device=${deviceParam}`;
    }
    const api = (window as any).electronAPI;
    if (api && typeof api.openExternal === 'function') {
      api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-background/80 dark:bg-black/80 backdrop-blur-sm transition-all tech-bg overflow-y-auto p-2 sm:p-4 font-['Inter'] text-[16px] leading-[1.6] license-modal-wrap"
      onKeyDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:wght@500;600;700&family=Geist:wght@400;500&display=swap');
        
        .license-modal-wrap .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .license-modal-wrap .editorial-shadow {
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
        }
        .tech-bg {
            background-image: radial-gradient(circle at 2px 2px, rgba(15, 0, 109, 0.03) 1px, transparent 0);
            background-size: 24px 24px;
        }
        .dark .tech-bg {
            background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
        }
      ` }} />
      
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Modal Container */}
      <div className="relative w-full max-w-[720px] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] bg-surface-bright editorial-shadow overflow-y-auto overscroll-contain p-4 sm:p-8 lg:p-[48px] flex flex-col gap-5 sm:gap-8 animate-in fade-in zoom-in duration-500 rounded-xl my-auto">
        
        {/* Header Section */}
        <header className="flex justify-between items-start w-full">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-surface-container flex items-center justify-center rounded-lg">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
            </div>
            <div>
              <h1 className="font-['Source_Serif_4'] text-[32px] font-medium leading-[1.3] text-primary tracking-tight">라이선스 정품 인증</h1>
              <p className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant uppercase mt-1">Onrivi Author Premium License Guard</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container transition-colors duration-200 rounded-full">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </header>

        {/* Status Banner */}
        {licenseStatus.isActivated ? (
          <section className="bg-surface-container-low p-[32px] border-l-4 border-primary">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <div>
                <h2 className="font-['Inter'] text-[18px] leading-[1.8] tracking-[-0.01em] font-semibold text-primary mb-2">정품 인증이 승인되어 모든 PRO 기능이 활성화 상태입니다.</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant uppercase">요금제</span>
                    <span className="font-['Inter'] text-[16px] leading-[1.6] font-bold text-on-surface">{getPlanDisplayName(licenseStatus.planName)}
                      {licenseStatus.isRestricted && <span className="ml-2 text-error text-[13px] font-normal tracking-normal">(동시접속 제한)</span>}
                    </span>
                  </div>
                  {licenseStatus.nextPaymentDate && (
                  <div className="flex flex-col">
                    <span className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant uppercase">다음 결제일</span>
                    <span className="font-['Inter'] text-[16px] leading-[1.6] font-bold text-on-surface">{new Date(licenseStatus.nextPaymentDate).toLocaleDateString()}</span>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : licenseStatus.isExpired ? (
          <section className="bg-error-container p-[32px] border-l-4 border-error">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-error mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <div>
                <h2 className="font-['Inter'] text-[18px] leading-[1.8] tracking-[-0.01em] font-semibold text-error mb-2">
                  {licenseStatus.isRestricted 
                    ? "동시 접속 한도를 초과하여 제한 모드로 동작 중입니다. 다른 기기에서 로그아웃하거나 요금제를 업그레이드 해주세요." 
                    : "체험 기간이 만료되었습니다. 에디터 잠금 해제를 위해 라이선스를 연동해 주세요."}
                </h2>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-secondary-container p-[32px] border-l-4 border-secondary">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-secondary mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
              <div>
                <h2 className="font-['Inter'] text-[18px] leading-[1.8] tracking-[-0.01em] font-semibold text-secondary mb-2">무료 체험 기간이 작동 중입니다. (남은 기한: {licenseStatus.remainingDays}일)</h2>
              </div>
            </div>
          </section>
        )}

        {/* Data Grid */}
        <section className="flex flex-col gap-[32px] z-10 relative">
          
          {/* Row 1: Email */}
          <div className="flex flex-col gap-2">
            <label className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant px-1 uppercase">가입 이메일 (유저 ID)</label>
            {isEmailReadOnly ? (
              <div className="bg-surface-container-lowest border-b-2 border-outline-variant hover:border-primary transition-colors p-4 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface truncate">
                  {licenseStatus.userId || 'onrivi@naver.com'}
              </div>
            ) : (
              <input 
                type="text"
                value={inputUserId}
                onChange={(e) => setInputUserId(e.target.value)}
                placeholder="이메일 입력"
                className="bg-surface-container-lowest border-b-2 border-outline-variant hover:border-primary focus:border-primary focus:outline-none transition-colors p-4 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface w-full"
              />
            )}
          </div>

          {/* Row 2: Password (and Verify Button if needed) */}
          {!isEmailReadOnly && (
            <div className="flex flex-col gap-2">
              <label className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant px-1 uppercase">비밀번호</label>
              <div className="flex gap-2">
                <input 
                    type="password"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyEmail(); }}
                    placeholder="비밀번호 입력"
                    className="bg-surface-container-lowest border-b-2 border-outline-variant hover:border-primary focus:border-primary focus:outline-none transition-colors p-4 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface w-full"
                  />
                <button 
                  onClick={handleVerifyEmail}
                  disabled={isVerifyingEmail || !inputUserId.trim() || (!inputPassword && !isEmailReadOnly)}
                  className="bg-primary text-on-primary px-8 py-3 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] uppercase hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isVerifyingEmail ? '확인 중...' : '로그인 & 확인'}
                </button>
              </div>
            </div>
          )}

          {/* Row 3: Device ID */}
          <div className="flex flex-col gap-2">
            <label className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant px-1 uppercase">디바이스 정보 (기기 고유 ID)</label>
            <div 
              onClick={() => handleCopyText(deviceId, '디바이스 정보')}
              title="클릭하여 복사"
              className="cursor-pointer bg-surface-container-lowest border-b-2 border-outline-variant hover:border-primary transition-colors p-4 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface truncate active:bg-surface-container select-none"
            >
              {deviceId}
            </div>
          </div>

          {/* Row 4: License ID */}
          <div className="flex flex-col gap-2">
            <label className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant px-1 uppercase">내 라이선스 식별 코드</label>
            <div 
              onClick={() => handleCopyText(licenseStatus.licenseKey, '라이선스 코드')}
              title="클릭하여 복사"
              className="cursor-pointer bg-surface-container-lowest border-b-2 border-outline-variant hover:border-primary transition-colors p-4 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.2em] text-on-surface active:bg-surface-container select-none"
            >
                {maskSecret(licenseStatus.licenseKey) || '미발급'}
            </div>
          </div>

          {/* Row 5: Payment No */}
          <div className="flex flex-col gap-2">
            <label className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant px-1 uppercase">정품 결제번호</label>
            <div 
              onClick={() => handleCopyText(licenseStatus.paymentNo || '', '결제번호')}
              title="클릭하여 복사"
              className="cursor-pointer bg-surface-container-lowest border-b-2 border-outline-variant hover:border-primary transition-colors p-4 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.2em] text-on-surface active:bg-surface-container select-none"
            >
                {maskSecret(licenseStatus.paymentNo) || '미발급'}
            </div>
          </div>
        </section>

        {/* 안내 메시지 출력 */}
        {message.text && (
          <div className={`p-4 font-['Inter'] text-[14px] font-bold z-10 relative ${
            message.type === 'error'   ? 'bg-error-container text-error border-l-4 border-error' :
            message.type === 'success' ? 'bg-surface-container-low text-primary border-l-4 border-primary' :
            'bg-surface-container text-on-surface-variant border-l-4 border-outline-variant'
          }`}>
            {message.text}
          </div>
        )}

        {/* Footer / Secondary Details */}
        <footer className="mt-[32px] flex flex-col md:flex-row justify-between items-end border-t border-outline-variant pt-[32px] z-10 relative">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <span className="font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] text-on-surface-variant uppercase">시스템 상태</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="font-['Inter'] text-[16px] leading-[1.6] text-on-surface font-medium">Onrivi Author Engine v1.0.4 - Local Secure</span>
            </div>
          </div>
          <div className="flex gap-4 mt-6 md:mt-0">
            {!licenseStatus.isActivated && isUserVerified && (
              <button 
                onClick={handleGoToPurchase}
                className="bg-primary text-on-primary px-8 py-3 font-['Geist'] text-[13px] font-medium leading-[1.2] tracking-[0.05em] uppercase hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                구독 페이지 이동 ↗
              </button>
            )}
          </div>
        </footer>

        {/* Atmospheric Design Element */}
        <div className="absolute bottom-0 right-0 p-8 opacity-[0.03] pointer-events-none z-0">
          <span className="font-['Source_Serif_4'] text-[64px] font-semibold leading-[1.1] tracking-[-0.02em] text-primary select-none">
            {licenseStatus.isActivated ? 'AUTHORIZED' : 'LOCKED'}
          </span>
        </div>

      </div>
    </div>
  );
}
