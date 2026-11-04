/**
 * ====================================================================
 * 🏷️ 파일명 : GuestPaywallOverlay.tsx
 * 🎭 역할(Role) : Manager (오버레이 모달 — 게스트 즉시 체험판 만료 차단막)
 * 🎯 주요기능 : 비로그인 5분/5회 체험 만료 시 회원가입 유도, 5회 미만 시 체험 계속하기 및 개발 환경 리셋 제공
 * 🚨 @PATCH : 2026-11-04 — [MainEditorApp 모듈화] 게스트 즉시 체험 만료 가입 유도 모달 차단막 UI를 독립 오버레이 컴포넌트로 분리 (규칙 3 Manager 역할 준수)
 * ====================================================================
 */

"use client";

import React from 'react';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';

export interface GuestPaywallOverlayProps {
  isGuestMode: boolean;
  isGuestExpired: boolean;
  setIsGuestExpired: React.Dispatch<React.SetStateAction<boolean>>;
  setGuestRemainingSeconds: React.Dispatch<React.SetStateAction<number>>;
  setLicenseStatus: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * ========================================================================================
 * [컴포넌트명] GuestPaywallOverlay - 게스트 즉시 체험 만료 시 표시되는 전체화면 가입 유도 모달
 *
 * @param {GuestPaywallOverlayProps} props - 게스트 모드/만료 상태 및 라이선스·타이머 갱신 함수
 * @returns {JSX.Element | null} 만료 차단막 오버레이 또는 null
 * ==========================================================================================
 */
export default function GuestPaywallOverlay({
  isGuestMode,
  isGuestExpired,
  setIsGuestExpired,
  setGuestRemainingSeconds,
  setLicenseStatus,
}: GuestPaywallOverlayProps) {
  if (!isGuestMode || !isGuestExpired) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-6 select-none" translate="no">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl text-center transform scale-100 transition-all duration-300">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⏱️</span>
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 flex items-center justify-between gap-2">
          <span>정식으로 회원가입 후 사용하세요</span>
          {typeof window !== 'undefined' && (
            window.location.hostname.includes('localhost') ||
            window.location.hostname.includes('127.0.0.1') ||
            window.location.port === '3100' ||
            process.env.NODE_ENV === 'development'
          ) && (
            <button
              onClick={() => {
                localStorage.removeItem('onrivi_guest_expired');
                localStorage.removeItem('onrivi_guest_start_time');
                localStorage.setItem('onrivi_guest_try_count', '0');
                setIsGuestExpired(false);
                setGuestRemainingSeconds(300);
                window.location.reload();
              }}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline bg-transparent border-none cursor-pointer font-normal flex-shrink-0"
              title="개발자 전용 체험 횟수 초기화"
            >
              테스트용 리셋
            </button>
          )}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">
          동일 브라우저당 허용되는 <strong>5회 체험 접속</strong>을 모두 사용하셨거나, <strong>5분 편집 제한 시간</strong>이 경과하였습니다. 작성하신 소중한 원고는 브라우저에 임시 안전 보관 중입니다. 계속해서 원고를 이어서 작성하고 무제한 클라우드 백업 및 AI 어시스턴트를 활용하시려면 지금 가입하세요!
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              localStorage.removeItem('onrivi_guest_mode');
              localStorage.removeItem('onrivi_guest_start_time');
              window.location.href = '/signup';
            }}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition duration-150 shadow-md cursor-pointer border-none text-center"
          >
            3초 만에 무료 회원가입
          </button>
          {/* 🌟 접속 횟수가 5회 미만일 때만 '체험판 계속하기' 단추 노출 (5회 완료 시 완전 차단) */}
          {(() => {
            const currentTryCount = typeof window !== 'undefined' ? parseInt(localStorage.getItem('onrivi_guest_try_count') || '0', 10) : 0;
            if (currentTryCount < 5) {
              return (
                <button
                  onClick={() => {
                    localStorage.removeItem('onrivi_guest_expired');
                    localStorage.removeItem('onrivi_guest_start_time');

                    // 🌟 계속하기 클릭 역시 새로운 5분 세션을 시작하는 행위이므로 접속 카운트를 1회 추가 소진(증가)시킵니다!
                    const nextCount = currentTryCount + 1;
                    localStorage.setItem('onrivi_guest_try_count', nextCount.toString());

                    setIsGuestExpired(false);
                    setGuestRemainingSeconds(300);
                    setLicenseStatus({
                      isActivated: true,
                      isExpired: false,
                      remainingDays: 999,
                      userId: 'GUEST_USER',
                      licenseKey: 'GUEST_LICENSE_KEY',
                      paymentNo: 'GUEST_PAYMENT_NO',
                      planName: '체험판 게스트 요금제',
                      nextPaymentDate: '2999-12-31'
                    });
                  }}
                  className="w-full py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold rounded-xl transition duration-150 cursor-pointer border-none text-center"
                >
                  체험판 계속하기
                </button>
              );
            }
            return null;
          })()}
          <button
            onClick={() => {
              localStorage.removeItem('onrivi_guest_mode');
              localStorage.removeItem('onrivi_guest_start_time');
              window.location.href = '/';
            }}
            className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 font-semibold border border-zinc-200 dark:border-zinc-800 rounded-xl transition duration-150 cursor-pointer text-center"
          >
            홈페이지 가기
          </button>
        </div>
        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
          <a
            href="/"
            onClick={() => {
              localStorage.removeItem('onrivi_guest_mode');
              localStorage.removeItem('onrivi_guest_start_time');
            }}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#10B981" />
            </svg>
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
              Onrivi Author
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
