/**
 * ============================================================================
 * 🏷️ 파일명 : editorFileUtils.ts
 * 🎯 주요기능 :
 *   - 에디터 작업장 파일 트리 탐색, 마크다운(.md/.markdown) 통합 수집, 상대 이미지/문서 경로 계산 유틸리티
 *   - 브라우저(FSA & WASM 지식 DB), 데스크톱(Electron), VFS, 열린 탭 전 환경 중복 제거 및 NFC 정규화
 * 🚨 @PATCH :
 *   - 2026-11-07 : [문서 연결(DocLink) 작업장 전체 하위 폴더 문서 탐색 보장]:
 *                  1) 구글 드라이브(GDRIVE/cloud) 작업장 판별 최우선화 및 ensureValidDriveToken 최신 토큰 기반 Promise.all 병렬 재귀 스캔으로 하위 폴더(도움말, 소스분석 등) 전체 마크다운 파일 100% 수집
 *                  2) 작업장 내 도움말/HELP 문서 오필터링 원천 제거: 파일명(HELP-/00_시작하기)으로 사용자 작업장 문서를 차단하던 결함 해소
 *   - 2026-11-07 : [문서 연결(DocLink) 작업장 마크다운 수집 누락 원천 해결]:
 *                  1) 로컬 작업장: rootFolder.name 대신 절대경로(path/onrivi_workspace_path) 우선 스캔으로 ENOENT 실패 방지
 *                  2) 클라우드 작업장: fileList 외에 구글 드라이브 작업장 폴더(workspaceFolderId) 재귀 스캔 보강으로 하위 문서 누락 차단
 *                  3) 도움말 모드: 도움말 문서 열람 시 public/help가 일괄 배제되어 문서 목록이 0개 되던 오필터링 제거 및 중복 방어 정교화
 *   - 2026-11-04 : 주석 표준화(1·2단계) 및 Log-First(logError/logWarn) 에러 진단 로깅 일괄 적용
 *   - 2026-11-04 : getMdFiles, fetchAllMdFiles, resolveRelativeImagePath, getRelativePath를 MainEditorApp에서 분리 위임
 * ============================================================================
 */

import { FileNode, scanDirectoryDeep } from '@/lib/indexedDbHelper';
import { getVfsFiles } from '@/lib/virtualFileSystem';
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { logError, logWarn } from '@/lib/errorDiagnostics';

/**
 * ============================================================================
 * [getMdFiles]
 * FileNode 트리를 순회하여 모든 .md 파일을 재귀적으로 수집합니다.
 *
 * @param {FileNode[]} nodes - 대상 파일 노드 목록
 * @returns {FileNode[]} 수집된 마크다운 파일 노드 배열
 * ============================================================================
 */
export const getMdFiles = (nodes: FileNode[]): FileNode[] => {
  const result: FileNode[] = [];
  const traverse = (list: FileNode[]) => {
    for (const node of list) {
      if (node.kind === 'file') {
        const ext = node.name.split('.').pop()?.toLowerCase();
        if (ext === 'md' && node.path) {
          result.push(node);
        }
      } else if (node.kind === 'directory' && node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return result;
};

/**
 * ============================================================================
 * [fetchAllMdFiles]
 * 브라우저(FSA & WASM DB), 데스크톱(Electron), VFS, 열린 탭 전 환경의 마크다운 파일을 통합 수집합니다.
 *
 * @param {string} workspaceType - 작업장 유형 ('browser' | 'local' | 'cloud')
 * @param {FileNode[]} fileList - 현재 메모리 파일 트리
 * @param {{ name: string; handle?: any } | null} rootFolder - 루트 작업장 폴더 정보
 * @param {string | null} [resourceFolder] - 공통 리소스 폴더 경로
 * @param {any} [resourceFolderHandle] - 공통 리소스 폴더 핸들
 * @param {FileNode | null} [currentFileNode] - 현재 활성 파일 노드
 * @param {any[]} [tabs] - 현재 열려 있는 탭 목록
 * @returns {Promise<FileNode[]>} 중복이 제거된 전체 마크다운 파일 노드 배열
 * ============================================================================
 */
export const fetchAllMdFiles = async (
  workspaceType: string,
  fileList: FileNode[],
  rootFolder: { name?: string; handle?: any; path?: string; type?: string; id?: string; driveFolderId?: string } | null,
  resourceFolder?: string | null,
  resourceFolderHandle?: any,
  currentFileNode?: FileNode | null,
  tabs?: any[]
): Promise<FileNode[]> => {
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  const fileMap = new Map<string, FileNode>();

  const addToFileMap = (node: FileNode, extra?: Partial<FileNode & { title?: string; isKnowledge?: boolean }>) => {
    if (!node || !node.name) return;
    if (node.kind === 'file') {
      const ext = node.name.split('.').pop()?.toLowerCase();
      if (ext !== 'md' && ext !== 'markdown') return;
    } else {
      return;
    }
    const normPath = (node.path || '').replace(/\\/g, '/').toLowerCase();
    const pathSegments = normPath.split('/');
    const excludedDirs = ['out', '.next', '.next-web-build', 'dist', 'build', 'release', 'node_modules', '_dev_api_backup', '.vscode', '.idea', 'scratch'];
    if (pathSegments.some(seg => excludedDirs.includes(seg))) return;

    // 앱 내부 정적 번들 docs/help 및 public/help 중복 수집 방어 (동일 파일명 기준 1개만 유지)
    const isStaticHelp = normPath.startsWith('frontend/public/help/') || normPath.includes('/frontend/public/help/') ||
                         normPath.startsWith('public/help/') || normPath.includes('/public/help/') ||
                         normPath.startsWith('docs/help/') || normPath.includes('/docs/help/');
    if (isStaticHelp) {
      const fileNameLower = (node.name || '').toLowerCase().normalize('NFC');
      if (Array.from(fileMap.values()).some(existing => existing.name.toLowerCase().normalize('NFC') === fileNameLower)) {
        return;
      }
    }
    const rawKey = (node.path || node.name).replace(/\\/g, '/').toLowerCase().normalize('NFC');
    if (!fileMap.has(rawKey)) {
      fileMap.set(rawKey, { ...node, ...extra });
    } else if (extra) {
      const existing = fileMap.get(rawKey)!;
      fileMap.set(rawKey, { ...existing, ...extra });
    }
  };

  const addTreeNodes = (nodes: FileNode[]) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node.kind === 'file') {
        addToFileMap(node);
      } else if (node.kind === 'directory' && Array.isArray(node.children)) {
        addTreeNodes(node.children);
      }
    }
  };

  const isCloudWorkspace = workspaceType === 'cloud' ||
    rootFolder?.type === 'GDRIVE' ||
    Boolean(rootFolder?.driveFolderId) ||
    Boolean((rootFolder as any)?.driveFolderId) ||
    (rootFolder?.path || '').startsWith('GoogleDrive/') ||
    (typeof window !== 'undefined' && (localStorage.getItem('workspaceType') === 'cloud' || localStorage.getItem('onrivi_last_workspace_mode') === 'cloud'));

  if (isCloudWorkspace) {
    // 1. 구글 드라이브(Cloud) 워크스페이스 수집
    addTreeNodes(fileList);

    // 구글 드라이브 작업장 폴더 하위 재귀 수집 보강
    try {
      const { getSavedDriveToken, getSavedWorkspaceInfo, listDriveChildren, ensureValidDriveToken } = await import('@/lib/gdrive/googleDriveClient');
      const token = (await ensureValidDriveToken()) || getSavedDriveToken();
      const wsInfo = getSavedWorkspaceInfo();
      let rawRoot: any = null;
      try { rawRoot = JSON.parse(localStorage.getItem('rootFolder') || '{}'); } catch {}
      const targetFolderId = rootFolder?.id || (rootFolder as any)?.driveFolderId || rawRoot?.driveFolderId || rawRoot?.id || wsInfo?.workspaceFolderId;

      if (token && targetFolderId) {
        const visitedFolders = new Set<string>();
        const scanDrive = async (folderId: string, currentPath = '') => {
          if (visitedFolders.has(folderId)) return;
          visitedFolders.add(folderId);
          try {
            const items = await listDriveChildren(token, folderId);
            const folderPromises: Promise<void>[] = [];
            for (const item of items) {
              const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
              if (item.isFolder) {
                folderPromises.push(scanDrive(item.id, itemPath));
              } else if (item.name.toLowerCase().endsWith('.md') || item.name.toLowerCase().endsWith('.markdown')) {
                addToFileMap({
                  name: item.name,
                  path: itemPath,
                  kind: 'file',
                  driveId: item.id,
                  driveFileId: item.id,
                  id: item.id,
                } as any);
              }
            }
            await Promise.all(folderPromises);
          } catch (scanErr) {
            logWarn({
              file: 'src/utils/editorFileUtils.ts',
              func: 'fetchAllMdFiles.scanDrive',
              doing: '구글 드라이브 하위 폴더 재귀 목록 조회',
              target: folderId,
              error: scanErr,
            });
          }
        };
        await scanDrive(targetFolderId, '');
      }
    } catch (err) {
      logWarn({
        file: 'src/utils/editorFileUtils.ts',
        func: 'fetchAllMdFiles',
        doing: '구글 드라이브 작업장 재귀 스캔 중',
        target: rootFolder?.name || 'gdrive',
        error: err,
      });
    }
  } else if (workspaceType === 'browser') {
    // 2. 브라우저(Web) 환경 수집: FileSystemDirectoryHandle 심층 재귀 스캔
    if (rootFolder?.handle && !(rootFolder as any).needPermission) {
      try {
        if (!rootFolder.handle.queryPermission || (await rootFolder.handle.queryPermission({ mode: 'read' })) === 'granted') {
          const deepFiles = await scanDirectoryDeep(rootFolder.handle, "", new Set(), false);
          deepFiles.forEach(f => addToFileMap(f));
        }
      } catch (e: any) {
        if (e?.name !== 'NotAllowedError') {
          logWarn({
            file: 'src/utils/editorFileUtils.ts',
            func: 'fetchAllMdFiles',
            doing: '브라우저 작업장 폴더 핸들 심층 재귀 스캔(scanDirectoryDeep)',
            target: rootFolder?.name || 'browser_root',
            error: e,
          });
        }
      }
    }

    // 메모리 트리 및 가상 파일 시스템(VFS) 병합
    addTreeNodes(fileList);

    try {
      const vfsFiles = getVfsFiles();
      if (Array.isArray(vfsFiles)) {
        vfsFiles.forEach((f: any) => {
          addToFileMap({ name: f.name, path: f.path || f.name, kind: 'file' });
        });
      }
    } catch (e) {
      logWarn({
        file: 'src/utils/editorFileUtils.ts',
        func: 'fetchAllMdFiles',
        doing: '가상 파일 시스템(VFS) 마크다운 목록 조회',
        target: 'vfsFiles',
        error: e,
      });
    }
  } else if (workspaceType === 'local') {
    // 3. 데스크톱(Electron) 로컬 워크스페이스 수집: 절대 경로 우선 타겟팅
    const localTargetDir = (rootFolder?.path && rootFolder.path !== '브라우저 로컬 저장소' && rootFolder.path !== 'BROWSER_STORAGE_NAME' ? rootFolder.path : null)
      || (rootFolder?.name && !rootFolder.name.startsWith('GoogleDrive') && rootFolder.name !== '작업장' ? rootFolder.name : null)
      || (typeof window !== 'undefined' ? (localStorage.getItem('onrivi_last_local_workspace_path') || localStorage.getItem('onrivi_workspace_path')) : null);

    if (api?.listDirectory && localTargetDir) {
      const visited = new Set<string>();
      const scan = async (dirPath: string) => {
        if (visited.has(dirPath)) return;
        visited.add(dirPath);
        try {
          const list: FileNode[] = await api.listDirectory(dirPath);
          for (const item of list) {
            if (item.kind === 'file') {
              const nameLower = item.name.toLowerCase();
              if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown')) {
                addToFileMap(item);
              }
            } else if (item.kind === 'directory' && item.path) {
              const dirName = (item.name || '').toLowerCase();
              const isIgnored = dirName.startsWith('.') || 
                ['node_modules', 'out', 'dist', 'build', 'release', '_dev_api_backup', '.wrangler', '.next-web-build', '.next', '.vscode', '.idea', 'scratch'].includes(dirName);
              if (!isIgnored) {
                await scan(item.path);
              }
            }
          }
        } catch (e: any) {
          if (!e?.message?.includes('ENOENT') && !e?.message?.includes('EPERM')) {
            logWarn({
              file: 'src/utils/editorFileUtils.ts',
              func: 'fetchAllMdFiles',
              doing: '데스크톱 로컬 디렉토리 재귀 스캔',
              target: dirPath,
              error: e,
            });
          }
        }
      };

      await scan(localTargetDir);
    } else {
      try {
        const res = await fetch(getApiUrl(`/api/files?t=${Date.now()}`));
        if (res.ok) {
          const list = await res.json();
          addTreeNodes(list);
        }
      } catch (err) {
        logError({
          file: 'src/utils/editorFileUtils.ts',
          func: 'fetchAllMdFiles',
          doing: '로컬 파일 트리 API(/api/files) 조회',
          target: '/api/files',
          error: err,
        });
      }
    }
    addTreeNodes(fileList);
  } else {
    addTreeNodes(fileList);
  }

  // 3. 현재 열려 있는 탭(tabs) 병합 (현재 작업 중인 파일 및 미저장 탭 포함)
  if (tabs && Array.isArray(tabs)) {
    tabs.forEach(t => {
      if (t && t.name && (t.name.endsWith('.md') || t.name.endsWith('.markdown')) && (t.path || !Array.from(fileMap.values()).some(f => f.name.toLowerCase().normalize('NFC') === t.name.toLowerCase().normalize('NFC')))) {
        addToFileMap({
          name: t.name,
          path: t.path || t.name,
          kind: 'file',
          handle: t.node?.handle
        });
      }
    });
  }

  // 4. 지식 보관함(Knowledge Base) 문서 웹 WASM & 로컬 전면 통합
  try {
    const rfHandle = resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
    const knowDocs = await knowledgeClient.listDocuments({
      resourceFolder: resourceFolder || undefined,
      resourceFolderHandle: rfHandle
    });
    if (Array.isArray(knowDocs)) {
      for (const doc of knowDocs) {
        if (!doc.filePath && !doc.title) continue;
        const filePath = doc.filePath || `${doc.title}.md`;
        const fileName = filePath.split(/[/\\]/).pop() || `${doc.title}.md`;
        addToFileMap({
          name: fileName,
          path: filePath,
          kind: 'file',
        }, {
          title: doc.title,
          isKnowledge: true
        });
      }
    }
  } catch (err) {
    logWarn({
      file: 'src/utils/editorFileUtils.ts',
      func: 'fetchAllMdFiles',
      doing: '지식 보관함(Knowledge Base) 문서 목록 조회',
      target: resourceFolder || 'knowledge_db',
      error: err,
    });
  }

  // 5. 로컬스토리지 등록 지식 문서 플래그 동기화
  try {
    const registered = JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
    if (Array.isArray(registered)) {
      for (const reg of registered) {
        const normReg = reg.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        for (const [key, node] of fileMap.entries()) {
          if (key.includes(normReg) || normReg.includes(key) || (node.name && node.name.toLowerCase().normalize('NFC') === normReg)) {
            (node as any).isKnowledge = true;
          }
        }
      }
    }
  } catch (err) {
    logWarn({
      file: 'src/utils/editorFileUtils.ts',
      func: 'fetchAllMdFiles',
      doing: '로컬스토리지 등록 지식 문서 플래그(onrivi_registered_knowledge_docs) 파싱',
      target: 'onrivi_registered_knowledge_docs',
      error: err,
    });
  }

  return Array.from(fileMap.values());
};

/**
 * ============================================================================
 * [resolveRelativeImagePath]
 * 상대 마크다운 이미지 경로를 현재 파일 기준 절대 경로로 변환하고 구분자를 정규화합니다.
 *
 * @param {string} srcPath - 이미지 소스 경로
 * @param {string | undefined} currentFileNodePath - 현재 마크다운 파일의 절대 경로
 * @returns {string} 정규화된 절대/상대 경로
 * ============================================================================
 */
export const resolveRelativeImagePath = (srcPath: string, currentFileNodePath: string | undefined): string => {
  if (!srcPath) return "";

  if (srcPath.startsWith('http://') || srcPath.startsWith('https://') || srcPath.startsWith('data:') || srcPath.startsWith('blob:')) {
    return srcPath;
  }

  let normalizedSrc = srcPath.replace(/\\/g, '/');
  if (normalizedSrc.startsWith('file:///')) {
    normalizedSrc = normalizedSrc.replace(/^file:\/\/\//, '');
  }
  const isAbsolute = /^[a-zA-Z]:\//.test(normalizedSrc) || normalizedSrc.startsWith('/');
  if (isAbsolute) {
    return normalizedSrc;
  }

  let baseFolder = "";
  if (currentFileNodePath) {
    const normalizedFile = currentFileNodePath.replace(/\\/g, '/');
    const lastSlash = normalizedFile.lastIndexOf('/');
    if (lastSlash !== -1) {
      baseFolder = normalizedFile.substring(0, lastSlash);
    }
  }

  let cleanSrc = srcPath.replace(/\\/g, '/');
  if (cleanSrc.startsWith('/')) {
    cleanSrc = cleanSrc.substring(1);
  }

  if (cleanSrc.startsWith('./')) {
    cleanSrc = cleanSrc.substring(2);
  }

  let finalPath = "";
  if (baseFolder) {
    finalPath = baseFolder + '/' + cleanSrc;
  } else {
    finalPath = cleanSrc;
  }

  const segments = finalPath.split('/');
  const stack: string[] = [];
  for (const seg of segments) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') {
      stack.pop();
    } else {
      stack.push(seg);
    }
  }

  return stack.join('/');
};

/**
 * ============================================================================
 * [getRelativePath]
 * 기준 소스 파일 경로(fromPath)에서 대상 파일 경로(toPath)까지의 상대 경로를 계산합니다.
 *
 * @param {string | null | undefined} fromPath - 기준 소스 파일 경로
 * @param {string} toPath - 대상 타겟 파일 경로
 * @returns {string} 계산된 상대 경로 (예: ./sub/doc.md 또는 ../sibling.md)
 * ============================================================================
 */
export const getRelativePath = (fromPath: string | null | undefined, toPath: string): string => {
  if (!fromPath) {
    return toPath.startsWith('/') || toPath.startsWith('.') ? toPath : `./${toPath}`;
  }
  const normFrom = fromPath.replace(/\\/g, '/');
  const normTo = toPath.replace(/\\/g, '/');

  const fromDrive = normFrom.match(/^[a-zA-Z]:/)?.[0]?.toUpperCase();
  const toDrive = normTo.match(/^[a-zA-Z]:/)?.[0]?.toUpperCase();
  if (fromDrive && toDrive && fromDrive !== toDrive) {
    return normTo;
  }

  const fromParts = normFrom.split('/').filter(Boolean);
  const toParts = normTo.split('/').filter(Boolean);

  // 파일명을 제외한 폴더 경로만 추출
  fromParts.pop();

  let commonIndex = 0;
  while (commonIndex < fromParts.length && commonIndex < toParts.length && fromParts[commonIndex] === toParts[commonIndex]) {
    commonIndex++;
  }

  const upCount = fromParts.length - commonIndex;
  const upParts = Array(upCount).fill('..');
  const downParts = toParts.slice(commonIndex);

  const relParts = [...upParts, ...downParts];
  let relPath = relParts.join('/');
  if (!relPath.startsWith('.') && !relPath.startsWith('/')) {
    relPath = './' + relPath;
  }
  return relPath;
};
