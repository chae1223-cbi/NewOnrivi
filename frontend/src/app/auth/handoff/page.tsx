"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function HandoffContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processHandoff = async () => {
      try {
        // 1. URL의 Hash Fragment 추출 (예: #access_token=...&refresh_token=...&redirect=...)
        const hash = window.location.hash;
        if (!hash) {
          throw new Error("보안 토큰이 전달되지 않았습니다.");
        }

        // '#' 제거 후 파싱
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const redirectPath = params.get('redirect') || '/dashboard';

        if (!accessToken || !refreshToken) {
          throw new Error("유효하지 않은 보안 토큰입니다.");
        }

        // 2. 주소창에서 토큰 흔적 지우기 (보안)
        window.history.replaceState(null, '', window.location.pathname);

        // 3. Supabase 세션 강제 주입 (로그인 처리)
        const { error: authError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (authError) {
          throw authError;
        }

        // 4. 원래 목적지로 리다이렉트
        router.push(redirectPath);

      } catch (err: any) {
        console.error("Auto Login Error:", err);
        setError(err.message || "자동 로그인 처리 중 오류가 발생했습니다.");
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    processHandoff();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
      <div className="text-center">
        {error ? (
          <div className="text-rose-500 font-bold mb-4">{error}</div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 dark:text-zinc-400 font-medium animate-pulse">
              안전하게 로그인 중입니다...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthHandoffPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">Loading...</div>}>
      <HandoffContent />
    </Suspense>
  );
}
