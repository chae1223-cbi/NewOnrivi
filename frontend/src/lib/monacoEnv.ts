import { loader } from '@monaco-editor/react';

// ====================================================================
// 📊 [OMD-EDIT-monacoEnv-0001] monacoEnv.ts ➔ configureMonacoEnvironment
// 🎯 @KICK  : Monaco Editor 워커/로더 경로를 로컬(Electron/Web) 또는 Extension 환경에 맞게 구성
// 🛡️ @GUARD : window 부재, Extension 환경(chrome.runtime.id) 조기 반환
// 🚨 @PATCH : loader.config try-catch로 미초기화 상태 무시 | **2026-06-28** — CDN Monaco Editor 라이브러리와 워커 로더 버전 불일치로 인한 M.findSectionHeaders is not a function 런타임 타입 에러를 차단하기 위해 0.44.0 버전으로 매칭 하향 안정화 적용
// 🔗 @CALLS : 없음
// ====================================================================
export function configureMonacoEnvironment(): void {
  if (typeof window === 'undefined') return;

  const isExtension = !!((window as any).chrome?.runtime?.id);

  if (isExtension) return; // page.tsx 모듈 레벨에서 처리됨

  // Web routes (including /editor/) must resolve from the site root. Relative
  // URLs are reserved for Electron's packaged file:// entry point.
  const vsPath = (window as any).electronAPI ? './monaco-editor/min/vs' : '/monaco-editor/min/vs';
  (window as any).MonacoEnvironment = {
    // The bundled min/vs distribution uses the AMD worker bootstrap for every
    // language, rather than the *.worker.js filenames in the ESM distribution.
    getWorkerUrl: () => `${vsPath}/base/worker/workerMain.js`
  };

  try {
    loader.config({ paths: { vs: vsPath } });
  } catch {
    // 로더가 아직 초기화되지 않은 경우 무시 (onMount에서 처리됨)
  }
}
