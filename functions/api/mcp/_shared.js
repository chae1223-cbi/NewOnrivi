// ====================================================================
// 📊 [OMD-MCP-REMOTE-0001] functions/api/mcp/_shared.js
// 🎯 @KICK  : 웹 원격 MCP(Streamable HTTP) 전용 토큰 암호화 저장·구독 권한 검증·Google Drive API 유틸리티
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), AES-GCM 토큰 암호화 및 SHA-256 해시 조회
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
export async function saveMcpTokenRecord(env, { userId, tokenHash, maskedToken, workspaceFolderId, resourceFolderId, driveRefreshToken }) {
  if (!env.R2_BUCKET) throw new Error('R2_BUCKET_NOT_CONFIGURED');
  const existingObj = await env.R2_BUCKET.get(`_mcp-tokens/by-user/${userId}`);
  if (existingObj) {
    try {
      const prev = await openJson(env, await existingObj.text());
      if (prev?.tokenHash && prev.tokenHash !== tokenHash) {
        await env.R2_BUCKET.delete(`_mcp-tokens/by-hash/${prev.tokenHash}`);
      }
    } catch {
      // 이전 손상 레코드 무시
    }
  }
  const now = new Date().toISOString();
  const payload = {
    version: 1,
    userId,
    tokenHash,
    maskedToken,
    workspaceFolderId: workspaceFolderId || '',
    resourceFolderId: resourceFolderId || '',
    driveRefreshToken: driveRefreshToken || '',
    driveAccessToken: '',
    driveAccessExpires: 0,
    updatedAt: now,
  };
  const sealed = await sealJson(env, payload);
  await env.R2_BUCKET.put(`_mcp-tokens/by-hash/${tokenHash}`, sealed);
  await env.R2_BUCKET.put(`_mcp-tokens/by-user/${userId}`, sealed);
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
export async function revokeMcpToken(env, userId) {
  if (!env.R2_BUCKET) return;
  const existing = await getMcpTokenByUser(env, userId);
  if (existing?.tokenHash) {
    await env.R2_BUCKET.delete(`_mcp-tokens/by-hash/${existing.tokenHash}`);
  }
  await env.R2_BUCKET.delete(`_mcp-tokens/by-user/${userId}`);
}

/**
 * ========================================================================================
 * [함수명] getValidDriveAccessToken - MCP 토큰 레코드의 Refresh Token으로 유효한 Google Drive Access Token을 확보합니다.
 * ========================================================================================
 */
export async function getValidDriveAccessToken(env, record) {
  if (!record?.driveRefreshToken) {
    throw new Error('연결된 Google Drive 인증 정보가 없습니다. 온리비어서 웹에서 구글 드라이브를 연결한 뒤 MCP 토큰을 다시 발급해 주세요.');
  }
  if (record.driveAccessToken && record.driveAccessExpires - Date.now() > 120_000) {
    return record.driveAccessToken;
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('서버 Google OAuth 설정이 누락되었습니다.');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: record.driveRefreshToken,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error('Google Drive 인증이 만료되었습니다. 온리비어서 웹에서 구글 드라이브를 다시 연결한 뒤 MCP 토큰을 재발급해 주세요.');
  }
  record.driveAccessToken = data.access_token;
  record.driveAccessExpires = Date.now() + Number(data.expires_in || 3600) * 1000;
  if (data.refresh_token) record.driveRefreshToken = data.refresh_token;

  const sealed = await sealJson(env, record);
  await env.R2_BUCKET.put(`_mcp-tokens/by-hash/${record.tokenHash}`, sealed);
  await env.R2_BUCKET.put(`_mcp-tokens/by-user/${record.userId}`, sealed);
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

export async function listDriveChildren(accessToken, folderId, extraQuery = '') {
  const q = `'${folderId}' in parents and trashed = false${extraQuery ? ` and ${extraQuery}` : ''}`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=200&orderBy=folder,name`;
  const res = await driveRequest(accessToken, url);
  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function readDriveFileText(accessToken, fileId) {
  const metaRes = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,modifiedTime`);
  const meta = await metaRes.json();
  const contentRes = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`);
  const text = await contentRes.text();
  return { meta, text, sha256: await sha256Hex(text) };
}

export async function createDriveTextFile(accessToken, parentFolderId, name, content, mimeType = 'text/markdown') {
  const metadata = { name, parents: [parentFolderId], mimeType };
  const boundary = `onrivi_mcp_${crypto.randomUUID()}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}; charset=UTF-8\r\n\r\n${content}\r\n` +
    `--${boundary}--`;
  const res = await driveRequest(accessToken, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.json();
}

export async function updateDriveTextFile(accessToken, fileId, content, mimeType = 'text/markdown') {
  const res = await driveRequest(accessToken, `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,modifiedTime`, {
    method: 'PATCH',
    headers: { 'Content-Type': `${mimeType}; charset=UTF-8` },
    body: content,
  });
  return res.json();
}

export async function findOrCreateDriveSubfolder(accessToken, parentId, folderName, allowCreate = false) {
  const q = `'${parentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`);
  const data = await res.json();
  if (data.files?.length > 0) return data.files[0].id;
  if (!allowCreate) return null;
  const created = await driveRequest(accessToken, 'https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' }),
  });
  const createdData = await created.json();
  return createdData.id;
}

export async function findDriveFileByName(accessToken, parentId, fileName) {
  const q = `'${parentId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
  const res = await driveRequest(accessToken, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&pageSize=5`);
  const data = await res.json();
  return data.files?.[0] || null;
}
