// ====================================================================
// 📊 [OMD-PRELOAD-0001] preload.js ➔ Desktop GDrive Auth Bridge & Secure APIs
// 🎯 @KICK  : Electron contextBridge API 노출 및 안전한 IPC 통신 채널 제공
// 🛡️ @GUARD : contextIsolation 및 nodeIntegration 보안 원칙 준수
// 🚨 @PATCH : **2026-10-28** — [외부 AI MCP 타겟(Gemini, Claude) 자동 감지 및 원클릭 연동 브리지 노출]: checkMcpTargets, installMcpTarget, uninstallMcpTarget IPC 브리지 연동
// 🚨 @PATCH : **2026-10-26** — [단축코드 정의서(shortcodes.json) 브리지(loadShortcodes, saveShortcodes) 노출]: 리소스 폴더 settings/shortcodes.json 파일 IPC 브리지 연동
// 🚨 @PATCH : **2026-10-21** — [AI 인증정보 리소스 폴더 암호화 브리지(loadAICredentials, saveAICredentials, getDeviceInfo) 노출]: 리소스 폴더 settings/ai_credentials.enc 파일 및 물리 기기 정보 IPC 브리지 연동
// 🚨 @PATCH : **2026-10-14** — [클립보드 네이티브 비트맵 이미지 복사 API(copyImageToClipboard) 노출]: clipboard:writeImage IPC 연동을 통해 이미지 경로/URL/DataURL을 OS 시스템 클립보드에 비트맵으로 직접 복사하는 브리지 API 노출
// 🚨 @PATCH : **2026-10-14** — [외부 웹 이미지 바이너리 안전 다운로드 브리지(fetchExternalImage) 노출]: net:fetchImageBlob IPC 연동을 통해 CORS 제약 없이 웹 이미지 바이너리를 다운로드할 수 있도록 API 노출
// 🚨 @PATCH : **2026-10-04** — [구글 드라이브 데스크톱 외부 브라우저 안전 인증]: requestDesktopGDriveAuth IPC 호출 브리지 API(gdrive:request-auth) 추가
// ====================================================================
const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스(Next.js)에 노출할 안전한 API 정의
contextBridge.exposeInMainWorld('electronAPI', {
  inlineAIKey: data => ipcRenderer.invoke('inline-ai:key',data),
  inlineAIRun: data => ipcRenderer.invoke('inline-ai:run',data),
  inlineAICancel: id => ipcRenderer.invoke('inline-ai:cancel',id),
  onInlineAIEvent: callback => {const handler=(_event,data)=>callback(data);ipcRenderer.on('inline-ai:event',handler);return()=>ipcRenderer.removeListener('inline-ai:event',handler);},
  // 2. 현재 열린 파일 경로에 덮어쓰기 저장
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),
  
  // 3. 다른 이름으로 저장 대화상자를 띄워 파일 기록 (워크스페이스 경로 지원)
  saveFileAs: (content, suggestedName, defaultDir, filters) => ipcRenderer.invoke('file:saveAs', content, suggestedName, defaultDir, filters),
  saveBinaryFile: (filePath, bytes) => ipcRenderer.invoke('file:saveBinary', filePath, bytes),
  readTransferFile: (filePath) => ipcRenderer.invoke('file:readTransferFile', filePath),
  writeTransferCopy: (folderPath, relativePath, bytes) => ipcRenderer.invoke('file:writeTransferCopy', folderPath, relativePath, bytes),

  // 4. 경로를 지정하여 직접 파일 읽기 (검색 결과 파일 로드용)
  readFromPath: (filePath) => {
    const caller = new Error('readFromPath caller').stack;
    return ipcRenderer.invoke('file:readFromPath', filePath).catch((error) => {
      console.error('[file:readFromPath failed]', { filePath, caller });
      throw error;
    });
  },
  readFile: async (filePath) => {
    const res = await ipcRenderer.invoke('file:readFromPath', filePath);
    return typeof res === 'object' && res !== null ? (res.content ?? '') : (res ?? '');
  },

  // 5. 폴더 선택 대화상자 띄우기 (전체 검색 범위 선택용)
  selectMediaFile: (options) => ipcRenderer.invoke('dialog:selectMediaFile', options),
  selectFolder: (defaultPath) => ipcRenderer.invoke('dialog:selectFolder', defaultPath),
  chooseImportDocument: (defaultPath) => ipcRenderer.invoke('dialog:chooseImportDocument', defaultPath),

  // 5.5. 파일 저장 대화상자 띄우기
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),

  // 6. 드라이브 목록 조회 (Windows 탐색기)
  getDrives: () => ipcRenderer.invoke('file:getDrives'),

  // 7. 디렉토리 파일 목록 조회
  listDirectory: (dirPath) => ipcRenderer.invoke('file:listDirectory', dirPath),
  
  // [Bug Fix] 워크스페이스 실시간 감지 시작
  watchWorkspace: (workspacePath) => ipcRenderer.invoke('file:watchWorkspace', workspacePath),
  onWorkspaceChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('workspace-changed', handler);
    return () => ipcRenderer.removeListener('workspace-changed', handler);
  },

  // 9. 파일/폴더 이름 변경
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('file:rename', oldPath, newPath),

  // 9-1. 파일/폴더 복사 (Copy & Paste)
  copyFile: (srcPath, destPath) => ipcRenderer.invoke('file:copy', srcPath, destPath),

  // 9-2. 파일/폴더 이동 (Cut & Paste)
  moveFile: (srcPath, destPath, options) => ipcRenderer.invoke('file:move', srcPath, destPath, options),

  // 9-3. 시스템 탐색기 / Finder 열기 및 위치 표시
  openPath: (targetPath) => ipcRenderer.invoke('system:openPath', targetPath),
  showItemInFolder: (targetPath) => ipcRenderer.invoke('system:showItemInFolder', targetPath),

  // 10. 파일/폴더 삭제
  deleteFile: (targetPath) => ipcRenderer.invoke('file:delete', targetPath),
  backupFolderForUndo: (folderPath) => ipcRenderer.invoke('file:backupFolderForUndo', folderPath),
  restoreFolderFromUndo: (backupPath, targetPath) => ipcRenderer.invoke('file:restoreFolderFromUndo', backupPath, targetPath),

  // 11. 새 파일 생성
  createFile: (parentPath, name) => ipcRenderer.invoke('file:createFile', parentPath, name),

  // 12. 새 폴더 생성
  createFolder: (parentPath, name) => ipcRenderer.invoke('file:createFolder', parentPath, name),

  // 13. 폴더 아래의 모든 마크다운 파일 대상 단어 검색
  searchInFolder: (config) => ipcRenderer.invoke('file:searchInFolder', config),

  // 7. 단축키 및 상단 시스템 메뉴 이벤트에 반응할 이벤트 리스너 등록
  onNewFileRequested: (callback) => ipcRenderer.on('menu:new-file', (_, value) => callback(value)),
  onSaveFileRequested: (callback) => ipcRenderer.on('menu:save-file', (_, value) => callback(value)),
  onSaveFileAsRequested: (callback) => ipcRenderer.on('menu:save-file-as', (_, value) => callback(value)),

  // 8. 윈도우 파일 연결(더블클릭)로 외부 .md 파일 열기 요청 수신 (두 번째 실행부터)
  onReceiveFile: (callback) => {
    const handler = (_event, filePath) => callback(filePath);
    ipcRenderer.on('open-external-md', handler);
    return () => {
      ipcRenderer.removeListener('open-external-md', handler);
    };
  },

  // 9. 최초 실행 시 filePathToOpen 조회 (pull 방식, 경합 조건 없음)
  getInitialFilePath: () => ipcRenderer.invoke('get-initial-file-path'),

  // 9-1. 마지막으로 열려있던 세션 데이터 저장
  saveLastSession: (sessionData) => ipcRenderer.invoke('session:saveLastSession', sessionData),

  // 9-2. 마지막으로 열려있던 세션 데이터 복원
  getLastSession: () => ipcRenderer.invoke('session:getLastSession'),

  // 14. 시스템 네이티브 이모지 피커 호출
  showEmojiPicker: () => ipcRenderer.invoke('system:showEmojiPicker'),

  // 15. 라이선스 키 로드 (데스크탑 영구 저장 연동)
  loadLicense: () => ipcRenderer.invoke('license:load'),

  // 16. 라이선스 키 저장 (데스크탑 영구 저장 연동)
  saveLicense: (licenseKey) => ipcRenderer.invoke('license:save', licenseKey),

  // 하이브리드 라이선스 정보 연동 API 추가
  loadLicenseFull: () => ipcRenderer.invoke('license:load-full'),
  saveLicenseFull: (data) => ipcRenderer.invoke('license:save-full', data),
  getMachineId: () => ipcRenderer.invoke('license:get-device-id'),
  openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
  onLicenseActivated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('license-activated', handler);
    return () => {
      ipcRenderer.removeListener('license-activated', handler);
    };
  },

  // 17. 환경설정 로드 (데스크탑 영구 저장 연동)
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  syncMcpContext: (context) => ipcRenderer.invoke('mcp-context:sync', context),
  checkMcpTargets: () => ipcRenderer.invoke('mcp:check-targets'),
  installMcpTarget: (target) => ipcRenderer.invoke('mcp:install-target', target),
  uninstallMcpTarget: (target) => ipcRenderer.invoke('mcp:uninstall-target', target),

  // 18. 환경설정 저장 (데스크탑 영구 저장 연동)
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // 18-1. AI 프롬프트 로드
  loadPrompts: (resourceFolder) => ipcRenderer.invoke('prompts:load', resourceFolder),

  // 18-2. AI 프롬프트 저장
  savePrompts: (prompts, resourceFolder) => ipcRenderer.invoke('prompts:save', prompts, resourceFolder),

  // 18-3. AI 프리셋 로드
  loadPresets: (resourceFolder) => ipcRenderer.invoke('presets:load', resourceFolder),

  // 18-4. AI 프리셋 저장
  savePresets: (presets, resourceFolder) => ipcRenderer.invoke('presets:save', presets, resourceFolder),

  // 18-5. AI 인증정보 암호화 파일 로드 및 저장 (리소스 폴더/기기별 격리 관리)
  loadAICredentials: (resourceFolder) => ipcRenderer.invoke('ai-credentials:load', resourceFolder),
  saveAICredentials: (cipherText, resourceFolder) => ipcRenderer.invoke('ai-credentials:save', cipherText, resourceFolder),
  getDeviceInfo: () => ipcRenderer.invoke('device:get-info'),


  // 19. OS 네이티브 글꼴 선택 대화상자 호출
  openFontDialog: () => ipcRenderer.invoke('dialog:openFontPicker'),

  // 20. 클립보드 이미지 복사 및 로컬 파일 쓰기 핸들러 연동
  saveImage: (targetFolder, base64Data, fileName) => ipcRenderer.invoke('file:saveImage', targetFolder, base64Data, fileName),

  // 21. 일렉트론 네이티브 PDF 인쇄 API
  printToPDF: (options) => ipcRenderer.invoke('pdf:printToPDF', options),
  printHTMLToPDF: (html, options) => ipcRenderer.invoke('pdf:printHTMLToPDF', html, options),

  // 22. 로컬 이미지 파일 Base64 변환 읽기 API
  readImageAsBase64: (filePath) => ipcRenderer.invoke('file:readImageAsBase64', filePath),
  // 22.5. 외부 웹 이미지 바이너리 안전 다운로드 API (CORS 우회)
  fetchExternalImage: (url) => ipcRenderer.invoke('net:fetchImageBlob', url),

  // 23. 파일명 클립보드 복사 API
  copyTextToClipboard: (text) => ipcRenderer.invoke('clipboard:copyText', text),
  // 23.4. 클립보드 HTML 서식 및 텍스트 동시 복사 API
  copyHtmlToClipboard: (html, text) => ipcRenderer.invoke('clipboard:writeHtml', { html, text }),
  // 23.5. 클립보드 네이티브 이미지 복사 API
  copyImageToClipboard: (source) => ipcRenderer.invoke('clipboard:writeImage', source),

  // 24. 클립보드 네이티브 이미지 읽기 API
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),
  readClipboardImageSync: () => ipcRenderer.sendSync('clipboard:readImageSync'),

  // 23. 사용자 서식 프로필 읽기/저장 (Desktop — userData or resourceFolder)
  readProfiles: (resourceFolder) => ipcRenderer.invoke('file:readProfiles', resourceFolder),
  saveProfiles: (profiles, resourceFolder) => ipcRenderer.invoke('file:saveProfiles', profiles, resourceFolder),

  // 25. 다중 파일 병합 (백엔드 서버 불필요, IPC 직접 처리)
  mergeFiles: (config) => ipcRenderer.invoke('file:mergeFiles', config),

  // 26. 로컬 보안 데이터 암복호화 (OS Keyring 연동)
  encryptData: (plainText) => ipcRenderer.invoke('security:encrypt', plainText),
  decryptData: (cipherTextHex) => ipcRenderer.invoke('security:decrypt', cipherTextHex),

  // 27. 리소스 폴더 5대 디렉토리 및 onrivi_knowledge.db 일괄 생성 API
  initResourceFolder: (resourceFolder, profiles) => ipcRenderer.invoke('resourceFolder:initStructure', resourceFolder, profiles),
  ensureLocalEnvironment: (settings) => ipcRenderer.invoke('desktop:ensureLocalEnvironment', settings),

  // 28. Mermaid 다이어그램 새 창으로 확대 뷰잉 (Electron BrowserWindow 직접 생성 — window.open 팝업 차단 우회)
  openMermaidWindow: (svgHtml, options) => ipcRenderer.invoke('mermaid:open-window', svgHtml, options),

  // 29. 구글 드라이브 데스크톱 외부 브라우저 안전 인증 (Handoff 및 루프백 연동)
  requestDesktopGDriveAuth: (options) => ipcRenderer.invoke('gdrive:request-auth', options),
  refreshDesktopGDriveAuth: () => ipcRenderer.invoke('gdrive:refresh-auth'),
  disconnectDesktopGDriveAuth: () => ipcRenderer.invoke('gdrive:disconnect-auth'),

  // 리스너 해제를 위한 유틸리티 (컴포넌트 unmount 시 메모리 누수 방지)
  removeListeners: () => {
    ipcRenderer.removeAllListeners('menu:new-file');
    ipcRenderer.removeAllListeners('menu:save-file');
    ipcRenderer.removeAllListeners('menu:save-file-as');
    ipcRenderer.removeAllListeners('open-external-md');
    ipcRenderer.removeAllListeners('dialog:openFontPicker');
    ipcRenderer.removeAllListeners('workspace-changed');
  }
});
