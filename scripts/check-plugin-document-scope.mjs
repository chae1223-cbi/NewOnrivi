import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readDocument, replaceDocument, editMarkdownSection } from '../plugins/onrivi-author/server/documents.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'onrivi-doc-scope-'));
try {
  const workspace = path.join(root, 'workspace');
  const resource = path.join(root, 'resource');
  await fs.mkdir(workspace);
  await fs.mkdir(resource);
  const inside = path.join(workspace, 'inside.md');
  const outside = path.join(root, 'outside.md');
  await fs.writeFile(inside, 'before');
  await fs.writeFile(outside, 'secret');
  const roots = [workspace, resource];
  const read = await readDocument(inside, roots);
  await assert.rejects(readDocument(outside, roots), /밖의 문서/);
  await assert.rejects(replaceDocument(outside, read.sha256, 'changed', roots), /밖의 문서/);
  await assert.rejects(replaceDocument(inside, read.sha256, 'changed', roots, async () => { throw new Error('revoked'); }), /revoked/);
  assert.equal(await fs.readFile(inside, 'utf8'), 'before');
  await replaceDocument(inside, read.sha256, 'after', roots);
  assert.equal(await fs.readFile(inside, 'utf8'), 'after');
  await fs.writeFile(inside, '# Intro\nold text\n```md\n# Fake\n```\n## Detail\nkeep this\n# End\nuntouched');
  const section = await readDocument(inside, roots);
  const edited = await editMarkdownSection(inside, section.sha256, 'Intro', 'old text', 'new text', roots);
  assert.equal(edited.heading, 'Intro');
  assert.match(await fs.readFile(inside, 'utf8'), /new text/);
  assert.match(await fs.readFile(inside, 'utf8'), /# End\nuntouched/);
  await assert.rejects(editMarkdownSection(inside, section.sha256, 'Intro', 'new text', 'bad', roots), /변경되었습니다/);
  const current = await readDocument(inside, roots);
  await assert.rejects(editMarkdownSection(inside, current.sha256, 'Fake', 'anything', 'bad', roots), /제목을 찾지/);
  await assert.rejects(editMarkdownSection(inside, current.sha256, 'Intro', 'new text', 'bad', roots, async () => { throw new Error('revoked'); }), /revoked/);
  assert.match(await fs.readFile(inside, 'utf8'), /new text/);
  process.stdout.write('MCP document scope checks passed\n');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
