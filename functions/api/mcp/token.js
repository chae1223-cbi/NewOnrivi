// ====================================================================
// 📊 [OMD-MCP-TOKEN-0001] functions/api/mcp/token.js
// 🎯 @KICK  : 웹 사용자용 개인 MCP API 토큰 발급·조회·폐기 엔드포인트 (/api/mcp/token)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Supabase JWT 인증, 유료 구독 검증, SHA-256 해시 저장 및 Drive Refresh Token AES-GCM 연계
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 2: 다중 연결(connections) 목록 조회·개별 연결 생성/폐기 지원]
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 1: MCP 전용 연결 폴더 설정 분리 연계]: GET/POST에서 connectionId·configVersion 기반 전용 설정 조회 및 재발급 시 기존 전용 폴더 보존
// 🚨 @PATCH : 2026-11-16 — [웹 원격 MCP 구축] 개인용 MCP 전용 토큰 발급/조회/폐기 API 신설
// 🔗 @CALLS : functions/api/license/_sessionAuth.js, functions/api/gdrive/_oauth.js, functions/api/mcp/_shared.js
// ====================================================================
import { serverError } from '../_server-error.js';
import { sessionUser } from '../license/_sessionAuth.js';
import { consumeMcpDriveTicket, readDriveOAuthSession } from '../gdrive/_oauth.js';
import {
  generateMcpToken,
  getMcpConnectionConfig,
  getMcpTokenByUser,
  getUserMcpDevices,
  listUserMcpConnections,
  revokeMcpToken,
  saveMcpTokenRecord,
  sha256Hex,
  verifyActivePaidPlan,
} from './_shared.js';

const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (body, status = 200) => {
  if (status >= 400 && status < 500) {
    console.warn(`[ClientWarn] HTTP ${status} · MCP_TOKEN_WARN · ${body?.message || body?.code || '클라이언트 요청 오류'} [경로: /api/mcp/token]`);
  }
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
};

export const onRequestOptions = () => new Response(null, { headers: corsHeaders });

/**
 * ========================================================================================
 * [함수명] onRequestGet - 현재 로그인 사용자의 원격 MCP 토큰 발급 상태를 조회합니다.
 * ========================================================================================
 */
export async function onRequestGet({ request, env }) {
  try {
    const user = await sessionUser(request, env);
    if (!user?.id) return json({ success: false, code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }, 401);

    const record = await getMcpTokenByUser(env, user.id);
    const config = record ? await getMcpConnectionConfig(env, record) : null;
    const rawConnections = await listUserMcpConnections(env, user.id);
    const connections = await Promise.all(
      rawConnections.map(async (conn) => {
        const cfg = await getMcpConnectionConfig(env, { connectionId: conn.connectionId, userId: user.id, tokenHash: conn.tokenHash });
        return {
          connectionId: conn.connectionId,
          clientName: conn.clientName || 'DEFAULT',
          maskedToken: conn.maskedToken || '',
          configVersion: cfg.configVersion,
          workspace: cfg.workspace,
          resource: cfg.resource,
          createdAt: conn.createdAt || '',
          lastUsedAt: conn.lastUsedAt || '',
        };
      })
    );
    const devices = await getUserMcpDevices(env, user.id);
    return json({
      success: true,
      hasToken: Boolean(record?.tokenHash) || connections.length > 0,
      connectionId: config?.connectionId || connections[0]?.connectionId || '',
      configVersion: config?.configVersion || connections[0]?.configVersion || 0,
      maskedToken: record?.maskedToken || connections[0]?.maskedToken || '',
      workspaceFolderId: config?.workspace?.folderId || '',
      resourceFolderId: config?.resource?.folderId || '',
      hasDriveConnected: Boolean(record?.driveRefreshToken),
      updatedAt: config?.updatedAt || record?.updatedAt || '',
      connections,
      devices,
    });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/mcp/token.js',
      stage: 'get_mcp_token',
      doing: '원격 MCP 토큰 상태 조회 중',
      target: 'MCP_TOKEN',
      message: 'MCP 토큰 상태를 조회하지 못했습니다.',
    });
  }
}

/**
 * ========================================================================================
 * [함수명] onRequestPost - 유료 구독 검증 후 개인용 원격 MCP 토큰을 발급(또는 재발급)합니다.
 * ========================================================================================
 */
export async function onRequestPost({ request, env }) {
  try {
    const user = await sessionUser(request, env);
    if (!user?.id) return json({ success: false, code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }, 401);

    const paidSub = await verifyActivePaidPlan(env, user.id);
    if (!paidSub) {
      return json({
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: '웹 원격 MCP는 활성 유료 요금제(REGULAR, ELITEPRO 등) 구독자만 발급할 수 있습니다.',
      }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const ticketSession = body?.driveTicket ? await consumeMcpDriveTicket(env, body.driveTicket) : null;
    const driveSession = ticketSession || (await readDriveOAuthSession(request, env, body?.driveSessionToken));
    const existing = await getMcpTokenByUser(env, user.id);

    const hasExplicitWorkspace = Object.prototype.hasOwnProperty.call(body || {}, 'workspaceFolderId');
    const hasExplicitResource = Object.prototype.hasOwnProperty.call(body || {}, 'resourceFolderId');
    const workspaceFolderId = hasExplicitWorkspace ? String(body.workspaceFolderId || '').trim() : undefined;
    const resourceFolderId = hasExplicitResource ? String(body.resourceFolderId || '').trim() : undefined;
    const driveRefreshToken = String(driveSession?.refreshToken || existing?.driveRefreshToken || '').trim();

    if (!driveRefreshToken) {
      return json({
        success: false,
        code: 'DRIVE_AUTH_REQUIRED',
        message: '먼저 구글 드라이브를 연결한 뒤 원격 MCP 토큰을 발급해 주세요.',
      }, 400);
    }

    const rawToken = generateMcpToken();
    const tokenHash = await sha256Hex(rawToken);
    const maskedToken = `${rawToken.slice(0, 15)}...${rawToken.slice(-4)}`;

    const savedRecord = await saveMcpTokenRecord(env, {
      userId: user.id,
      tokenHash,
      maskedToken,
      workspaceFolderId,
      resourceFolderId,
      driveRefreshToken,
      clientName: body?.clientName ? String(body.clientName).trim() : 'DEFAULT',
      createNewConnection: Boolean(body?.createNewConnection),
    });
    const config = await getMcpConnectionConfig(env, savedRecord);

    return json({
      success: true,
      token: rawToken,
      maskedToken,
      connectionId: config.connectionId,
      clientName: savedRecord.clientName,
      configVersion: config.configVersion,
      workspaceFolderId: config.workspace.folderId,
      resourceFolderId: config.resource.folderId,
      hasDriveConnected: true,
      planName: paidSub.plan_name,
    });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/mcp/token.js',
      stage: 'issue_mcp_token',
      doing: '원격 MCP 토큰 발급 및 Google Drive 세션 연계 중',
      target: 'MCP_TOKEN',
      message: 'MCP 토큰을 발급하지 못했습니다.',
    });
  }
}

/**
 * ========================================================================================
 * [함수명] onRequestDelete - 발급된 원격 MCP 토큰을 즉시 폐기합니다.
 * ========================================================================================
 */
export async function onRequestDelete({ request, env }) {
  try {
    const user = await sessionUser(request, env);
    if (!user?.id) return json({ success: false, code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }, 401);

    const url = new URL(request.url);
    const targetConnectionId = String(url.searchParams.get('connectionId') || '').trim();
    await revokeMcpToken(env, user.id, targetConnectionId);
    return json({
      success: true,
      revokedConnectionId: targetConnectionId || 'ALL',
      message: targetConnectionId ? '지정한 원격 MCP 연결이 폐기되었습니다.' : '원격 MCP 토큰이 폐기되었습니다.',
    });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/mcp/token.js',
      stage: 'revoke_mcp_token',
      doing: '원격 MCP 토큰 폐기 중',
      target: 'MCP_TOKEN',
      message: 'MCP 토큰을 폐기하지 못했습니다.',
    });
  }
}
