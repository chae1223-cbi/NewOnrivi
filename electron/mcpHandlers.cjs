// ====================================================================
// 📊 [OMD-ELECTRON-mcpHandlers-0001] electron/mcpHandlers.cjs
// 🎯 @KICK  : 외부 AI(Google Gemini, Claude Desktop, ChatGPT) MCP 설정 연동 및 동적 mcp-context.json 동기화 모듈
// 🛡️ @GUARD : Rule 1(표준 주석 규격), Rule 2(대문자 코드값), 5대 정밀 진단 로깅
// 🚨 @PATCH : 2026-11-08 — [main.js 2단계 모듈 분리] main.js의 MCP 타겟 관리 및 컨텍스트 동기화 로직을 electron/mcpHandlers.cjs로 격리 모듈화
// 🔗 @CALLS : node:fs, node:path, node:os, node:child_process
// ====================================================================

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');

let mcpDeviceIdPromise = null;

/**
 * ========================================================================================
 * [함수명] getMcpDeviceId - 물리 기기 고유 UUID를 비동기 획득 (Windows CIM 조회, 5초 타임아웃)
 *
 * @returns {Promise<string|null>} 36자리 UUID 문자열 또는 null
 * ==========================================================================================
 */
const getMcpDeviceId = () => {
  if (mcpDeviceIdPromise) return mcpDeviceIdPromise;
  if (process.platform !== 'win32') return Promise.resolve(null);
  mcpDeviceIdPromise = new Promise(resolve => {
    execFile('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID'],
      { encoding: 'utf8', timeout: 5000 }, (error, output) => {
        const id = !error ? output.trim() : '';
        if (!/^[a-f0-9-]{36}$/i.test(id)) mcpDeviceIdPromise = null;
        resolve(/^[a-f0-9-]{36}$/i.test(id) ? id : null);
      });
  });
  return mcpDeviceIdPromise;
};

/**
 * ========================================================================================
 * [함수명] copyDirectoryRecursiveSync - 디렉터리 재귀 복사 유틸리티
 *
 * @param {string} srcDir - 원본 디렉터리 경로
 * @param {string} destDir - 대상 디렉터리 경로
 * ==========================================================================================
 */
const copyDirectoryRecursiveSync = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursiveSync(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

/**
 * ========================================================================================
 * [함수명] resolveMcpPluginRoot - 실행 환경(extraResources, asarUnpack, userData, dev)에 따른 MCP 플러그인 루트 경로 반환
 *
 * @param {object} app - Electron app 인스턴스
 * @param {string} rootDir - 프로젝트 루트 디렉터리 (__dirname)
 * @returns {string} 슬래시(/)로 정규화된 플러그인 루트 절대경로
 * ==========================================================================================
 */
const resolveMcpPluginRoot = (app, rootDir) => {
  const userData = app ? app.getPath('userData') : path.join(os.homedir(), 'AppData', 'Roaming', 'Onrivi Author');
  const userPluginDir = path.join(userData, 'plugins', 'onrivi-author');
  const appRootDir = rootDir || path.resolve(__dirname, '..');

  // 1순위: 데스크톱 설치 경로의 extraResources (예: C:/Program Files/Onrivi Author/resources/plugins/onrivi-author)
  if (process.resourcesPath) {
    const extraResPath = path.join(process.resourcesPath, 'plugins', 'onrivi-author');
    if (fs.existsSync(path.join(extraResPath, 'server', 'index.mjs'))) {
      try { copyDirectoryRecursiveSync(extraResPath, userPluginDir); } catch (_) {}
      return extraResPath.replace(/\\/g, '/');
    }
    // 2순위: 데스크톱 설치 경로의 asarUnpack (예: C:/Program Files/Onrivi Author/resources/app.asar.unpacked/plugins/onrivi-author)
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'plugins', 'onrivi-author');
    if (fs.existsSync(path.join(unpackedPath, 'server', 'index.mjs'))) {
      try { copyDirectoryRecursiveSync(unpackedPath, userPluginDir); } catch (_) {}
      return unpackedPath.replace(/\\/g, '/');
    }
  }

  // 3순위: 패키징된 앱에서 userData로 추출 및 동기화
  const bundledPath = path.join(appRootDir, 'plugins', 'onrivi-author');
  try {
    if (fs.existsSync(path.join(bundledPath, 'server', 'index.mjs'))) {
      copyDirectoryRecursiveSync(bundledPath, userPluginDir);
    }
  } catch (_) {}
  if ((app && app.isPackaged) || appRootDir.toLowerCase().includes('.asar')) {
    if (fs.existsSync(path.join(userPluginDir, 'server', 'index.mjs'))) {
      return userPluginDir.replace(/\\/g, '/');
    }
  }

  // 4순위: 로컬 개발 환경 (언패키징 상태)
  return bundledPath.replace(/\\/g, '/');
};

/**
 * ========================================================================================
 * [함수명] syncMcpEnvironmentVariable - Windows 사용자 레지스트리(HKCU)에 ONRIVI_MCP_HOME 환경변수 동기화
 *
 * @param {object} app - Electron app 인스턴스
 * @param {string} rootDir - 프로젝트 루트 디렉터리
 * @returns {string} 설정된 ONRIVI_MCP_HOME 경로
 * ==========================================================================================
 */
const syncMcpEnvironmentVariable = (app, rootDir) => {
  const pluginRoot = resolveMcpPluginRoot(app, rootDir);
  process.env.ONRIVI_MCP_HOME = pluginRoot;
  if (process.platform === 'win32') {
    execFile('reg', ['add', 'HKCU\\Environment', '/v', 'ONRIVI_MCP_HOME', '/t', 'REG_EXPAND_SZ', '/d', pluginRoot.replace(/\//g, '\\'), '/f'], () => {});
  }
  return pluginRoot;
};

/**
 * ========================================================================================
 * [함수명] getMcpDynamicBootstrapArg - AI 설정 파일에 기록될 동적 bootstrap 인자 생성
 *
 * @returns {string} node -e 용 import 스크립트 문자열
 * ==========================================================================================
 */
const getMcpDynamicBootstrapArg = () =>
  "import('file:///' + (process.env.ONRIVI_MCP_HOME || (process.env.APPDATA + '/Onrivi Author/plugins/onrivi-author')).replace(/\\\\/g, '/') + '/server/index.mjs')";

/**
 * ========================================================================================
 * [함수명] getMcpTargetConfigs - AI 클라이언트(Gemini, Claude Desktop) 설정 파일 경로 객체 반환
 *
 * @returns {object} { gemini, claude }
 * ==========================================================================================
 */
const getMcpTargetConfigs = () => {
  const home = os.homedir();
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  return {
    gemini: {
      name: 'Google Gemini / Antigravity',
      path: path.join(home, '.gemini', 'config', 'mcp_config.json'),
      dir: path.join(home, '.gemini', 'config')
    },
    claude: {
      name: 'Claude Desktop',
      path: process.platform === 'win32'
        ? path.join(appData, 'Claude', 'claude_desktop_config.json')
        : path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      dir: process.platform === 'win32'
        ? path.join(appData, 'Claude')
        : path.join(home, 'Library', 'Application Support', 'Claude')
    }
  };
};

const getChatGptMarketplace = () => {
  const dir = path.join(os.homedir(), '.agents', 'plugins');
  return { dir, file: path.join(dir, 'marketplace.json'), pluginDir: path.join(dir, 'onrivi-author') };
};

const readChatGptMarketplace = (file) => {
  if (!fs.existsSync(file)) return { name: 'onrivi-local', interface: { displayName: 'Onrivi Local' }, plugins: [] };
  const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  if (!data || !Array.isArray(data.plugins)) throw new Error('ChatGPT 개인 플러그인 목록 형식을 확인해 주세요.');
  return data;
};

/**
 * ========================================================================================
 * [함수명] registerMcpHandlers - Electron IPC 및 생명주기에 MCP 관련 핸들러 일괄 등록
 *
 * @param {object} params - 의존성 주입 객체
 * @param {object} params.ipcMain - Electron ipcMain
 * @param {object} params.app - Electron app
 * @param {Function} params.getMainWindow - 메인 윈도우 인스턴스 조회 게터
 * @param {string} [params.rootDir] - 프로젝트 루트 경로
 * ==========================================================================================
 */
function registerMcpHandlers({ ipcMain, app, getMainWindow, rootDir }) {
  const appRootDir = rootDir || path.resolve(__dirname, '..');
  const mcpContextFile = () => path.join(app.getPath('userData'), 'mcp-context.json');

  // 1. 초기 기동 시 환경변수 동기화
  if (app.isReady()) {
    try { syncMcpEnvironmentVariable(app, appRootDir); } catch (_) {}
  } else {
    app.whenReady().then(() => {
      try { syncMcpEnvironmentVariable(app, appRootDir); } catch (_) {}
    });
  }

  // 2. 앱 종료 전 임시 mcp-context.json 파일 정리
  app.on('before-quit', () => {
    try { fs.unlinkSync(mcpContextFile()); } catch {}
  });

  // 3. MCP 컨텍스트 스냅샷 동기화 핸들러
  ipcMain.handle('mcp-context:sync', async (event, context) => {
    const win = getMainWindow ? getMainWindow() : null;
    if (!win || event.sender !== win.webContents) throw new Error('INVALID_MCP_CONTEXT_SENDER');
    const deviceId = await getMcpDeviceId();
    const validPath = value => typeof value === 'string' && path.isAbsolute(value) && fs.existsSync(value) && fs.statSync(value).isDirectory();
    const snapshot = {
      version: 1,
      workspaceType: context?.workspaceType === 'cloud' ? 'cloud' : context?.workspaceType === 'browser' ? 'browser' : 'local',
      resourceKind: context?.resourceKind === 'drive' ? 'drive' : context?.resourceKind === 'browser' ? 'browser' : context?.resourceKind === 'local' ? 'local' : 'unset',
      workspacePath: context?.workspaceType === 'local' && validPath(context?.workspacePath) ? path.resolve(context.workspacePath) : null,
      resourcePath: context?.resourceKind === 'local' && validPath(context?.resourcePath) ? path.resolve(context.resourcePath) : null,
      deviceId,
      pid: process.pid,
      updatedAt: new Date().toISOString()
    };
    const target = mcpContextFile();
    const temporary = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(snapshot), 'utf8');
    fs.renameSync(temporary, target);
    return { synced: true, localReady: !!(snapshot.workspacePath && snapshot.resourcePath) };
  });

  // 4. MCP 타겟 설치 상태 점검 핸들러
  ipcMain.handle('mcp:check-targets', async () => {
    const targets = getMcpTargetConfigs();
    const result = {};
    for (const [key, target] of Object.entries(targets)) {
      let installed = false;
      let available = fs.existsSync(target.dir);
      if (fs.existsSync(target.path)) {
        try {
          const content = JSON.parse(fs.readFileSync(target.path, 'utf8') || '{}');
          installed = Boolean(content?.mcpServers?.['onrivi-author']);
        } catch (_) {}
      }
      result[key] = { name: target.name, available, installed, path: target.path.replace(/\\/g, '/') };
    }
    const chatgpt = getChatGptMarketplace();
    let registered = false;
    try {
      const marketplace = readChatGptMarketplace(chatgpt.file);
      registered = marketplace.plugins.some(item => item?.name === 'onrivi-author' && item?.source?.path === './onrivi-author')
        && fs.existsSync(path.join(chatgpt.pluginDir, 'server', 'index.mjs'));
    } catch (_) {}
    result.chatgpt = { name: 'ChatGPT Desktop', available: true, installed: registered, path: chatgpt.file.replace(/\\/g, '/') };
    return result;
  });

  // 5. MCP 타겟 등록 설치 핸들러
  ipcMain.handle('mcp:install-target', async (event, key) => {
    if (key === 'chatgpt') {
      const target = getChatGptMarketplace();
      const marketplace = readChatGptMarketplace(target.file);
      const source = resolveMcpPluginRoot(app, appRootDir);
      if (!fs.existsSync(path.join(source, 'server', 'index.mjs'))) throw new Error('온리비 어서 MCP 플러그인 파일을 찾지 못했습니다.');
      fs.mkdirSync(target.dir, { recursive: true });
      copyDirectoryRecursiveSync(source, target.pluginDir);
      marketplace.plugins = marketplace.plugins.filter(item => item?.name !== 'onrivi-author');
      marketplace.plugins.push({
        name: 'onrivi-author',
        source: { source: 'local', path: './onrivi-author' },
        policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
        category: 'Productivity'
      });
      fs.writeFileSync(target.file, JSON.stringify(marketplace, null, 2), 'utf8');
      return { success: true, path: target.file.replace(/\\/g, '/'), requiresInstall: true };
    }
    syncMcpEnvironmentVariable(app, appRootDir);
    const targets = getMcpTargetConfigs();
    const target = targets[key];
    if (!target) throw new Error('지원하지 않는 타겟입니다: ' + key);
    if (!fs.existsSync(target.dir)) {
      fs.mkdirSync(target.dir, { recursive: true });
    }
    let config = {};
    if (fs.existsSync(target.path)) {
      try {
        config = JSON.parse(fs.readFileSync(target.path, 'utf8') || '{}');
      } catch (_) {
        config = {};
      }
    }
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      config.mcpServers = {};
    }
    config.mcpServers['onrivi-author'] = {
      command: 'node',
      args: ['-e', getMcpDynamicBootstrapArg()]
    };
    fs.writeFileSync(target.path, JSON.stringify(config, null, 2), 'utf8');
    return { success: true, path: target.path.replace(/\\/g, '/') };
  });

  // 6. MCP 타겟 등록 해제 핸들러
  ipcMain.handle('mcp:uninstall-target', async (event, key) => {
    if (key === 'chatgpt') {
      const target = getChatGptMarketplace();
      if (!fs.existsSync(target.file)) return { success: true };
      const marketplace = readChatGptMarketplace(target.file);
      marketplace.plugins = marketplace.plugins.filter(item => item?.name !== 'onrivi-author');
      fs.writeFileSync(target.file, JSON.stringify(marketplace, null, 2), 'utf8');
      return { success: true };
    }
    const targets = getMcpTargetConfigs();
    const target = targets[key];
    if (!target || !fs.existsSync(target.path)) return { success: true };
    try {
      const config = JSON.parse(fs.readFileSync(target.path, 'utf8') || '{}');
      if (config.mcpServers && config.mcpServers['onrivi-author']) {
        delete config.mcpServers['onrivi-author'];
        fs.writeFileSync(target.path, JSON.stringify(config, null, 2), 'utf8');
      }
    } catch (_) {}
    return { success: true };
  });
}

module.exports = {
  registerMcpHandlers,
  getMcpDeviceId,
  resolveMcpPluginRoot,
  syncMcpEnvironmentVariable,
  getMcpTargetConfigs,
};
