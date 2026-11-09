// ====================================================================
// 📊 [OMD-ELECTRON-fileIpcHandlers-0001] electron/fileIpcHandlers.cjs
// 🎯 @KICK  : Electron 데스크톱 파일 시스템, 폴더 탐색기, 다이얼로그 IPC 핸들러 모듈
// 🛡️ @GUARD : Rule 1(표준 주석 규격), Rule 2(대문자 코드값), 5대 정밀 진단 로깅
// 🚨 @PATCH : 2026-11-08 — [main.js 3단계 모듈 분리] main.js의 파일/폴더 I/O 및 탐색기 IPC 핸들러 1,000줄을 electron/fileIpcHandlers.cjs로 격리 모듈화
// 🔗 @CALLS : electron(dialog, shell), node:fs, node:path, node:crypto, node:os
// ====================================================================

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { shell: electronShell, dialog: electronDialog } = require('electron');

/**
 * ========================================================================================
 * [함수명] registerFileIpcHandlers - 파일 시스템 및 작업장 탐색기 제어 IPC 핸들러 일괄 등록
 *
 * @param {object} params - 의존성 주입 객체
 * @param {object} params.ipcMain - Electron ipcMain
 * @param {object} params.app - Electron app
 * @param {object} params.dialog - Electron dialog
 * @param {object} params.shell - Electron shell
 * @param {Function} params.getMainWindow - 메인 윈도우 인스턴스 조회 게터
 * @param {Function} params.getFilePathToOpen - 초기 열기 파일 경로 게터
 * @param {Function} params.clearFilePathToOpen - 초기 열기 파일 경로 클리어 함수
 * @param {Function} params.getCurrentWorkspacePath - 현재 활성 작업장 경로 게터
 * @param {Function} params.setCurrentWorkspacePath - 현재 활성 작업장 경로 세터
 * ==========================================================================================
 */
function registerFileIpcHandlers({
  ipcMain,
  app,
  dialog,
  shell,
  getMainWindow,
  getFilePathToOpen,
  clearFilePathToOpen,
  getCurrentWorkspacePath,
  setCurrentWorkspacePath
}) {
  const getWin = () => (typeof getMainWindow === 'function' ? getMainWindow() : null);
  const activeShell = shell || electronShell;
  const activeDialog = dialog || electronDialog;

  // 🔒 [ 순수 데스크톱 파일 제어 IPC 핸들러 등록 ]
  const getActiveWorkspace = () => (typeof getCurrentWorkspacePath === 'function' ? getCurrentWorkspacePath() : null);
    const setActiveWorkspace = (val) => { if (typeof setCurrentWorkspacePath === 'function') setCurrentWorkspacePath(val); };
  
  /**
   * ========================================================================================
   * [함수명] findFileRecursive - 작업장 파일명을 비동기로 탐색하며 생성 산출물은 건너뜁니다.
   * @param {string} dir - 탐색 폴더
   * @param {string} targetName - 찾을 파일명
   * @param {number} currentDepth - 현재 깊이
   * @param {number} maxDepth - 최대 깊이
   * @returns {Promise<string|null>} 찾은 파일 경로 또는 null
   * ========================================================================================
   */
  async function findFileRecursive(dir, targetName, currentDepth = 0, maxDepth = 4) {
    if (currentDepth > maxDepth || !dir) return null;
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
          return path.join(dir, entry.name);
        }
        if (entry.isDirectory() && !['node_modules', '.git', '.next', '.next-desktop', '.vscode', 'out', 'dist', 'dist-win', 'dist-electron', 'build', 'release', 'scratch', '.tmp'].includes(entry.name.toLowerCase())) {
          const found = await findFileRecursive(path.join(dir, entry.name), targetName, currentDepth + 1, maxDepth);
          if (found) return found;
        }
      }
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'EACCES' && error?.code !== 'EPERM') {
        console.warn(JSON.stringify({ file: 'main.js', func: 'findFileRecursive', doing: '작업장 하위 파일명 탐색 중', target: path.basename(dir), error: error?.message || String(error) }));
      }
    }
    return null;
  }
  
  // 0. 초기 파일 연결 경로 조회 (renderer가 준비된 후 pull 방식으로 가져감)
  ipcMain.handle('get-initial-file-path', () => {
    if (typeof getFilePathToOpen === 'function') {
      const initialPath = getFilePathToOpen();
      if (typeof clearFilePathToOpen === 'function') clearFilePathToOpen();
      return initialPath;
    }
    return null;
  });
  
  // 0-1. 마지막 세션 데이터 저장 (오픈된 탭 파일 경로 목록 + 활성 탭 파일 경로)
  ipcMain.handle('session:saveLastSession', (event, sessionData) => {
    try {
      const userDataPath = app.getPath('userData');
      const sessionPath = path.join(userDataPath, 'session.json');
      const data = {
        openFilePaths: sessionData?.openFilePaths || [],
        activeFilePath: sessionData?.activeFilePath || null,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[session:saveLastSession] 오류:', e);
      return false;
    }
  });
  
  // 0-2. 마지막 세션 데이터 복원 (존재하는 파일들만 유효성 체크 후 반환)
  ipcMain.handle('session:getLastSession', () => {
    try {
      const userDataPath = app.getPath('userData');
      const sessionPath = path.join(userDataPath, 'session.json');
      if (!fs.existsSync(sessionPath)) return null;
      const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      
      // 파일이 디스크에 실제 존재하고 있는 것만 필터링
      const validOpenPaths = (data?.openFilePaths || []).filter(filePath => 
        filePath && fs.existsSync(filePath)
      );
      const activePath = data?.activeFilePath;
      const validActivePath = (activePath && fs.existsSync(activePath)) ? activePath : null;
  
      return {
        openFilePaths: validOpenPaths,
        activeFilePath: validActivePath
      };
    } catch (e) {
      console.error('[session:getLastSession] 오류:', e);
      return null;
    }
  });
  
  // 2. 현재 파일 덮어쓰기 저장 핸들러
  ipcMain.handle('file:save', async (event, filePath, content) => {
    try {
      let cleanPath = filePath.normalize('NFC');
      if (cleanPath.startsWith('file:///')) {
        cleanPath = decodeURIComponent(cleanPath.replace(/^file:\/\/\/?/, ''));
      }
      const normalized = cleanPath.replace(/\\/g, '/');
      if (/(?:^|\/)[^/]+\.asar(?:\/|$)/i.test(normalized)) throw new Error('앱에 포함된 문서는 덮어쓸 수 없습니다. 다른 이름으로 저장해 주세요.');
      if (path.isAbsolute(cleanPath) || /^[a-zA-Z]:\//.test(normalized) || cleanPath.startsWith('/')) {
        cleanPath = path.resolve(cleanPath);
      }
      fs.writeFileSync(cleanPath, content, 'utf-8');
  
      // 🛡️ [도움말 3중 미러 자동 동기화 - 재빌드 시 초기화 영구 방어]
      const isHelpDoc = /(?:^|\/)help\/[^/]+\.md$/i.test(normalized) || /^(?:HELP-[^/]+|00_시작하기)\.md$/i.test(path.basename(cleanPath));
      if (isHelpDoc) {
        const helpFileName = path.basename(cleanPath);
        const projectRoot = app.getAppPath();
        const mirrorPaths = [
          path.join(projectRoot, 'frontend/public/help', helpFileName),
          path.join(projectRoot, 'docs/help', helpFileName),
          path.join(projectRoot, 'frontend/out/help', helpFileName)
        ];
        for (const mPath of mirrorPaths) {
          try {
            const normMPath = path.resolve(mPath.normalize('NFC'));
            if (normMPath !== cleanPath) {
              const dir = path.dirname(normMPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(normMPath, content, 'utf-8');
            }
          } catch (mirrorErr) {
            console.warn('[file:save] 도움말 미러 동기화 경고:', mPath, mirrorErr.message);
          }
        }
      }
  
      return true;
    } catch (e) {
      console.error('로컬 파일 덮어쓰기 저장 실패:', e);
      throw e;
    }
  });
  
  // 3. 다른 이름으로 저장 핸들러 (워크스페이스 폴더 우선, suggestedName 및 커스텀 필터 지원)
  ipcMain.handle('file:saveAs', async (event, content, suggestedName, defaultDir, filters) => {
    const defaultName = suggestedName || 'untitled.md';
    const cleanDefaultDir = defaultDir ? defaultDir.normalize('NFC') : undefined;
    const startDir = cleanDefaultDir && fs.existsSync(cleanDefaultDir) ? cleanDefaultDir : app.getPath('documents');
    const targetFilters = filters || [{ name: 'Markdown Files', extensions: ['md'] }];
    
    const result = await activeDialog.showSaveDialog(getWin(), {
      title: '다른 이름으로 저장',
      defaultPath: path.join(startDir, defaultName),
      filters: targetFilters
    });
  
    if (result.canceled || !result.filePath) {
      return null;
    }
  
    const filePath = result.filePath.normalize('NFC');
    try {
      if (content.startsWith('data:') && content.includes(';base64,')) {
        const base64Data = content.split(';base64,')[1];
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      return {
        name: path.basename(filePath),
        path: filePath
      };
    } catch (e) {
      console.error('로컬 다른 이름 저장 실패:', e);
      throw e;
    }
  });
  
  // 4.5 프론트엔드에서 저장 다이얼로그 호출
  ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    const win = getWin(); if (!win) return { canceled: true };
    const settings = { ...options };
    if (settings.defaultPath && !path.isAbsolute(settings.defaultPath)) {
      settings.defaultPath = path.join(app.getPath('downloads'), path.basename(settings.defaultPath));
    }
    console.info('[Save dialog] requested');
    const result = await activeDialog.showSaveDialog(getWin(), settings);
    return result;
  });
  
  ipcMain.handle('file:saveBinary', async (event, filePath, bytes) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !(bytes instanceof Uint8Array)) {
      throw new Error('파일 저장 경로나 데이터가 올바르지 않습니다.');
    }
    try {
      await fs.promises.writeFile(filePath, bytes);
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        throw new Error(`파일을 저장할 수 없습니다. PDF 뷰어 등에서 '${path.basename(filePath)}' 파일을 닫은 후 다시 저장하거나 다른 파일 이름을 선택해 주세요. (${error.code})`);
      }
      throw error;
    }
    return { name: path.basename(filePath), path: filePath };
  });
  
  // 문서 전송은 원본·동명 파일을 덮어쓰지 않고 선택한 폴더 내부에 복사한다.
  ipcMain.handle('file:readTransferFile', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('절대 파일 경로가 필요합니다.');
    return new Uint8Array(await fs.promises.readFile(filePath));
  });
  ipcMain.handle('file:writeTransferCopy', async (_event, folderPath, relativePath, bytes) => {
    if (typeof folderPath !== 'string' || !path.isAbsolute(folderPath) || typeof relativePath !== 'string' || !(bytes instanceof Uint8Array)) throw new Error('전송 경로나 데이터가 올바르지 않습니다.');
    const root = path.resolve(folderPath);
    const destination = path.resolve(root, relativePath);
    const relative = path.relative(root, destination);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('선택한 폴더 밖으로 저장할 수 없습니다.');
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    const parsed = path.parse(destination);
    for (let index = 0; index < 10000; index++) {
      const candidate = index ? path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`) : destination;
      try {
        await fs.promises.writeFile(candidate, bytes, { flag: 'wx' });
        return { path: candidate, relativePath: path.relative(root, candidate).replace(/\\/g, '/'), reused: false };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const existing = await fs.promises.readFile(candidate);
        if (existing.equals(Buffer.from(bytes))) return { path: candidate, relativePath: path.relative(root, candidate).replace(/\\/g, '/'), reused: true };
      }
    }
    throw new Error('동일 이름 파일이 너무 많습니다.');
  });
  
  // 🛡️ [외부 웹 이미지 다운로드 브리지 (CORS 원천 우회)]
  ipcMain.handle('net:fetchImageBlob', async (_event, imageUrl) => {
    if (typeof imageUrl !== 'string' || !/^https?:\/\//i.test(imageUrl)) return null;
    try {
      const response = await net.fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      return {
        bytes: new Uint8Array(arrayBuffer),
        contentType
      };
    } catch (err) {
      console.error('[net:fetchImageBlob failed]', err);
      return null;
    }
  });
  
  // 4. 프론트엔드에서 폴더 선택 다이얼로그 호출 시 OS 표준 창 띄우기
  //    기본 경로는 사용자 Documents 폴더 혹은 전달받은 defaultPath
  ipcMain.handle('dialog:selectMediaFile', async (_event, options = {}) => {
    const video = options.kind === 'video';
    const extensions = video ? ['mp4','webm','mov','ogg','m4v','avi','mkv'] : ['png','jpg','jpeg','gif','webp','svg','bmp','avif'];
    const start = typeof options.defaultPath === 'string' ? path.resolve(options.defaultPath.normalize('NFC')) : '';
    if (!start || !fs.existsSync(start) || !fs.statSync(start).isDirectory()) throw new Error('환경설정의 로컬 리소스 폴더를 확인해 주세요.');
    const result = await activeDialog.showOpenDialog(getWin(),{title:video?'동영상 선택':'사진 선택',defaultPath:start,properties:['openFile'],filters:[{name:video?'동영상':'사진',extensions}]});
    if(result.canceled || !result.filePaths.length)return {canceled:true};
    const selected = result.filePaths[0];
    const extension = path.extname(selected).slice(1).toLowerCase();
    if(!extensions.includes(extension))throw new Error('지원하는 미디어 파일을 선택해 주세요.');
    if(video && (await fs.promises.stat(selected)).size > 100*1024*1024)throw new Error('동영상 크기는 100MB를 초과할 수 없습니다.');
    const types = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',ogg:'video/ogg',m4v:'video/mp4',avi:'video/x-msvideo',mkv:'video/x-matroska'};
    return {canceled:false,name:path.basename(selected),mimeType:types[extension],bytes:new Uint8Array(await fs.promises.readFile(selected))};
  });
  
  ipcMain.handle('dialog:chooseImportDocument', async (event, defaultPath) => {
    const win = getWin(); if (!win || event.sender !== win.webContents) return null;
    const start = typeof defaultPath === 'string' && path.isAbsolute(defaultPath) && fs.existsSync(defaultPath) && fs.statSync(defaultPath).isDirectory()
      ? defaultPath : app.getPath('documents');
    const result = await activeDialog.showOpenDialog(getWin(), {
      title: '가져올 파일 선택', defaultPath: start, properties: ['openFile'],
      filters: [{ name: '지원 문서 (DOCX, HWP, PDF, EPUB, TXT, MD, HTML)', extensions: ['docx', 'hwp', 'pdf', 'epub', 'txt', 'md', 'markdown', 'html', 'htm'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const selectedPath = result.filePaths[0];
    return { path: selectedPath, name: path.basename(selectedPath) };
  });
  
  ipcMain.handle('dialog:selectFolder', async (event, defaultPath) => {
    const win = getWin(); if (!win) return { status: 'canceled' };
    
    // 💡 [요구사항 2] 전달받은 경로 문자열을 윈도우 파일 시스템 표준 경로구분자(path.sep)로 정밀 변환 및 NFC 노멀라이징 수행
    let cleanDefault = defaultPath ? defaultPath.normalize('NFC') : undefined;
    if (cleanDefault) {
      cleanDefault = path.resolve(cleanDefault.replace(/\//g, path.sep));
    }
    
    let startDir = cleanDefault && fs.existsSync(cleanDefault) && fs.statSync(cleanDefault).isDirectory()
      ? cleanDefault
      : app.getPath('documents');
  
    // Open inside the current workspace and accept directories only.
    const properties = ['openDirectory', 'createDirectory'];
  
    const result = await activeDialog.showOpenDialog(getWin(), {
      title: defaultPath ? `워크스페이스 폴더 선택 - ${defaultPath}` : '워크스페이스 폴더 선택',
      defaultPath: startDir,
      properties: properties
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { status: 'canceled' };
    }
    const finalPath = result.filePaths[0];
    return { status: 'success', path: finalPath };
  });
  
  // 5. 절대 경로를 지정하여 직접 파일 내용 읽기
  ipcMain.handle('file:readFromPath', async (event, filePath) => {
    const readStartedAt = Date.now();
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('유효하지 않은 파일 경로입니다.');
      }
      let cleanPath = filePath.normalize('NFC');
      if (cleanPath.startsWith('file:///')) {
        cleanPath = decodeURIComponent(cleanPath.slice(8));
      }
      
      // 윈도우 슬래시 스타일 포함하여 절대 경로 정밀 판별
      const normalizedPath = cleanPath.replace(/\\/g, '/');
      // Only explicit help URLs/names may resolve to bundled help. A missing
      // absolute workspace file must not silently open an installed namesake.
      const canUseBundledHelp = /^(?:\.?\/)?(?:docs\/)?help\/[^/]+\.md$/i.test(normalizedPath)
        || /^(?:HELP-[^/]+|00_시작하기)\.md$/i.test(normalizedPath);
      const isAbsolute = path.isAbsolute(cleanPath) || /^[a-zA-Z]:\//.test(normalizedPath) || cleanPath.startsWith('/');
  
      if (isAbsolute) {
        cleanPath = path.resolve(cleanPath);
      } else if (cleanPath.startsWith('docs/help/')) {
        const projectRoot = app.getAppPath();
        cleanPath = path.join(projectRoot, cleanPath).normalize('NFC');
      } else {
        // 🛡️ [상대경로/파일명 단독 유입 시 활성 워크스페이스 우선 탐색]:
        let foundPath = '';
        if (getActiveWorkspace() && fs.existsSync(getActiveWorkspace())) {
          // 1) 워크스페이스 직접 조인
          const directCandidate = path.join(getActiveWorkspace(), cleanPath).normalize('NFC');
          if (fs.existsSync(directCandidate)) {
            foundPath = directCandidate;
          } else if (!/[\\/]/.test(cleanPath)) {
            // 2) 단일 파일명인 경우 워크스페이스 하위 재귀 탐색
            const targetBase = path.basename(cleanPath);
            const recursiveCandidate = await findFileRecursive(getActiveWorkspace(), targetBase, 0, 5);
            if (recursiveCandidate) {
              foundPath = recursiveCandidate;
            }
          }
        }
  
        if (foundPath) {
          cleanPath = foundPath;
        } else if (canUseBundledHelp) {
          // 명시적인 도움말 요청만 앱 리소스에서 탐색
          const pathsToTry = [
            path.join(app.getAppPath(), 'frontend/public', filePath),
            path.join(app.getAppPath(), 'frontend/out', filePath),
            path.join(app.getAppPath(), filePath),
            path.join(process.resourcesPath, 'frontend/public', filePath),
            path.join(process.resourcesPath, 'frontend/out', filePath),
            path.join(process.resourcesPath, filePath)
          ];
          
          for (const p of pathsToTry) {
            const normalizedP = p.normalize('NFC');
            if (fs.existsSync(normalizedP)) {
              cleanPath = normalizedP;
              break;
            }
          }
        }
      }
  
      // 명시적인 도움말 요청만 설치 리소스로 연결합니다.
      // 없는 작업장 문서를 설치본의 동명 파일로 바꿔 열지 않습니다.
      if (!fs.existsSync(cleanPath) && canUseBundledHelp) {
        const targetFileName = path.basename(cleanPath);
        {
          const helpPathsToTry = [
            path.join(app.getAppPath(), 'frontend/public/help', targetFileName),
            path.join(app.getAppPath(), 'frontend/out/help', targetFileName),
            path.join(process.resourcesPath, 'frontend/public/help', targetFileName),
            path.join(process.resourcesPath, 'frontend/out/help', targetFileName),
            path.join(app.getAppPath(), 'docs/help', targetFileName)
          ];
          for (const hp of helpPathsToTry) {
            const normHp = hp.normalize('NFC');
            if (fs.existsSync(normHp)) {
              cleanPath = normHp;
              break;
            }
          }
        }
      }
  
      // 최종 검증
      if (!fs.existsSync(cleanPath)) {
        throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
      }
        
      const rawContent = await fs.promises.readFile(cleanPath, 'utf-8');
      let content = rawContent;
      try {
        content = require('./desktopInlineImages').externalizeInlineImages(rawContent, cleanPath);
      } catch (inlineErr) {
        // desktopInlineImages 모듈이 누락되었거나 처리 실패 시에도 파일 읽기는 원본 본문으로 무중단 반환
        content = rawContent;
      }
      const readMs = Date.now() - readStartedAt;
      if (readMs > 300) console.info('[STARTUP timing] document read ms=%d bytes=%d file=%s', readMs, Buffer.byteLength(rawContent, 'utf8'), path.basename(cleanPath));
      return {
        name: path.basename(cleanPath),
        path: cleanPath,
        content: content
      };
    } catch (e) {
      console.error('로컬 파일 절대경로 읽기 실패:', e.message || e);
      throw e;
    }
  });
  
  // 폴더 아래의 모든 .md / .markdown 파일을 재귀적으로 찾는 헬퍼 함수 (무시 폴더 필터 및 안정성 강화)
  const IGNORED_SEARCH_DIRS = new Set([
    'node_modules', '.git', '.next', 'out', 'dist', 'build', '.wrangler',
    '_dev_api_backup', '.vscode', '.idea', 'scratch', '.next-web-build'
  ]);
  
  function getAllMdFiles(dirPath, fileList = [], depth = 0, visitedDirs = new Set()) {
    if (depth > 12) return fileList; // 지나치게 깊은 재귀 탐색 방어
    try {
      if (!dirPath || typeof dirPath !== 'string' || !fs.existsSync(dirPath)) {
        return fileList;
      }
      let realDir = dirPath;
      try {
        realDir = fs.realpathSync(dirPath);
      } catch {}
      const normRealDir = realDir.toLowerCase();
      if (visitedDirs.has(normRealDir)) return fileList;
      visitedDirs.add(normRealDir);
  
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryName = entry.name;
        const fullEntryPath = path.join(dirPath, entryName);
        let isDir = entry.isDirectory();
        let isFile = entry.isFile();
        if (entry.isSymbolicLink()) {
          try {
            const stat = fs.statSync(fullEntryPath);
            isDir = stat.isDirectory();
            isFile = stat.isFile();
          } catch {
            continue;
          }
        }
        if (isDir) {
          const lowerName = entryName.toLowerCase();
          if (lowerName.startsWith('.') || IGNORED_SEARCH_DIRS.has(lowerName)) {
            continue;
          }
          getAllMdFiles(fullEntryPath, fileList, depth + 1, visitedDirs);
        } else if (isFile) {
          const lowerName = entryName.toLowerCase();
          if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.bib')) {
            fileList.push(fullEntryPath);
          }
        }
      }
    } catch (e) {
      console.error('폴더 스캔 에러:', e?.message || e);
    }
    return fileList;
  }
  
  // 6. 드라이브 목록 조회 (Windows 탐색기)
  ipcMain.handle('file:getDrives', async () => {
    if (process.platform !== 'win32') {
      return ['/'];
    }
    try {
      // Windows 11에서 제거된 deprecated wmic 대신, Node.js 네이티브 fs 병렬 검사로 즉각적(0~10ms) 탐색
      const checks = Array.from({ length: 26 }, (_, index) => {
        const drive = String.fromCharCode(65 + index) + ':';
        return fs.promises.access(drive + '\\').then(() => drive, () => null);
      });
      const found = (await Promise.all(checks)).filter(Boolean);
      if (found.length > 0) return found;
    } catch (e) {
      console.warn(JSON.stringify({ file: 'main.js', func: 'file:getDrives', doing: '드라이브 목록 비동기 조회 중', target: 'local-drives', error: e?.message || String(e) }));
    }
    return ['C:'];
  });
  
  
  
  // 워크스페이스 실시간 감지 (chokidar)
  let workspaceWatcher = null;
  let workspaceNotifyTimer = null;
  ipcMain.handle('file:watchWorkspace', async (event, workspacePath) => {
    try {
      if (workspaceWatcher) {
        await workspaceWatcher.close();
        workspaceWatcher = null;
      }
      if (workspaceNotifyTimer) {
        clearTimeout(workspaceNotifyTimer);
        workspaceNotifyTimer = null;
      }
      if (!workspacePath) return { success: false, error: '경로 없음' };
  
      const cleanPath = path.resolve(workspacePath.replace(/^file:\/\/\/?/, '')).normalize('NFC');
      if (!fs.existsSync(cleanPath)) {
        return { success: false, error: '경로가 존재하지 않음: ' + cleanPath };
      }
  
      const ignoredDirectories = new Set(['node_modules', '.git', '.next', '.next-desktop', '.vscode', 'out', 'dist', 'dist-win', 'dist-electron', 'build', 'release', 'scratch']);
      workspaceWatcher = chokidar.watch(cleanPath, {
        ignored: watchedPath => {
          const relative = path.relative(cleanPath, watchedPath).replace(/\\/g, '/');
          return relative.split('/').some(segment => segment.startsWith('.') || ignoredDirectories.has(segment.toLowerCase()));
        },
        persistent: true,
        ignoreInitial: true,
        depth: 10,
        awaitWriteFinish: {
          stabilityThreshold: 250,
          pollInterval: 100
        }
      });
  
      const notify = () => {
        if (workspaceNotifyTimer) clearTimeout(workspaceNotifyTimer);
        workspaceNotifyTimer = setTimeout(() => {
          const win = getWin(); if (win && !win.isDestroyed()) { win.webContents.send('workspace-changed'); }
        }, 300);
      };
  
      workspaceWatcher
        .on('ready', () => {
          if (workspaceWatcher) console.info('[STARTUP timing] workspace watcher ready directories=%d', Object.keys(workspaceWatcher.getWatched()).length);
        })
        .on('add', notify)
        .on('unlink', notify)
        .on('addDir', notify)
        .on('unlinkDir', notify)
        .on('change', notify)
        .on('error', (error) => {
          // Cloud-backed drives can temporarily reject lstat while syncing.
          // Handle the asynchronous watcher error so Electron does not crash.
          console.warn('[Workspace watcher] 파일 변경 감지 오류:', error);
          notify();
        });
  
      return { success: true };
    } catch (e) {
      console.error('watchWorkspace 오류:', e);
      return { success: false, error: e.message };
    }
  });
  
  // 7. 디렉토리 파일 목록 조회 (Windows 탐색기)
  ipcMain.handle('file:listDirectory', async (event, dirPath) => {
    try {
      const cleanPath = dirPath.normalize('NFC');
      if (!getActiveWorkspace() || !cleanPath.startsWith(getActiveWorkspace())) {
        setActiveWorkspace(cleanPath);
      }
      const entries = fs.readdirSync(cleanPath, { withFileTypes: true });
      const nodes = entries
        .filter(entry => {
          const ignoredDirs = ['node_modules', '.git', '.next', '.vscode', 'out', 'dist', 'build', '.next-web-build', '.wrangler', '_dev_api_backup', 'release', '.idea'];
          if (ignoredDirs.includes(entry.name.toLowerCase())) return false;
          if (entry.isDirectory() && entry.name.toLowerCase() === 'help' && (cleanPath.replace(/\\/g, '/').toLowerCase().endsWith('/docs') || cleanPath.replace(/\\/g, '/').toLowerCase().endsWith('docs'))) return false;
          if (entry.isFile()) {
            const nameLower = entry.name.toLowerCase();
            return nameLower.endsWith('.md') || nameLower.endsWith('.markdown') || nameLower.endsWith('.bib');
          }
          return true;
        })
        .map(entry => {
          const fullPath = path.join(cleanPath, entry.name);
          if (entry.isDirectory()) {
            return { name: entry.name, kind: 'directory', path: fullPath };
          } else {
            return { name: entry.name, kind: 'file', path: fullPath };
          }
        })
        .sort((a, b) => {
          if (a.kind === b.kind) return a.name.localeCompare(b.name, 'ko', { numeric: true });
          return a.kind === 'directory' ? -1 : 1;
        });
      return nodes;
      } catch (e) {
        if (['ENOENT', 'EPERM', 'EBUSY', 'EACCES'].includes(e.code) || !fs.existsSync(cleanPath)) {
          // 폴더가 삭제/이동된 직후이거나 가상/클라우드 드라이브(구글드라이브 등) 일시 잠금 시 빈 목록 반환하여 크래시 방지
          return [];
        }
        console.error(`[Electron] listDirectory 오류 - 경로: [${dirPath}]:`, e);
        throw e;
      }
  });
  
  // 9. 파일/폴더 이름 변경
  ipcMain.handle('file:rename', async (event, oldPath, newPath) => {
    try {
      const cleanOld = oldPath.normalize('NFC');
      const cleanNew = newPath.normalize('NFC');
      if (!fs.existsSync(cleanOld)) {
        return { success: true, skipped: true };
      }
      const destDir = path.dirname(cleanNew);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      try {
        fs.renameSync(cleanOld, cleanNew);
      } catch (renameErr) {
        const stat = fs.statSync(cleanOld);
        if (stat.isDirectory()) {
          fs.cpSync(cleanOld, cleanNew, { recursive: true });
          fs.rmSync(cleanOld, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        } else {
          fs.copyFileSync(cleanOld, cleanNew);
          fs.unlinkSync(cleanOld);
        }
      }
      return { success: true };
    } catch (e) {
      console.error('파일 이름 변경 실패:', e);
      throw e;
    }
  });
  
  // 9-1. 파일/폴더 복사 (Copy & Paste)
  ipcMain.handle('file:copy', async (event, srcPath, destPath) => {
    try {
      const cleanSrc = srcPath.normalize('NFC');
      let cleanDest = destPath.normalize('NFC');
  
      if (!fs.existsSync(cleanSrc)) {
        throw new Error(`원본 파일 또는 폴더가 존재하지 않습니다: ${cleanSrc}`);
      }
  
      const srcStat = fs.statSync(cleanSrc);
      const isDir = srcStat.isDirectory();
  
      // 만약 대상 경로에 이미 파일이나 폴더가 존재하면 중복 방지 이름 생성
      if (fs.existsSync(cleanDest)) {
        const parsed = path.parse(cleanDest);
        const ext = isDir ? '' : parsed.ext;
        const base = isDir ? parsed.base : parsed.name;
        const dir = parsed.dir;
  
        let counter = 1;
        let candidate = path.join(dir, `${base}_copy${ext}`);
        while (fs.existsSync(candidate)) {
          counter++;
          candidate = path.join(dir, `${base}_copy${counter}${ext}`);
        }
        cleanDest = candidate;
      }
  
      // 대상 부모 디렉토리가 없으면 생성
      const destParent = path.dirname(cleanDest);
      if (!fs.existsSync(destParent)) {
        fs.mkdirSync(destParent, { recursive: true });
      }
  
      if (isDir) {
        fs.cpSync(cleanSrc, cleanDest, { recursive: true });
      } else {
        fs.copyFileSync(cleanSrc, cleanDest);
      }
  
      return { success: true, newPath: cleanDest };
    } catch (e) {
      console.error('파일/폴더 복사 실패:', e);
      throw e;
    }
  });
  
  // 9-2. 파일/폴더 이동 (Cut & Paste / Move)
  ipcMain.handle('file:move', async (event, srcPath, destPath, options) => {
    try {
      const cleanSrc = srcPath.normalize('NFC');
      let cleanDest = destPath.normalize('NFC');
      if (options?.failIfExists && fs.existsSync(cleanDest)) throw new Error('원래 위치에 같은 이름의 항목이 있습니다. 이름을 변경한 뒤 다시 되돌려 주세요.');
  
      if (!fs.existsSync(cleanSrc)) {
        throw new Error(`원본 파일 또는 폴더가 존재하지 않습니다: ${cleanSrc}`);
      }
  
      const srcStat = fs.statSync(cleanSrc);
      const isDir = srcStat.isDirectory();
  
      // 대상 부모 디렉토리가 없으면 생성
      const destParent = path.dirname(cleanDest);
      if (!fs.existsSync(destParent)) {
        fs.mkdirSync(destParent, { recursive: true });
      }
  
      // 동일 경로인 경우 스킵
      if (path.resolve(cleanSrc) === path.resolve(cleanDest)) {
        return { success: true, newPath: cleanDest };
      }
  
      try {
        fs.renameSync(cleanSrc, cleanDest);
      } catch (renameErr) {
        // 드라이브 간 이동 또는 EXDEV 에러 시 fallback
        if (isDir) {
          fs.cpSync(cleanSrc, cleanDest, { recursive: true });
          fs.rmSync(cleanSrc, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        } else {
          fs.copyFileSync(cleanSrc, cleanDest);
          fs.unlinkSync(cleanSrc);
        }
      }
  
      return { success: true, newPath: cleanDest };
    } catch (e) {
      console.error('파일/폴더 이동 실패:', e);
      throw e;
    }
  });
  
  // ====================================================================
  // 📊 [OMD-MAIN-main-0003] main.js ➔ system:openPath & system:showItemInFolder
  // 🎯 @KICK  : 지정 폴더/파일을 운영체제 기본 파일 탐색기(Windows Explorer / macOS Finder)로 열기
  // 🛡️ @GUARD : 경로 유효성 검증, shell.openPath / shell.showItemInFolder 호출
  // 🚨 @PATCH : 2026-09-16 — 루트 및 탐색기에서 시스템 파일 탐색기/Finder 열기 IPC 신규 추가
  // 🔗 @CALLS : shell.openPath, shell.showItemInFolder
  // ====================================================================
  ipcMain.handle('system:openPath', async (event, targetPath) => {
    try {
      if (!targetPath) return { success: false, error: '경로가 유효하지 않습니다.' };
      const { shell } = require('electron');
      const cleanPath = targetPath.replace(/^file:\/\/\/?/, '').normalize('NFC');
      const fullPath = path.resolve(decodeURIComponent(cleanPath));
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: '경로가 존재하지 않습니다: ' + fullPath };
      }
      const err = await activeShell.openPath(fullPath);
      if (err) {
        return { success: false, error: err };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  ipcMain.handle('system:showItemInFolder', async (event, targetPath) => {
    try {
      if (!targetPath) return { success: false, error: '경로가 유효하지 않습니다.' };
      const { shell } = require('electron');
      const cleanPath = targetPath.replace(/^file:\/\/\/?/, '').normalize('NFC');
      const fullPath = path.resolve(decodeURIComponent(cleanPath));
      activeShell.showItemInFolder(fullPath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  // 10. 파일/폴더 삭제
  ipcMain.handle('file:delete', async (event, targetPath) => {
    try {
      const cleanPath = targetPath.normalize('NFC');
      if (!fs.existsSync(cleanPath)) {
        return { success: true, alreadyDeleted: true };
      }
      const stat = fs.statSync(cleanPath);
      if (stat.isDirectory()) {
        fs.rmSync(cleanPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } else {
        fs.unlinkSync(cleanPath);
      }
      return { success: true };
    } catch (e) {
      console.error('파일/폴더 삭제 1차 실패, force 재시도:', e);
      try {
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
          return { success: true };
        }
      } catch (retryErr) {
        console.error('파일/폴더 삭제 2차 실패:', retryErr);
        throw retryErr;
      }
      return { success: true };
    }
  });
  
  // 10-1. 폴더 삭제 되돌리기(Undo) 지원을 위한 임시 백업
  ipcMain.handle('file:backupFolderForUndo', async (event, folderPath) => {
    try {
      if (!folderPath) return { success: false, error: '경로가 비어있습니다.' };
      const cleanPath = folderPath.normalize('NFC');
      if (!fs.existsSync(cleanPath)) return { success: false, error: '경로가 존재하지 않습니다: ' + cleanPath };
      const stat = fs.statSync(cleanPath);
      if (!stat.isDirectory()) return { success: false, error: '디렉토리가 아닙니다.' };
  
      const backupBase = path.join(app.getPath('temp'), 'onrivi_undo_backups');
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tempDir = path.join(backupBase, backupId);
      fs.mkdirSync(tempDir, { recursive: true });
  
      const folderName = path.basename(cleanPath);
      const backupDest = path.join(tempDir, folderName);
      fs.cpSync(cleanPath, backupDest, { recursive: true });
  
      return { success: true, backupPath: backupDest };
    } catch (e) {
      console.error('폴더 삭제 백업 실패:', e);
      return { success: false, error: e.message };
    }
  });
  
  // 10-2. 폴더 삭제 되돌리기(Undo) 복원
  ipcMain.handle('file:restoreFolderFromUndo', async (event, backupPath, targetPath) => {
    try {
      if (!backupPath || !targetPath) return { success: false, error: '경로가 유효하지 않습니다.' };
      const cleanBackup = backupPath.normalize('NFC');
      const cleanTarget = targetPath.normalize('NFC');
      if (!fs.existsSync(cleanBackup)) return { success: false, error: '백업 디렉토리가 존재하지 않습니다: ' + cleanBackup };
      if (fs.existsSync(cleanTarget)) return { success: false, error: '복원할 위치에 같은 이름의 항목이 이미 있습니다.' };
  
      const targetParent = path.dirname(cleanTarget);
      if (!fs.existsSync(targetParent)) {
        fs.mkdirSync(targetParent, { recursive: true });
      }
  
      fs.cpSync(cleanBackup, cleanTarget, { recursive: true });
      return { success: true };
    } catch (e) {
      console.error('폴더 삭제 복원 실패:', e);
      return { success: false, error: e.message };
    }
  });
  
  // 11. 새 파일 생성
  ipcMain.handle('file:createFile', async (event, parentPath, name) => {
    try {
      const cleanParent = parentPath.normalize('NFC');
      const cleanName = name.normalize('NFC');
      const fullPath = path.join(cleanParent, cleanName);
      fs.writeFileSync(fullPath, '', { encoding: 'utf-8', flag: 'wx' });
      return { success: true, path: fullPath };
    } catch (e) {
      console.error('파일 생성 실패:', e);
      throw e;
    }
  });
  
  // 12. 새 폴더 생성
  ipcMain.handle('file:createFolder', async (event, parentPath, name) => {
    try {
      const cleanParent = parentPath.normalize('NFC');
      const cleanName = name.normalize('NFC');
      const fullPath = path.join(cleanParent, cleanName);
      fs.mkdirSync(fullPath, { recursive: true });
      return { success: true, path: fullPath };
    } catch (e) {
      console.error('폴더 생성 실패:', e);
      throw e;
    }
  });
  
  // 13. 폴더 아래의 모든 마크다운 파일 내용 검색 (안전성·경로해석·유니코드 NFC 정규화 및 예외 격리 보강)
  ipcMain.handle('file:searchInFolder', async (event, { folderPath, searchTerm, matchCase, useRegex }) => {
    try {
      if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
        return [];
      }
  
      // 1) 검색 대상 폴더 경로 정규화 및 활성 작업장 경로 해석
      let resolvedFolder = typeof folderPath === 'string' ? folderPath.trim() : '';
      if (resolvedFolder.startsWith('file:///')) {
        try { resolvedFolder = decodeURIComponent(resolvedFolder.replace(/^file:\/\/\//, '')); } catch {}
      }
  
      const isValidDir = (p) => {
        if (!p || typeof p !== 'string' || p.startsWith('GoogleDrive') || p === '브라우저 저장소') return false;
        try {
          return fs.existsSync(p) && fs.statSync(p).isDirectory();
        } catch {
          return false;
        }
      };
  
      if (!isValidDir(resolvedFolder)) {
        let fallbackFolder = '';
        if (getActiveWorkspace() && isValidDir(getActiveWorkspace())) {
          if (resolvedFolder && !resolvedFolder.startsWith('GoogleDrive')) {
            const candidate = path.join(getActiveWorkspace(), resolvedFolder);
            fallbackFolder = isValidDir(candidate) ? candidate : getActiveWorkspace();
          } else {
            fallbackFolder = getActiveWorkspace();
          }
        }
        if (!fallbackFolder) {
          try {
            const settingsPath = path.join(app.getPath('userData'), 'settings.json');
            if (fs.existsSync(settingsPath)) {
              const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
              if (saved?.localWorkspaceFolder && isValidDir(saved.localWorkspaceFolder)) {
                fallbackFolder = saved.localWorkspaceFolder;
                setActiveWorkspace(fallbackFolder);
              }
            }
          } catch {}
        }
        resolvedFolder = fallbackFolder;
      } else {
        setActiveWorkspace(resolvedFolder);
      }
  
      if (!isValidDir(resolvedFolder)) {
        return [];
      }
  
      const mdFiles = getAllMdFiles(resolvedFolder);
      const results = [];
  
      const normalizedSearchTerm = searchTerm.normalize('NFC');
      let regex;
      const escaped = normalizedSearchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (useRegex) {
        try {
          regex = new RegExp(normalizedSearchTerm, matchCase ? 'g' : 'gi');
        } catch(e) {
          regex = new RegExp(escaped, matchCase ? 'g' : 'gi');
        }
      } else {
        regex = new RegExp(escaped, matchCase ? 'g' : 'gi');
      }
  
      for (const filePath of mdFiles) {
        try {
          const fileName = path.basename(filePath).normalize('NFC');
          const fileNameWithoutExt = path.basename(filePath, path.extname(filePath)).normalize('NFC');
          let content = '';
          try {
            content = fs.readFileSync(filePath, 'utf-8').normalize('NFC');
          } catch {
            // 잠긴 파일, 바이너리 또는 권한 문제 시 개별 skip
            continue;
          }
          const lines = content.split(/\r?\n/);
          const snippets = [];
          const lineNumbers = [];
          let fileNameMatched = false;
  
          // 파일명 검사
          regex.lastIndex = 0;
          if (regex.test(fileName)) {
            fileNameMatched = true;
          } else {
            regex.lastIndex = 0;
            if (regex.test(fileNameWithoutExt)) {
              fileNameMatched = true;
            }
          }
  
          // 내용 검사
          lines.forEach((line, index) => {
            regex.lastIndex = 0;
            if (regex.test(line)) {
              snippets.push(`Line ${index + 1}: ${line.trim()}`);
              lineNumbers.push(index + 1);
            }
          });
  
          if (snippets.length > 0) {
            results.push({
              fileName,
              path: filePath,
              count: snippets.length,
              snippets,
              lineNumbers
            });
          } else if (fileNameMatched) {
            results.push({
              fileName,
              path: filePath,
              count: 0,
              snippets: [],
              lineNumbers: [],
              fileNameMatch: true
            });
          }
        } catch (fileErr) {
          // 개별 파일 처리 실패 시 전체 프로세스 중단 방지
          continue;
        }
      }
      return results;
    } catch (e) {
      console.error("폴더 전역 검색 에러:", e?.message || e);
      return [];
    }
  });
}

module.exports = {
  registerFileIpcHandlers,
};
