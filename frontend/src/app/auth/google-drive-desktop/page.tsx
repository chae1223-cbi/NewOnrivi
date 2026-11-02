// ====================================================================
// 📊 [OMD-PAGE-gdrive-desktop-0001] src/app/auth/google-drive-desktop/page.tsx
// 🎯 @KICK  : 데스크톱 Electron 앱을 위한 Google OAuth 외부 브라우저 안전 인증 Handoff 브리지 페이지
// 🛡️ @GUARD : Rule 1, OMD 디자인 시스템 준수, Suspense 래핑으로 Next.js static export 보장
// 🚨 @PATCH : **2026-10-04** — [데스크톱 Google OAuth 400 invalid_request 해결 & 시스템 브라우저 웹 Handoff 브리지 신설]: Google OAuth 보안 정책을 준수하는 공식 도메인에서 GIS 인증을 완료하고 임시 루프백 서버 및 딥링크를 통해 데스크톱 앱에 토큰을 전달하는 브리지 페이지 신설
// ====================================================================
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { requestGoogleDriveAuth, loadGoogleIdentityScript } from '@/lib/gdrive/googleDriveClient';
import { CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

function GoogleDriveDesktopBridgeContent() {
  const searchParams = useSearchParams();
  const port = searchParams.get('port');

  const [status, setStatus] = useState<'idle' | 'authorizing' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  const handleAuthorize = React.useCallback(async () => {
    try {
      // Script loading may consume the click's popup permission. Prepare first,
      // then let the user initiate authorization with a fresh click.
      if (!(window as any).google?.accounts?.oauth2) {
        await loadGoogleIdentityScript();
        setIsGoogleReady(true);
        setStatus('idle');
        return;
      }
      setStatus('authorizing');
      setErrorMessage('');

      // 웹 브라우저 환경에서 Google Identity Services (GIS) OAuth 팝업 실행
      const token = await requestGoogleDriveAuth();
      if (!token) {
        throw new Error('Google Drive 인증 토큰을 받지 못했습니다.');
      }

      setStatus('sending');

      // 1. 로컬 루프백 HTTP 서버로 토큰 전달
      if (port) {
        try {
          await fetch(`http://127.0.0.1:${port}/callback?token=${encodeURIComponent(token)}&expires_in=3600`, {
            method: 'GET',
            mode: 'no-cors'
          });
        } catch (fetchErr) {
          console.warn('[GDrive Bridge] Loopback fetch error (fallback to deep link):', fetchErr);
        }
      }

      // 2. onriviauthor:// 딥링크 호출 (백업 경로)
      try {
        window.location.href = `onriviauthor://gdrive-auth?token=${encodeURIComponent(token)}&expires_in=3600`;
      } catch {}

      setStatus('success');
    } catch (err: any) {
      console.error('[GDrive Bridge Error]', err);
      setStatus('error');
      setErrorMessage(err?.message || '구글 인증 과정에서 오류가 발생했습니다.');
    }
  }, [port]);

  // Preload GIS only. Opening a popup from a timer has no browser user activation.
  useEffect(() => {
    let disposed = false;
    loadGoogleIdentityScript().then(() => {
      if (!disposed) setIsGoogleReady(true);
    }).catch((error: Error) => {
      if (!disposed) { setStatus('error'); setErrorMessage(error.message); }
    });
    return () => { disposed = true; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8 text-center transition-all">
        {/* 상단 로고 / 브랜드 */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
            <svg className="w-8 h-8" viewBox="0 0 87.3 78" fill="currentColor">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H6.6c0 1.55.4 3.1 1.2 4.5l-1.2 9.35z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.95 10.3 7.8 13.5z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2L43.65 25z" fill="#00832D"/>
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2L59.8 53z" fill="#2684FC"/>
              <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#FFBA00"/>
            </svg>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Onrivi Author 데스크톱</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Google Drive 계정 안전 연결</p>
        </div>

        {/* 상태별 콘텐츠 */}
        {status === 'authorizing' && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">구글 로그인 팝업이 열렸습니다</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              열린 구글 팝업창에서 계정을 선택하고<br />
              <span className="font-bold text-blue-600 dark:text-blue-400">드라이브 접근 권한을 허용</span>해 주세요.
            </p>
          </div>
        )}

        {status === 'sending' && (
          <div className="py-6 flex flex-col items-center">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">데스크톱 앱으로 인증 토큰 전송 중...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">연결이 완료되었습니다!</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
              Onrivi Author 데스크톱 앱으로 돌아가<br />
              구글 드라이브 작업장을 바로 사용하세요.
            </p>
            <div className="mt-6 p-3 bg-slate-100 dark:bg-zinc-800/80 rounded-xl text-xs text-zinc-500 dark:text-zinc-400">
              💡 이 브라우저 창은 이제 닫으셔도 좋습니다.
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">인증을 완료하지 못했습니다</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 px-2 break-keep">
              {errorMessage}
            </p>
            <button
              onClick={handleAuthorize}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도하기
            </button>
          </div>
        )}

        {status === 'idle' && (
          <div className="py-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-6">
              아래 버튼을 눌러 Google 계정으로 로그인하고 데스크톱 앱과 연결하세요.
            </p>
            <button
              onClick={handleAuthorize}
              disabled={!isGoogleReady}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              {isGoogleReady ? 'Google 계정으로 로그인' : 'Google 로그인 준비 중...'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleDriveDesktopBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <GoogleDriveDesktopBridgeContent />
    </Suspense>
  );
}
