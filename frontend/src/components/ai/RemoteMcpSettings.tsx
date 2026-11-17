// ====================================================================
// 📊 [OMD-AI-RemoteMcpSettings-0001] src/components/ai/RemoteMcpSettings.tsx
// 🎯 @KICK  : 통합 MCP 연동 설정 UI (구글 드라이브 원격 Streamable HTTP + 내 PC 로컬 OS 폴더 Stdio 전환 지원)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(Core/Manager 분리), Rule 6(Modern Technical Editorial), 토큰 1회성 노출
// 🚨 @PATCH : 2026-11-17 — [로컬 작업장 자동 감지 및 내 PC 로컬 폴더 탭 기본 전환]: 현재 활성 작업장이 로컬 PC/브라우저 폴더일 경우 '내 PC 로컬 폴더' 탭을 기본 선택하고 작업장 경로를 자동 채움. 구글 드라이브 미연결 시 원격 토큰 불필요 안내 배너 추가
// 🚨 @PATCH : 2026-11-17 — [MCP 설정 JSON 표준화 및 로컬+웹 통합 복사 지원]: localConfigSnippet을 ONRIVI_MCP_HOME/APPDATA 자동 경로 방식으로 통일하고, onrivi-author + onrivi-author-web 통합 mcpServers JSON 복사 버튼 추가
// 🚨 @PATCH : 2026-11-16 — [구글 드라이브 + 로컬 OS 폴더 통합 MCP UI] 단일 카드 내 저장소 유형 전환 탭(구글 드라이브 / 로컬 폴더) 추가
// 🚨 @PATCH : 2026-11-16 — [웹 원격 MCP 구축] 개인용 MCP 토큰 발급/재발급/폐기 및 연결 설정 복사 UI 신설
// ====================================================================
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getResourceSettings } from '@/lib/resourceSettings';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { logError } from '@/lib/errorDiagnostics';

interface TokenStatus {
  hasToken: boolean;
  maskedToken: string;
  workspaceFolderId: string;
  resourceFolderId: string;
  hasDriveConnected: boolean;
  updatedAt: string;
}

/**
 * ========================================================================================
 * [컴포넌트명] RemoteMcpSettings - 웹 원격 Streamable HTTP MCP 토큰 발급 및 연결 안내 UI
 * ==========================================================================================
 */
export default function RemoteMcpSettings() {
  const [targetMode, setTargetMode] = useState<'gdrive' | 'local'>(() => {
    if (typeof window === 'undefined') return 'gdrive';
    try {
      const lastMode = localStorage.getItem('onrivi_last_workspace_mode') || window.localStorage.getItem('onrivi_last_workspace_mode') || '';
      const localPath = localStorage.getItem('onrivi_workspace_path') || window.localStorage.getItem('onrivi_workspace_path') || '';
      if (lastMode === 'local' || lastMode === 'browser' || (localPath && lastMode !== 'gdrive' && lastMode !== 'cloud')) {
        return 'local';
      }
    } catch {
      // ignore
    }
    return 'gdrive';
  });
  const [localWorkspacePath, setLocalWorkspacePath] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('onrivi_workspace_path') || window.localStorage.getItem('onrivi_workspace_path') || '';
    } catch {
      return '';
    }
  });
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [issuedToken, setIssuedToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const mcpEndpoint = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : 'https://onrivi.com/api/mcp';

  const readLinkedFolderIds = () => {
    let workspaceFolderId = '';
    let resourceFolderId = '';
    try {
      const wsInfo = JSON.parse(localStorage.getItem('onrivi_gdrive_workspace_info') || 'null');
      workspaceFolderId = wsInfo?.workspaceFolderId || wsInfo?.folderId || '';
    } catch {
      // 파싱 실패 시 빈 값 유지
    }
    try {
      const resSettings = getResourceSettings() as any;
      resourceFolderId = resSettings?.driveFolderId || resSettings?.resourceFolderDriveId || workspaceFolderId;
    } catch {
      resourceFolderId = workspaceFolderId;
    }
    return { workspaceFolderId, resourceFolderId };
  };

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
          workspaceFolderId: data.workspaceFolderId || '',
          resourceFolderId: data.resourceFolderId || '',
          hasDriveConnected: Boolean(data.hasDriveConnected),
          updatedAt: data.updatedAt || '',
        });
      }
    } catch {
      // 초기 조회 실패는 조용히 무시
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleIssue = async () => {
    setBusy(true);
    setMessage('');
    setIssuedToken('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage('❌ 로그인이 필요합니다.');
        return;
      }
      const { workspaceFolderId, resourceFolderId } = readLinkedFolderIds();
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
        // 기존 저장된 refreshToken이 있으면 서버에서 폴백 사용
      }

      const res = await fetch('/api/mcp/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspaceFolderId, resourceFolderId, driveTicket }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setMessage(`❌ ${data?.message || '토큰 발급에 실패했습니다.'}`);
        return;
      }
      setIssuedToken(data.token || '');
      setMessage(`✅ 원격 MCP 토큰이 발급되었습니다. (${data.planName || '유료 플랜'} 확인됨) 아래 토큰은 지금 한 번만 표시되므로 안전하게 복사해 두세요.`);
      await loadStatus();
    } catch (error) {
      logError({
        file: 'frontend/src/components/ai/RemoteMcpSettings.tsx',
        func: 'handleIssue',
        doing: '웹 원격 MCP 개인용 토큰 발급 중',
        target: 'MCP_TOKEN',
        error,
      });
      setMessage('❌ 토큰 발급 중 네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/mcp/token', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setMessage(`❌ ${data?.message || '토큰 폐기에 실패했습니다.'}`);
        return;
      }
      setIssuedToken('');
      setMessage('원격 MCP 토큰이 폐기되었습니다.');
      await loadStatus();
    } catch (error) {
      logError({
        file: 'frontend/src/components/ai/RemoteMcpSettings.tsx',
        func: 'handleRevoke',
        doing: '웹 원격 MCP 개인용 토큰 폐기 중',
        target: 'MCP_TOKEN',
        error,
      });
      setMessage('❌ 토큰 폐기 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const webMcpEntry = {
    url: mcpEndpoint,
    headers: {
      Authorization: `Bearer ${issuedToken || '<발급받은_ONRIVI_MCP_토큰>'}`,
    },
  };

  const localMcpEntry = {
    command: 'node',
    args: [
      '-e',
      "import('file:///' + (process.env.ONRIVI_MCP_HOME || (process.env.APPDATA + '/Onrivi Author/plugins/onrivi-author')).replace(/\\\\/g, '/') + '/server/index.mjs')",
    ],
    ...(localWorkspacePath.trim()
      ? { env: { ONRIVI_WORKSPACE_PATH: localWorkspacePath.trim() } }
      : {}),
  };

  const configSnippet = JSON.stringify(
    { mcpServers: { 'onrivi-author-web': webMcpEntry } },
    null,
    2
  );

  const localConfigSnippet = JSON.stringify(
    { mcpServers: { 'onrivi-author': localMcpEntry } },
    null,
    2
  );

  const combinedConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        'onrivi-author': localMcpEntry,
        'onrivi-author-web': webMcpEntry,
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
        <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTargetMode('gdrive')}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              targetMode === 'gdrive'
                ? 'bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-blue-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            🌐 구글 드라이브 (원격)
          </button>
          <button
            type="button"
            onClick={() => setTargetMode('local')}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              targetMode === 'local'
                ? 'bg-white dark:bg-zinc-900 text-[#1d4ed8] dark:text-blue-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            💻 내 PC 로컬 폴더
          </button>
        </div>
      </div>

      {targetMode === 'gdrive' ? (
        <>
          {status && !status.hasDriveConnected && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-amber-900 dark:text-amber-200 font-medium">
                💡 현재 구글 드라이브가 연결되어 있지 않습니다. <strong>내 PC 로컬 폴더</strong>를 사용 중이시라면 원격 토큰 발급 없이 바로 연동할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={() => setTargetMode('local')}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 cursor-pointer"
              >
                💻 내 PC 로컬 폴더로 전환 →
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              웹·데스크톱 어디서든 연결한 <strong>구글 드라이브 작업장·리소스 폴더(문서, AI 템플릿, 서식 프로필)</strong>를 외부 AI 에이전트(Antigravity, Claude 등)에서 바로 읽고 수정할 수 있습니다. (활성 유료 구독 필요)
            </p>
            <span
              className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                status?.hasToken
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {status?.hasToken ? `● 토큰 발급됨 (${status.maskedToken})` : '○ 미발급'}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400 block">원격 MCP 엔드포인트 (Streamable HTTP)</span>
            <code className="font-mono text-[12px] text-blue-700 dark:text-blue-400">{mcpEndpoint}</code>
          </div>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(mcpEndpoint).then(() => setMessage('엔드포인트 주소를 복사했습니다.'))}
            className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
          >
            주소 복사
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleIssue()}
            className="px-3.5 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold disabled:opacity-40 cursor-pointer shadow-xs"
          >
            {busy ? '처리 중…' : status?.hasToken ? 'MCP 토큰 재발급' : 'MCP 전용 토큰 발급'}
          </button>
          {status?.hasToken && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRevoke()}
              className="px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold disabled:opacity-40 cursor-pointer"
            >
              토큰 폐기
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

        <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">AI 에이전트 설정 예시 (`mcp_config.json`)</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(combinedConfigSnippet).then(() => setMessage('로컬+웹 통합 mcp_config.json을 복사했습니다.'))}
                className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
              >
                통합 JSON 복사 (로컬+웹)
              </button>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(configSnippet).then(() => setMessage('mcp_config.json 예시를 복사했습니다.'))}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                JSON 복사
              </button>
            </div>
          </div>
          <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto">
            {configSnippet}
          </pre>
        </div>

        {message && <p role="status" className="text-xs font-medium text-purple-700 dark:text-purple-300 pt-1">{message}</p>}
      </div>
        </>
      ) : (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 space-y-3 text-xs">
          <p className="text-[12px] text-on-surface-variant leading-relaxed">
            <strong>내 PC 로컬 폴더</strong>를 공유 폴더로 사용할 때는 AI 에이전트(Antigravity, Claude 등)가 PC의 로컬 MCP 서버(`Stdio`)를 직접 실행해 문서를 읽고 씁니다.
          </p>
          <label className="block space-y-1">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">공유할 로컬 폴더 경로 (선택)</span>
            <input
              type="text"
              value={localWorkspacePath}
              onChange={(e) => setLocalWorkspacePath(e.target.value)}
              placeholder="예: D:\MyDocs\OnriviWorkspace"
              className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
            />
          </label>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">AI 에이전트 설정 예시 (`mcp_config.json`)</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(combinedConfigSnippet).then(() => setMessage('로컬+웹 통합 mcp_config.json을 복사했습니다.'))}
                  className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                >
                  통합 JSON 복사 (로컬+웹)
                </button>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(localConfigSnippet).then(() => setMessage('로컬 MCP 설정 JSON을 복사했습니다.'))}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  JSON 복사
                </button>
              </div>
            </div>
            <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto">
              {localConfigSnippet}
            </pre>
          </div>
          {message && <p role="status" className="text-xs font-medium text-purple-700 dark:text-purple-300 pt-1">{message}</p>}
        </div>
      )}
    </div>
  );
}
