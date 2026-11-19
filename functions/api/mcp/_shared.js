// ====================================================================
// 📊 [OMD-MCP-REMOTE-0001] functions/api/mcp/_shared.js
// 🎯 @KICK  : 웹 원격 MCP(Streamable HTTP) 전용 토큰 암호화 저장·구독 권한 검증·Google Drive API 유틸리티
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), AES-GCM 토큰 암호화 및 SHA-256 해시 조회
// 🚨 @PATCH : 2026-11-19 — [Google Drive 토큰 자동 동기화] 사용자별 최신 Drive 자격증명(_mcp-tokens/drive-by-user) 저장·조회 추가 및 getValidDriveAccessToken 자동 연계(MCP 토큰 재발급 불필요)
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 4: 로컬 장치 등록·상태 조회 및 아웃바운드 Local Agent 작업 라우터(dispatchLocalAgentJob) 신설]
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 3: Drive 페이지네이션(listDriveChildrenPage) 및 재귀 탐색(listDriveTreeRecursive) 헬퍼 신설]
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 2: 다중 연결 목록 관리(listUserMcpConnections/revokeMcpConnection) 및 쓰기 직전 실시간 인가 재검증 지원]
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 1: MCP 전용 연결·폴더 설정 저장소(_mcp-configs/by-connection) 및 Drive 폴더 후보 조회 신설]:
//             1) 토큰 레코드에 connectionId 도입 및 연결별 독립 작업장/리소스 폴더 설정(configVersion 기반 낙관적 잠금) 분리 저장
//             2) getMcpConnectionConfig, updateMcpFolderSlot, listDriveFolders 헬퍼 추가
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 0: Drive 폴더 자손 경계 검증(assertDriveDescendant) 신설]: 작업장 외부 파일/폴더 ID, 휴지통, 바로가기 경유 접근 차단 및 공유 드라이브 파라미터 보강
// 🚨 @PATCH : 2026-11-16 — [웹 원격 MCP 구축] 개인용 MCP 토큰 저장소, 유료 구독 검증, Google Drive 파일/JSON 입출력 헬퍼 신설
// 🔗 @CALLS : functions/api/_db.js (withDbTransaction), functions/api/_db-codes.js (DB_CODES), Cloudflare R2, Google Drive API v3
// ====================================================================
import { withDbTransaction } from '../_db.js';
import { DB_CODES } from '../_db-codes.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const ALLOWED_MCP_PLANS = new Set([
  DB_CODES.PLAN_NAME.BASIC,
  DB_CODES.PLAN_NAME.PRO,
  DB_CODES.PLAN_NAME.PREMIUM,
  DB_CODES.PLAN_NAME.REGULAR,
  DB_CODES.PLAN_NAME.ELITEPRO,
  'DESKTOP',
]);

const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/**
 * ========================================================================================
 * [함수명] sha256Hex - 문자열을 SHA-256 16진수 해시 문자열로 변환합니다.
 * ========================================================================================
 */
export async function sha256Hex(text) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(String(text || '')));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * ========================================================================================
 * [함수명] generateMcpToken - 32바이트 보안 난수 기반 개인용 MCP 토큰을 생성합니다.
 * ========================================================================================
 */
export function generateMcpToken() {
  return `onrivi_mcp_${toBase64Url(crypto.getRandomValues(new Uint8Array(32)))}`;
}

async function getSecretKey(env) {
  const secret = env.MCP_TOKEN_SECRET || env.GOOGLE_CLIENT_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('MCP_SECRET_NOT_CONFIGURED');
  const keyBytes = await crypto.subtle.digest('SHA-256', encoder.encode(`onrivi-remote-mcp-v1:${secret}`));
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function sealJson(env, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getSecretKey(env);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(data)));
  return `${toBase64Url(iv)}.${toBase64Url(cipher)}`;
}

async function openJson(env, raw) {
  const [iv, body] = String(raw || '').split('.');
  if (!iv || !body) throw new Error('INVALID_SEALED_RECORD');
  const key = await getSecretKey(env);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(iv) }, key, fromBase64Url(body));
  return JSON.parse(decoder.decode(plain));
}

/**
 * ========================================================================================
 * [함수명] verifyActivePaidPlan - 사용자의 활성 유료 구독(웹/데스크톱 포함) 보유 여부를 PostgreSQL에서 검증합니다.
 * ========================================================================================
 */
export async function verifyActivePaidPlan(env, userId) {
  return withDbTransaction(env, async (db) => {
    const { rows } = await db.query(
      `SELECT plan_name, plan_status, is_active, current_period_end
       FROM public.subscriptions
       WHERE user_id = $1
         AND is_active = true
         AND UPPER(plan_status) = $2
         AND (current_period_end IS NULL OR current_period_end > NOW())
       ORDER BY updated_at DESC NULLS LAST`,
      [userId, DB_CODES.PLAN_STATUS.ACTIVE]
    );
    const matched = rows.find((row) => {
      const plan = String(row.plan_name || '').toUpperCase();
      return ALLOWED_MCP_PLANS.has(plan) || plan.includes('ELITE') || plan.includes('DESKTOP') || plan.includes('REGULAR');
    });
    return matched || null;
  });
}

/**
 * ========================================================================================
 * [함수명] saveMcpTokenRecord - R2 버킷에 해시 기반 MCP 토큰 레코드와 사용자 매핑을 암호화 저장합니다.
 * ========================================================================================
 */
/**
 * ========================================================================================
 * [함수명] listUserMcpConnections - 사용자의 전체 MCP 연결 목록(다중 클라이언트 지원)을 조회합니다.
 * ==========================================================================================
 */
export async function listUserMcpConnections(env, userId) {
  if (!env.R2_BUCKET || !userId) return [];
  const obj = await env.R2_BUCKET.get(`_mcp-connections/by-user/${userId}`);
  if (!obj) {
    const legacy = await getMcpTokenByUser(env, userId);
    if (!legacy?.tokenHash) return [];
    return [{
      connectionId: resolveConnectionId(legacy),
      tokenHash: legacy.tokenHash,
      maskedToken: legacy.maskedToken || '',
      clientName: legacy.clientName || 'DEFAULT',
      createdAt: legacy.updatedAt || '',
      lastUsedAt: legacy.lastUsedAt || '',
    }];
  }
  try {
    const list = await openJson(env, await obj.text());
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveUserMcpConnections(env, userId, list) {
  if (!env.R2_BUCKET) throw new Error('R2_BUCKET_NOT_CONFIGURED');
  const sealed = await sealJson(env, list);
  await env.R2_BUCKET.put(`_mcp-connections/by-user/${userId}`, sealed);
}

/**
 * ========================================================================================
 * [함수명] saveMcpTokenRecord - R2 버킷에 해시 기반 MCP 토큰 레코드와 연결 목록을 암호화 저장합니다.
 * createNewConnection=true인 경우 기존 연결을 유지한 채 새 독립 연결을 추가합니다.
 * ==========================================================================================
 */
export async function saveMcpTokenRecord(
  env,
  { userId, tokenHash, maskedToken, workspaceFolderId, resourceFolderId, driveRefreshToken, connectionId, clientName = 'DEFAULT', createNewConnection = false }
) {
  if (!env.R2_BUCKET) throw new Error('R2_BUCKET_NOT_CONFIGURED');
  let prevConnectionId = '';
  const existingObj = await env.R2_BUCKET.get(`_mcp-tokens/by-user/${userId}`);
  if (existingObj && !createNewConnection) {
    try {
      const prev = await openJson(env, await existingObj.text());
      prevConnectionId = prev?.connectionId || '';
      if (prev?.tokenHash && prev.tokenHash !== tokenHash) {
        await env.R2_BUCKET.delete(`_mcp-tokens/by-hash/${prev.tokenHash}`);
      }
    } catch {
      // 이전 손상 레코드 무시
    }
  }
  const now = new Date().toISOString();
  const resolvedConnectionId = createNewConnection
    ? `conn_${crypto.randomUUID()}`
    : String(connectionId || prevConnectionId || `conn_${crypto.randomUUID()}`).trim();
  const payload = {
    version: 2,
    connectionId: resolvedConnectionId,
    clientName: String(clientName || 'DEFAULT').trim().slice(0, 60),
    userId,
    tokenHash,
    maskedToken,
    workspaceFolderId: workspaceFolderId || '',
    resourceFolderId: resourceFolderId || '',
    driveRefreshToken: driveRefreshToken || '',
    driveAccessToken: '',
    driveAccessExpires: 0,
    createdAt: now,
    lastUsedAt: '',
    updatedAt: now,
  };
  const sealed = await sealJson(env, payload);
  await env.R2_BUCKET.put(`_mcp-tokens/by-hash/${tokenHash}`, sealed);
  if (!createNewConnection || !existingObj) {
    await env.R2_BUCKET.put(`_mcp-tokens/by-user/${userId}`, sealed);
  }

  const currentList = await listUserMcpConnections(env, userId);
  const filteredList = currentList.filter((item) => item.connectionId !== resolvedConnectionId);
  filteredList.push({
    connectionId: resolvedConnectionId,
    tokenHash,
    maskedToken,
    clientName: payload.clientName,
    createdAt: now,
    lastUsedAt: '',
  });
  await saveUserMcpConnections(env, userId, filteredList);

  const existingConfig = await getMcpConnectionConfig(env, payload, { persistIfMissing: false });
  if (!existingConfig._persisted || workspaceFolderId !== undefined || resourceFolderId !== undefined) {
    const nextConfig = {
      version: 1,
      connectionId: resolvedConnectionId,
      userId,
      configVersion: existingConfig._persisted ? existingConfig.configVersion + 1 : 1,
      workspace: workspaceFolderId !== undefined
        ? buildFolderSlot('WORKSPACE', workspaceFolderId ? 'GDRIVE' : null, workspaceFolderId || '', '', ['READ', 'WRITE'], now)
        : existingConfig.workspace,
      resource: resourceFolderId !== undefined
        ? buildFolderSlot('RESOURCE', resourceFolderId ? 'GDRIVE' : null, resourceFolderId || '', '', ['READ', 'WRITE'], now)
        : existingConfig.resource,
      updatedAt: now,
    };
    await saveMcpConnectionConfig(env, nextConfig);
  }
  return payload;
}

/**
 * ========================================================================================
 * [함수명] getMcpTokenByUser - 사용자 ID로 현재 발급된 MCP 토큰 메타데이터를 조회합니다.
 * ========================================================================================
 */
export async function getMcpTokenByUser(env, userId) {
  if (!env.R2_BUCKET) return null;
  const obj = await env.R2_BUCKET.get(`_mcp-tokens/by-user/${userId}`);
  if (!obj) return null;
  try {
    return await openJson(env, await obj.text());
  } catch {
    return null;
  }
}

/**
 * ========================================================================================
 * [함수명] getMcpTokenByHash - Bearer 토큰 해시로 저장된 MCP 인증 레코드를 조회합니다.
 * ========================================================================================
 */
export async function getMcpTokenByHash(env, tokenHash) {
  if (!env.R2_BUCKET || !tokenHash) return null;
  const obj = await env.R2_BUCKET.get(`_mcp-tokens/by-hash/${tokenHash}`);
  if (!obj) return null;
  try {
    return await openJson(env, await obj.text());
  } catch {
    return null;
  }
}

/**
 * ========================================================================================
 * [함수명] revokeMcpToken - 사용자의 MCP 토큰을 R2 저장소에서 즉시 폐기(삭제)합니다.
 * ========================================================================================
 */
export async function revokeMcpToken(env, userId, targetConnectionId = '') {
  if (!env.R2_BUCKET) return;
  const connections = await listUserMcpConnections(env, userId);
  if (targetConnectionId) {
    const target = connections.find((c) => c.connectionId === targetConnectionId);
    if (target?.tokenHash) {
      await env.R2_BUCKET.delete(`_mcp-tokens/by-hash/${target.tokenHash}`);
    }
    await env.R2_BUCKET.delete(`_mcp-configs/by-connection/${targetConnectionId}`);
    const remaining = connections.filter((c) => c.connectionId !== targetConnectionId);
    await saveUserMcpConnections(env, userId, remaining);
    const primary = await getMcpTokenByUser(env, userId);
    if (primary && resolveConnectionId(primary) === targetConnectionId) {
      await env.R2_BUCKET.delete(`_mcp-tokens/by-user/${userId}`);
    }
    return;
  }
  for (const conn of connections) {
    if (conn.tokenHash) await env.R2_BUCKET.delete(`_mcp-tokens/by-hash/${conn.tokenHash}`);
    if (conn.connectionId) await env.R2_BUCKET.delete(`_mcp-configs/by-connection/${conn.connectionId}`);
  }
  const existing = await getMcpTokenByUser(env, userId);
  if (existing?.tokenHash) {
    await env.R2_BUCKET.delete(`_mcp-tokens/by-hash/${existing.tokenHash}`);
  }
  if (existing?.connectionId) {
    await env.R2_BUCKET.delete(`_mcp-configs/by-connection/${existing.connectionId}`);
  }
  await env.R2_BUCKET.delete(`_mcp-tokens/by-user/${userId}`);
  await env.R2_BUCKET.delete(`_mcp-connections/by-user/${userId}`);
}

const VALID_FOLDER_PERMISSIONS = new Set(['READ', 'WRITE']);

function normalizeFolderPermissions(permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) return ['READ', 'WRITE'];
  const normalized = Array.from(new Set(permissions.map((p) => String(p || '').trim().toUpperCase()).filter((p) => VALID_FOLDER_PERMISSIONS.has(p))));
  return normalized.length > 0 ? normalized : ['READ'];
}

function buildFolderSlot(
  role,
  storageType,
  folderId,
  folderName = '',
  permissions = ['READ', 'WRITE'],
  updatedAt = '',
  { deviceId = '', rootId = '' } = {}
) {
  const upperStorage = storageType ? String(storageType).trim().toUpperCase() : null;
  const cleanFolderId = String(folderId || '').trim();
  const cleanDeviceId = String(deviceId || '').trim();
  const cleanRootId = String(rootId || '').trim();
  const isConfigured = upperStorage === 'LOCAL' ? Boolean(cleanDeviceId && cleanRootId) : Boolean(cleanFolderId);
  return {
    role,
    storageType: isConfigured ? (upperStorage || 'GDRIVE') : null,
    folderId: isConfigured && upperStorage !== 'LOCAL' ? cleanFolderId : '',
    deviceId: isConfigured && upperStorage === 'LOCAL' ? cleanDeviceId : '',
    rootId: isConfigured && upperStorage === 'LOCAL' ? cleanRootId : '',
    folderName: isConfigured ? String(folderName || '').trim() : '',
    permissions: isConfigured ? normalizeFolderPermissions(permissions) : [],
    updatedAt: isConfigured ? (updatedAt || new Date().toISOString()) : '',
  };
}

/**
 * ========================================================================================
 * [함수명] resolveConnectionId - MCP 인증 레코드의 고유 연결 ID를 반환합니다.
 * ==========================================================================================
 */
export function resolveConnectionId(record) {
  if (record?.connectionId) return String(record.connectionId);
  const suffix = String(record?.tokenHash || record?.userId || 'default').slice(0, 16);
  return `legacy_${suffix}`;
}

/**
 * ========================================================================================
 * [함수명] saveMcpConnectionConfig - 연결별 MCP 전용 폴더 설정을 암호화하여 R2에 저장합니다.
 * ==========================================================================================
 */
export async function saveMcpConnectionConfig(env, config) {
  if (!env.R2_BUCKET) throw new Error('R2_BUCKET_NOT_CONFIGURED');
  const { _persisted, ...clean } = config;
  const sealed = await sealJson(env, clean);
  await env.R2_BUCKET.put(`_mcp-configs/by-connection/${clean.connectionId}`, sealed);
  return { ...clean, _persisted: true };
}

/**
 * ========================================================================================
 * [함수명] getMcpConnectionConfig - MCP 연결 전용 작업장/리소스 폴더 설정을 조회합니다.
 * 미저장 레거시 토큰의 경우 토큰 레코드의 폴더 ID로 초기 구성을 생성하며,
 * 편집기 폴더나 반대 슬롯으로 임의 폴백하지 않습니다.
 * ==========================================================================================
 */
export async function getMcpConnectionConfig(env, record, { persistIfMissing = false } = {}) {
  const connectionId = resolveConnectionId(record);
  if (env.R2_BUCKET) {
    const obj = await env.R2_BUCKET.get(`_mcp-configs/by-connection/${connectionId}`);
    if (obj) {
      try {
        const parsed = await openJson(env, await obj.text());
        if (parsed && parsed.connectionId === connectionId) {
          return {
            version: parsed.version || 1,
            connectionId,
            userId: parsed.userId || record?.userId || '',
            configVersion: Number.isInteger(parsed.configVersion) && parsed.configVersion > 0 ? parsed.configVersion : 1,
            workspace: buildFolderSlot('WORKSPACE', parsed.workspace?.storageType, parsed.workspace?.folderId, parsed.workspace?.folderName, parsed.workspace?.permissions, parsed.workspace?.updatedAt, { deviceId: parsed.workspace?.deviceId, rootId: parsed.workspace?.rootId }),
            resource: buildFolderSlot('RESOURCE', parsed.resource?.storageType, parsed.resource?.folderId, parsed.resource?.folderName, parsed.resource?.permissions, parsed.resource?.updatedAt, { deviceId: parsed.resource?.deviceId, rootId: parsed.resource?.rootId }),
            updatedAt: parsed.updatedAt || '',
            _persisted: true,
          };
        }
      } catch {
        // 손상 레코드는 초기 미설정 상태로 안전 폴백하지 않고 재초기화
      }
    }
  }
  const now = record?.updatedAt || new Date().toISOString();
  const initial = {
    version: 1,
    connectionId,
    userId: record?.userId || '',
    configVersion: 1,
    workspace: buildFolderSlot('WORKSPACE', record?.workspaceFolderId ? 'GDRIVE' : null, record?.workspaceFolderId || '', '', ['READ', 'WRITE'], record?.workspaceFolderId ? now : ''),
    resource: buildFolderSlot('RESOURCE', record?.resourceFolderId ? 'GDRIVE' : null, record?.resourceFolderId || '', '', ['READ', 'WRITE'], record?.resourceFolderId ? now : ''),
    updatedAt: now,
    _persisted: false,
  };
  if (persistIfMissing && env.R2_BUCKET) {
    return saveMcpConnectionConfig(env, initial);
  }
  return initial;
}

/**
 * ========================================================================================
 * [함수명] updateMcpFolderSlot - expectedConfigVersion 낙관적 잠금을 검증하고
 * MCP 연결의 작업장(WORKSPACE) 또는 리소스(RESOURCE) 폴더 슬롯을 갱신/해제합니다.
 * ==========================================================================================
 */
export async function updateMcpFolderSlot(
  env,
  record,
  { role, folderId = '', folderName = '', storageType = 'GDRIVE', deviceId = '', rootId = '', permissions = ['READ', 'WRITE'], expectedConfigVersion }
) {
  const upperRole = String(role || '').trim().toUpperCase();
  if (upperRole !== 'WORKSPACE' && upperRole !== 'RESOURCE') {
    throw new Error('폴더 역할(role)은 WORKSPACE 또는 RESOURCE만 허용됩니다.');
  }
  const expected = Number(expectedConfigVersion);
  if (!Number.isInteger(expected) || expected < 1) {
    throw new Error('폴더 설정 변경 시 현재 조회한 expectedConfigVersion(정수)이 필수입니다.');
  }
  const current = await getMcpConnectionConfig(env, record);
  if (current.configVersion !== expected) {
    throw new Error(`폴더 설정 버전이 충돌했습니다(현재 버전: ${current.configVersion}, 요청 버전: ${expected}). get_mcp_folders로 최신 버전을 다시 조회해 주세요.`);
  }
  const now = new Date().toISOString();
  const hasTarget = storageType === 'LOCAL' ? Boolean(deviceId && rootId) : Boolean(folderId);
  const nextSlot = buildFolderSlot(upperRole, hasTarget ? storageType : null, folderId, folderName, permissions, now, { deviceId, rootId });
  const nextConfig = {
    version: 1,
    connectionId: current.connectionId,
    userId: current.userId || record?.userId || '',
    configVersion: current.configVersion + 1,
    workspace: upperRole === 'WORKSPACE' ? nextSlot : current.workspace,
    resource: upperRole === 'RESOURCE' ? nextSlot : current.resource,
    updatedAt: now,
  };
  return saveMcpConnectionConfig(env, nextConfig);
}

const DEVICE_HEARTBEAT_TTL_MS = 120_000;

/**
 * ========================================================================================
 * [함수명] getUserMcpDevices - 사용자 계정에 등록된 로컬 에이전트 장치 목록과 승인 폴더(rootId)를 조회합니다.
 * ==========================================================================================
 */
export async function getUserMcpDevices(env, userId) {
  if (!env.R2_BUCKET || !userId) return [];
  const obj = await env.R2_BUCKET.get(`_mcp-devices/by-user/${userId}`);
  if (!obj) return [];
  try {
    const list = await openJson(env, await obj.text());
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list.map((dev) => {
      const lastBeat = Date.parse(dev.lastHeartbeatAt || '');
      const isOnline = dev.status === 'ONLINE' && Number.isFinite(lastBeat) && (now - lastBeat) <= DEVICE_HEARTBEAT_TTL_MS;
      return {
        deviceId: dev.deviceId,
        deviceName: dev.deviceName || 'My PC',
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastHeartbeatAt: dev.lastHeartbeatAt || '',
        approvedRoots: Array.isArray(dev.approvedRoots) ? dev.approvedRoots : [],
      };
    });
  } catch {
    return [];
  }
}

/**
 * ========================================================================================
 * [함수명] upsertUserMcpDevice - 로컬 에이전트 장치 상태와 승인된 폴더 후보(절대경로 제외)를 등록·갱신합니다.
 * ==========================================================================================
 */
export async function upsertUserMcpDevice(env, userId, { deviceId, deviceName = 'My PC', status = 'ONLINE', approvedRoots = [], lastHeartbeatAt = new Date().toISOString() }) {
  if (!env.R2_BUCKET) throw new Error('R2_BUCKET_NOT_CONFIGURED');
  const cleanId = String(deviceId || '').trim();
  if (!cleanId) throw new Error('deviceId가 필요합니다.');
  const existing = await getUserMcpDevices(env, userId);
  const sanitizedRoots = (Array.isArray(approvedRoots) ? approvedRoots : []).map((r) => ({
    rootId: String(r.rootId || '').trim(),
    name: String(r.name || '').trim(),
    permissions: normalizeFolderPermissions(r.permissions),
    approvedAt: r.approvedAt || new Date().toISOString(),
  })).filter((r) => r.rootId);

  const nextList = existing.filter((d) => d.deviceId !== cleanId);
  const record = {
    deviceId: cleanId,
    deviceName: String(deviceName || 'My PC').trim().slice(0, 80),
    status: String(status || 'ONLINE').toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
    lastHeartbeatAt,
    approvedRoots: sanitizedRoots,
  };
  nextList.push(record);
  await env.R2_BUCKET.put(`_mcp-devices/by-user/${userId}`, await sealJson(env, nextList));
  return record;
}

/**
 * ========================================================================================
 * [함수명] dispatchLocalAgentJob - 온라인 상태인 등록 장치(Local Agent)로 단기 수명 문서 작업을 중계합니다.
 * 오프라인 장치에 대해서는 쓰기를 예약하지 않고 즉시 오프라인 오류를 반환합니다.
 * ==========================================================================================
 */
export async function dispatchLocalAgentJob(env, userId, { deviceId, job, timeoutMs = 15_000 }) {
  const devices = await getUserMcpDevices(env, userId);
  const targetDevice = devices.find((d) => d.deviceId === deviceId);
  if (!targetDevice) {
    throw new Error('등록되지 않았거나 해제된 로컬 장치입니다.');
  }
  if (targetDevice.status !== 'ONLINE') {
    throw new Error('선택된 로컬 PC 에이전트가 오프라인 상태입니다. PC와 Onrivi Local Agent가 실행 중인지 확인해 주세요.');
  }
  const boundedJob = {
    ...job,
    jobId: `job_${crypto.randomUUID()}`,
    expiresAt: Date.now() + Math.max(3000, Math.min(30_000, Number(timeoutMs) || 15_000)),
  };

  if (typeof env.LOCAL_AGENT_DISPATCHER === 'function') {
    return env.LOCAL_AGENT_DISPATCHER({ userId, deviceId, job: boundedJob });
  }
  if (env.LOCAL_AGENT_RELAY_URL) {
    const res = await fetch(`${String(env.LOCAL_AGENT_RELAY_URL).replace(/\/$/, '')}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.LOCAL_AGENT_RELAY_SECRET ? { Authorization: `Bearer ${env.LOCAL_AGENT_RELAY_SECRET}` } : {}),
      },
      body: JSON.stringify({ userId, deviceId, job: boundedJob }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error || `로컬 에이전트 중계 실패 (${res.status})`);
    }
    return data.result ?? data;
  }
  throw new Error('로컬 에이전트 중계 전송 계층(LOCAL_AGENT_RELAY_URL / Durable Object)이 아직 연결되지 않았습니다.');
}

/**
 * ========================================================================================
 * [함수명] saveUserDriveCredentials - 사용자 계정의 최신 Google Drive Refresh Token을 암호화 저장하여 모든 기존 MCP 연결에 자동 공유합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수 (R2_BUCKET)
 * @param {string} userId - 사용자 UUID
 * @param {{ driveRefreshToken: string, driveAccessToken?: string, driveAccessExpires?: number }} creds - Google Drive OAuth 토큰 정보
 * @returns {Promise<object|null>} 저장된 자격증명 객체 (Refresh Token 누락 시 null)
 * ==========================================================================================
 */
export async function saveUserDriveCredentials(env, userId, creds = {}) {
  if (!env?.R2_BUCKET || !userId || !creds?.driveRefreshToken) return null;
  const payload = {
    userId,
    driveRefreshToken: String(creds.driveRefreshToken),
    driveAccessToken: String(creds.driveAccessToken || ''),
    driveAccessExpires: Number(creds.driveAccessExpires || 0),
    updatedAt: new Date().toISOString(),
  };
  await env.R2_BUCKET.put(`_mcp-tokens/drive-by-user/${userId}`, await sealJson(env, payload));
  return payload;
}

/**
 * ========================================================================================
 * [함수명] getUserDriveCredentials - 사용자 계정에 자동 동기화된 최신 Google Drive 자격증명을 조회합니다.
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수 (R2_BUCKET)
 * @param {string} userId - 사용자 UUID
 * @returns {Promise<object|null>} 복호화된 자격증명 객체 또는 null
 * ==========================================================================================
 */
export async function getUserDriveCredentials(env, userId) {
  if (!env?.R2_BUCKET || !userId) return null;
  const obj = await env.R2_BUCKET.get(`_mcp-tokens/drive-by-user/${userId}`);
  if (!obj) return null;
  try {
    return await openJson(env, await obj.text());
  } catch {
    return null;
  }
}

/**
 * ========================================================================================
 * [함수명] getValidDriveAccessToken - MCP 토큰 레코드 또는 사용자 최신 Drive 자격증명으로 유효한 Google Drive Access Token을 확보합니다.
 * (기존 MCP 토큰을 재발급하지 않아도 웹에서 나중에 연결한 Google Drive 인증을 자동으로 반영합니다.)
 *
 * @param {object} env - Cloudflare 바인딩 환경 변수
 * @param {object} record - MCP 토큰 레코드
 * @returns {Promise<string>} 유효한 Google Drive Access Token
 * ==========================================================================================
 */
export async function getValidDriveAccessToken(env, record) {
  let userDrive = null;
  if (!record?.driveRefreshToken && record?.userId) {
    userDrive = await getUserDriveCredentials(env, record.userId);
    if (userDrive?.driveRefreshToken) {
      record.driveRefreshToken = userDrive.driveRefreshToken;
      if (userDrive.driveAccessToken && userDrive.driveAccessExpires > Date.now() + 120_000) {
        record.driveAccessToken = userDrive.driveAccessToken;
        record.driveAccessExpires = userDrive.driveAccessExpires;
      }
    }
  }
  if (!record?.driveRefreshToken) {
    throw new Error('연결된 Google Drive 인증 정보가 없습니다. 온리비어서 웹에서 구글 드라이브를 연결해 주세요.');
  }
  if (record.driveAccessToken && record.driveAccessExpires - Date.now() > 120_000) {
    return record.driveAccessToken;
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('서버 Google OAuth 설정이 누락되었습니다.');
  }

  const refreshWith = async (refreshToken) => {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && Boolean(data.access_token), data };
  };

  let refreshed = await refreshWith(record.driveRefreshToken);
  if (!refreshed.ok && record?.userId) {
    // 기존 토큰 레코드의 Refresh Token이 만료된 경우, 계정의 최신 동기화 Drive 토큰으로 1회 자동 재시도
    const latestDrive = userDrive || (await getUserDriveCredentials(env, record.userId));
    if (latestDrive?.driveRefreshToken && latestDrive.driveRefreshToken !== record.driveRefreshToken) {
      refreshed = await refreshWith(latestDrive.driveRefreshToken);
      if (refreshed.ok) {
        record.driveRefreshToken = latestDrive.driveRefreshToken;
      }
    }
  }
  if (!refreshed.ok) {
    throw new Error('Google Drive 인증이 만료되었습니다. 온리비어서 웹에서 구글 드라이브를 다시 연결해 주세요.');
  }

  record.driveAccessToken = refreshed.data.access_token;
  record.driveAccessExpires = Date.now() + Number(refreshed.data.expires_in || 3600) * 1000;
  if (refreshed.data.refresh_token) record.driveRefreshToken = refreshed.data.refresh_token;

  const sealed = await sealJson(env, record);
  if (record.tokenHash) {
    await env.R2_BUCKET.put(`_mcp-tokens/by-hash/${record.tokenHash}`, sealed);
  }
  if (record.userId) {
    await env.R2_BUCKET.put(`_mcp-tokens/by-user/${record.userId}`, sealed);
    await saveUserDriveCredentials(env, record.userId, {
      driveRefreshToken: record.driveRefreshToken,
      driveAccessToken: record.driveAccessToken,
      driveAccessExpires: record.driveAccessExpires,
    });
  }
  return record.driveAccessToken;
}

/**
 * ========================================================================================
 * [함수명] driveRequest - Google Drive v3 API 요청을 수행합니다.
 * ========================================================================================
 */
export async function driveRequest(accessToken, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google Drive 요청 실패 (${res.status}): ${errText.slice(0, 200)}`);
  }
  return res;
}

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{5,128}$/;
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const DRIVE_SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';
const MARKDOWN_EXT_PATTERN = /\.(md|markdown)$/i;

/**
 * ========================================================================================
 * [함수명] assertValidDriveId - Google Drive 파일/폴더 ID 형식을 검증합니다.
 *
 * @param {string} id - 검증할 Drive 식별자
 * @param {string} [label='Drive ID'] - 오류 메시지에 표시할 항목명
 * @returns {string} 정규화된 Drive ID
 * @throws {Error} 형식이 유효하지 않은 경우
 * ==========================================================================================
 */
export function assertValidDriveId(id, label = 'Drive ID') {
  const value = String(id || '').trim();
  if (!DRIVE_ID_PATTERN.test(value)) {
    throw new Error(`유효하지 않은 ${label} 형식입니다.`);
  }
  return value;
}

/**
 * ========================================================================================
 * [함수명] getDriveItemMeta - Google Drive 항목의 메타데이터(id, name, mimeType, parents, trashed)를 조회합니다.
 *
 * @param {string} accessToken - 유효한 Google Drive Access Token
 * @param {string} itemId - 조회할 Drive 파일 또는 폴더 ID
 * @returns {Promise<object>} Drive 파일 메타데이터 객체
 * ==========================================================================================
 */
export async function getDriveItemMeta(accessToken, itemId) {
  const safeId = assertValidDriveId(itemId, '항목 ID');
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safeId)}?fields=id,name,mimeType,parents,trashed,modifiedTime&supportsAllDrives=true`;
  const res = await driveRequest(accessToken, url);
  return res.json();
}

/**
 * ========================================================================================
 * [함수명] assertDriveDescendant - 대상 Drive 항목이 지정된 허용 루트 폴더(rootFolderId)의
 * 직·간접 하위 항목인지 조상 체인을 추적하여 검증합니다.
 * 휴지통 항목, 바로가기(shortcut) 경유 탈출, 최대 깊이 초과 및 폴더 외부 ID 접근을 차단합니다.
 *
 * @param {string} accessToken - 유효한 Google Drive Access Token
 * @param {string} targetId - 검증 대상 파일 또는 폴더 ID
 * @param {string} rootFolderId - 허용된 MCP 루트 폴더 ID
 * @param {object} [options] - 세부 검증 옵션
 * @param {boolean} [options.allowRoot=false] - 대상이 루트 폴더 자체인 경우 허용 여부
 * @param {boolean} [options.requireFolder=false] - 대상이 반드시 폴더여야 하는지 여부
 * @param {boolean} [options.requireMarkdownFile=false] - 대상이 반드시 마크다운 파일이어야 하는지 여부
 * @param {number} [options.maxDepth=20] - 조상 추적 최대 깊이
 * @returns {Promise<object>} 검증 통과한 대상 항목의 메타데이터
 * @throws {Error} 허용 폴더 경계 밖이거나 유형/상태가 허용되지 않는 경우
 * ==========================================================================================
 */
export async function assertDriveDescendant(
  accessToken,
  targetId,
  rootFolderId,
  { allowRoot = false, requireFolder = false, requireMarkdownFile = false, maxDepth = 20 } = {}
) {
  const safeRoot = assertValidDriveId(rootFolderId, '루트 폴더 ID');
  const safeTarget = assertValidDriveId(targetId, '대상 항목 ID');
  const targetMeta = await getDriveItemMeta(accessToken, safeTarget);

  if (!targetMeta?.id || targetMeta.trashed) {
    throw new Error('대상을 찾을 수 없거나 휴지통에 있는 항목입니다.');
  }
  if (targetMeta.mimeType === DRIVE_SHORTCUT_MIME) {
    throw new Error('바로가기(Shortcut) 항목은 보안상 접근할 수 없습니다.');
  }
  if (requireFolder && targetMeta.mimeType !== DRIVE_FOLDER_MIME) {
    throw new Error('지정한 대상이 폴더가 아닙니다.');
  }
  if (requireMarkdownFile) {
    if (targetMeta.mimeType === DRIVE_FOLDER_MIME || !MARKDOWN_EXT_PATTERN.test(String(targetMeta.name || ''))) {
      throw new Error('마크다운(.md, .markdown) 파일만 접근할 수 있습니다.');
    }
  }

  if (safeTarget === safeRoot) {
    if (!allowRoot) {
      throw new Error('루트 폴더 자체에는 해당 작업을 수행할 수 없습니다.');
    }
    return targetMeta;
  }

  const visited = new Set([safeTarget]);
  let queue = Array.isArray(targetMeta.parents) ? [...targetMeta.parents] : [];
  let depth = 0;

  while (queue.length > 0 && depth < maxDepth) {
    depth += 1;
    const nextQueue = [];
    for (const parentId of queue) {
      if (!parentId || visited.has(parentId)) continue;
      if (parentId === safeRoot) {
        return targetMeta;
      }
      visited.add(parentId);
      let parentMeta;
      try {
        parentMeta = await getDriveItemMeta(accessToken, parentId);
      } catch {
        // 접근 불가(403/404) 상위 조상 노드는 허용 루트에 도달할 수 없으므로 경계 밖으로 간주
        continue;
      }
      if (!parentMeta || parentMeta.trashed || parentMeta.mimeType === DRIVE_SHORTCUT_MIME) {
        continue;
      }
      if (Array.isArray(parentMeta.parents)) {
        nextQueue.push(...parentMeta.parents);
      }
    }
    queue = nextQueue;
  }

  throw new Error('허용된 MCP 작업장 폴더 외부의 Drive 항목에는 접근할 수 없습니다.');
}

/**
 * ========================================================================================
 * [함수명] listDriveChildrenPage - Google Drive 폴더 직속 하위 항목을 페이지네이션 커서와 함께 조회합니다.
 * ==========================================================================================
 */
export async function listDriveChildrenPage(accessToken, folderId, { extraQuery = '', pageSize = 100, pageToken = '' } = {}) {
  const safeFolderId = assertValidDriveId(folderId, '폴더 ID');
  const safeLimit = Math.max(1, Math.min(200, Number(pageSize) || 100));
  const q = `'${safeFolderId}' in parents and trashed = false${extraQuery ? ` and ${extraQuery}` : ''}`;
  const params = new URLSearchParams({
    q,
    fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size)',
    pageSize: String(safeLimit),
    orderBy: 'folder,name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  if (pageToken) params.set('pageToken', String(pageToken).trim());
  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const res = await driveRequest(accessToken, url);
  const data = await res.json();
  return {
    files: Array.isArray(data.files) ? data.files : [],
    nextPageToken: data.nextPageToken || '',
  };
}

export async function listDriveChildren(accessToken, folderId, extraQuery = '') {
  const { files } = await listDriveChildrenPage(accessToken, folderId, { extraQuery, pageSize: 200 });
  return files;
}

/**
 * ========================================================================================
 * [함수명] listDriveTreeRecursive - 허용된 작업장 루트 폴더 하위를 BFS로 재귀 탐색하여
 * 마크다운 파일(및 선택적으로 폴더) 목록과 relativePath를 반환합니다.
 * 바로가기(shortcut)와 휴지통 항목은 탐색 대상에서 제외하고 순환 참조 및 최대 깊이/개수를 제한합니다.
 * ==========================================================================================
 */
export async function listDriveTreeRecursive(
  accessToken,
  rootFolderId,
  { query = '', includeFolders = false, maxDepth = 6, maxItems = 200 } = {}
) {
  const safeRoot = assertValidDriveId(rootFolderId, '루트 폴더 ID');
  const needle = String(query || '').trim().toLowerCase();
  const limit = Math.max(1, Math.min(500, Number(maxItems) || 200));
  const depthLimit = Math.max(1, Math.min(12, Number(maxDepth) || 6));

  const visited = new Set([safeRoot]);
  const queue = [{ folderId: safeRoot, prefix: '', depth: 0 }];
  const items = [];
  let truncated = false;

  while (queue.length > 0 && items.length < limit) {
    const current = queue.shift();
    let pageToken = '';
    do {
      const page = await listDriveChildrenPage(accessToken, current.folderId, { pageSize: 200, pageToken });
      pageToken = page.nextPageToken;
      for (const entry of page.files) {
        if (!entry?.id || entry.mimeType === DRIVE_SHORTCUT_MIME) continue;
        const relPath = current.prefix ? `${current.prefix}/${entry.name}` : entry.name;
        const isFolder = entry.mimeType === DRIVE_FOLDER_MIME;
        if (isFolder) {
          if (includeFolders && (!needle || relPath.toLowerCase().includes(needle))) {
            items.push({ ...entry, folderId: current.folderId, relativePath: relPath });
            if (items.length >= limit) {
              truncated = true;
              break;
            }
          }
          if (current.depth < depthLimit && !visited.has(entry.id)) {
            visited.add(entry.id);
            queue.push({ folderId: entry.id, prefix: relPath, depth: current.depth + 1 });
          }
        } else if (MARKDOWN_EXT_PATTERN.test(String(entry.name || ''))) {
          if (!needle || entry.name.toLowerCase().includes(needle) || relPath.toLowerCase().includes(needle)) {
            items.push({ ...entry, folderId: current.folderId, relativePath: relPath });
            if (items.length >= limit) {
              truncated = true;
              break;
            }
          }
        }
      }
      if (truncated) break;
    } while (pageToken);
  }

  return { items, truncated };
}

export async function readDriveFileText(accessToken, fileId) {
  const safeFileId = assertValidDriveId(fileId, '파일 ID');
  const metaRes = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safeFileId)}?fields=id,name,mimeType,modifiedTime&supportsAllDrives=true`);
  const meta = await metaRes.json();
  const contentRes = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safeFileId)}?alt=media&supportsAllDrives=true`);
  const text = await contentRes.text();
  return { meta, text, sha256: await sha256Hex(text) };
}

export async function createDriveTextFile(accessToken, parentFolderId, name, content, mimeType = 'text/markdown') {
  const safeParentId = assertValidDriveId(parentFolderId, '상위 폴더 ID');
  const metadata = { name, parents: [safeParentId], mimeType };
  const boundary = `onrivi_mcp_${crypto.randomUUID()}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}; charset=UTF-8\r\n\r\n${content}\r\n` +
    `--${boundary}--`;
  const res = await driveRequest(accessToken, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime&supportsAllDrives=true', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.json();
}

export async function updateDriveTextFile(accessToken, fileId, content, mimeType = 'text/markdown') {
  const safeFileId = assertValidDriveId(fileId, '파일 ID');
  const res = await driveRequest(accessToken, `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(safeFileId)}?uploadType=media&fields=id,name,modifiedTime&supportsAllDrives=true`, {
    method: 'PATCH',
    headers: { 'Content-Type': `${mimeType}; charset=UTF-8` },
    body: content,
  });
  return res.json();
}

export async function findOrCreateDriveSubfolder(accessToken, parentId, folderName, allowCreate = false) {
  const safeParentId = assertValidDriveId(parentId, '상위 폴더 ID');
  const q = `'${safeParentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`);
  const data = await res.json();
  if (data.files?.length > 0) return data.files[0].id;
  if (!allowCreate) return null;
  const created = await driveRequest(accessToken, 'https://www.googleapis.com/drive/v3/files?fields=id,name&supportsAllDrives=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, parents: [safeParentId], mimeType: 'application/vnd.google-apps.folder' }),
  });
  const createdData = await created.json();
  return createdData.id;
}

export async function findDriveFileByName(accessToken, parentId, fileName) {
  const safeParentId = assertValidDriveId(parentId, '상위 폴더 ID');
  const q = `'${safeParentId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
  const res = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`);
  const data = await res.json();
  return data.files?.[0] || null;
}

/**
 * ========================================================================================
 * [함수명] listDriveFolders - MCP 전용 폴더 선택을 위해 접근 가능한 Google Drive 폴더 후보 목록을 조회합니다.
 * ==========================================================================================
 */
export async function listDriveFolders(accessToken, { parentFolderId = '', query = '', pageSize = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(pageSize) || 50));
  const clauses = [`mimeType = '${DRIVE_FOLDER_MIME}'`, 'trashed = false'];
  if (parentFolderId) {
    const safeParent = assertValidDriveId(parentFolderId, '상위 폴더 ID');
    clauses.push(`'${safeParent}' in parents`);
  }
  const cleanQuery = String(query || '').trim();
  if (cleanQuery) {
    clauses.push(`name contains '${cleanQuery.replace(/'/g, "\\'")}'`);
  }
  const q = clauses.join(' and ');
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents,modifiedTime)&pageSize=${safeLimit}&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await driveRequest(accessToken, url);
  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}
