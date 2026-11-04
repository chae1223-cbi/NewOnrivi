// ====================================================================
// 📊 [OMD-HOOK-useEditorAuth] frontend/src/hooks/editor/useEditorAuth.ts
// 🎯 @KICK  : 에디터 사용자 인증, 디바이스 ID, 라이선스 상태(LicenseStatus) 초기 상태 관리 훅
// 🛡️ @GUARD : 초기 라이선스 검증 중(isLicenseChecking) 가드 활성화로 비정상 조기 렌더링 방어
// 🚨 @PATCH : 2026-11-04 — [주석 표준화] 1단계 파일 헤더 및 2단계 useEditorAuth JSDoc 표준화 적용
// 🔗 @CALLS : useState
// ====================================================================

import { useState } from 'react';

export interface LicenseStatus {
  isActivated: boolean;
  isExpired: boolean;
  isRestricted?: boolean; // 추가: 동시접속 초과 등으로 인한 읽기 전용 제한 모드 여부
  isConcurrentLimited?: boolean; // 💡 다른 기기/브라우저 동시 접속으로 인한 세션 제한 여부
  hasEditorSubscription?: boolean; // 💡 정품/체험판 등 에디터 편집 지원 구독 보유 여부
  remainingDays: number;
  userId: string;
  licenseKey: string;
  paymentNo?: string;
  planName?: string;
  nextPaymentDate?: string;
}

/**
 * ========================================================================================
 * [함수명] useEditorAuth - 에디터 사용자 인증, 디바이스 ID 및 라이선스 상태 컨테이너 훅
 *
 * @returns {{ deviceId: string, setDeviceId: React.Dispatch<React.SetStateAction<string>>, licenseStatus: LicenseStatus, setLicenseStatus: React.Dispatch<React.SetStateAction<LicenseStatus>>, isLicenseChecking: boolean, setIsLicenseChecking: React.Dispatch<React.SetStateAction<boolean>> }}
 * ==========================================================================================
 */
export const useEditorAuth = () => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [isLicenseChecking, setIsLicenseChecking] = useState(true);
  
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>({
    isActivated: false,
    isExpired: false,
    remainingDays: 14,
    userId: '',
    licenseKey: ''
  });

  return {
    deviceId,
    setDeviceId,
    licenseStatus,
    setLicenseStatus,
    isLicenseChecking,
    setIsLicenseChecking
  };
};
