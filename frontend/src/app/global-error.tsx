// ====================================================================
// 📊 [OMD-UI-GlobalError-0001] app/global-error.tsx ➔ GlobalError
// 🎯 @KICK  : Next.js App Router 최상위 루트 레이아웃 및 번들 크래시 방어용 전역 에러 바운더리
// 🛡️ @GUARD : Next.js 기본 백지 화면(Application error) 완전 차단 및 강력 새로고침·상세 진단 인터페이스 제공
// 🚨 @PATCH : 2026-11-04 — [전역 루트 에러 바운더리 신설]: 루트 레이아웃 및 클라이언트 런타임 예외 시 백지 화면 대신 정밀 진단 스택 및 캐시 소탕 리로드 UI 표출
// 🔗 @CALLS : reset, window.location.reload
// ====================================================================
"use client";

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🚨 [Next.js Global Root Error Caught]:', error);
  }, [error]);

  const handleHardReload = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        // 청크 재시도 플래그 초기화
        sessionStorage.removeItem('chunk_retry_editor');
      }
    } catch {
      // 무시
    }
    window.location.reload();
  };

  return (
    <html lang="ko">
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#090d16',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: '720px',
          width: '90%',
          margin: '2rem auto',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <span style={{ fontSize: '32px' }}>🚨</span>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#f87171' }}>
                화면 로드 중 런타임 오류가 발생했습니다
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Onrivi Author 전역 진단 엔진 (Global Error Guard)
              </p>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
            새로운 버전 배포 후 브라우저에 남아있는 이전 스크립트 캐시 충돌이거나 일시적인 클라이언트 런타임 예외일 수 있습니다. 아래 [강력 새로고침] 버튼을 눌러 최신 스크립트를 즉시 다시 내려받아 주세요.
          </p>

          <div style={{
            backgroundColor: '#020617',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '24px',
            overflowX: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#f1f5f9',
            maxHeight: '260px',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5
          }}>
            <div style={{ color: '#fb7185', fontWeight: 'bold', marginBottom: '8px' }}>
              {error.name || 'Error'}: {error.message || '알 수 없는 클라이언트 예외'}
            </div>
            {error.digest && <div style={{ color: '#64748b', marginBottom: '6px' }}>Digest: {error.digest}</div>}
            {error.stack && (
              <div style={{ color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '8px', fontSize: '11px' }}>
                {error.stack}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleHardReload}
              style={{
                flex: 1,
                minWidth: '160px',
                padding: '12px 20px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              🔄 강력 새로고침 (캐시 갱신)
            </button>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '12px 20px',
                backgroundColor: '#334155',
                color: '#f8fafc',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
