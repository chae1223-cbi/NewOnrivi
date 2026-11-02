// ====================================================================
// 📊 [OMD-PAGE-knowledge-0001] page.tsx ➔ Onrivi Knowledge Engine Page
// 🎯 @KICK  : http://localhost:3100/knowledge 직접 접속 시 동일 탭 내 에디터 지식 뷰(/editor?view=knowledge)로 자동 전환
// 🛡️ @GUARD : 동일 브라우저 다중 탭 분리 방지, 단일 탭 에디터 인라인 뷰 전환 보장
// 🚨 @PATCH : **2026-09-04** — [브랜드 로고 통일] 지식 엔진 리다이렉트 화면 로고를 온리비 공식 네잎클로버 펜촉 브랜드 로고(/icon.png)로 교체
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 새 탭 분리 방지 및 에디터 인라인 지식 뷰 자동 리다이렉트 적용
// 🔗 @CALLS : router.replace
// ====================================================================

'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function KnowledgeRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    const targetUrl = tab 
      ? `/editor?view=knowledge&tab=${encodeURIComponent(tab)}` 
      : '/editor?view=knowledge';
    router.replace(targetUrl);
  }, [router, searchParams]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#FAFBFC] dark:bg-[#121316] text-zinc-600 dark:text-zinc-400 gap-3 select-none">
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 p-1 flex items-center justify-center shadow-xs animate-bounce">
        <img src="/icon.png" alt="Onrivi" className="w-full h-full object-contain select-none" />
      </div>
      <p className="text-xs font-semibold">지식 엔진으로 전환 중...</p>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#FAFBFC] dark:bg-[#121316] text-zinc-600 dark:text-zinc-400 gap-3">
        <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 p-1 flex items-center justify-center shadow-xs animate-bounce">
          <img src="/icon.png" alt="Onrivi" className="w-full h-full object-contain select-none" />
        </div>
        <p className="text-xs font-semibold">지식 엔진 불러오는 중...</p>
      </div>
    }>
      <KnowledgeRedirectContent />
    </Suspense>
  );
}
