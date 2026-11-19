// ====================================================================
// 📊 [OMD-MCP-AUTH-0001] plugins/onrivi-author/server/authorization.mjs
// 🎯 @KICK  : 온리비 어서 PC 하이브리드 MCP 구독/세션 권한 검증 (원격 Bearer 토큰 + 데스크톱 라이선스 통합 지원)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), 활성 유료 요금제(웹/데스크톱) 검증, 민감정보 로그 마스킹
// 🚨 @PATCH : 2026-11-19 — [PC 하이브리드 MCP 전환] 원격 MCP Bearer 토큰 기반 계정·구독·Google Drive 상태 실시간 검증 추가(데스크톱 앱 미실행 상태 지원)
// 🚨 @PATCH : 2026-11-16 — [웹 유료 요금제 MCP 권한 확장] ELITE/DESKTOP 외 REGULAR, BASIC, PRO, PREMIUM 유료 플랜도 MCP 허용
// 🔗 @CALLS : ./context.mjs, ./remote-client.mjs, node:fs/promises, node:path
// ====================================================================
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getCurrentFolders, getDesktopAppContext } from './context.mjs';
import { callRemoteMcpTool, getRemoteMcpConfig } from './remote-client.mjs';

const CHECK_URL = 'https://onrivi.com/api/license/check-session';
const AUTH_CACHE_TTL_MS = 60 * 1000;
let cachedAuth = { key: '', verifiedAt: 0, meta: null };

const isAllowedPaidPlan = (planName) => {
  const plan = String(planName || '').toUpperCase();
  return (
    plan.includes('ELITE') ||
    plan.includes('DESKTOP') ||
    plan.includes('REGULAR') ||
    plan.includes('BASIC') ||
    plan.includes('PRO') ||
    plan.includes('PREMIUM')
  );
};

/**
 * ========================================================================================
 * [함수명] verifyRemoteTokenAccess - 원격 웹 MCP 토큰으로 계정·구독·Google Drive 연결 상태를 검증합니다.
 *
 * @param {{ forceRefresh?: boolean }} [options={}] - 캐시 무시 여부
 * @returns {Promise<object>} 검증된 원격 계정 및 연결 메타데이터
 * @throws {Error} 계정 비활성, 유료 구독 만료 또는 원격 인증 실패 시
 * ==========================================================================================
 */
export async function verifyRemoteTokenAccess({ forceRefresh = false } = {}) {
  const remote = getRemoteMcpConfig();
  if (!remote.configured) {
    throw new Error('원격 MCP 토큰이 설정되어 있지 않습니다.');
  }
  const cacheKey = `REMOTE:${remote.url}:${remote.token.slice(0, 12)}`;
  if (!forceRefresh && cachedAuth.key === cacheKey && cachedAuth.meta && (Date.now() - cachedAuth.verifiedAt) < AUTH_CACHE_TTL_MS) {
    return cachedAuth.meta;
  }

  let status;
  try {
    status = await callRemoteMcpTool('get_mcp_connection_status', {});
  } catch (err) {
    cachedAuth = { key: '', verifiedAt: 0, meta: null };
    console.error(JSON.stringify({
      event: 'MCP_REMOTE_AUTH_ERROR',
      file: 'plugins/onrivi-author/server/authorization.mjs',
      func: 'verifyRemoteTokenAccess',
      doing: '원격 웹 MCP 토큰 기반 계정·구독 상태 검증 중',
      target: 'get_mcp_connection_status',
      error: err?.message || String(err),
    }));
    throw err;
  }

  const accountStatus = String(status.accountStatus || '').toUpperCase();
  const planName = String(status.planName || '').toUpperCase();
  const planStatus = String(status.planStatus || '').toUpperCase();
  const driveStatus = String(status.driveStatus || 'DISCONNECTED').toUpperCase();

  if (accountStatus !== 'ACTIVE' || planStatus !== 'ACTIVE' || !isAllowedPaidPlan(planName)) {
    cachedAuth = { key: '', verifiedAt: 0, meta: null };
    throw new Error('현재 계정에 온리비 어서 MCP 사용 권한이 없습니다. 활성 유료 구독 상태를 확인해 주세요.');
  }

  const meta = {
    authMode: 'BEARER_TOKEN',
    connectionId: String(status.connectionId || ''),
    clientName: String(status.clientName || 'PC Hybrid MCP'),
    accountStatus,
    planName,
    planStatus,
    driveStatus,
    remoteConfigVersion: Number.isInteger(status.configVersion) ? status.configVersion : 1,
    remoteWorkspace: status.workspace || null,
    remoteResource: status.resource || null,
  };
  cachedAuth = { key: cacheKey, verifiedAt: Date.now(), meta };
  return meta;
}

/**
 * ========================================================================================
 * [함수명] verifyDesktopLicenseAccess - 실행 중인 온리비 어서 데스크톱 앱의 라이선스 세션을 검증합니다.
 *
 * @param {{ forceRefresh?: boolean }} [options={}] - 캐시 무시 여부
 * @returns {Promise<object>} 검증된 데스크톱 라이선스 메타데이터
 * @throws {Error} 데스크톱 앱 미실행, 라이선스 무효 또는 세션 만료 시
 * ==========================================================================================
 */
async function verifyDesktopLicenseAccess({ forceRefresh = false } = {}) {
  const desktop = await getDesktopAppContext();
  if (!desktop) {
    throw new Error('실행 중인 온리비 어서 데스크톱 앱 또는 원격 MCP 토큰(ONRIVI_MCP_TOKEN)을 찾지 못했습니다.');
  }
  if (!desktop.deviceId || !/^[a-f0-9-]{36}$/i.test(desktop.deviceId)) {
    throw new Error('기기 ID를 확인할 수 없어 MCP 권한을 검증하지 못했습니다.');
  }
  const licenseFile = path.join(path.dirname(desktop.contextFile), 'license.json');
  const stat = await fs.lstat(licenseFile);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) {
    throw new Error('로컬 라이선스 정보를 확인할 수 없습니다.');
  }
  const license = JSON.parse(await fs.readFile(licenseFile, 'utf8'));
  if (typeof license.paymentNo !== 'string' || !license.paymentNo || license.paymentNo === 'GUEST_PAYMENT_NO') {
    cachedAuth = { key: '', verifiedAt: 0, meta: null };
    throw new Error('MCP 사용 권한이 확인되지 않았습니다. 유료 라이선스를 앱에서 다시 인증해 주세요.');
  }

  const cacheKey = `DESKTOP:${license.paymentNo}:${stat.mtimeMs}:${desktop.deviceId}:${desktop.pid}`;
  if (!forceRefresh && cachedAuth.key === cacheKey && cachedAuth.meta && (Date.now() - cachedAuth.verifiedAt) < AUTH_CACHE_TTL_MS) {
    return cachedAuth.meta;
  }

  let response;
  try {
    response = await fetch(CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_payment_no: license.paymentNo, p_device_uuid: desktop.deviceId }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'MCP_LICENSE_FETCH_ERROR',
      file: 'plugins/onrivi-author/server/authorization.mjs',
      func: 'verifyDesktopLicenseAccess',
      doing: '데스크톱 라이선스 세션 서버 권한 확인 요청 중',
      target: 'check-session',
      error: err?.message || String(err),
    }));
    throw new Error('라이선스 서버에 연결할 수 없어 MCP 사용을 중단했습니다.');
  }
  if (!response.ok) {
    throw new Error('라이선스 서버의 권한 확인 요청이 거부되었습니다.');
  }
  const result = await response.json();
  const planName = String(result.plan_name || '').toUpperCase();
  const planStatus = String(result.plan_status || '').toUpperCase();
  if (
    result.success !== true ||
    result.has_session !== true ||
    result.is_restricted === true ||
    planStatus !== 'ACTIVE' ||
    !isAllowedPaidPlan(planName)
  ) {
    cachedAuth = { key: '', verifiedAt: 0, meta: null };
    throw new Error('현재 라이선스에 온리비 어서 MCP 사용 권한이 없습니다. 활성 유료 구독과 기기 세션을 확인해 주세요.');
  }

  const meta = {
    authMode: 'DESKTOP_LICENSE',
    connectionId: desktop.deviceId,
    clientName: 'Onrivi Author Desktop',
    accountStatus: 'ACTIVE',
    planName,
    planStatus,
    driveStatus: 'DISCONNECTED',
    remoteConfigVersion: 1,
    remoteWorkspace: null,
    remoteResource: null,
  };
  cachedAuth = { key: cacheKey, verifiedAt: Date.now(), meta };
  return meta;
}

/**
 * ========================================================================================
 * [함수명] requireMcpAccess - 원격 토큰 또는 데스크톱 라이선스로 MCP 사용 권한을 검증하고 현재 폴더 컨텍스트와 결합해 반환합니다.
 *
 * @param {{ forceRefresh?: boolean }} [options={}] - 캐시 강제 갱신 여부
 * @returns {Promise<object>} 폴더 컨텍스트 + 인증 상태 통합 객체
 * ==========================================================================================
 */
export async function requireMcpAccess({ forceRefresh = false } = {}) {
  const remote = getRemoteMcpConfig();
  const auth = remote.configured
    ? await verifyRemoteTokenAccess({ forceRefresh })
    : await verifyDesktopLicenseAccess({ forceRefresh });
  const folders = await getCurrentFolders();
  return {
    ...folders,
    auth,
  };
}
