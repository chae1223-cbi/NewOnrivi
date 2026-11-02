// ====================================================================
// 📊 [OMD-UI-EditorPage-0001] editor/page.tsx ➔ Page
// 🎯 @KICK  : MainEditorApp을 SSR 비활성화(Client-side only) 및 청크 로드 실패 시 자동 복구 가드를 통해 안전하게 마운트하는 최상위 에디터 진입 라우트
// 🛡️ @GUARD : Next.js 빌드/HMR 청크 불일치로 인한 ChunkLoadError 방어 및 1회 자동 새로고침 복구 가드
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — ChunkLoadError 자동 복구 리트라이 가드 추가 및 LDSG v5.0 로딩 스피너 UI 통일
// 🔗 @CALLS : dynamic, MainEditorApp
// ====================================================================
"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { activateBrowserAccount, getBrowserAccountScope } from '@/lib/browserAccountStorage';

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
      const previous = getBrowserAccountScope();
      if (previous && previous !== (owner || 'guest')) {
        window.location.reload();
        return;
      }
      activateBrowserAccount(owner);
      initialized = true;
      setReady(true);
    }).catch(() => {
      if (!cancelled) setError('계정 저장소를 준비하지 못했습니다. 새로고침하거나 다시 로그인해 주세요.');
    });
    return () => { cancelled = true; listener?.subscription.unsubscribe(); };
  }, []);
  if (!ready) return <div role="status" className="p-6">{error || '계정별 작업장을 준비하고 있습니다…'}</div>;
  return <MainEditorApp />;
}
