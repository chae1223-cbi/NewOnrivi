"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { reportClientLog } from '@/lib/clientLogs';
import { showToast, dismissDriveAuthNotices } from '@/utils/toast';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ====================================================================
// 📊 [OMD-EDIT-ToastProvider-0001] ToastProvider ➔ useToast
// 🎯 @KICK  : Toast 컨텍스트 커스텀 훅 - Provider 내부에서 showToast 함수 조회
// 🛡️ @GUARD : context undefined 시 "useToast must be used within a ToastProvider" 에러 throw
// 🚨 @PATCH : 없음
// 🔗 @CALLS : useContext
// ====================================================================
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// ====================================================================
// 📊 [OMD-EDIT-ToastProvider-0002] ToastProvider ➔ ToastProvider
// 🎯 @KICK  : 전역 Toast 컨텍스트 Provider - 자식 컴포넌트에 showToast 유틸리티 제공
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : showToast (from utils)
// ====================================================================
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportClientLog(event.message || '브라우저 실행 오류', 'ERROR', 'BROWSER_ERROR');
    const onRejection = (event: PromiseRejectionEvent) => reportClientLog(event.reason instanceof Error ? event.reason.message : '처리되지 않은 비동기 오류', 'ERROR', 'UNHANDLED_REJECTION');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('onrivi:drive_token_updated', dismissDriveAuthNotices);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('onrivi:drive_token_updated', dismissDriveAuthNotices);
    };
  }, []);
  // 💡 [ ToastProvider 정밀 리팩토링 ]
  // 기존의 꼬이기 쉬운 리액트 상태 JSX 코드를 아예 모두 삭제하여 순도를 높이고,
  // 공통 전역 알림 유틸리티(showToast)를 콘텍스트를 통해 호환 연동합니다.
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
};
