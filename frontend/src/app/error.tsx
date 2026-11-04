// ====================================================================
// 📊 [OMD-UI-GlobalError-0001] app/error.tsx ➔ GlobalError
// 🎯 @KICK  : Next.js App Router 전역 클라이언트 예외 발생 시 불투명한 에러 화면 대신 정밀 진단 및 복구 인터페이스 표출
// 🛡️ @GUARD : React 렌더링/생명주기 크래시 포착, console.error 덤프 및 복구(reset/reload) 액션 제공
// 🚨 @PATCH : **2026-11-04** — [전역 클라이언트 에러 페이지 신설]: Next.js의 기본 백지 에러를 방어하고 사용자 복구 및 정밀 스택 확인 UI 제공
// 🔗 @CALLS : reset, window.location.reload
// ====================================================================
"use client";

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🚨 [AppRouter Global Error Caught]:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '680px',
        width: '100%',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>⚠️</span>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#f87171' }}>
            화면 표시 중 오류가 발생했습니다
          </h2>
        </div>
        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
          일시적인 브라우저 리소스 또는 스크립트 충돌일 수 있습니다. 아래 버튼을 눌러 다시 시도하거나 페이지를 새로고침해 주세요.
        </p>

        <div style={{
          backgroundColor: '#020617',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          overflowX: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#e2e8f0',
          maxHeight: '200px',
          whiteSpace: 'pre-wrap'
        }}>
          <strong>{error.name || 'Error'}:</strong> {error.message || '알 수 없는 클라이언트 예외'}
          {error.digest && <div style={{ color: '#64748b', marginTop: '6px' }}>Digest: {error.digest}</div>}
          {error.stack && (
            <div style={{ color: '#94a3b8', marginTop: '10px', fontSize: '11px', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
              {error.stack}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              flex: 1,
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
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
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
            페이지 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
