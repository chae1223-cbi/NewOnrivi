// ====================================================================
// 📊 [OMD-MCP-REMOTE-CLIENT-0001] plugins/onrivi-author/server/remote-client.mjs
// 🎯 @KICK  : PC 로컬 MCP에서 원격 웹 MCP(/api/mcp)를 호출하는 경량 JSON-RPC 2.0 클라이언트 및 로컬 인증 파일(mcp-auth.json) 실시간 자동 로드
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), Bearer 토큰 로그 마스킹, mtime 기반 자동 재로딩, 심볼릭 링크 차단
// 🚨 @PATCH : 2026-11-19 — [토큰 자동 갱신 지원] mcp_config.json 하드코딩 대신 %APPDATA%\Onrivi Author\mcp-auth.json을 mtime 기반으로 실시간 자동 로드하도록 개선
// 🚨 @PATCH : 2026-11-19 — [PC 하이브리드 MCP 신설] 중계 서버 없이 PC MCP에서 Google Drive 및 원격 계정 인증을 직접 프록시하는 클라이언트 추가
// 🔗 @CALLS : globalThis.fetch, node:fs, node:os, node:path
// ====================================================================
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_TIMEOUT_MS = 15_000;
let rpcSequence = 1;
let cachedAuthFile = { filePath: '', mtimeMs: -1, url: '', token: '' };

/**
 * ========================================================================================
 * [함수명] getDefaultAuthFilePath - PC MCP 원격 인증 파일(mcp-auth.json)의 기본 경로를 반환합니다.
 *
 * @returns {string} mcp-auth.json 절대경로
 * ==========================================================================================
 */
export function getDefaultAuthFilePath() {
  if (process.env.ONRIVI_MCP_AUTH_FILE) return path.resolve(process.env.ONRIVI_MCP_AUTH_FILE);
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(base, 'Onrivi Author', 'mcp-auth.json');
}

/**
 * ========================================================================================
 * [함수명] readAuthFileSync - mcp-auth.json을 mtime 변경 감지 기반으로 동기 조회합니다.
 * (파일이 갱신되면 MCP 서버 재시작 없이 즉시 새 토큰을 반영합니다.)
 *
 * @returns {{ url: string, token: string, source: string }} 파일에서 읽은 원격 인증 정보
 * ==========================================================================================
 */
function readAuthFileSync() {
  const filePath = getDefaultAuthFilePath();
  try {
    const stat = fsSync.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8192) {
      return { url: '', token: '', source: '' };
    }
    if (cachedAuthFile.filePath === filePath && cachedAuthFile.mtimeMs === stat.mtimeMs) {
      return { url: cachedAuthFile.url, token: cachedAuthFile.token, source: 'AUTH_FILE' };
    }
    const raw = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
    const url = String(raw.remoteUrl || raw.url || '').trim().replace(/\/$/, '');
    const token = String(raw.token || raw.mcpToken || '').trim();
    cachedAuthFile = { filePath, mtimeMs: stat.mtimeMs, url, token };
    return { url, token, source: 'AUTH_FILE' };
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      console.error(JSON.stringify({
        event: 'MCP_AUTH_FILE_READ_ERROR',
        file: 'plugins/onrivi-author/server/remote-client.mjs',
        func: 'readAuthFileSync',
        doing: 'PC MCP 자동 인증 파일(mcp-auth.json) 읽기 중',
        target: 'mcp-auth.json',
        error: err?.message || String(err),
      }));
    }
    return { url: '', token: '', source: '' };
  }
}

/**
 * ========================================================================================
 * [함수명] saveRemoteMcpAuth - 원격 웹 MCP URL과 토큰을 mcp-auth.json에 원자적으로 저장합니다.
 *
 * @param {{ url: string, token: string }} params - 저장할 원격 URL 및 Bearer 토큰
 * @returns {Promise<{ authFilePath: string, updatedAt: string }>} 저장 결과 메타데이터
 * ==========================================================================================
 */
export async function saveRemoteMcpAuth({ url, token }) {
  const cleanUrl = String(url || '').trim().replace(/\/$/, '');
  const cleanToken = String(token || '').trim();
  if (!cleanUrl || !cleanToken) {
    throw new Error('원격 MCP URL과 토큰이 모두 필요합니다.');
  }
  const filePath = getDefaultAuthFilePath();
  const updatedAt = new Date().toISOString();
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    tmpPath,
    JSON.stringify({ version: 1, remoteUrl: cleanUrl, token: cleanToken, updatedAt }, null, 2),
    'utf8',
  );
  await fs.rename(tmpPath, filePath);
  cachedAuthFile = { filePath: '', mtimeMs: -1, url: '', token: '' };
  return { authFilePath: filePath, updatedAt };
}

/**
 * ========================================================================================
 * [함수명] getRemoteMcpConfig - mcp-auth.json(우선) 및 환경변수에서 원격 웹 MCP URL 및 Bearer 토큰을 조회합니다.
 *
 * @returns {{ configured: boolean, url: string, token: string, source: string }} 원격 MCP 설정 정보
 * ==========================================================================================
 */
export function getRemoteMcpConfig() {
  const fromFile = readAuthFileSync();
  const envUrl = String(process.env.ONRIVI_REMOTE_MCP_URL || '').trim().replace(/\/$/, '');
  const envToken = String(process.env.ONRIVI_MCP_TOKEN || '').trim();
  const url = fromFile.url || envUrl;
  const token = fromFile.token || envToken;
  const source = fromFile.token ? 'AUTH_FILE' : envToken ? 'ENV' : 'NONE';
  return {
    configured: Boolean(url && token),
    url,
    token,
    source,
  };
}

/**
 * ========================================================================================
 * [함수명] parseJsonRpcPayload - JSON 또는 SSE(text/event-stream) 응답 본문에서 JSON-RPC 객체를 추출합니다.
 *
 * @param {string} rawText - HTTP 응답 본문 문자열
 * @param {string} contentType - HTTP Content-Type 헤더
 * @returns {object} 파싱된 JSON-RPC 응답 객체
 * @throws {Error} 유효한 JSON-RPC 응답을 찾지 못한 경우
 * ==========================================================================================
 */
function parseJsonRpcPayload(rawText, contentType) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) {
    throw new Error('원격 MCP 서버에서 빈 응답을 반환했습니다.');
  }
  if (contentType.includes('text/event-stream') || trimmed.startsWith('event:') || trimmed.startsWith('data:')) {
    const lines = trimmed.split(/\r?\n/);
    let lastJson = null;
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        lastJson = JSON.parse(data);
      } catch {
        // 비-JSON SSE 이벤트는 무시
      }
    }
    if (lastJson) return lastJson;
  }
  return JSON.parse(trimmed);
}

/**
 * ========================================================================================
 * [함수명] callRemoteMcpTool - 원격 웹 MCP 서버의 특정 도구(tools/call)를 실행하고 구조화 결과를 반환합니다.
 *
 * @param {string} toolName - 호출할 원격 MCP 도구명 (예: 'get_mcp_connection_status')
 * @param {object} [args={}] - 도구에 전달할 인자 객체
 * @returns {Promise<object>} 원격 도구 실행 결과 객체
 * @throws {Error} 원격 설정 미비, 네트워크 오류, HTTP 오류 또는 원격 도구 오류 발생 시
 *
 * @example
 * const status = await callRemoteMcpTool('get_mcp_connection_status', {});
 * ==========================================================================================
 */
export async function callRemoteMcpTool(toolName, args = {}) {
  const { configured, url, token } = getRemoteMcpConfig();
  if (!configured) {
    throw new Error('원격 웹 MCP 연결 정보(mcp-auth.json 또는 ONRIVI_MCP_TOKEN)가 설정되어 있지 않습니다.');
  }

  const id = rpcSequence++;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args ?? {},
        },
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'MCP_REMOTE_FETCH_ERROR',
      file: 'plugins/onrivi-author/server/remote-client.mjs',
      func: 'callRemoteMcpTool',
      doing: '원격 웹 MCP 도구 호출 요청 전송 중',
      target: toolName,
      error: err?.message || String(err),
    }));
    throw new Error(`원격 웹 MCP 서버에 연결하지 못했습니다. (${toolName})`);
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text();
  if (!response.ok) {
    console.error(JSON.stringify({
      event: 'MCP_REMOTE_HTTP_ERROR',
      file: 'plugins/onrivi-author/server/remote-client.mjs',
      func: 'callRemoteMcpTool',
      doing: '원격 웹 MCP HTTP 응답 수신 중',
      target: toolName,
      status: response.status,
    }));
    throw new Error(`원격 웹 MCP 요청이 거부되었습니다. (HTTP ${response.status})`);
  }

  let payload;
  try {
    payload = parseJsonRpcPayload(rawText, contentType);
  } catch (err) {
    console.error(JSON.stringify({
      event: 'MCP_REMOTE_PARSE_ERROR',
      file: 'plugins/onrivi-author/server/remote-client.mjs',
      func: 'callRemoteMcpTool',
      doing: '원격 웹 MCP JSON-RPC 응답 파싱 중',
      target: toolName,
      error: err?.message || String(err),
    }));
    throw new Error('원격 웹 MCP 응답 형식을 해석하지 못했습니다.');
  }

  if (payload?.error) {
    const msg = payload.error.message || '원격 웹 MCP 실행 오류가 발생했습니다.';
    console.error(JSON.stringify({
      event: 'MCP_REMOTE_RPC_ERROR',
      file: 'plugins/onrivi-author/server/remote-client.mjs',
      func: 'callRemoteMcpTool',
      doing: '원격 웹 MCP JSON-RPC 결과 검증 중',
      target: toolName,
      code: payload.error.code,
      error: msg,
    }));
    throw new Error(msg);
  }

  const result = payload?.result;
  if (!result) {
    throw new Error('원격 웹 MCP 응답에 result 필드가 없습니다.');
  }
  if (result.isError) {
    const text = Array.isArray(result.content)
      ? result.content.map((item) => item?.text || '').filter(Boolean).join('\n')
      : '';
    throw new Error(text || '원격 웹 MCP 도구 실행 중 오류가 발생했습니다.');
  }

  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const firstText = Array.isArray(result.content) ? result.content.find((item) => typeof item?.text === 'string')?.text : '';
  if (firstText) {
    try {
      return JSON.parse(firstText);
    } catch {
      return { text: firstText };
    }
  }
  return result;
}
