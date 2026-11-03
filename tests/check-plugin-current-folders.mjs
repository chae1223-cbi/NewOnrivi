import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getCurrentFolders, requireLocalFolders } from '../plugins/onrivi-author/server/context.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'onrivi-context-'));
const contextFile = path.join(root, 'mcp-context.json');
process.env.ONRIVI_MCP_CONTEXT_FILE = contextFile;
const workspacePath = path.join(root, 'workspace');
const resourcePath = path.join(root, 'resource');
await fs.mkdir(workspacePath);
await fs.mkdir(resourcePath);
const save = async overrides => fs.writeFile(contextFile, JSON.stringify({
  version: 1, workspaceType: 'local', resourceKind: 'local', workspacePath,
  resourcePath, pid: process.pid, updatedAt: new Date().toISOString(), ...overrides
}));

try {
  await save({});
  const current = await getCurrentFolders();
  assert.equal(current.localReady, true);
  assert.equal((await requireLocalFolders(current.contextSha256)).resourcePath, resourcePath);
  await save({ workspacePath: resourcePath });
  await assert.rejects(requireLocalFolders(current.contextSha256), /변경되었습니다/);
  await save({ workspaceType: 'cloud', workspacePath: null });
  await assert.rejects(requireLocalFolders(), /모두 로컬/);
  await save({ updatedAt: new Date(Date.now() - 120000).toISOString() });
  await assert.rejects(getCurrentFolders(), /최신 폴더 정보를 찾지/);
  process.stdout.write('current folder MCP checks passed\n');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
