// ====================================================================
// 📊 [OMD-AUTH-callback-0001] page ➔ AuthCallbackPage
// 🎯 @KICK  : 구글 OAuth 콜백 처리. 웹 SaaS 로그인 시 license_activations에 세션 등록(접속자수+1)
// 🛡️ @GUARD : 비인증 진입 가드, 소프트웨어 라이선스 없으면 세션 생성 스킵
// 🚨 @PATCH : 2026-11-02 — [DB 접근 표준화 & Rule 9 준수] subscriptions 브라우저 직접 조회 및 임의 폴백 제거, /api/subscription/get 단일화
// 🚨 @PATCH : **2026-07-22** — supabase.rpc('insert_license_activation') 클라이언트 직접 호출을 fetch('/api/license/activate') 서버단 API Route 호출로 전환; license_activations 테이블명 전환 대응
//             **2026-06-21** — OAuth 콜백 경로 신설; **2026-06-22** — 로그인 시 session UUID 생성, localStorage 저장, license_activations.insert로 접속자수 증가 (장비 미체크, 순수 접속자수 기반)
// 🔗 @CALLS : supabase.auth, supabase.from, useRouter, crypto.randomUUID, fetch
// ====================================================================
"use client";

import { useEffect, useState } from "react";        // React 코어
import { useRouter } from "next/navigation";        // Next.js 라우터
import { supabase } from "@/lib/supabaseClient";     // Supabase 클라이언트 

// =====================================================================
// 🎯  구글 OAuth 콜백 처리 페이지
// 🛡️ @GUARD : 비인증 진입 가드, 소프트웨어 라이선스 없으면 세션 생성 스킵
// 🚨 @PATCH : **2026-06-21** — OAuth 콜백 경로 신설; **2026-06-22** — 로그인 시 session UUID 생성, localStorage 저장, license_activations.insert로 접속자수 증가 (장비 미체크, 순수 접속자수 기반)
// 🔗 @CALLS : supabase.auth, supabase.from, useRouter, crypto.randomUUID
// =====================================================================
export default function AuthCallbackPage() {
  const router = useRouter();   // 🎯 Next.js 라우  터
  const [status, setStatus] = useState("인증 상태를 확인하고 있습니다...");  // 🎯 상태 관리

  useEffect(() => {  // 🎯 useEffect 훅
    async function handleAuthCallback() {  // 🎯 비동기 함수
      try {  // 🎯 try-catch 블록
        // 1. 세션 정보 조회
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();  // 🎯 Supabase 세션 정보 조 회
        if (sessionError) throw sessionError;  // 🎯 오류 처리

        if (!session || !session.user) {  // 🎯 세션 정보 확인
          setStatus("로그인 세션을 찾을 수 없습니다. 로그인 페이지로 이동합니다.");  // 🎯 상태 업데이트
          setTimeout(() => router.push("/login"), 2000);  // 🎯 2초 후 로그인 페이지로 이동
          return;
        }

        const userId = session.user.id;  // 🎯 사용자 ID

        // 모드 구분: login 페이지 → mode=login, signup 페이지 → mode=signup
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const mode = params.get('mode') || 'login';

        // 2. users / users 존재 조회 및 회원가입 동기화
        const checkRes = await fetch('/api/user/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_email: session.user.email })
        });
        const userCheck = checkRes.ok ? await checkRes.json() : null;

        let redirectPath = "/dashboard";

        if (mode === 'login') {
          // ================================================================
          // 구글 로그인: 기존 활성 사용자만 허용
          // ================================================================
          if (!userCheck?.exists || userCheck.is_deleted) {
            // 세션 완전 제거 후 회원가입 페이지로 강제 이동
            await supabase.auth.signOut();
            if (typeof window !== 'undefined') {
              window.location.href = '/signup';
            }
            return;
          }

        } else {
          // ================================================================
          // 구글 회원가입 / 복구
          // ================================================================
          if (!userCheck?.exists || userCheck.is_deleted) {
            setStatus(userCheck?.is_deleted ? "계정을 복구 중입니다..." : "신규 계정을 등록 중입니다...");

            let nickName = session.user.user_metadata?.name || session.user.user_metadata?.full_name || null;
            if (typeof window !== 'undefined') {
              const savedNick = localStorage.getItem('onrivi_signup_nick_name');
              if (savedNick) {
                nickName = savedNick;
                localStorage.removeItem('onrivi_signup_nick_name');
              }
            }

            const upsertRes = await fetch('/api/user/upsert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({
                p_id: userId,
                p_email: session.user.email,
                p_provider: 'google',
                p_nick_name: nickName
              })
            });
            const upsertData = await upsertRes.json();
            if (!upsertData.success) throw new Error(`회원가입 처리 실패: ${upsertData.message}`);
            setStatus("계정 동기화가 완료되었습니다.");
          } else {
            // 기존 활성 사용자 → 로그인 페이지로 안내 후 이동
            await supabase.auth.signOut();
            setStatus("이미 가입된 계정입니다. 로그인 페이지로 이동합니다...");
            setTimeout(() => router.push("/login"), 1500);
            return;
          }
        }

        // 현재사용자: 라이선스 유효성 확인 후 분기 (RLS 우회를 위해 /api/subscription/get 우선 호출)
        let subData: any = null;
        try {
          const subRes = await fetch('/api/subscription/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
          });
          if (subRes.ok) {
            const subJson = await subRes.json();
            if (subJson?.success && subJson.subscription) {
              subData = subJson.subscription;
            }
          }
        } catch (e) {
          console.warn('[AUTH_CALLBACK] /api/subscription/get error:', e);
        }

        if (subData) {
          const targetDate = subData.current_period_end;
          const isValid = targetDate ? Date.now() < new Date(targetDate).getTime() : false;
          redirectPath = isValid ? "/editor" : "/dashboard";

          // 활성 라이선스 있으면 세션 등록
          if (typeof window !== 'undefined' && redirectPath === "/editor") {
            let sessionId = sessionStorage.getItem('onrivi_tab_session_id');
            if (!sessionId) {
              sessionId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
                ? crypto.randomUUID() 
                : 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
            }
            sessionStorage.setItem('onrivi_tab_session_id', sessionId);
            localStorage.setItem('onrivi_session_id', sessionId);
            localStorage.setItem('onrivi_user_id', session.user.email || userId);
            localStorage.setItem('onrivi_payment_no', subData.payment_no || '');
            localStorage.setItem('onrivi_license_key', subData.license_key || '');
            await fetch('/api/license/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ p_license_id: subData.id, p_device_uuid: sessionId, p_device_name: 'Web SaaS', p_user_id: userId })
            });
          }
        } else {
          redirectPath = "/dashboard";
        }

        setStatus("인증이 완료되었습니다. 이동합니다...");
        router.push(redirectPath);

      } catch (err: any) {
        console.error("소셜 인증 처리 에러:", err);
        setStatus("인증 처리 중 오류가 발생했습니다: " + (err.message || err));
        setTimeout(() => router.push("/login"), 3000);
      }
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md bg-slate-900/40 border border-slate-900 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-lg font-black tracking-tight">OAuth 로그인 처리 중</h2>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">{status}</p>
      </div>
    </div>
  );
}
