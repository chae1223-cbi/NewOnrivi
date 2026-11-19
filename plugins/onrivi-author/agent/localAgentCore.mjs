// ====================================================================
// 📊 [OMD-MCP-LOCAL-AGENT-0001] plugins/onrivi-author/agent/localAgentCore.mjs
// 🎯 @KICK  : 온리비 어서 편집기 없이 독립 실행되는 MCP Local Agent 핵심 엔진
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), realpath 경계 검증, 심볼릭 링크 차단, 원자적 파일 교체, 만료 작업 거부
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 4: 독립 Local Agent 코어 신설]
//             1) mcp-context.json/실행 중 앱 의존성 없이 승인된 로컬 폴더(rootId) 저장소 관리
//             2) realpath 기반 폴더 이탈·심볼릭 링크 차단 및 원자적 쓰기(wx / temp+rename) 구현
//             3) list, search, read, create, replace, edit_section 공통 문서 인터페이스 구현
// 🔗 @CALLS : node:fs/promises, node:path, node:crypto
// ====================================================================
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MARKDOWN_EXT = /\.(md|markdown)$/i;
const VALID_PERMS = new Set(['READ', 'WRITE']);

const sha256Hex = (text) => createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex');

const normalizeForCompare = (p) => {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const isInsideRoot = (candidateRealPath, rootRealPath) => {
  const target = normalizeForCompare(candidateRealPath);
  const root = normalizeForCompare(rootRealPath);
  if (target === root) return true;
  const withSep = root.endsWith(path.sep) ? root : root + path.sep;
  return target.startsWith(withSep);
};

/**
 * ========================================================================================
 * [함수명] applyLocalSectionEdit - 로컬 마크다운 문서의 특정 제목 섹션 또는 고유 문구를 부분 수정합니다.
 * ==========================================================================================
 */
function applyLocalSectionEdit(sourceText, { targetHeading = '', oldText = '', newText = '' }) {
  const eol = sourceText.includes('\r\n') ? '\r\n' : '\n';
  const normalized = String(sourceText || '').replace(/\r\n/g, '\n');
  const replacement = String(newText ?? '').replace(/\r\n/g, '\n');
  const cleanOld = String(oldText || '').replace(/\r\n/g, '\n');
  const cleanHeading = String(targetHeading || '').trim();

  if (!cleanOld && !cleanHeading) {
    throw new Error('부분 수정을 위해 targetHeading 또는 oldText 중 하나를 지정해 주세요.');
  }
  if (cleanOld) {
    const first = normalized.indexOf(cleanOld);
    if (first === -1) throw new Error('지정한 oldText를 문서에서 찾지 못했습니다.');
    if (normalized.indexOf(cleanOld, first + 1) !== -1) {
      throw new Error('지정한 oldText가 문서에 2곳 이상 존재합니다. 주변 문맥을 포함해 주세요.');
    }
    const updated = normalized.slice(0, first) + replacement + normalized.slice(first + cleanOld.length);
    return eol === '\r\n' ? updated.replace(/\n/g, '\r\n') : updated;
  }

  const normalizedTarget = cleanHeading.replace(/^#{1,6}\s+/, '').trim();
  const lines = normalized.split('\n');
  let fence = '';
  const matched = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(/^\s*(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = '';
      continue;
    }
    if (fence) continue;
    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (!h) continue;
    if (line.trim() === cleanHeading || h[2].trim() === normalizedTarget) {
      matched.push({ index: i, level: h[1].length });
    }
  }
  if (matched.length === 0) throw new Error(`지정한 제목 섹션을 찾지 못했습니다: ${cleanHeading}`);
  if (matched.length > 1) throw new Error(`동일한 제목 섹션이 2곳 이상 존재합니다: ${cleanHeading}`);

  const start = matched[0];
  let endIndex = lines.length;
  fence = '';
  for (let i = start.index + 1; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(/^\s*(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = '';
      continue;
    }
    if (fence) continue;
    const nh = line.match(/^(#{1,6})\s+/);
    if (nh && nh[1].length <= start.level) {
      endIndex = i;
      break;
    }
  }
  const bodyLines = replacement.length > 0 ? ['', ...replacement.split('\n'), ''] : [''];
  const updated = [...lines.slice(0, start.index + 1), ...bodyLines, ...lines.slice(endIndex)]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  return eol === '\r\n' ? updated.replace(/\n/g, '\r\n') : updated;
}

/**
 * ========================================================================================
 * [클래스명] LocalAgentCore - 승인된 로컬 폴더(rootId) 경계 내에서 MCP 문서 작업을 실행하는 독립 에이전트 코어
 * ==========================================================================================
 */
export class LocalAgentCore {
  constructor({ deviceId, deviceName = 'My PC', roots = [] } = {}) {
    this.deviceId = String(deviceId || `dev_${randomUUID()}`);
    this.deviceName = String(deviceName || 'My PC');
    this.roots = new Map();
    for (const r of roots) {
      this.registerApprovedRoot(r);
    }
  }

  /**
   * ========================================================================================
   * [메서드명] registerApprovedRoot - 해당 PC 사용자가 승인한 로컬 폴더를 등록하고 불투명 rootId를 반환합니다.
   * ==========================================================================================
   */
  registerApprovedRoot({ rootId, name, absPath, permissions = ['READ', 'WRITE'] }) {
    if (!absPath || !path.isAbsolute(absPath)) {
      throw new Error('로컬 폴더 승인에는 절대경로가 필요합니다.');
    }
    const cleanRootId = String(rootId || `root_${randomUUID()}`).trim();
    const cleanPerms = Array.from(
      new Set((Array.isArray(permissions) ? permissions : ['READ', 'WRITE']).map((p) => String(p).toUpperCase()).filter((p) => VALID_PERMS.has(p)))
    );
    const entry = {
      rootId: cleanRootId,
      name: String(name || path.basename(absPath) || cleanRootId).trim(),
      absPath: path.resolve(absPath),
      permissions: cleanPerms.length > 0 ? cleanPerms : ['READ'],
      approvedAt: new Date().toISOString(),
    };
    this.roots.set(cleanRootId, entry);
    return {
      rootId: entry.rootId,
      name: entry.name,
      permissions: entry.permissions,
      approvedAt: entry.approvedAt,
    };
  }

  /**
   * ========================================================================================
   * [메서드명] getPublicDeviceSummary - 절대경로를 제외한 공개 장치/폴더 후보 요약을 반환합니다.
   * ==========================================================================================
   */
  getPublicDeviceSummary() {
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      status: 'ONLINE',
      approvedRoots: Array.from(this.roots.values()).map(({ rootId, name, permissions, approvedAt }) => ({
        rootId,
        name,
        permissions,
        approvedAt,
      })),
    };
  }

  /**
   * ========================================================================================
   * [메서드명] resolveSafePath - realpath 검증과 심볼릭 링크 차단을 통해 승인된 폴더 내부 경로만 반환합니다.
   * ==========================================================================================
   */
  async resolveSafePath(rootId, relativePath = '', { allowRoot = false, mustExist = true, requireMarkdown = false } = {}) {
    const rootEntry = this.roots.get(String(rootId || '').trim());
    if (!rootEntry) {
      throw new Error('승인되지 않았거나 해제된 로컬 폴더(rootId)입니다.');
    }
    const rootStat = await fs.lstat(rootEntry.absPath);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw new Error('승인된 로컬 폴더가 유효한 디렉터리가 아닙니다.');
    }
    const realRoot = await fs.realpath(rootEntry.absPath);

    const rawRel = String(relativePath || '').replace(/\\/g, '/').trim();
    if (!rawRel) {
      if (!allowRoot) throw new Error('상대경로(relativePath)를 지정해 주세요.');
      return { rootEntry, realRoot, targetPath: realRoot, relativePath: '' };
    }
    if (path.isAbsolute(rawRel) || /^[a-zA-Z]:/.test(rawRel) || rawRel.startsWith('//')) {
      throw new Error('절대경로는 허용되지 않습니다. 폴더 기준 상대경로만 사용하세요.');
    }
    const segments = rawRel.split('/').filter(Boolean);
    if (segments.some((s) => s === '.' || s === '..')) {
      throw new Error('상위 폴더 이동(..)이 포함된 경로는 허용되지 않습니다.');
    }

    const joined = path.resolve(realRoot, ...segments);
    if (!isInsideRoot(joined, realRoot)) {
      throw new Error('허용된 로컬 폴더 경계를 벗어나는 경로입니다.');
    }

    if (mustExist) {
      const targetLstat = await fs.lstat(joined);
      if (targetLstat.isSymbolicLink()) {
        throw new Error('심볼릭 링크 항목은 보안상 접근할 수 없습니다.');
      }
      const realTarget = await fs.realpath(joined);
      if (!isInsideRoot(realTarget, realRoot)) {
        throw new Error('실제 경로가 허용된 로컬 폴더 경계를 벗어납니다.');
      }
      if (requireMarkdown && (targetLstat.isDirectory() || !MARKDOWN_EXT.test(path.basename(realTarget)))) {
        throw new Error('마크다운(.md, .markdown) 파일만 접근할 수 있습니다.');
      }
      return { rootEntry, realRoot, targetPath: realTarget, relativePath: segments.join('/'), stat: targetLstat };
    }

    const parentDir = path.dirname(joined);
    const parentLstat = await fs.lstat(parentDir);
    if (!parentLstat.isDirectory() || parentLstat.isSymbolicLink()) {
      throw new Error('상위 디렉터리가 유효하지 않습니다.');
    }
    const realParent = await fs.realpath(parentDir);
    if (!isInsideRoot(realParent, realRoot)) {
      throw new Error('생성 대상 상위 경로가 허용된 로컬 폴더 경계를 벗어납니다.');
    }
    const fileName = path.basename(joined);
    if (requireMarkdown && !MARKDOWN_EXT.test(fileName)) {
      throw new Error('파일명은 .md 또는 .markdown으로 끝나야 합니다.');
    }
    return { rootEntry, realRoot, targetPath: path.join(realParent, fileName), relativePath: segments.join('/') };
  }

  /**
   * ========================================================================================
   * [메서드명] executeJob - Gateway가 전달한 단기 수명 로컬 작업을 검증 후 실행합니다.
   * ==========================================================================================
   */
  async executeJob(job) {
    if (!job || typeof job !== 'object') {
      throw new Error('유효하지 않은 로컬 작업 요청입니다.');
    }
    if (job.expiresAt && Date.now() > Number(job.expiresAt)) {
      throw new Error('만료된 로컬 작업 요청은 실행하지 않습니다.');
    }
    const rootEntry = this.roots.get(String(job.rootId || '').trim());
    if (!rootEntry) {
      throw new Error('승인되지 않았거나 해제된 로컬 폴더(rootId)입니다.');
    }

    const op = String(job.op || '').toUpperCase();
    const isWrite = op === 'CREATE' || op === 'REPLACE' || op === 'EDIT_SECTION';
    const requiredPerm = isWrite ? 'WRITE' : 'READ';
    if (!rootEntry.permissions.includes(requiredPerm)) {
      throw new Error(`로컬 폴더에 ${requiredPerm} 권한이 없습니다.`);
    }

    if (op === 'LIST' || op === 'SEARCH') {
      const { realRoot, targetPath, relativePath: baseRel } = await this.resolveSafePath(job.rootId, job.subPath || '', {
        allowRoot: true,
        mustExist: true,
      });
      const recursive = op === 'SEARCH' ? job.recursive !== false : Boolean(job.recursive);
      const needle = op === 'SEARCH' ? String(job.query || '').trim().toLowerCase() : '';
      const maxItems = Math.max(1, Math.min(500, Number(job.maxItems || job.pageSize) || 200));
      const items = [];
      let truncated = false;

      const walk = async (dirPath, relPrefix, depth) => {
        if (items.length >= maxItems) {
          truncated = true;
          return;
        }
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isSymbolicLink()) continue;
          const childPath = path.join(dirPath, entry.name);
          const childReal = await fs.realpath(childPath).catch(() => null);
          if (!childReal || !isInsideRoot(childReal, realRoot)) continue;
          const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            if (op === 'LIST') {
              items.push({ id: rel, name: entry.name, relativePath: rel, mimeType: 'application/vnd.onrivi.folder' });
              if (items.length >= maxItems) { truncated = true; return; }
            }
            if (recursive && depth < 6) {
              await walk(childReal, rel, depth + 1);
            }
          } else if (entry.isFile() && MARKDOWN_EXT.test(entry.name)) {
            if (!needle || entry.name.toLowerCase().includes(needle) || rel.toLowerCase().includes(needle)) {
              const st = await fs.stat(childReal);
              items.push({
                id: rel,
                documentId: `onrivi://local/${this.deviceId}/${job.rootId}/${encodeURIComponent(rel)}`,
                name: entry.name,
                relativePath: rel,
                mimeType: 'text/markdown',
                modifiedTime: st.mtime.toISOString(),
                size: String(st.size),
              });
              if (items.length >= maxItems) { truncated = true; return; }
            }
          }
        }
      };

      await walk(targetPath, baseRel, 0);
      return {
        storageType: 'LOCAL',
        deviceId: this.deviceId,
        rootId: job.rootId,
        availability: 'ONLINE',
        recursive,
        truncated,
        ...(op === 'SEARCH' ? { query: job.query, searchScope: recursive ? 'LOCAL_RECURSIVE_FILENAME_ONLY' : 'LOCAL_ROOT_FILENAME_ONLY', contentSearchSupported: false } : {}),
        items,
      };
    }

    if (op === 'READ') {
      const { targetPath, relativePath, stat } = await this.resolveSafePath(job.rootId, job.relativePath, {
        allowRoot: false,
        mustExist: true,
        requireMarkdown: true,
      });
      const content = await fs.readFile(targetPath, 'utf8');
      return {
        storageType: 'LOCAL',
        deviceId: this.deviceId,
        rootId: job.rootId,
        availability: 'ONLINE',
        documentId: `onrivi://local/${this.deviceId}/${job.rootId}/${encodeURIComponent(relativePath)}`,
        relativePath,
        name: path.basename(targetPath),
        modifiedTime: stat.mtime.toISOString(),
        sha256: sha256Hex(content),
        permissions: rootEntry.permissions,
        content,
      };
    }

    if (op === 'CREATE') {
      const rel = job.subPath ? `${job.subPath}/${job.name}` : job.name;
      const { targetPath, relativePath } = await this.resolveSafePath(job.rootId, rel, {
        allowRoot: false,
        mustExist: false,
        requireMarkdown: true,
      });
      const content = String(job.content ?? '');
      try {
        await fs.writeFile(targetPath, content, { encoding: 'utf8', flag: 'wx' });
      } catch (err) {
        if (err?.code === 'EEXIST') throw new Error(`동일한 이름의 파일이 이미 존재합니다: ${relativePath}`);
        throw err;
      }
      const st = await fs.stat(targetPath);
      return {
        storageType: 'LOCAL',
        deviceId: this.deviceId,
        rootId: job.rootId,
        success: true,
        documentId: `onrivi://local/${this.deviceId}/${job.rootId}/${encodeURIComponent(relativePath)}`,
        relativePath,
        name: path.basename(targetPath),
        modifiedTime: st.mtime.toISOString(),
        sha256: sha256Hex(content),
      };
    }

    if (op === 'REPLACE' || op === 'EDIT_SECTION') {
      const expectedSha256 = String(job.expectedSha256 || '').trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
        throw new Error('동시 수정 충돌 방지를 위해 유효한 expectedSha256(64자리 SHA-256 해시)이 필수입니다.');
      }
      const { targetPath, relativePath } = await this.resolveSafePath(job.rootId, job.relativePath, {
        allowRoot: false,
        mustExist: true,
        requireMarkdown: true,
      });
      const currentContent = await fs.readFile(targetPath, 'utf8');
      if (sha256Hex(currentContent) !== expectedSha256) {
        throw new Error('문서가 조회 후 변경되었습니다. 다시 읽은 뒤 수정해 주세요.');
      }
      const nextContent = op === 'EDIT_SECTION'
        ? applyLocalSectionEdit(currentContent, { targetHeading: job.targetHeading, oldText: job.oldText, newText: job.newText })
        : String(job.content ?? '');

      // 임시 파일 작성 후 원자적 교체 (경계 재검증 포함)
      const tmpPath = `${targetPath}.onrivi-tmp-${randomUUID()}`;
      try {
        await fs.writeFile(tmpPath, nextContent, { encoding: 'utf8', flag: 'wx' });
        const recheckContent = await fs.readFile(targetPath, 'utf8');
        if (sha256Hex(recheckContent) !== expectedSha256) {
          throw new Error('저장 직전 문서가 다른 프로세스에 의해 변경되었습니다.');
        }
        await fs.rename(tmpPath, targetPath);
      } catch (err) {
        await fs.unlink(tmpPath).catch(() => {});
        throw err;
      }
      const st = await fs.stat(targetPath);
      return {
        storageType: 'LOCAL',
        deviceId: this.deviceId,
        rootId: job.rootId,
        success: true,
        documentId: `onrivi://local/${this.deviceId}/${job.rootId}/${encodeURIComponent(relativePath)}`,
        relativePath,
        name: path.basename(targetPath),
        modifiedTime: st.mtime.toISOString(),
        sha256: sha256Hex(nextContent),
      };
    }

    throw new Error(`지원하지 않는 로컬 작업 유형입니다: ${op}`);
  }
}
