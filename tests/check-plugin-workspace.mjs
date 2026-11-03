import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listWorkspaceFiles, searchWorkspace, createMarkdown } from '../plugins/onrivi-author/server/workspace.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'onrivi-workspace-'));
const workspace = path.join(root, 'workspace');
const sha = 'a'.repeat(64);
try {
  await fs.mkdir(workspace);
  await fs.mkdir(path.join(workspace, 'notes'));
  await fs.writeFile(path.join(workspace, 'a.md'), 'alpha only');
  await fs.writeFile(path.join(workspace, 'notes', 'b.markdown'), 'first line\nneedle appears here');
  await fs.writeFile(path.join(root, 'outside.md'), 'needle outside');

  const first = await listWorkspaceFiles(workspace, { limit: 1 });
  assert.equal(first.files.length, 1);
  assert.ok(first.nextCursor);
  const second = await listWorkspaceFiles(workspace, { limit: 1, cursor: first.nextCursor });
  assert.equal(second.files.length, 1);
  assert.notEqual(first.files[0].path, second.files[0].path);
  assert.equal(second.nextCursor, null);
  await assert.rejects(listWorkspaceFiles(workspace, { cursor: 'bad' }), /커서/);

  const found = await searchWorkspace(workspace, { query: 'needle' });
  assert.equal(found.matches.length, 1);
  assert.equal(found.matches[0].line, 2);
  assert.match(found.matches[0].snippet, /needle/);
  assert.equal(found.nextCursor, null);

  await assert.rejects(createMarkdown(workspace, { relativePath: '../outside.md', content: 'bad', expectedContextSha256: sha }), /상대경로/);
  await assert.rejects(createMarkdown(workspace, { relativePath: 'a.md', content: 'bad', expectedContextSha256: sha }), /EEXIST/);
  await assert.rejects(createMarkdown(workspace, { relativePath: 'notes/revoked.md', content: 'bad', expectedContextSha256: sha }, async () => { throw new Error('revoked'); }), /revoked/);
  assert.equal(await fs.stat(path.join(workspace, 'notes', 'revoked.md')).then(() => true, () => false), false);
  const created = await createMarkdown(workspace, { relativePath: 'notes/new.md', content: '# New', expectedContextSha256: sha });
  assert.equal(created.relativePath, 'notes/new.md');
  assert.equal(await fs.readFile(created.path, 'utf8'), '# New');
  assert.equal(await fs.readFile(path.join(workspace, 'a.md'), 'utf8'), 'alpha only');
  process.stdout.write('MCP workspace checks passed\n');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
