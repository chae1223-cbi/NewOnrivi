// ====================================================================
// 📊 [OMD-MCP-DEVICES-0001] functions/api/mcp/devices.js
// 🎯 @KICK  : 온리비 어서 독립 Local Agent 장치 등록·하트비트·상태 조회 API (/api/mcp/devices)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Bearer MCP 토큰 SHA-256 검증, 활성 유료 구독 검증, 절대경로 미저장
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 4: Local Agent 장치 등록·하트비트 API 신설]
// 🔗 @CALLS : functions/api/mcp/_shared.js, functions/api/_server-error.js
// ====================================================================
import { serverError } from '../_server-error.js';
import {
  getMcpTokenByHash,
  getUserMcpDevices,
  sha256Hex,
  upsertUserMcpDevice,
  verifyActivePaidPlan,
} from './_shared.js';

const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (body, status = 200) => {
  if (status >= 400 && status < 500) {
    console.warn(`[ClientWarn] HTTP ${status} · MCP_DEVICES_WARN · ${body?.message || body?.code || '클라이언트 요청 오류'} [경로: /api/mcp/devices]`);
  }
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
};

export const onRequestOptions = () => new Response(null, { headers: corsHeaders });

async function authenticateMcpBearer(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const rawToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!rawToken.startsWith('onrivi_mcp_')) {
    return { error: json({ success: false, code: 'UNAUTHORIZED', message: '유효한 온리비 MCP 토큰이 필요합니다.' }, 401) };
  }
  const record = await getMcpTokenByHash(env, await sha256Hex(rawToken));
  if (!record?.userId) {
    return { error: json({ success: false, code: 'UNAUTHORIZED', message: '폐기되었거나 유효하지 않은 MCP 토큰입니다.' }, 401) };
  }
  const paidSub = await verifyActivePaidPlan(env, record.userId);
  if (!paidSub) {
    return { error: json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: '활성 유료 요금제 구독이 확인되지 않았습니다.' }, 403) };
  }
  return { record, paidSub };
}

/**
 * ========================================================================================
 * [함수명] onRequestGet - 현재 MCP 토큰 사용자 계정에 등록된 로컬 장치 목록을 조회합니다.
 * ==========================================================================================
 */
export async function onRequestGet({ request, env }) {
  try {
    const authResult = await authenticateMcpBearer(request, env);
    if (authResult.error) return authResult.error;
    const devices = await getUserMcpDevices(env, authResult.record.userId);
    return json({ success: true, devices });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/mcp/devices.js',
      stage: 'list_mcp_devices',
      doing: 'MCP 로컬 장치 목록 조회 중',
      target: 'MCP_DEVICES',
      message: '로컬 장치 목록을 조회하지 못했습니다.',
    });
  }
}

/**
 * ========================================================================================
 * [함수명] onRequestPost - 독립 Local Agent의 온라인/오프라인 하트비트와 승인된 폴더(rootId) 목록을 갱신합니다.
 * 절대경로는 전달받지 않으며, 공개 표시 이름과 불투명 rootId만 저장합니다.
 * ==========================================================================================
 */
export async function onRequestPost({ request, env }) {
  try {
    const authResult = await authenticateMcpBearer(request, env);
    if (authResult.error) return authResult.error;
    const body = await request.json().catch(() => null);
    if (!body?.deviceId) {
      return json({ success: false, code: 'INVALID_REQUEST', message: 'deviceId가 필요합니다.' }, 400);
    }
    const saved = await upsertUserMcpDevice(env, authResult.record.userId, {
      deviceId: body.deviceId,
      deviceName: body.deviceName || 'My PC',
      status: body.status || 'ONLINE',
      approvedRoots: Array.isArray(body.approvedRoots) ? body.approvedRoots : [],
      lastHeartbeatAt: new Date().toISOString(),
    });
    return json({ success: true, device: saved });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/mcp/devices.js',
      stage: 'upsert_mcp_device',
      doing: 'MCP 로컬 장치 하트비트 및 승인 폴더 갱신 중',
      target: 'MCP_DEVICES',
      message: '로컬 장치 상태를 갱신하지 못했습니다.',
    });
  }
}
