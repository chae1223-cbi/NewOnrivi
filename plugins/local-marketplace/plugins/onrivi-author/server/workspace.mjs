import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MAX_ENTRIES = 5000;
const MAX_CREATE_BYTES = 2 * 1024 * 1024;
const MAX_SEARCH_FILE_BYTES = 512 * 1024;
const MAX_SEARCH_BYTES = 8 * 1024 * 1024;
const isMarkdown = (name) => /\.(md|markdown)$/i.test(name);
const hash = (value) => createHash('sha256').update(value).digest('hex');

function boundedLimit(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`limit은 1~${maximum} 사이의 정수여야 합니다.`);
  return value;
}

function decodeCursor(cursor, key) {
  if (cursor === undefined || cursor === '') return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (parsed.key !== key || !Number.isInteger(parsed.offset) || parsed.offset < 0 || parsed.offset > MAX_ENTRIES) throw new Error();
    return parsed.offset;
  } catch { throw new Error('현재 조회 조건에 맞는 페이지 커서가 아닙니다. 처음부터 다시 조회하세요.'); }
}

const encodeCursor = (offset, key) => Buffer.from(JSON.stringify({ offset, key })).toString('base64url');

async function collectMarkdown(workspacePath) {
  const root = await fs.realpath(workspacePath);
  const files = [];
  let entries = 0;
  let truncated = false;
  async function visit(folder) {
    const children = await fs.readdir(folder, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    for (const child of children) {
      if (entries >= MAX_ENTRIES) { truncated = true; return; }
      entries++;
      if (child.name.startsWith('.') || child.isSymbolicLink()) continue;
      const full = path.join(folder, child.name);
      if (child.isDirectory()) {
        await visit(full);
        if (truncated) return;
      } else if (child.isFile() && isMarkdown(child.name)) {
        const stat = await fs.lstat(full).catch(() => null);
        if (stat?.isFile() && !stat.isSymbolicLink()) files.push({
          path: full, relativePath: path.relative(root, full).split(path.sep).join('/'),
          bytes: stat.size, modifiedAt: stat.mtime.toISOString()
        });
      }
    }
  }
  await visit(root);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'ko'));
  return { files, truncated };
}

export async function listWorkspaceFiles(workspacePath, { cursor, limit } = {}) {
  const pageSize = boundedLimit(limit, 30, 100);
  const key = hash(`list:${workspacePath}`);
  const start = decodeCursor(cursor, key);
  const { files, truncated } = await collectMarkdown(workspacePath);
  const page = files.slice(start, start + pageSize);
  const next = start + page.length;
  return { files: page, nextCursor: next < files.length ? encodeCursor(next, key) : null,
    truncated, totalFound: files.length };
}

export async function searchWorkspace(workspacePath, { query, cursor, limit } = {}) {
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > 100) throw new Error('검색어는 2~100자여야 합니다.');
  const needle = query.trim().toLocaleLowerCase();
  const pageSize = boundedLimit(limit, 10, 30);
  const key = hash(`search:${workspacePath}:${needle}`);
  let index = decodeCursor(cursor, key);
  const { files, truncated } = await collectMarkdown(workspacePath);
  const matches = [];
  let scannedBytes = 0;
  let skippedLargeFiles = 0;
  while (index < files.length && matches.length < pageSize) {
    const file = files[index];
    if (file.bytes > MAX_SEARCH_FILE_BYTES) { skippedLargeFiles++; index++; continue; }
    if (scannedBytes + file.bytes > MAX_SEARCH_BYTES && scannedBytes > 0) break;
    index++;
    try {
      const bytes = await fs.readFile(file.path);
      if (bytes.length > MAX_SEARCH_FILE_BYTES || bytes.includes(0)) { skippedLargeFiles++; continue; }
      scannedBytes += bytes.length;
      const content = bytes.toString('utf8');
      const position = content.toLocaleLowerCase().indexOf(needle);
      const nameMatch = file.relativePath.toLocaleLowerCase().includes(needle);
      if (position === -1 && !nameMatch) continue;
      const line = position < 0 ? null : content.slice(0, position).split('\n').length;
      const snippet = position < 0 ? '' : content.slice(Math.max(0, position - 70), position + query.length + 90).replace(/\s+/g, ' ');
      matches.push({ path: file.path, relativePath: file.relativePath, line, snippet: snippet.slice(0, 200), matchedInName: nameMatch });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { matches, nextCursor: index < files.length ? encodeCursor(index, key) : null,
    truncated, skippedLargeFiles, scannedBytes };
}

export async function createMarkdown(workspacePath, { relativePath, content, expectedContextSha256 }, beforeWrite) {
  if (typeof relativePath !== 'string' || !relativePath || path.isAbsolute(relativePath) ||
      relativePath.split(/[\\/]/).some(part => !part || part === '.' || part === '..' || part.startsWith('.')) ||
      !isMarkdown(relativePath) || relativePath.includes(':')) {
    throw new Error('작업장 안의 새 .md 또는 .markdown 상대경로를 지정하세요.');
  }
  if (typeof content !== 'string') throw new Error('content는 문자열이어야 합니다.');
  if (!/^[a-f0-9]{64}$/i.test(expectedContextSha256 ?? '')) throw new Error('get_current_folders에서 받은 컨텍스트 SHA-256 값이 필요합니다.');
  const bytes = Buffer.from(content, 'utf8');
  if (bytes.length > MAX_CREATE_BYTES || bytes.includes(0)) throw new Error('내용은 2 MiB 이하의 텍스트여야 합니다.');
  const root = await fs.realpath(workspacePath);
  const file = path.resolve(root, relativePath);
  const parent = await fs.realpath(path.dirname(file));
  const relativeParent = path.relative(root, parent);
  if (relativeParent === '..' || relativeParent.startsWith(`..${path.sep}`) || path.isAbsolute(relativeParent)) throw new Error('작업장 밖에는 문서를 만들 수 없습니다.');
  if (beforeWrite) await beforeWrite();
  const latestParent = await fs.realpath(path.dirname(file));
  if (latestParent !== parent) throw new Error('저장 폴더가 변경되었습니다. 다시 시도해 주세요.');
  const handle = await fs.open(file, 'wx');
  try { await handle.writeFile(bytes); await handle.sync(); }
  catch (error) { await handle.close(); await fs.unlink(file).catch(() => {}); throw error; }
  await handle.close();
  return { path: file, relativePath: path.relative(root, file).split(path.sep).join('/'), sha256: hash(bytes), bytes: bytes.length };
}
