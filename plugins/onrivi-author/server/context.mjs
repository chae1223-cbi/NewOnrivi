// ====================================================================
// 📊 [OMD-MCP-CONTEXT-0001] plugins/onrivi-author/server/context.mjs
// 🎯 @KICK  : PC 하이브리드 MCP의 작업장·리소스 폴더(LOCAL/GDRIVE) 영구 상태 관리 및 경로 무결성 검증
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), Rule 9(임의 폴백 원천 금지), 심볼릭 링크 차단
// 🚨 @PATCH : 2026-11-19 — [리소스 폴더 표준 스캐폴드 자동 생성] setLocalFolder('RESOURCE') 호출 시 대상 폴더 및 하위 디렉터리(profiles/prompt/media/settings/backups/bible/db)와 기본 JSON 파일(userCssProfiles.json, ai_presets.json, ai_prompts.json, shortcodes.json) 미존재 시 자동 생성
// 🚨 @PATCH : 2026-11-19 — [PC 하이브리드 MCP 전환] 명령어 기반 작업장·리소스 폴더(LOCAL/GDRIVE) 영구 저장(mcp-folders.json) 및 동적 전환 기능 구현
// 🔗 @CALLS : node:crypto, node:fs/promises, node:os, node:path
// ====================================================================
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const STORAGE_TYPE = Object.freeze({
  LOCAL: 'LOCAL',
  GDRIVE: 'GDRIVE',
});

export const FOLDER_ROLE = Object.freeze({
  WORKSPACE: 'WORKSPACE',
  RESOURCE: 'RESOURCE',
});

const RESOURCE_SUBDIRS = Object.freeze(['profiles', 'prompt', 'media', 'settings', 'backups', 'bible', 'db']);
const RESOURCE_DEFAULT_FILES = Object.freeze([
  { relativePath: path.join('profiles', 'userCssProfiles.json'), content: '[]\n' },
  { relativePath: path.join('prompt', 'ai_presets.json'), content: '[]\n' },
  { relativePath: path.join('prompt', 'ai_prompts.json'), content: '{}\n' },
  { relativePath: path.join('settings', 'shortcodes.json'), content: '[]\n' },
]);

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const emptySlot = (role) => ({
  role,
  storageType: null,
  path: '',
  folderId: '',
  folderName: '',
  configured: false,
  updatedAt: '',
});

/**
 * ========================================================================================
 * [함수명] getDefaultStateFilePath - PC MCP 폴더 설정 영구 파일(mcp-folders.json) 경로를 반환합니다.
 *
 * @returns {string} mcp-folders.json 절대경로
 * ==========================================================================================
 */
export function getDefaultStateFilePath() {
  if (process.env.ONRIVI_MCP_STATE_FILE) return path.resolve(process.env.ONRIVI_MCP_STATE_FILE);
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(base, 'Onrivi Author', 'mcp-folders.json');
}

const desktopContextCandidates = () => {
  if (process.env.ONRIVI_MCP_CONTEXT_FILE) return [process.env.ONRIVI_MCP_CONTEXT_FILE];
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return ['Onrivi Author', 'onrivi-author'].map((name) => path.join(base, name, 'mcp-context.json'));
};

/**
 * ========================================================================================
 * [함수명] validateLocalDirectory - 로컬 경로가 실존하는 일반 절대경로 디렉터리인지 검증합니다.
 *
 * @param {string} dirPath - 검증할 로컬 폴더 절대경로
 * @returns {Promise<string>} 정규화된 로컬 폴더 절대경로
 * @throws {Error} 절대경로가 아니거나 디렉터리가 아니거나 심볼릭 링크인 경우
 * ==========================================================================================
 */
export async function validateLocalDirectory(dirPath) {
  if (typeof dirPath !== 'string' || !dirPath.trim()) {
    throw new Error('로컬 폴더 경로를 입력해 주세요.');
  }
  const normalized = path.resolve(dirPath.trim());
  if (!path.isAbsolute(normalized)) {
    throw new Error('로컬 폴더는 절대경로로 지정해야 합니다.');
  }
  let stat;
  try {
    stat = await fs.lstat(normalized);
  } catch (err) {
    if (err?.code === 'ENOENT') {
      throw new Error('지정한 로컬 폴더가 존재하지 않습니다. 경로를 확인해 주세요.');
    }
    throw err;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('지정한 경로가 일반 로컬 디렉터리가 아닙니다.');
  }
  return normalized;
}

/**
 * ========================================================================================
 * [함수명] readPersistedState - mcp-folders.json에 저장된 PC MCP 폴더 설정을 로드합니다.
 *
 * @returns {Promise<{ version: number, configVersion: number, workspace: object, resource: object, updatedAt: string }>} 저장된 상태 객체
 * ==========================================================================================
 */
async function readPersistedState() {
  const filePath = getDefaultStateFilePath();
  try {
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384) {
      throw new Error('MCP 폴더 설정 파일이 손상되었거나 유효하지 않습니다.');
    }
    const raw = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return {
      version: 1,
      configVersion: Number.isInteger(raw.configVersion) && raw.configVersion >= 1 ? raw.configVersion : 1,
      workspace: raw.workspace ? { ...emptySlot(FOLDER_ROLE.WORKSPACE), ...raw.workspace, role: FOLDER_ROLE.WORKSPACE } : emptySlot(FOLDER_ROLE.WORKSPACE),
      resource: raw.resource ? { ...emptySlot(FOLDER_ROLE.RESOURCE), ...raw.resource, role: FOLDER_ROLE.RESOURCE } : emptySlot(FOLDER_ROLE.RESOURCE),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
    };
  } catch (err) {
    if (err?.code === 'ENOENT') {
      return {
        version: 1,
        configVersion: 1,
        workspace: emptySlot(FOLDER_ROLE.WORKSPACE),
        resource: emptySlot(FOLDER_ROLE.RESOURCE),
        updatedAt: '',
      };
    }
    console.error(JSON.stringify({
      event: 'MCP_STATE_READ_ERROR',
      file: 'plugins/onrivi-author/server/context.mjs',
      func: 'readPersistedState',
      doing: 'PC MCP 영구 폴더 설정 파일(mcp-folders.json) 읽기 중',
      target: 'mcp-folders.json',
      error: err?.message || String(err),
    }));
    throw err;
  }
}

/**
 * ========================================================================================
 * [함수명] writePersistedState - PC MCP 폴더 설정을 임시 파일 경유 원자적 교체로 저장합니다.
 *
 * @param {object} state - 저장할 상태 객체
 * @returns {Promise<object>} 저장 완료된 상태 객체
 * ==========================================================================================
 */
async function writePersistedState(state) {
  const filePath = getDefaultStateFilePath();
  const dir = path.dirname(filePath);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
  return state;
}

/**
 * ========================================================================================
 * [함수명] getDesktopAppContext - 현재 실행 중인 온리비 어서 데스크톱 앱의 mcp-context.json을 조회합니다.
 *
 * @returns {Promise<object|null>} 실행 중인 앱 컨텍스트 또는 null
 * ==========================================================================================
 */
export async function getDesktopAppContext() {
  const found = [];
  for (const candidate of desktopContextCandidates()) {
    try {
      const stat = await fs.lstat(candidate);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) continue;
      const raw = JSON.parse(await fs.readFile(candidate, 'utf8'));
      if (raw.version !== 1 || !Number.isInteger(raw.pid) || raw.pid <= 0) continue;
      const age = Date.now() - Date.parse(raw.updatedAt);
      if (!Number.isFinite(age) || age < -10000 || age > 90000) continue;
      try {
        process.kill(raw.pid, 0);
      } catch {
        continue;
      }
      found.push({ ...raw, contextFile: candidate });
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
    }
  }
  if (found.length === 0) return null;
  if (found.length > 1) {
    throw new Error('온리비 어서 폴더 정보가 여러 곳에 있습니다. 사용할 앱을 하나만 실행해 주세요.');
  }
  return found[0];
}

/**
 * ========================================================================================
 * [함수명] getCurrentFolders - 영구 설정, 실행 중 데스크톱 앱, 환경변수 순으로 현재 작업장·리소스 폴더를 조회합니다.
 * (Rule 9 준수: 설정이 없을 때 임의 기본 경로로 폴백하지 않고 configured: false로 반환합니다.)
 *
 * @returns {Promise<object>} 현재 작업장·리소스 폴더 통합 컨텍스트
 * ==========================================================================================
 */
export async function getCurrentFolders() {
  const persisted = await readPersistedState();
  const desktop = await getDesktopAppContext();

  let workspace = { ...persisted.workspace };
  let resource = { ...persisted.resource };

  // 1) 영구 설정이 비어 있을 때만 실행 중 데스크톱 앱 컨텍스트 참조
  if (!workspace.configured && desktop?.workspaceType === 'local' && desktop?.workspacePath) {
    workspace = {
      role: FOLDER_ROLE.WORKSPACE,
      storageType: STORAGE_TYPE.LOCAL,
      path: desktop.workspacePath,
      folderId: '',
      folderName: path.basename(desktop.workspacePath),
      configured: true,
      updatedAt: desktop.updatedAt || '',
    };
  }
  if (!resource.configured && desktop?.resourceKind === 'local' && desktop?.resourcePath) {
    resource = {
      role: FOLDER_ROLE.RESOURCE,
      storageType: STORAGE_TYPE.LOCAL,
      path: desktop.resourcePath,
      folderId: '',
      folderName: path.basename(desktop.resourcePath),
      configured: true,
      updatedAt: desktop.updatedAt || '',
    };
  }

  // 2) 여전히 비어 있을 때만 명시적 환경변수 참조 (임의 폴백 금지)
  const envWorkspace = String(process.env.ONRIVI_WORKSPACE_PATH || '').trim();
  const envResource = String(process.env.ONRIVI_RESOURCE_PATH || '').trim();
  if (!workspace.configured && envWorkspace) {
    workspace = {
      role: FOLDER_ROLE.WORKSPACE,
      storageType: STORAGE_TYPE.LOCAL,
      path: path.resolve(envWorkspace),
      folderId: '',
      folderName: path.basename(envWorkspace),
      configured: true,
      updatedAt: '',
    };
  }
  if (!resource.configured && envResource) {
    resource = {
      role: FOLDER_ROLE.RESOURCE,
      storageType: STORAGE_TYPE.LOCAL,
      path: path.resolve(envResource),
      folderId: '',
      folderName: path.basename(envResource),
      configured: true,
      updatedAt: '',
    };
  }

  const identity = {
    configVersion: persisted.configVersion,
    workspaceType: workspace.storageType,
    workspacePath: workspace.path,
    workspaceFolderId: workspace.folderId,
    resourceKind: resource.storageType,
    resourcePath: resource.path,
    resourceFolderId: resource.folderId,
  };

  return {
    configVersion: persisted.configVersion,
    workspace,
    resource,
    workspaceType: workspace.storageType,
    workspacePath: workspace.path,
    resourceKind: resource.storageType,
    resourcePath: resource.path,
    deviceId: desktop?.deviceId || '',
    pid: desktop?.pid || 0,
    contextFile: desktop?.contextFile || '',
    contextSha256: hash(identity),
    updatedAt: persisted.updatedAt || desktop?.updatedAt || '',
    localReady:
      workspace.configured &&
      workspace.storageType === STORAGE_TYPE.LOCAL &&
      resource.configured &&
      resource.storageType === STORAGE_TYPE.LOCAL,
  };
}

/**
 * ========================================================================================
 * [함수명] assertConfigVersion - 동시성 충돌 방지를 위해 expectedConfigVersion을 검증합니다.
 *
 * @param {object} persisted - 현재 영구 상태 객체
 * @param {number} [expectedConfigVersion] - 호출자가 기대하는 configVersion
 * @throws {Error} 버전이 일치하지 않는 경우
 * ==========================================================================================
 */
function assertConfigVersion(persisted, expectedConfigVersion) {
  if (expectedConfigVersion !== undefined && expectedConfigVersion !== null) {
    if (!Number.isInteger(expectedConfigVersion) || expectedConfigVersion !== persisted.configVersion) {
      throw new Error(`폴더 설정 버전이 변경되었습니다. (현재 버전: ${persisted.configVersion}) get_mcp_folders로 다시 조회해 주세요.`);
    }
  }
}

/**
 * ========================================================================================
 * [함수명] ensureResourceFolderScaffold - 로컬 리소스 폴더 및 필수 하위 디렉터리·기본 JSON 설정 파일을 안전하게 초기화합니다.
 * (기존 폴더나 파일이 이미 존재하는 경우 절대 덮어쓰지 않고 없는 항목만 생성합니다.)
 *
 * @param {string} resourcePath - 리소스 폴더 절대경로
 * @returns {Promise<{ path: string, createdDirs: string[], createdFiles: string[] }>} 생성된 항목 요약
 * @throws {Error} 절대경로가 아니거나 심볼릭 링크·일반 파일과 충돌하는 경우
 * ==========================================================================================
 */
export async function ensureResourceFolderScaffold(resourcePath) {
  if (typeof resourcePath !== 'string' || !resourcePath.trim()) {
    throw new Error('로컬 리소스 폴더 경로를 입력해 주세요.');
  }
  const normalized = path.resolve(resourcePath.trim());
  if (!path.isAbsolute(normalized)) {
    throw new Error('로컬 리소스 폴더는 절대경로로 지정해야 합니다.');
  }

  const createdDirs = [];
  const createdFiles = [];

  try {
    const rootStat = await fs.lstat(normalized);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw new Error('지정한 리소스 경로가 일반 로컬 디렉터리가 아닙니다.');
    }
  } catch (err) {
    if (err?.code === 'ENOENT') {
      await fs.mkdir(normalized, { recursive: true });
      createdDirs.push('.');
    } else {
      throw err;
    }
  }

  for (const sub of RESOURCE_SUBDIRS) {
    const dir = path.join(normalized, sub);
    try {
      const stat = await fs.lstat(dir);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error(`리소스 하위 폴더(${sub})가 일반 디렉터리가 아닙니다.`);
      }
    } catch (err) {
      if (err?.code === 'ENOENT') {
        await fs.mkdir(dir, { recursive: true });
        createdDirs.push(sub);
      } else {
        throw err;
      }
    }
  }

  for (const item of RESOURCE_DEFAULT_FILES) {
    const filePath = path.join(normalized, item.relativePath);
    try {
      const stat = await fs.lstat(filePath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`리소스 기본 설정 파일(${item.relativePath})이 일반 파일이 아닙니다.`);
      }
    } catch (err) {
      if (err?.code === 'ENOENT') {
        await fs.writeFile(filePath, item.content, { encoding: 'utf8', flag: 'wx' });
        createdFiles.push(item.relativePath.split(path.sep).join('/'));
      } else {
        throw err;
      }
    }
  }

  return { path: normalized, createdDirs, createdFiles };
}

/**
 * ========================================================================================
 * [함수명] setLocalFolder - 작업장 또는 리소스 폴더를 로컬 PC 디렉터리로 등록·변경합니다.
 * (RESOURCE 역할인 경우 대상 폴더 및 필수 하위 디렉터리·기본 JSON 설정 파일을 함께 자동 초기화합니다.)
 *
 * @param {'WORKSPACE'|'RESOURCE'} role - 변경할 폴더 역할
 * @param {string} dirPath - 로컬 PC 절대경로
 * @param {number} [expectedConfigVersion] - 동시성 확인용 설정 버전 (선택)
 * @returns {Promise<object>} 갱신된 폴더 컨텍스트 (RESOURCE일 때 scaffold 포함)
 * ==========================================================================================
 */
export async function setLocalFolder(role, dirPath, expectedConfigVersion) {
  const normalizedRole = String(role || '').toUpperCase();
  if (normalizedRole !== FOLDER_ROLE.WORKSPACE && normalizedRole !== FOLDER_ROLE.RESOURCE) {
    throw new Error('role은 WORKSPACE 또는 RESOURCE여야 합니다.');
  }
  let scaffold = null;
  let validPath;
  if (normalizedRole === FOLDER_ROLE.RESOURCE) {
    scaffold = await ensureResourceFolderScaffold(dirPath);
    validPath = scaffold.path;
  } else {
    validPath = await validateLocalDirectory(dirPath);
  }
  const persisted = await readPersistedState();
  assertConfigVersion(persisted, expectedConfigVersion);

  const now = new Date().toISOString();
  const nextSlot = {
    role: normalizedRole,
    storageType: STORAGE_TYPE.LOCAL,
    path: validPath,
    folderId: '',
    folderName: path.basename(validPath),
    configured: true,
    updatedAt: now,
  };

  if (normalizedRole === FOLDER_ROLE.WORKSPACE) {
    persisted.workspace = nextSlot;
  } else {
    persisted.resource = nextSlot;
  }
  persisted.configVersion += 1;
  persisted.updatedAt = now;

  await writePersistedState(persisted);
  const latest = await getCurrentFolders();
  return scaffold ? { ...latest, scaffold } : latest;
}

/**
 * ========================================================================================
 * [함수명] setGdriveFolder - 작업장 또는 리소스 폴더를 Google Drive 폴더로 등록·변경합니다.
 *
 * @param {'WORKSPACE'|'RESOURCE'} role - 변경할 폴더 역할
 * @param {{ folderId: string, folderName?: string }} gdrive - Google Drive 폴더 식별 정보
 * @param {number} [expectedConfigVersion] - 동시성 확인용 설정 버전 (선택)
 * @returns {Promise<object>} 갱신된 폴더 컨텍스트
 * ==========================================================================================
 */
export async function setGdriveFolder(role, { folderId, folderName = '' }, expectedConfigVersion) {
  const normalizedRole = String(role || '').toUpperCase();
  if (normalizedRole !== FOLDER_ROLE.WORKSPACE && normalizedRole !== FOLDER_ROLE.RESOURCE) {
    throw new Error('role은 WORKSPACE 또는 RESOURCE여야 합니다.');
  }
  const cleanId = String(folderId || '').trim();
  if (!cleanId) {
    throw new Error('Google Drive 폴더 ID(folderId)를 지정해 주세요.');
  }
  const persisted = await readPersistedState();
  assertConfigVersion(persisted, expectedConfigVersion);

  const now = new Date().toISOString();
  const nextSlot = {
    role: normalizedRole,
    storageType: STORAGE_TYPE.GDRIVE,
    path: '',
    folderId: cleanId,
    folderName: String(folderName || '').trim() || cleanId,
    configured: true,
    updatedAt: now,
  };

  if (normalizedRole === FOLDER_ROLE.WORKSPACE) {
    persisted.workspace = nextSlot;
  } else {
    persisted.resource = nextSlot;
  }
  persisted.configVersion += 1;
  persisted.updatedAt = now;

  await writePersistedState(persisted);
  return getCurrentFolders();
}

/**
 * ========================================================================================
 * [함수명] clearMcpFolder - 지정한 역할(WORKSPACE/RESOURCE)의 폴더 설정을 해제합니다.
 *
 * @param {'WORKSPACE'|'RESOURCE'} role - 해제할 폴더 역할
 * @param {number} [expectedConfigVersion] - 동시성 확인용 설정 버전 (선택)
 * @returns {Promise<object>} 갱신된 폴더 컨텍스트
 * ==========================================================================================
 */
export async function clearMcpFolder(role, expectedConfigVersion) {
  const normalizedRole = String(role || '').toUpperCase();
  if (normalizedRole !== FOLDER_ROLE.WORKSPACE && normalizedRole !== FOLDER_ROLE.RESOURCE) {
    throw new Error('role은 WORKSPACE 또는 RESOURCE여야 합니다.');
  }
  const persisted = await readPersistedState();
  assertConfigVersion(persisted, expectedConfigVersion);

  const now = new Date().toISOString();
  if (normalizedRole === FOLDER_ROLE.WORKSPACE) {
    persisted.workspace = emptySlot(FOLDER_ROLE.WORKSPACE);
  } else {
    persisted.resource = emptySlot(FOLDER_ROLE.RESOURCE);
  }
  persisted.configVersion += 1;
  persisted.updatedAt = now;

  await writePersistedState(persisted);
  return getCurrentFolders();
}

/**
 * ========================================================================================
 * [함수명] requireWorkspaceContext - 현재 작업장이 유효하게 설정되어 있는지 검증합니다.
 *
 * @param {string} [expectedContextSha256] - 동시성 확인용 컨텍스트 해시 (선택)
 * @returns {Promise<object>} 검증 완료된 폴더 컨텍스트
 * @throws {Error} 작업장이 미설정이거나 로컬 디렉터리가 유효하지 않은 경우
 * ==========================================================================================
 */
export async function requireWorkspaceContext(expectedContextSha256) {
  const context = await getCurrentFolders();
  if (expectedContextSha256 && context.contextSha256 !== expectedContextSha256) {
    throw new Error('작업장 또는 리소스 폴더가 변경되었습니다. 현재 폴더를 다시 조회해 주세요.');
  }
  if (!context.workspace.configured) {
    throw new Error('작업장이 설정되어 있지 않습니다. set_mcp_workspace로 로컬 경로 또는 Google Drive 폴더를 먼저 지정해 주세요.');
  }
  if (context.workspace.storageType === STORAGE_TYPE.LOCAL) {
    await validateLocalDirectory(context.workspace.path);
  }
  return context;
}

/**
 * ========================================================================================
 * [함수명] requireResourceContext - 현재 리소스 폴더가 유효하게 설정되어 있는지 검증합니다.
 *
 * @param {string} [expectedContextSha256] - 동시성 확인용 컨텍스트 해시 (선택)
 * @returns {Promise<object>} 검증 완료된 폴더 컨텍스트
 * @throws {Error} 리소스 폴더가 미설정이거나 로컬 디렉터리가 유효하지 않은 경우
 * ==========================================================================================
 */
export async function requireResourceContext(expectedContextSha256) {
  const context = await getCurrentFolders();
  if (expectedContextSha256 && context.contextSha256 !== expectedContextSha256) {
    throw new Error('작업장 또는 리소스 폴더가 변경되었습니다. 현재 폴더를 다시 조회해 주세요.');
  }
  if (!context.resource.configured) {
    throw new Error('리소스 폴더가 설정되어 있지 않습니다. set_mcp_resource_folder로 로컬 경로 또는 Google Drive 폴더를 먼저 지정해 주세요.');
  }
  if (context.resource.storageType === STORAGE_TYPE.LOCAL) {
    await validateLocalDirectory(context.resource.path);
  }
  return context;
}

/**
 * ========================================================================================
 * [함수명] requireLocalFolders - 작업장과 리소스 폴더가 모두 유효한 로컬 디렉터리인지 검증합니다.
 *
 * @param {string} [expectedContextSha256] - 동시성 확인용 컨텍스트 해시 (선택)
 * @returns {Promise<object>} 검증 완료된 폴더 컨텍스트
 * ==========================================================================================
 */
export async function requireLocalFolders(expectedContextSha256) {
  const context = await getCurrentFolders();
  if (!context.localReady) {
    throw new Error('현재 작업장과 리소스 폴더가 모두 로컬로 연결돼 있어야 합니다. set_mcp_workspace / set_mcp_resource_folder로 설정해 주세요.');
  }
  if (expectedContextSha256 && context.contextSha256 !== expectedContextSha256) {
    throw new Error('작업장 또는 리소스 폴더가 변경되었습니다. 현재 폴더를 다시 조회해 주세요.');
  }
  await validateLocalDirectory(context.workspacePath);
  await validateLocalDirectory(context.resourcePath);
  return context;
}
