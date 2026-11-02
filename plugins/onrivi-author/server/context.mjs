import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const candidates = () => {
  if (process.env.ONRIVI_MCP_CONTEXT_FILE) return [process.env.ONRIVI_MCP_CONTEXT_FILE];
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return ['Onrivi Author', 'onrivi-author'].map(name => path.join(base, name, 'mcp-context.json'));
};

export async function getCurrentFolders() {
  const found = [];
  for (const candidate of candidates()) {
    try {
      const stat = await fs.lstat(candidate);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) continue;
      const raw = JSON.parse(await fs.readFile(candidate, 'utf8'));
      if (raw.version !== 1 || !Number.isInteger(raw.pid) || raw.pid <= 0) continue;
      const age = Date.now() - Date.parse(raw.updatedAt);
      if (!Number.isFinite(age) || age < -10000 || age > 90000) continue;
      try { process.kill(raw.pid, 0); } catch { continue; }
      found.push({ ...raw, contextFile: candidate });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (found.length === 0) throw new Error('실행 중인 온리비 어서 데스크톱 앱의 최신 폴더 정보를 찾지 못했습니다. 앱을 열고 작업장과 리소스 폴더를 연결해 주세요.');
  if (found.length > 1) throw new Error('온리비 어서 폴더 정보가 여러 곳에 있습니다. 사용할 앱을 하나만 실행해 주세요.');
  const context = found[0];
  const identity = {
    workspaceType: context.workspaceType,
    workspacePath: context.workspacePath,
    resourceKind: context.resourceKind,
    resourcePath: context.resourcePath,
    deviceId: context.deviceId,
    pid: context.pid,
  };
  return { ...identity, contextFile: context.contextFile, contextSha256: hash(identity), updatedAt: context.updatedAt, localReady: context.workspaceType === 'local' && context.resourceKind === 'local' && !!context.workspacePath && !!context.resourcePath };
}

export async function requireLocalFolders(expectedContextSha256) {
  const context = await getCurrentFolders();
  if (!context.localReady) throw new Error('현재 작업장과 리소스 폴더가 모두 로컬로 연결돼 있어야 합니다. 웹드라이브나 미설정 상태에서는 서식 파일을 수정하지 않습니다.');
  if (expectedContextSha256 && context.contextSha256 !== expectedContextSha256) throw new Error('작업장 또는 리소스 폴더가 변경되었습니다. 현재 폴더를 다시 조회해 주세요.');
  for (const folder of [context.workspacePath, context.resourcePath]) {
    if (!path.isAbsolute(folder)) throw new Error('로컬 폴더의 절대경로를 확인하지 못했습니다.');
    const stat = await fs.lstat(folder);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('현재 폴더가 일반 로컬 디렉터리가 아닙니다.');
  }
  return context;
}
