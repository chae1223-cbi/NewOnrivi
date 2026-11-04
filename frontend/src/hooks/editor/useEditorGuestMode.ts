// ====================================================================
// 📊 [OMD-HOOK-useEditorGuestMode] frontend/src/hooks/editor/useEditorGuestMode.ts
// 🎯 @KICK  : 비로그인 즉시 체험판(Guest Mode) 5분(300초) 카운트다운 타이머, 5회 접속 제한(Paywall) 상태 및 인터랙티브 플로팅 가이드 단계 관리 훅
// 🛡️ @GUARD : React Strict Mode 중복 카운팅 방어(guestCountedRef), 5회 초과 또는 만료 시 licenseStatus 즉시 만료 전환 및 로컬스토리지 낙인 보존
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 모듈화]: 게스트 체험판 타이머·횟수 제한 상태 및 이펙트를 MainEditorApp.tsx에서 분리 위임 (동작 변경 없음)
// 🔗 @CALLS : browserAccountStorage (localStorage), setLicenseStatus
// ====================================================================

import { useState, useRef, useEffect } from 'react';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';

export interface UseEditorGuestModeProps {
  setLicenseStatus: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * ========================================================================================
 * [함수명] useEditorGuestMode - 비로그인 즉시 체험판 타이머 및 Paywall 상태를 관리합니다.
 *
 * @param {UseEditorGuestModeProps} props - 라이선스 상태 갱신 setter
 * @returns {object} isGuestMode, guestRemainingSeconds, isGuestExpired, guideStep, isGuideMinimized 및 각 setter
 *
 * @example
 * const { isGuestMode, isGuestExpired, guestRemainingSeconds } = useEditorGuestMode({ setLicenseStatus });
 * ==========================================================================================
 */
export function useEditorGuestMode({ setLicenseStatus }: UseEditorGuestModeProps) {
  // ⏳ [게스트 즉시 체험판 시간 및 횟수 제한(Paywall) 상태]
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('onrivi_guest_mode') === 'Y';
  });
  const [guestRemainingSeconds, setGuestRemainingSeconds] = useState<number>(300); // 5분 (300초)
  const [isGuestExpired, setIsGuestExpired] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const tryCount = parseInt(localStorage.getItem('onrivi_guest_try_count') || '0', 10);
    return localStorage.getItem('onrivi_guest_expired') === 'Y' || tryCount > 5;
  });

  // ⏳ [게스트 즉시 체험판 인터랙티브 플로팅 가이드 상태]
  const [guideStep, setGuideStep] = useState<number>(1);
  const [isGuideMinimized, setIsGuideMinimized] = useState<boolean>(false);
  const guestCountedRef = useRef<boolean>(false);

  // ⏳ [게스트 타이머 구동 및 재접속 제한 이펙트]
  useEffect(() => {
    if (!isGuestMode) return;

    const tryCount = parseInt(localStorage.getItem('onrivi_guest_try_count') || '0', 10);

    // 1. 이미 만료 낙인이 찍혔거나 재접속 횟수를 초과한 게스트인 경우
    if (isGuestExpired || tryCount > 5) {
      setIsGuestExpired(true);
      localStorage.setItem('onrivi_guest_expired', 'Y');
      setLicenseStatus({
        isActivated: false,
        isExpired: true,
        remainingDays: 0,
        userId: 'GUEST_USER',
        licenseKey: '',
        paymentNo: '',
        planName: '체험판 재접속 횟수 초과',
        nextPaymentDate: ''
      });
      return;
    }

    // 2. 신규 진입 세션에 대해 접속 횟수 카운터 증가 (Strict Mode 중복 연산 방지 가드)
    let newCount = tryCount;
    if (!guestCountedRef.current) {
      guestCountedRef.current = true;
      newCount = tryCount + 1;
      localStorage.setItem('onrivi_guest_try_count', newCount.toString());
    }

    // 3. 증가된 카운트가 제한(5회)을 초과한 경우
    if (newCount > 5) {
      setIsGuestExpired(true);
      localStorage.setItem('onrivi_guest_expired', 'Y');
      setLicenseStatus({
        isActivated: false,
        isExpired: true,
        remainingDays: 0,
        userId: 'GUEST_USER',
        licenseKey: '',
        paymentNo: '',
        planName: '체험판 재접속 횟수 초과',
        nextPaymentDate: ''
      });
      return;
    }

    // 4. 타이머를 5분(300초)으로 매 접속마다 독립적으로 새로 기동
    setGuestRemainingSeconds(300);
    const interval = setInterval(() => {
      setGuestRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsGuestExpired(true);
          // 5분 만료 시점에 접속 카운트가 5회 이상이었다면 완전히 영구 낙인 찍기
          if (newCount >= 5) {
            localStorage.setItem('onrivi_guest_expired', 'Y');
          }
          setLicenseStatus({
            isActivated: false,
            isExpired: true,
            remainingDays: 0,
            userId: 'GUEST_USER',
            licenseKey: '',
            paymentNo: '',
            planName: '체험판 시간 만료',
            nextPaymentDate: ''
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGuestMode, isGuestExpired, setLicenseStatus]);

  return {
    isGuestMode,
    setIsGuestMode,
    guestRemainingSeconds,
    setGuestRemainingSeconds,
    isGuestExpired,
    setIsGuestExpired,
    guideStep,
    setGuideStep,
    isGuideMinimized,
    setIsGuideMinimized,
  };
}
