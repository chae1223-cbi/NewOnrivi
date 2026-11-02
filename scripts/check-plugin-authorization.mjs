import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireMcpAccess } from '../plugins/onrivi-author/server/authorization.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'onrivi-mcp-auth-'));
const file = path.join(root, 'mcp-context.json');
process.env.ONRIVI_MCP_CONTEXT_FILE = file;
const context = {
  version: 1, workspaceType: 'local', resourceKind: 'local', workspacePath: root,
  resourcePath: root, deviceId: 'ECFA1E00-B0B1-11F0-B89B-6D88C0B84201',
  pid: process.pid, updatedAt: new Date().toISOString()
};
const writeLicense = async paymentNo => fs.writeFile(path.join(root, 'license.json'), JSON.stringify({ paymentNo }));
const realFetch = globalThis.fetch;
try {
  await fs.writeFile(file, JSON.stringify(context));
  await writeLicense('PAID');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, has_session: true, is_restricted: false, plan_name: 'ELITEPRO', plan_status: 'ACTIVE' }) });
  assert.equal((await requireMcpAccess()).deviceId, context.deviceId);
  await writeLicense('PAID-FREE');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, has_session: true, plan_name: 'ELITEPRO', plan_status: 'FREE' }) });
  await assert.rejects(requireMcpAccess(), /권한이 없습니다/);
  await writeLicense('PAID-LEGACY');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, has_session: true, plan_name: 'ELITEPRO', reason: 'ACTIVE' }) });
  await assert.rejects(requireMcpAccess(), /권한이 없습니다/);
  await writeLicense('PAID-REVOKED');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, has_session: false, plan_name: 'ELITEPRO', plan_status: 'ACTIVE' }) });
  await assert.rejects(requireMcpAccess(), /권한이 없습니다/);
  await writeLicense('PAID-OFFLINE');
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(requireMcpAccess(), /연결할 수 없어/);
  await writeLicense('GUEST_PAYMENT_NO');
  await assert.rejects(requireMcpAccess(), /유료 라이선스/);
  process.stdout.write('MCP authorization checks passed\n');
} finally {
  globalThis.fetch = realFetch;
  await fs.rm(root, { recursive: true, force: true });
}
