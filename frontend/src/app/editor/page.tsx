// ====================================================================
// 📊 [OMD-UI-EditorPage-0001] editor/page.tsx ➔ Page
// 🎯 @KICK  : MainEditorApp을 SSR 비활성화(Client-side only) 및 청크 로드 실패 시 자동 복구 가드를 통해 안전하게 마운트하는 최상위 에디터 진입 라우트
// 🛡️ @GUARD : Next.js 빌드/HMR 청크 불일치 방어 및 비로그인 무단 에디터 직접 접근 차단 가드
// 🚨 @PATCH : **2026-11-04** — [에디터 클라이언트 에러 바운더리 장착]: Next.js의 불투명한 'Application error' 백지 화면 대신 정밀 진단 스택 및 복구 UI를 표출하는 EditorErrorBoundary 장착
// 🚨 @PATCH : **2026-11-02** — [비로그인 무단 접근 원천 차단] 웹 환경에서 로그인 세션이나 '체험하기' 플래그가 없으면 에디터 진입을 차단하고 /login으로 즉시 리다이렉트
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — ChunkLoadError 자동 복구 리트라이 가드 추가 및 LDSG v5.0 로딩 스피너 UI 통일
// 🔗 @CALLS : dynamic, MainEditorApp, supabase.auth, activateBrowserAccount
// ====================================================================
"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { activateBrowserAccount, getBrowserAccountScope } from '@/lib/browserAccountStorage';

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [EditorErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#18181b', color: '#f43f5e', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, color: '#fb7185' }}>🚨 Onrivi Editor Client-Side Error Caught</h2>
          <div style={{ background: '#27272a', padding: 16, borderRadius: 8, marginBottom: 16, color: '#fff', whiteSpace: 'pre-wrap' }}>
            <strong>Error:</strong> {this.state.error?.name}: {this.state.error?.message}
            {'\n\n'}
            <strong>Stack:</strong>{'\n'}
            {this.state.error?.stack}
          </div>
          {this.state.errorInfo && (
            <div style={{ background: '#27272a', padding: 16, borderRadius: 8, color: '#a1a1aa', whiteSpace: 'pre-wrap' }}>
              <strong>Component Stack:</strong>{'\n'}
              {this.state.errorInfo.componentStack}
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
          >
            새로고침 (Reload)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainEditorApp = dynamic(
  () =>
    import("@/components/MainEditorApp").catch((err) => {
      // 빌드/배포 후 청크 해시 불일치로 인한 ChunkLoadError 발생 시 1회 자동 하드리로드
      if (typeof window !== "undefined") {
        const hasRetried = sessionStorage.getItem("chunk_retry_editor");
        if (!hasRetried) {
          sessionStorage.setItem("chunk_retry_editor", "true");
          window.location.reload();
        }
      }
      throw err;
    }),
  {
    ssr: false,
    loading: () => (
      <div translate="no" className="flex items-center justify-center h-screen bg-[#F9F8F6] dark:bg-[#121314] text-[#1A1A18] dark:text-[#E8ECE9] font-sans select-none">
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center w-24 h-24">
            <div className="absolute inset-0 m-auto w-20 h-20 border-[3px] border-[#1d4ed8]/20 border-t-[#1d4ed8] rounded-full animate-spin" />
            <img src="/icon.png" alt="Onrivi Logo" className="w-9 h-9 object-contain z-10" />
          </div>
          <div className="text-sm font-bold tracking-tight text-[#111413] dark:text-white">
            <span>Onrivi Author 로딩 중...</span>
          </div>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false, initialized = false;
    let owner: string|null = null;
    if ((window as any).electronAPI) { setReady(true); return; }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Never reuse mounted editor state across accounts. Old pending writes
      // retain the previous account scope until this page has unloaded.
      if (initialized && (session?.user?.id || null) !== owner) {
        setReady(false);
        window.location.reload();
      }
    });
    void supabase.auth.getSession().then(({data, error}) => {
      if (cancelled) return;
      if (error) throw error;
      owner = data.session?.user?.id || null;

      // 🛡️ [비로그인 무단 접근 차단 가드]
      // 데스크톱 앱(Electron)이 아닌 웹 브라우저 환경에서:
      // 로그인 아이디(owner)가 없고, '체험하기'를 통한 게스트 모드(onrivi_guest_mode === 'Y')도 없다면
      // 에디터 화면에 아예 들어오지 못하도록 로그인 화면(/login)으로 즉시 튕겨냅니다.
      const isGuestMode = typeof window !== 'undefined' && localStorage.getItem('onrivi_guest_mode') === 'Y';
      if (!owner && !isGuestMode) {
        window.location.replace('/login?redirect=/editor');
        return;
      }

      const effectiveAccount = owner || (isGuestMode ? 'guest' : null);
      if (!effectiveAccount) {
        window.location.replace('/login?redirect=/editor');
        return;
      }

      const previous = getBrowserAccountScope();
      if (previous && previous !== effectiveAccount) {
        window.location.reload();
        return;
      }
      activateBrowserAccount(effectiveAccount);
      initialized = true;
      setReady(true);
    }).catch(() => {
      if (!cancelled) setError('계정 저장소를 준비하지 못했습니다. 새로고침하거나 다시 로그인해 주세요.');
    });
    return () => { cancelled = true; listener?.subscription.unsubscribe(); };
  }, []);
  if (!ready) return <div role="status" className="p-6">{error || '계정별 작업장을 준비하고 있습니다…'}</div>;
  return (
    <EditorErrorBoundary>
      <MainEditorApp />
    </EditorErrorBoundary>
  );
}
