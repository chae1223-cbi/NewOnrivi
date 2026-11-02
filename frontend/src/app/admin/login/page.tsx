/** 🚨 @PATCH : 2026-11-02 — [DB 접근 서버 API 일원화] 브라우저 직접 supabase.from('admins')를 서버 /api/admin/role?pre_mfa=true 호출로 전환 */
/** 🚨 @PATCH : 2026-09-28 — 관리자 로그인 화면의 배경·카드·버튼을 DESIGN.md의 앱 UI 토큰으로 통일 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { showToast } from '@/utils/toast';

type LoginStep = 'GOOGLE_OAUTH' | 'OTP_ENROLL' | 'OTP_VERIFY' | 'LOADING' | 'AUTH_ERROR';

export default function AdminLogin() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('LOADING');
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(120);
  const [retryKey, setRetryKey] = useState(0);
  
  // Supabase MFA States
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');

  useEffect(() => {
    let mounted = true;

    async function checkAuthState() {
      try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        if (mounted) setStep('GOOGLE_OAUTH');
        return;
      }

      // 1. 관리자 권한 확인 (서버 API /api/admin/role?pre_mfa=true)
      const roleRes = await fetch('/api/admin/role?pre_mfa=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const roleJson = await roleRes.json().catch(() => ({}));
      if (!roleRes.ok || !roleJson?.admin_role || !['SUPER', 'SUPPORT'].includes(roleJson.admin_role)) {
        await supabase.auth.signOut();
        showToast('관리자 권한이 없습니다.', 'error');
        if (mounted) setStep('GOOGLE_OAUTH');
        return;
      }

      // 2. MFA 인증 레벨 확인
      const { data: authLevel, error: authLevelError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (authLevelError) throw authLevelError;
      const currentLevel = authLevel?.currentLevel;
      
      if (currentLevel === 'aal2') {
        // 이미 2단계 인증을 완료한 경우
        router.push('/admin');
        return;
      }

      // 3. 2단계 인증(MFA) 정보 불러오기
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const totpFactor = factorsData?.totp[0];

      if (!totpFactor || totpFactor.status !== 'verified') {
        // 기존에 등록 시도만 하고 검증되지 않은(Unverified) 인스턴스가 남아있으면 싹 지워줍니다.
        if (factorsData?.all) {
          for (const factor of factorsData.all) {
            if (factor.status === 'unverified') {
              await supabase.auth.mfa.unenroll({ factorId: factor.id });
            }
          }
        }

        // 기기 등록이 안 되어있거나 검증이 안 된 경우 -> 새 등록(Enroll) 진행
        const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({ 
          factorType: 'totp',
          friendlyName: `Admin Device ${Date.now()}`
        });
        if (enrollError) {
          console.error('Enroll Error:', enrollError);
          showToast('OTP 등록 중 오류가 발생했습니다.', 'error');
          if (mounted) setStep('AUTH_ERROR');
          return;
        }
        if (mounted) {
          setFactorId(enrollData.id);
          setQrCodeSvg(enrollData.totp.qr_code);
          setStep('OTP_ENROLL');
        }
      } else {
        // 이미 등록된 기기가 있는 경우 -> 인증 챌린지 생성
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        if (challengeError) {
          console.error('Challenge Error:', challengeError);
          showToast('인증 정보를 불러오는 중 오류가 발생했습니다.', 'error');
          if (mounted) setStep('AUTH_ERROR');
          return;
        }
        if (mounted) {
          setFactorId(totpFactor.id);
          setChallengeId(challengeData.id);
          setStep('OTP_VERIFY');
        }
      }
      } catch (error) {
        console.error('Admin authentication check failed:', error);
        showToast('로그인 상태를 확인하지 못했습니다. 다시 시도해주세요.', 'error');
        if (mounted) setStep('AUTH_ERROR');
      }
    }

    checkAuthState();

    return () => { mounted = false; };
  }, [router, retryKey]);

  // OTP 시간 제한 (2분)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === 'OTP_ENROLL' || step === 'OTP_VERIFY') {
      setTimeLeft(120);
      intervalId = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step]);

  useEffect(() => {
    if (timeLeft <= 0 && (step === 'OTP_ENROLL' || step === 'OTP_VERIFY')) {
      (async () => {
        showToast('보안을 위해 2분이 지나 인증이 취소되었습니다. 다시 로그인해주세요.', 'warning');
        await supabase.auth.signOut();
        setStep('GOOGLE_OAUTH');
        setOtpCode(['', '', '', '', '', '']);
        setTimeLeft(120);
      })();
    }
  }, [timeLeft, step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/login`,
        queryParams: {
          prompt: 'select_account',
        }
      }
    });
    if (error) {
      console.error(error);
      setIsLoading(false);
      showToast('구글 로그인 호출에 실패했습니다.', 'error');
    }
  };

  const handleEnrollDone = async () => {
    setIsLoading(true);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    setIsLoading(false);
    
    if (challengeError) {
      showToast('오류가 발생했습니다.', 'error');
      return;
    }
    setChallengeId(challengeData.id);
    setStep('OTP_VERIFY');
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: otpCode.join('')
    });
    setIsLoading(false);
    
    if (error) {
      showToast('OTP 인증에 실패했습니다. 코드를 다시 확인해주세요.', 'error');
    } else {
      showToast('인증이 완료되었습니다.', 'success');
      router.push('/admin');
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    setIsLoading(false);
    if (error) {
      showToast('인증을 취소하지 못했습니다. 다시 시도해주세요.', 'error');
      return;
    }
    setOtpCode(['', '', '', '', '', '']);
    setFactorId('');
    setChallengeId('');
    setQrCodeSvg('');
    setStep('GOOGLE_OAUTH');
    router.replace('/admin/login');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newCode = [...otpCode];
    newCode[index] = value;
    setOtpCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  if (step === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="w-10 h-10 border-4 border-[#1d4ed8]/20 border-t-[#1d4ed8] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-[var(--admin-bg)] px-4 py-8">

      <main className="w-full h-full flex items-center justify-center relative z-10">
        <section className="admin-glass-card w-full max-w-[520px] flex flex-col items-center justify-center px-6 py-10 sm:p-10 text-zinc-900 animate-in zoom-in-95 duration-500">
          
          <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1d4ed8]/15 text-[#1d4ed8]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-3 tracking-tight text-zinc-900">
              {step === 'GOOGLE_OAUTH' ? '온리비 어드민' : step === 'AUTH_ERROR' ? '로그인 확인 오류' : '2단계 인증'}
            </h1>
            <p className="text-base text-zinc-500 font-normal">
              {step === 'GOOGLE_OAUTH' ? '관리자 전용 대시보드에 접속하세요' : step === 'AUTH_ERROR' ? '일시적인 오류가 발생했습니다. 로그인 상태를 다시 확인해 주세요.' : '스마트폰 OTP 앱의 6자리 코드를 입력하세요'}
            </p>
            {(step === 'OTP_ENROLL' || step === 'OTP_VERIFY') && (
              <p className="mt-3 text-sm font-semibold text-red-600 animate-pulse">
                남은 시간: {formatTime(timeLeft)}
              </p>
            )}
          </div>
          
          {step === 'GOOGLE_OAUTH' && (
            <button 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              className="admin-btn-primary w-full max-w-[450px] min-h-14 rounded-lg flex items-center px-2 py-2 mb-8 group relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
            >
              <div className="bg-white rounded-full w-[56px] h-[56px] flex items-center justify-center flex-shrink-0">
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <svg height="24" viewBox="0 0 24 24" width="24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                )}
              </div>
              <span className="flex-grow text-center text-base font-semibold pr-14">Google 계정으로 계속하기</span>
            </button>
          )}

          {step === 'AUTH_ERROR' && (
            <button type="button" onClick={() => { setStep('LOADING'); setRetryKey(key => key + 1); }} className="admin-btn-primary w-full max-w-[450px] py-3 font-semibold mb-8">
              로그인 상태 다시 확인
            </button>
          )}

          {(step === 'OTP_ENROLL' || step === 'OTP_VERIFY') && (
            <div className="w-full max-w-[450px] mb-8 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
              
              {step === 'OTP_ENROLL' && (
                <div className="bg-white rounded-xl flex items-center justify-center mb-8 shadow-lg p-4">
                   {qrCodeSvg ? (
                     <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                   ) : (
                     <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin"></div>
                   )}
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="w-full">
                <div className="flex justify-center gap-3 mb-8">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-16 sm:w-14 sm:h-16 text-center text-3xl font-bold rounded-lg transition-all"
                    />
                  ))}
                </div>
                
                {step === 'OTP_VERIFY' && (
                  <button
                    type="submit"
                    disabled={isLoading || otpCode.join('').length < 6}
                    className="admin-btn-primary w-full min-h-12 flex items-center justify-center px-6 py-2 group disabled:opacity-50"
                  >
                    <span className="text-xl font-medium flex items-center gap-2">
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>인증 완료 <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </span>
                  </button>
                )}

                {step === 'OTP_ENROLL' && (
                  <button
                    type="button"
                    onClick={handleEnrollDone}
                    disabled={isLoading}
                    className="admin-btn-primary w-full min-h-12 flex items-center justify-center px-6 py-2 group disabled:opacity-50"
                  >
                    <span className="text-xl font-medium flex items-center gap-2">
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>QR 스캔 완료 <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </span>
                  </button>
                )}
              </form>
              
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="mt-6 rounded-full px-6 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition-colors"
              >
                인증 취소 · 로그인 화면으로 돌아가기
              </button>
            </div>
          )}
          
          <footer className="flex items-center gap-4 text-sm text-slate-600 font-normal mt-auto">
            <a className="hover:text-[#1d4ed8] transition-colors" href="#">개인정보처리방침</a>
            <span className="text-slate-300">|</span>
            <a className="hover:text-[#1d4ed8] transition-colors" href="#">이용약관</a>
          </footer>
        </section>
      </main>
    </div>
  );
}
