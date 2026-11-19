// ====================================================================
// 📊 [OMD-AI-RemoteMcpSettings-0001] src/components/ai/RemoteMcpSettings.tsx
// 🎯 @KICK  : 온리비 어서 통합 하이브리드 MCP 연동 설정 UI (단일 원격 엔드포인트로 Google Drive + 로컬 PC 에이전트 공용 지원)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 6(Modern Technical Editorial), Rule 8(고대비 시인성), 편집기 폴더 자동 복사 금지, 토큰 1회성 노출
// 🚨 @PATCH : 2026-11-19 — [구버전 2탭(구글드라이브/로컬 Stdio) 및 편집기 경로 입력 화면 제거 · 단일 하이브리드 통합 UI 일원화]:
//             1) 혼란을 주던 '구글 드라이브 (원격) / 내 PC 로컬 폴더' 탭과 편집기 폴더 경로(ONRIVI_WORKSPACE_PATH) 복사 UI 제거
//             2) 단일 통합 MCP 연결 발급·다중 연결 관리·로컬 PC 에이전트 장치 상태 확인으로 화면 간결화
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 5: 다중 연결 목록·개별 폐기·로컬 PC 에이전트 장치 상태 UI 연동]
// ====================================================================
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logError } from '@/lib/errorDiagnostics';

interface McpFolderSlotSummary {
  role: 'WORKSPACE' | 'RESOURCE';
  storageType: 'GDRIVE' | 'LOCAL' | null;
  folderId?: string;
  deviceId?: string;
  rootId?: string;
  folderName?: string;
  permissions?: string[];
}

interface McpConnectionSummary {
  connectionId: string;
  clientName: string;
  maskedToken: string;
  configVersion: number;
  workspace?: McpFolderSlotSummary;
  resource?: McpFolderSlotSummary;
  createdAt?: string;
  lastUsedAt?: string;
}

interface McpDeviceSummary {
  deviceId: string;
  deviceName: string;
  status: 'ONLINE' | 'OFFLINE';
  lastHeartbeatAt?: string;
  approvedRoots: Array<{ rootId: string; name: string; permissions?: string[] }>;
}

interface TokenStatus {
  hasToken: boolean;
  maskedToken: string;
  hasDriveConnected: boolean;
  updatedAt: string;
  connections: McpConnectionSummary[];
  devices: McpDeviceSummary[];
}

/**
 * ========================================================================================
 * [컴포넌트명] RemoteMcpSettings - 온리비 어서 통합 하이브리드 MCP 연결 발급 및 관리 UI
 * ==========================================================================================
 */
export default function RemoteMcpSettings() {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [issuedToken, setIssuedToken] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const mcpEndpoint = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : 'https://onrivi.com/api/mcp';

  const loadStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/mcp/token', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success) {
        setStatus({
          hasToken: Boolean(data.hasToken),
          maskedToken: data.maskedToken || '',
          hasDriveConnected: Boolean(data.hasDriveConnected),
          updatedAt: data.updatedAt || '',
          connections: Array.isArray(data.connections) ? data.connections : [],
          devices: Array.isArray(data.devices) ? data.devices : [],
        });
      }
    } catch {
      // 초기 조회 실패는 조용히 무시
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleIssue = async (createNewConnection = false) => {
    setBusy(true);
    setMessage('');
    setIssuedToken('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage('❌ 로그인이 필요합니다.');
        return;
      }
      let driveTicket = '';
      try {
        const ticketRes = await fetch('/api/gdrive/oauth/mcp-ticket', {
          method: 'POST',
          credentials: 'include',
        });
        if (ticketRes.ok) {
          const ticketData = await ticketRes.json().catch(() => ({}));
          driveTicket = ticketData?.ticket || '';
        }
      } catch {
        // 구글 드라이브 미연결 시에도 로컬 PC 에이전트용 토큰 발급 허용
      }

      const payload: Record<string, unknown> = {
        driveTicket,
        createNewConnection,
        clientName: newClientName.trim() || (createNewConnection ? '새 AI 클라이언트' : 'DEFAULT'),
      };

      const res = await fetch('/api/mcp/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setMessage(`❌ ${data?.message || '토큰 발급에 실패했습니다.'}`);
        return;
      }
      setIssuedToken(data.token || '');
      if (createNewConnection) setNewClientName('');
      const driveHint = data.hasDriveConnected
        ? 'Google Drive와 등록된 로컬 PC 폴더를 모두 전환해 사용할 수 있습니다.'
        : '현재 Google Drive 미연결 상태이므로 로컬 PC 에이전트용으로 바로 사용할 수 있으며, Drive는 필요 시 나중에 연결하세요.';
      setMessage(
        createNewConnection
          ? `✅ 새 독립 MCP 연결(${data.clientName || '새 클라이언트'}) 토큰이 발급되었습니다. ${driveHint}`
          : `✅ 통합 MCP 토큰이 발급되었습니다. (${data.planName || '유료 플랜'} 확인됨) ${driveHint}`
      );
      await loadStatus();
    } catch (error) {
      logError({
        file: 'frontend/src/components/ai/RemoteMcpSettings.tsx',
        func: 'handleIssue',
        doing: '통합 MCP 연결 토큰 발급 중',
        target: 'MCP_TOKEN',
        error,
      });
      setMessage('❌ 토큰 발급 중 네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (connectionId?: string) => {
    setBusy(true);
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const endpoint = connectionId ? `/api/mcp/token?connectionId=${encodeURIComponent(connectionId)}` : '/api/mcp/token';
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setMessage(`❌ ${data?.message || '토큰 폐기에 실패했습니다.'}`);
        return;
      }
      if (!connectionId) setIssuedToken('');
      setMessage(connectionId ? '선택한 MCP 연결이 해제되었습니다.' : '모든 MCP 토큰이 폐기되었습니다.');
      await loadStatus();
    } catch (error) {
      logError({
        file: 'frontend/src/components/ai/RemoteMcpSettings.tsx',
        func: 'handleRevoke',
        doing: '통합 MCP 연결 토큰 폐기 중',
        target: connectionId || 'MCP_TOKEN',
        error,
      });
      setMessage('❌ 토큰 폐기 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const configSnippet = JSON.stringify(
    {
      mcpServers: {
        'onrivi-author-web': {
          url: mcpEndpoint,
          headers: {
            Authorization: `Bearer ${issuedToken || '<발급받은_ONRIVI_MCP_토큰>'}`,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔌</span>
          <h4 className="text-[16px] font-bold text-on-surface">온리비 어서 통합 MCP 연동</h4>
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            status?.hasToken
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {status?.hasToken ? `● 연결 ${status.connections.length || 1}개 활성` : '○ 미발급'}
        </span>
      </div>

      <p className="text-[12px] text-on-surface-variant leading-relaxed">
        단일 원격 MCP 연결 하나로 <strong>Google Drive</strong>와 <strong>등록된 내 PC 로컬 폴더(Local Agent)</strong>를 편집기 실행 없이 전환해 사용할 수 있습니다. 작업장·리소스 폴더는 MCP 연결별로 독립 설정됩니다.
      </p>

      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">통합 MCP 엔드포인트 (Streamable HTTP)</span>
            <code className="font-mono text-[12px] text-blue-700 dark:text-blue-400 font-bold">{mcpEndpoint}</code>
          </div>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(mcpEndpoint).then(() => setMessage('엔드포인트 주소를 복사했습니다.'))}
            className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
          >
            주소 복사
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleIssue(false)}
            className="px-3.5 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold disabled:opacity-40 cursor-pointer shadow-xs"
          >
            {busy ? '처리 중…' : status?.hasToken ? '기본 토큰 재발급' : 'MCP 전용 토큰 발급'}
          </button>
          <input
            type="text"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="클라이언트 이름 (예: Claude, ChatGPT)"
            className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-800 dark:text-zinc-200 w-52"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleIssue(true)}
            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold disabled:opacity-40 cursor-pointer shadow-xs"
          >
            ＋ 새 독립 연결 추가
          </button>
          {status?.hasToken && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRevoke()}
              className="px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold disabled:opacity-40 cursor-pointer ml-auto"
            >
              전체 폐기
            </button>
          )}
        </div>

        {issuedToken && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">발급된 개인용 MCP 토큰 (1회 표시)</span>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(issuedToken).then(() => setMessage('MCP 토큰을 클립보드에 복사했습니다.'))}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                토큰 복사
              </button>
            </div>
            <code className="block break-all font-mono text-[11px] text-emerald-900 dark:text-emerald-200 select-all">
              {issuedToken}
            </code>
          </div>
        )}

        {status && status.connections.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="font-bold text-zinc-700 dark:text-zinc-200 block">
              활성 MCP 연결 목록 ({status.connections.length}개 · 연결별 독립 폴더 설정)
            </span>
            <div className="space-y-1.5">
              {status.connections.map((conn) => {
                const wsLabel = conn.workspace?.storageType
                  ? `${conn.workspace.storageType} · ${conn.workspace.folderName || conn.workspace.folderId || conn.workspace.rootId}`
                  : '미설정';
                const resLabel = conn.resource?.storageType
                  ? `${conn.resource.storageType} · ${conn.resource.folderName || conn.resource.folderId || conn.resource.rootId}`
                  : '미설정';
                return (
                  <div
                    key={conn.connectionId}
                    className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-950/50 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-800 dark:text-zinc-100">{conn.clientName}</span>
                        <code className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">{conn.maskedToken}</code>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                          v{conn.configVersion}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                        작업장: <span className="font-mono font-bold">{wsLabel}</span> · 리소스: <span className="font-mono font-bold">{resLabel}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRevoke(conn.connectionId)}
                      className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-[11px] cursor-pointer shrink-0"
                    >
                      연결 해제
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status && status.devices.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="font-bold text-zinc-700 dark:text-zinc-200 block">
              등록된 로컬 PC 에이전트 장치 ({status.devices.length}대)
            </span>
            <div className="space-y-1.5">
              {status.devices.map((dev) => (
                <div
                  key={dev.deviceId}
                  className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-950/50 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-800 dark:text-zinc-100">{dev.deviceName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          dev.status === 'ONLINE'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {dev.status === 'ONLINE' ? '● ONLINE' : '○ OFFLINE'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                      승인 폴더: {dev.approvedRoots.length > 0 ? dev.approvedRoots.map((r) => r.name).join(', ') : '없음'}
                    </div>
                  </div>
                  <code className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">{dev.deviceId}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">AI 에이전트 설정 예시 (`mcp_config.json`)</span>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(configSnippet).then(() => setMessage('mcp_config.json 예시를 복사했습니다.'))}
              className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              JSON 복사
            </button>
          </div>
          <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto">
            {configSnippet}
          </pre>
        </div>

        {message && <p role="status" className="text-xs font-medium text-purple-700 dark:text-purple-300 pt-1">{message}</p>}
      </div>
    </div>
  );
}
