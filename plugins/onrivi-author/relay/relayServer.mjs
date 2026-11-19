// ====================================================================
// 📊 [OMD-MCP-RELAY-0001] plugins/onrivi-author/relay/relayServer.mjs
// 🎯 @KICK  : 온리비 MCP Gateway ↔ PC Local Agent 간 아웃바운드 SSE 중계 브로커 서버
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 외부 의존성 0개(Node 내장 http), 오프라인 시 즉시 503 차단(쓰기 예약 금지), 단기 타임아웃
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 4: 경량 아웃바운드 Relay 브로커 신설]
//             1) GET /agent/stream (아웃바운드 SSE 연결 유지 및 실시간 작업 푸시)
//             2) POST /agent/result (에이전트 실행 결과 회신)
//             3) POST /dispatch (Gateway dispatchLocalAgentJob 연동 엔드포인트)
// 🔗 @CALLS : node:http, node:url
// ====================================================================
import http from 'node:http';
import { pathToFileURL } from 'node:url';

function readJsonBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('요청 본문 크기가 제한을 초과했습니다.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('유효한 JSON 본문이 아닙니다.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

/**
 * ========================================================================================
 * [함수명] createRelayServer - 아웃바운드 SSE 기반 Local Agent 중계 HTTP 서버를 생성합니다.
 *
 * @param {object} [options]
 * @param {string} [options.relaySecret] - Gateway → Relay /dispatch 인증용 공유 시크릿
 * @param {string} [options.agentSecret] - Agent → Relay 스트림/결과 인증용 시크릿 (미지정 시 relaySecret 공용)
 * @param {number} [options.keepaliveMs=25000] - SSE keepalive 핑 주기
 * @returns {{ server: http.Server, getConnectedDevices: () => Array<object>, closeAll: () => void }}
 * ==========================================================================================
 */
export function createRelayServer({ relaySecret = '', agentSecret = '', keepaliveMs = 25_000 } = {}) {
  const effectiveAgentSecret = agentSecret || relaySecret;
  /** @type {Map<string, { res: http.ServerResponse, userId: string, deviceId: string, connectedAt: string, timer: NodeJS.Timeout }>} */
  const streams = new Map();
  /** @type {Map<string, { resolve: Function, reject: Function, timer: NodeJS.Timeout, streamKey: string }>} */
  const pendingJobs = new Map();

  const makeKey = (userId, deviceId) => `${userId}:${deviceId}`;

  const cleanupStream = (key, targetRes) => {
    const entry = streams.get(key);
    if (!entry || (targetRes && entry.res !== targetRes)) return;
    clearInterval(entry.timer);
    streams.delete(key);
    for (const [jobId, pending] of pendingJobs.entries()) {
      if (pending.streamKey === key) {
        clearTimeout(pending.timer);
        pendingJobs.delete(jobId);
        pending.reject(new Error('작업 처리 중 로컬 PC 에이전트 연결이 끊어졌습니다.'));
      }
    }
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true, connectedAgents: streams.size });
    }

    if (req.method === 'GET' && url.pathname === '/agent/stream') {
      if (effectiveAgentSecret && bearer !== effectiveAgentSecret) {
        return sendJson(res, 401, { error: '에이전트 중계 인증에 실패했습니다.' });
      }
      const userId = String(url.searchParams.get('userId') || '').trim();
      const deviceId = String(url.searchParams.get('deviceId') || '').trim();
      if (!userId || !deviceId) {
        return sendJson(res, 400, { error: 'userId와 deviceId가 필요합니다.' });
      }

      const key = makeKey(userId, deviceId);
      const prev = streams.get(key);
      if (prev) {
        try { prev.res.end(); } catch {}
        cleanupStream(key, prev.res);
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      res.write(`event: connected\ndata: ${JSON.stringify({ userId, deviceId, connectedAt: new Date().toISOString() })}\n\n`);

      const timer = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { cleanupStream(key, res); }
      }, keepaliveMs);
      timer.unref?.();

      streams.set(key, { res, userId, deviceId, connectedAt: new Date().toISOString(), timer });
      req.on('close', () => cleanupStream(key, res));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/agent/result') {
      if (effectiveAgentSecret && bearer !== effectiveAgentSecret) {
        return sendJson(res, 401, { error: '에이전트 중계 인증에 실패했습니다.' });
      }
      try {
        const body = await readJsonBody(req);
        const jobId = String(body?.jobId || '').trim();
        const pending = pendingJobs.get(jobId);
        if (!pending) {
          return sendJson(res, 404, { error: '대기 중인 작업이 없거나 이미 만료되었습니다.' });
        }
        clearTimeout(pending.timer);
        pendingJobs.delete(jobId);
        if (body.ok) pending.resolve(body.result);
        else pending.reject(new Error(body.error || '로컬 에이전트 작업 실행에 실패했습니다.'));
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'POST' && url.pathname === '/dispatch') {
      if (relaySecret && bearer !== relaySecret) {
        return sendJson(res, 401, { error: 'Gateway 중계 인증에 실패했습니다.' });
      }
      try {
        const body = await readJsonBody(req);
        const userId = String(body?.userId || '').trim();
        const deviceId = String(body?.deviceId || '').trim();
        const job = body?.job;
        if (!userId || !deviceId || !job?.jobId) {
          return sendJson(res, 400, { error: 'userId, deviceId, job.jobId가 필요합니다.' });
        }
        const key = makeKey(userId, deviceId);
        const stream = streams.get(key);
        if (!stream) {
          return sendJson(res, 503, { error: '선택된 로컬 PC 에이전트가 오프라인 상태입니다.' });
        }
        const remainingMs = job.expiresAt ? Math.max(1000, Number(job.expiresAt) - Date.now()) : 15_000;
        const result = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            pendingJobs.delete(job.jobId);
            reject(new Error('로컬 PC 에이전트 응답 시간이 초과되었습니다.'));
          }, remainingMs);
          timer.unref?.();
          pendingJobs.set(job.jobId, { resolve, reject, timer, streamKey: key });
          try {
            stream.res.write(`event: job\ndata: ${JSON.stringify({ jobId: job.jobId, job })}\n\n`);
          } catch {
            clearTimeout(timer);
            pendingJobs.delete(job.jobId);
            cleanupStream(key, stream.res);
            reject(new Error('로컬 PC 에이전트 연결로 작업을 전송하지 못했습니다.'));
          }
        });
        return sendJson(res, 200, { ok: true, result });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    return sendJson(res, 404, { error: 'Not Found' });
  });

  return {
    server,
    getConnectedDevices: () => Array.from(streams.values()).map(({ userId, deviceId, connectedAt }) => ({ userId, deviceId, connectedAt })),
    closeAll: () => {
      for (const [key, entry] of streams.entries()) {
        try { entry.res.end(); } catch {}
        cleanupStream(key, entry.res);
      }
    },
  };
}

// CLI 직접 실행 진입점
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || process.env.ONRIVI_RELAY_PORT || 8799);
  const relaySecret = process.env.LOCAL_AGENT_RELAY_SECRET || '';
  const { server } = createRelayServer({ relaySecret });
  server.listen(port, '0.0.0.0', () => {
    console.info(`[Onrivi MCP Relay] listening on http://0.0.0.0:${port}`);
  });
}
