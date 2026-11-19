// ====================================================================
// 📊 [OMD-MCP-AGENT-RUNTIME-0001] plugins/onrivi-author/agent/runLocalAgent.mjs
// 🎯 @KICK  : PC에서 편집기 없이 상시 실행되는 온리비 MCP Local Agent 런타임 & CLI
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 아웃바운드 SSE 연결, 자동 재연결, 승인 폴더(mcp-local-agent.json) 로컬 보호
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 4: 독립 Local Agent 런타임 & CLI 신설]
//             1) approve / revoke-root / status / start CLI 지원
//             2) 아웃바운드 SSE 스트림 수신 → LocalAgentCore 실행 → /agent/result 회신 루프 구현
//             3) Gateway(/api/mcp/devices) 주기적 하트비트 및 종료 시 OFFLINE 통지
// 🔗 @CALLS : ./localAgentCore.mjs, node:fs/promises, node:os, node:path
// ====================================================================
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LocalAgentCore } from './localAgentCore.mjs';

export function getDefaultAgentConfigPath() {
  if (process.env.ONRIVI_AGENT_CONFIG_PATH) return path.resolve(process.env.ONRIVI_AGENT_CONFIG_PATH);
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(base, 'Onrivi Author', 'mcp-local-agent.json');
}

export async function loadAgentConfig(configPath = getDefaultAgentConfigPath()) {
  try {
    const raw = JSON.parse(await fs.readFile(configPath, 'utf8'));
    return {
      version: 1,
      deviceId: raw.deviceId || `dev_${randomUUID()}`,
      deviceName: raw.deviceName || os.hostname() || 'My PC',
      userId: raw.userId || '',
      gatewayUrl: raw.gatewayUrl || 'https://onrivi.com',
      relayUrl: raw.relayUrl || '',
      mcpToken: raw.mcpToken || '',
      relaySecret: raw.relaySecret || '',
      approvedRoots: Array.isArray(raw.approvedRoots) ? raw.approvedRoots : [],
    };
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    return {
      version: 1,
      deviceId: `dev_${randomUUID()}`,
      deviceName: os.hostname() || 'My PC',
      userId: '',
      gatewayUrl: 'https://onrivi.com',
      relayUrl: '',
      mcpToken: '',
      relaySecret: '',
      approvedRoots: [],
    };
  }
}

export async function saveAgentConfig(config, configPath = getDefaultAgentConfigPath()) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

/**
 * ========================================================================================
 * [클래스명] LocalAgentRuntime - Relay 아웃바운드 SSE 스트림과 Gateway 하트비트를 유지하는 상시 실행 런타임
 * ==========================================================================================
 */
export class LocalAgentRuntime {
  constructor({ core, userId, relayUrl, relaySecret = '', gatewayUrl = '', mcpToken = '', heartbeatMs = 45_000 }) {
    this.core = core;
    this.userId = String(userId || '').trim();
    this.relayUrl = String(relayUrl || '').replace(/\/$/, '');
    this.relaySecret = String(relaySecret || '');
    this.gatewayUrl = String(gatewayUrl || '').replace(/\/$/, '');
    this.mcpToken = String(mcpToken || '');
    this.heartbeatMs = heartbeatMs;
    this.stopped = false;
    this.abortController = null;
    this.heartbeatTimer = null;
  }

  async sendHeartbeat(status = 'ONLINE') {
    if (!this.gatewayUrl || !this.mcpToken) return;
    const summary = this.core.getPublicDeviceSummary();
    await fetch(`${this.gatewayUrl}/api/mcp/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.mcpToken}`,
      },
      body: JSON.stringify({
        deviceId: summary.deviceId,
        deviceName: summary.deviceName,
        status,
        approvedRoots: summary.approvedRoots,
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch((err) => {
      console.warn('[Onrivi LocalAgent] 하트비트 전송 실패:', err?.message || err);
    });
  }

  async postJobResult(jobId, payload) {
    await fetch(`${this.relayUrl}/agent/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.relaySecret ? { Authorization: `Bearer ${this.relaySecret}` } : {}),
      },
      body: JSON.stringify({ jobId, ...payload }),
      signal: AbortSignal.timeout(10_000),
    });
  }

  async handleIncomingJob(envelope) {
    const jobId = envelope?.jobId || envelope?.job?.jobId;
    if (!jobId) return;
    try {
      const result = await this.core.executeJob(envelope.job);
      await this.postJobResult(jobId, { ok: true, result });
    } catch (err) {
      await this.postJobResult(jobId, { ok: false, error: err?.message || '로컬 작업 실행 실패' }).catch(() => {});
    }
  }

  async connectOnce(onConnected) {
    const streamUrl = `${this.relayUrl}/agent/stream?userId=${encodeURIComponent(this.userId)}&deviceId=${encodeURIComponent(this.core.deviceId)}`;
    this.abortController = new AbortController();
    const res = await fetch(streamUrl, {
      headers: {
        Accept: 'text/event-stream',
        ...(this.relaySecret ? { Authorization: `Bearer ${this.relaySecret}` } : {}),
      },
      signal: this.abortController.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Relay 스트림 연결 실패 (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let connectedNotified = false;

    while (!this.stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const rawData = line.slice(5).trim();
          if (currentEvent === 'connected' && !connectedNotified) {
            connectedNotified = true;
            onConnected?.();
          } else if (currentEvent === 'job') {
            try {
              const envelope = JSON.parse(rawData);
              void this.handleIncomingJob(envelope);
            } catch {
              // 손상된 이벤트 무시
            }
          }
        } else if (line === '') {
          currentEvent = '';
        }
      }
    }
  }

  async start() {
    this.stopped = false;
    await this.sendHeartbeat('ONLINE');
    this.heartbeatTimer = setInterval(() => void this.sendHeartbeat('ONLINE'), this.heartbeatMs);
    this.heartbeatTimer.unref?.();

    let backoffMs = 1000;
    const loop = async () => {
      while (!this.stopped) {
        try {
          await this.connectOnce(() => {
            backoffMs = 1000;
          });
        } catch (err) {
          if (this.stopped) break;
          console.warn('[Onrivi LocalAgent] Relay 연결 끊김, 재연결 대기:', err?.message || err);
        }
        if (this.stopped) break;
        await new Promise((r) => setTimeout(r, backoffMs));
        backoffMs = Math.min(30_000, backoffMs * 2);
      }
    };

    // 최초 연결 완료 대기(최대 5초) 후 백그라운드 루프 유지
    await new Promise((resolve) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      const t = setTimeout(done, 5000);
      t.unref?.();
      this.connectOnce(() => { clearTimeout(t); done(); })
        .catch(() => { clearTimeout(t); done(); })
        .finally(() => { if (!this.stopped) void loop(); });
    });
  }

  async stop() {
    this.stopped = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.abortController?.abort();
    await this.sendHeartbeat('OFFLINE');
  }
}

// CLI 진입점
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , cmd = 'status', ...rest] = process.argv;
  const getArg = (flag) => {
    const idx = rest.indexOf(flag);
    return idx >= 0 ? rest[idx + 1] : '';
  };

  const configPath = getDefaultAgentConfigPath();
  const cfg = await loadAgentConfig(configPath);

  if (cmd === 'approve') {
    const targetPath = getArg('--path');
    if (!targetPath) {
      console.error('사용법: node runLocalAgent.mjs approve --path "D:\\Onrivi_mcp" [--name "내 작업장"]');
      process.exit(1);
    }
    const core = new LocalAgentCore({ deviceId: cfg.deviceId, deviceName: cfg.deviceName, roots: cfg.approvedRoots });
    const added = core.registerApprovedRoot({ absPath: targetPath, name: getArg('--name') || path.basename(targetPath) });
    cfg.approvedRoots = Array.from(core.roots.values());
    await saveAgentConfig(cfg, configPath);
    console.info('✅ 로컬 폴더 승인 완료:', added);
  } else if (cmd === 'revoke-root') {
    const rootId = getArg('--root-id');
    cfg.approvedRoots = cfg.approvedRoots.filter((r) => r.rootId !== rootId);
    await saveAgentConfig(cfg, configPath);
    console.info('✅ 로컬 폴더 승인 해제 완료:', rootId);
  } else if (cmd === 'start') {
    const core = new LocalAgentCore({ deviceId: cfg.deviceId, deviceName: cfg.deviceName, roots: cfg.approvedRoots });
    const runtime = new LocalAgentRuntime({
      core,
      userId: getArg('--user-id') || cfg.userId,
      relayUrl: getArg('--relay-url') || cfg.relayUrl || process.env.LOCAL_AGENT_RELAY_URL || '',
      relaySecret: getArg('--relay-secret') || cfg.relaySecret || process.env.LOCAL_AGENT_RELAY_SECRET || '',
      gatewayUrl: getArg('--gateway-url') || cfg.gatewayUrl,
      mcpToken: getArg('--mcp-token') || cfg.mcpToken || process.env.ONRIVI_MCP_TOKEN || '',
    });
    if (!runtime.relayUrl || !runtime.userId) {
      console.error('relayUrl과 userId가 필요합니다. mcp-local-agent.json 또는 --relay-url / --user-id 옵션을 지정하세요.');
      process.exit(1);
    }
    const shutdown = async () => {
      await runtime.stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    await runtime.start();
    console.info(`[Onrivi LocalAgent] 온라인 연결 완료 (deviceId=${core.deviceId}, roots=${core.roots.size})`);
  } else {
    console.info(JSON.stringify({
      configPath,
      deviceId: cfg.deviceId,
      deviceName: cfg.deviceName,
      relayUrl: cfg.relayUrl,
      approvedRoots: cfg.approvedRoots.map(({ rootId, name, permissions }) => ({ rootId, name, permissions })),
    }, null, 2));
  }
}
