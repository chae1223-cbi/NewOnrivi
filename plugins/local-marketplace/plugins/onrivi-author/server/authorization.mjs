import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getCurrentFolders } from './context.mjs';

const CHECK_URL = 'https://onrivi.com/api/license/check-session';
const AUTH_CACHE_TTL_MS = 60 * 1000;
let cachedAuth = { key: '', verifiedAt: 0 };

export async function requireMcpAccess() {
  const context = await getCurrentFolders();
  if (!context.deviceId || !/^[a-f0-9-]{36}$/i.test(context.deviceId)) {
    throw new Error('기기 ID를 확인할 수 없어 MCP 권한을 검증하지 못했습니다.');
  }
  const licenseFile = path.join(path.dirname(context.contextFile), 'license.json');
  const stat = await fs.lstat(licenseFile);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw new Error('로컬 라이선스 정보를 확인할 수 없습니다.');
  const license = JSON.parse(await fs.readFile(licenseFile, 'utf8'));
  if (typeof license.paymentNo !== 'string' || !license.paymentNo || license.paymentNo === 'GUEST_PAYMENT_NO') {
    cachedAuth = { key: '', verifiedAt: 0 };
    throw new Error('MCP 사용 권한이 확인되지 않았습니다. 유료 라이선스를 앱에서 다시 인증해 주세요.');
  }
  const cacheKey = `${license.paymentNo}:${stat.mtimeMs}:${context.deviceId}:${context.pid}`;
  if (cachedAuth.key === cacheKey && (Date.now() - cachedAuth.verifiedAt) < AUTH_CACHE_TTL_MS) {
    return context;
  }
  let response;
  try {
    response = await fetch(CHECK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_payment_no: license.paymentNo, p_device_uuid: context.deviceId }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw new Error('라이선스 서버에 연결할 수 없어 MCP 사용을 중단했습니다.');
  }
  if (!response.ok) throw new Error('라이선스 서버의 권한 확인 요청이 거부되었습니다.');
  const result = await response.json();
  const plan = String(result.plan_name || '').toUpperCase();
  const status = String(result.plan_status || '').toUpperCase();
  if (result.success !== true || result.has_session !== true || result.is_restricted === true ||
      status !== 'ACTIVE' ||
      (!plan.includes('ELITE') && !plan.includes('DESKTOP'))) {
    cachedAuth = { key: '', verifiedAt: 0 };
    throw new Error('현재 라이선스에 온리비 어서 MCP 사용 권한이 없습니다. 활성 유료 데스크톱 구독과 기기 세션을 확인해 주세요.');
  }
  cachedAuth = { key: cacheKey, verifiedAt: Date.now() };
  return context;
}
