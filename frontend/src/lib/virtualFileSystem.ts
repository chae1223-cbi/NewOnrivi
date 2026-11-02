/*
 * virtualFileSystem.ts — Virtual File System (가상 파일 시스템)
 * 브라우저 localStorage를 기반으로 한 단순한 가상 파일 시스템입니다.
 * 실제 파일 I/O 없이도 .md 파일을 생성/수정/삭제/이름변경할 수 있습니다.
 * 구조:
 * - 파일 목록: localStorage['onrivi_vfs_files'] (FileNode[] 직렬화)
 * - 파일 내용: localStorage['onrivi_vfs_content_<path>'] (원문 문자열)
 * 초기화 시 Welcome.md 파일이 자동 생성되며, 내용은 constants/welcomeContent.ts의
 * DEFAULT_WELCOME_MD를 사용합니다.
 */

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { FileNode } from './indexedDbHelper';
import { msg } from './systemMessages';
import { DEFAULT_WELCOME_MD } from '@/constants/welcomeContent';

const DEFAULT_WELCOME_TEXT = DEFAULT_WELCOME_MD;

// 파일 목록 스토리지 키
const VFS_FILES_KEY = 'onrivi_vfs_files';

// 파일 내용 스토리지 키 접두사
const VFS_CONTENT_PREFIX = 'onrivi_vfs_content_';

/**
 * 로컬 스토리지에서 가상 파일 목록을 조회합니다.
 * 없을 경우 기본 Welcome.md 파일을 포함하여 초기화합니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0001] virtualFileSystem.ts ➔ getVfsFiles
// 🎯 @KICK  : localStorage에서 가상 파일 목록 조회, 없으면 Welcome.md로 초기화
// 🛡️ @GUARD : window 부재, JSON 파싱 오류 시 빈 배열
// 🚨 @PATCH : **2026-09-18** — [가상 파일 시스템 노드 이동 함수 vfsMoveItem 신규 추가]: 원본 위치에서 노드를 완전히 분리(detach)한 뒤 대상 디렉토리로 이동 삽입 및 하위 콘텐츠 로컬스토리지 키 재귀 마이그레이션 완비
// 🔗 @CALLS : saveVfsFiles, vfsWriteFile, msg.error
// ====================================================================
export function getVfsFiles(): FileNode[] {
  if (typeof window === 'undefined') return [];
  
  const saved = localStorage.getItem(VFS_FILES_KEY);
  if (!saved) {
    // 초기화
    const initialFiles: FileNode[] = [
      {
        name: 'Welcome.md',
        kind: 'file',
        path: 'Welcome.md'
      }
    ];
    saveVfsFiles(initialFiles);
    vfsWriteFile('Welcome.md', DEFAULT_WELCOME_TEXT);
    return initialFiles;
  }
  
  try {
    return JSON.parse(saved);
  } catch (e) {
    msg.error('가상 파일 트리 파싱 오류', e);
    return [];
  }
}

/**
 * 가상 파일 목록 구조를 로컬 스토리지에 저장합니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0002] virtualFileSystem.ts ➔ saveVfsFiles
// 🎯 @KICK  : 가상 파일 목록을 localStorage에 JSON 직렬화하여 저장
// 🛡️ @GUARD : window 부재
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export function saveVfsFiles(files: FileNode[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VFS_FILES_KEY, JSON.stringify(files));
}

/**
 * [ONR-IO-002] 가상 VFS 입출력 핸들러 (vfsReadFile / vfsWriteFile)
 * 가상 파일의 텍스트 내용을 가져옵니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0003] virtualFileSystem.ts ➔ vfsReadFile
// 🎯 @KICK  : 가상 파일 텍스트 내용을 localStorage에서 조회
// 🛡️ @GUARD : window 부재, null 반환 시 빈 문자열
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export function vfsReadFile(path: string): string {
  if (typeof window === 'undefined') return '';
  const content = localStorage.getItem(VFS_CONTENT_PREFIX + path);
  return content !== null ? content : '';
}

/**
 * 가상 파일의 내용을 로컬 스토리지에 기록합니다.
 */
export function vfsWriteFile(path: string, content: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VFS_CONTENT_PREFIX + path, content);
}

/**
 * 특정 경로에서 노드를 검색하는 헬퍼 함수
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0005] virtualFileSystem.ts ➔ findNodeByPath
// 🎯 @KICK  : 노드 배열에서 path로 노드 재귀 검색
// 🛡️ @GUARD : directory kind 확인, children 순회
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.kind === 'directory' && node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 새 파일을 가상 파일 시스템에 추가합니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0006] virtualFileSystem.ts ➔ vfsCreateFile
// 🎯 @KICK  : 가상 파일 시스템에 새 .md 파일 생성 (확장자 자동 추가)
// 🛡️ @GUARD : parentPath 분기, findNodeByPath로 부모 폴더 검증, throw Error
// 🚨 @PATCH : 없음
// 🔗 @CALLS : getVfsFiles, saveVfsFiles, vfsWriteFile, findNodeByPath
// ====================================================================
export function vfsCreateFile(parentPath: string, name: string): void {
  const files = getVfsFiles();
  const fileName = name.endsWith('.md') ? name : `${name}.md`;
  const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
  
  const newFile: FileNode = {
    name: fileName,
    kind: 'file',
    path: filePath
  };

  if (!parentPath) {
    files.push(newFile);
  } else {
    const parent = findNodeByPath(files, parentPath);
    if (parent && parent.kind === 'directory') {
      if (!parent.children) parent.children = [];
      parent.children.push(newFile);
    } else {
      throw new Error('부모 폴더를 찾을 수 없습니다.');
    }
  }

  saveVfsFiles(files);
  vfsWriteFile(filePath, ''); // 빈 파일 생성
}

/**
 * 새 폴더를 가상 파일 시스템에 추가합니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0007] virtualFileSystem.ts ➔ vfsCreateFolder
// 🎯 @KICK  : 가상 파일 시스템에 새 폴더 생성
// 🛡️ @GUARD : parentPath 존재 여부에 따른 루트/하위 분기, findNodeByPath로 부모 검증
// 🚨 @PATCH : 없음
// 🔗 @CALLS : getVfsFiles, saveVfsFiles, findNodeByPath
// ====================================================================
export function vfsCreateFolder(parentPath: string, name: string): void {
  const files = getVfsFiles();
  const folderPath = parentPath ? `${parentPath}/${name}` : name;
  
  const newFolder: FileNode = {
    name,
    kind: 'directory',
    path: folderPath,
    children: []
  };

  if (!parentPath) {
    files.push(newFolder);
  } else {
    const parent = findNodeByPath(files, parentPath);
    if (parent && parent.kind === 'directory') {
      if (!parent.children) parent.children = [];
      parent.children.push(newFolder);
    } else {
      throw new Error('부모 폴더를 찾을 수 없습니다.');
    }
  }

  saveVfsFiles(files);
}

/**
 * 파일 및 폴더 구조 내에서 경로를 재귀적으로 수정합니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0008] virtualFileSystem.ts ➔ updateChildPaths
// 🎯 @KICK  : 노드 및 하위 노드의 path를 old 접두사에서 new 접두사로 재귀 교체
// 🛡️ @GUARD : directory kind 확인, children 존재 여부
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function updateChildPaths(node: FileNode, oldPathPrefix: string, newPathPrefix: string): void {
  if (node.path) {
    node.path = node.path.replace(oldPathPrefix, newPathPrefix);
  }
  if (node.kind === 'directory' && node.children) {
    for (const child of node.children) {
      updateChildPaths(child, oldPathPrefix, newPathPrefix);
    }
  }
}

/**
 * 가상 파일/폴더의 이름을 변경하고 경로를 수정합니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0009] virtualFileSystem.ts ➔ vfsRename
// 🎯 @KICK  : 가상 파일/폴더 이름 변경 및 경로 수정 (하위 콘텐츠 키 마이그레이션)
// 🛡️ @GUARD : file/directory 분기, 하위 경로 updateChildPaths 재귀 호출
// 🚨 @PATCH : 없음
// 🔗 @CALLS : getVfsFiles, vfsReadFile, vfsWriteFile, saveVfsFiles, updateChildPaths
// ====================================================================
export function vfsRename(oldPath: string, newPath: string): void {
  const files = getVfsFiles();
  
  // 변경 대상 노드 탐색 및 수정
  const updateNodeNameAndPath = (nodes: FileNode[]): boolean => {
    for (const node of nodes) {
      if (node.path === oldPath) {
        // 이름 추출
        const newName = newPath.split('/').pop() || newPath;
        
        // 파일인 경우 데이터 복사 후 이전 키 삭제
        if (node.kind === 'file') {
          const content = vfsReadFile(oldPath);
          vfsWriteFile(newPath, content);
          localStorage.removeItem(VFS_CONTENT_PREFIX + oldPath);
        } else if (node.kind === 'directory') {
          // 폴더일 때 하위 파일들의 콘텐츠 키 마이그레이션 및 하위 노드 경로 변경
          const migrateContents = (n: FileNode) => {
            if (n.kind === 'file' && n.path) {
              const childOldPath = n.path;
              const childNewPath = n.path.replace(oldPath, newPath);
              const content = vfsReadFile(childOldPath);
              vfsWriteFile(childNewPath, content);
              localStorage.removeItem(VFS_CONTENT_PREFIX + childOldPath);
            }
            if (n.kind === 'directory' && n.children) {
              n.children.forEach(migrateContents);
            }
          };
          migrateContents(node);
          
          // 하위 경로 노드 업데이트
          updateChildPaths(node, oldPath, newPath);
        }

        node.name = newName;
        node.path = newPath;
        return true;
      }
      if (node.kind === 'directory' && node.children) {
        if (updateNodeNameAndPath(node.children)) return true;
      }
    }
    return false;
  };

  updateNodeNameAndPath(files);
  saveVfsFiles(files);
}

/**
 * 가상 파일/폴더를 삭제합니다. 하위 콘텐츠도 함께 정리합니다.
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0010] virtualFileSystem.ts ➔ vfsDelete
// 🎯 @KICK  : 가상 파일/폴더 삭제 (하위 콘텐츠 localStorage 정리 포함)
// 🛡️ @GUARD : 재귀 clearContents로 하위 파일 키 일괄 제거
// 🚨 @PATCH : 없음
// 🔗 @CALLS : getVfsFiles, saveVfsFiles
// ====================================================================
export function vfsDelete(path: string): void {
  const files = getVfsFiles();

  const removeNode = (nodes: FileNode[]): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.path === path) {
        // 비어있지 않은 폴더 삭제 방지
        if (node.kind === 'directory' && node.children && node.children.length > 0) {
          throw new Error("ENOTEMPTY: directory not empty");
        }

        // 삭제 대상 노드의 콘텐츠 정리
        const clearContents = (n: FileNode) => {
          if (n.kind === 'file' && n.path) {
            localStorage.removeItem(VFS_CONTENT_PREFIX + n.path);
          }
          if (n.kind === 'directory' && n.children) {
            n.children.forEach(clearContents);
          }
        };
        clearContents(node);

        nodes.splice(i, 1);
        return true;
      }
      if (node.kind === 'directory' && node.children) {
        if (removeNode(node.children)) return true;
      }
    }
    return false;
  };

  removeNode(files);
  saveVfsFiles(files);
}

/**
 * 가상 파일/폴더를 복사하여 대상 폴더에 붙여넣습니다. (재귀적 복사 지원)
 */
export function vfsCopyItem(sourcePath: string, destDirPath: string = ''): string {
  const files = getVfsFiles();

  // 1. 소스 노드 찾기
  let sourceNode: FileNode | null = null;
  const findNode = (nodes: FileNode[]): boolean => {
    for (const node of nodes) {
      if (node.path === sourcePath) {
        sourceNode = JSON.parse(JSON.stringify(node));
        return true;
      }
      if (node.kind === 'directory' && node.children) {
        if (findNode(node.children)) return true;
      }
    }
    return false;
  };
  findNode(files);

  if (!sourceNode) {
    throw new Error('복사할 원본 파일/폴더를 찾을 수 없습니다.');
  }

  // 2. 새 이름 결정 (중복 방지)
  let destDirNorm = destDirPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (destDirNorm === '브라우저 로컬 저장소' || destDirNorm === 'BROWSER_STORAGE_NAME') {
    destDirNorm = '';
  }
  const getExistingNames = (nodes: FileNode[], targetDir: string): string[] => {
    if (!targetDir) return nodes.map(n => n.name);
    for (const node of nodes) {
      if (node.path === targetDir && node.kind === 'directory') {
        return (node.children || []).map(n => n.name);
      }
      if (node.kind === 'directory' && node.children) {
        const res = getExistingNames(node.children, targetDir);
        if (res.length > 0) return res;
      }
    }
    return [];
  };

  const existingNames = getExistingNames(files, destDirNorm);
  const srcName = (sourceNode as FileNode).name;
  let newName = srcName;

  if (existingNames.includes(newName)) {
    if ((sourceNode as FileNode).kind === 'file') {
      const extMatch = srcName.match(/\.[^.]+$/);
      const ext = extMatch ? extMatch[0] : '';
      const baseName = ext ? srcName.slice(0, -ext.length) : srcName;
      let counter = 1;
      while (existingNames.includes(`${baseName}_copy${counter > 1 ? counter : ''}${ext}`)) {
        counter++;
      }
      newName = `${baseName}_copy${counter > 1 ? counter : ''}${ext}`;
    } else {
      let counter = 1;
      while (existingNames.includes(`${srcName}_copy${counter > 1 ? counter : ''}`)) {
        counter++;
      }
      newName = `${srcName}_copy${counter > 1 ? counter : ''}`;
    }
  }

  const newPath = destDirNorm ? `${destDirNorm}/${newName}` : newName;

  // 3. 재귀 복제 및 컨텐츠 복사
  const cloneAndSaveContents = (node: FileNode, targetPath: string, targetName: string): FileNode => {
    const clonedNode: FileNode = {
      name: targetName,
      kind: node.kind,
      path: targetPath,
      children: node.kind === 'directory' ? [] : undefined
    };

    if (node.kind === 'file' && node.path) {
      const content = vfsReadFile(node.path);
      vfsWriteFile(targetPath, content);
    } else if (node.kind === 'directory' && node.children) {
      clonedNode.children = node.children.map(child => {
        const childNewPath = `${targetPath}/${child.name}`;
        return cloneAndSaveContents(child, childNewPath, child.name);
      });
    }

    return clonedNode;
  };

  const newNode = cloneAndSaveContents(sourceNode, newPath, newName);

  // 4. 새 노드를 대상 디렉토리에 삽입
  const insertNode = (nodes: FileNode[], targetDir: string): boolean => {
    if (!targetDir) {
      nodes.push(newNode);
      return true;
    }
    for (const node of nodes) {
      if (node.path === targetDir && node.kind === 'directory') {
        if (!node.children) node.children = [];
        node.children.push(newNode);
        return true;
      }
      if (node.kind === 'directory' && node.children) {
        if (insertNode(node.children, targetDir)) return true;
      }
    }
    return false;
  };

  insertNode(files, destDirNorm);
  saveVfsFiles(files);
  return newPath;
}

/**
 * 가상 파일/폴더를 대상 폴더로 이동합니다. (원래 부모로부터 분리하여 대상 폴더에 삽입 및 재귀적 경로/콘텐츠 마이그레이션)
 */
// ====================================================================
// 📊 [OMD-FILE-virtualFileSystem-0011] virtualFileSystem.ts ➔ vfsMoveItem
// 🎯 @KICK  : 가상 파일/폴더를 원본 위치에서 분리(detach)하여 대상 폴더로 이동
// 🛡️ @GUARD : 부모 배열 splice 분리, 하위 경로 및 콘텐츠 localStorage 키 재귀 마이그레이션
// 🚨 @PATCH : **2026-09-18** — [가상 파일 시스템(VFS) 노드 실제 이동 함수 신규 구현]: 잘라내기 후 루트 또는 타 폴더 붙여넣기 시 기존 부모 배열(children)에서 노드를 완전히 분리(splice)하고 대상 디렉토리로 이동 삽입하며, 하위 콘텐츠 로컬스토리지 키 재귀 마이그레이션 지원
// 🔗 @CALLS : getVfsFiles, saveVfsFiles, vfsReadFile, vfsWriteFile, updateChildPaths
// ====================================================================
export function vfsMoveItem(sourcePath: string, destDirPath: string = ''): string {
  const files = getVfsFiles();

  // 1. 소스 노드 탐색 및 기존 부모 배열에서 완전히 분리(detach)
  let removedNode: FileNode | null = null;
  const detachNode = (nodes: FileNode[]): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].path === sourcePath) {
        [removedNode] = nodes.splice(i, 1);
        return true;
      }
      if (nodes[i].kind === 'directory' && nodes[i].children) {
        if (detachNode(nodes[i].children!)) return true;
      }
    }
    return false;
  };
  detachNode(files);

  if (!removedNode) {
    throw new Error('이동할 원본 파일/폴더를 찾을 수 없습니다.');
  }

  const targetNode = removedNode as FileNode;

  // 2. 대상 디렉토리 정규화 ('브라우저 로컬 저장소'는 루트 ''로 정규화)
  let destDirNorm = destDirPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (destDirNorm === '브라우저 로컬 저장소' || destDirNorm === 'BROWSER_STORAGE_NAME') {
    destDirNorm = '';
  }

  // 3. 대상 디렉토리 내 중복 이름 방지
  const getExistingNames = (nodes: FileNode[], targetDir: string): string[] => {
    if (!targetDir) return nodes.map(n => n.name);
    for (const node of nodes) {
      if (node.path === targetDir && node.kind === 'directory') {
        return (node.children || []).map(n => n.name);
      }
      if (node.kind === 'directory' && node.children) {
        const res = getExistingNames(node.children, targetDir);
        if (res.length > 0) return res;
      }
    }
    return [];
  };

  const existingNames = getExistingNames(files, destDirNorm);
  const srcName = targetNode.name;
  let newName = srcName;

  if (existingNames.includes(newName)) {
    if (targetNode.kind === 'file') {
      const extMatch = srcName.match(/\.[^.]+$/);
      const ext = extMatch ? extMatch[0] : '';
      const baseName = ext ? srcName.slice(0, -ext.length) : srcName;
      let counter = 1;
      while (existingNames.includes(`${baseName}_copy${counter > 1 ? counter : ''}${ext}`)) {
        counter++;
      }
      newName = `${baseName}_copy${counter > 1 ? counter : ''}${ext}`;
    } else {
      let counter = 1;
      while (existingNames.includes(`${srcName}_copy${counter > 1 ? counter : ''}`)) {
        counter++;
      }
      newName = `${srcName}_copy${counter > 1 ? counter : ''}`;
    }
  }

  const newPath = destDirNorm ? `${destDirNorm}/${newName}` : newName;

  // 4. 경로 및 파일 콘텐츠 키 마이그레이션
  if (targetNode.kind === 'file') {
    const content = vfsReadFile(sourcePath);
    vfsWriteFile(newPath, content);
    localStorage.removeItem(VFS_CONTENT_PREFIX + sourcePath);
    targetNode.name = newName;
    targetNode.path = newPath;
  } else if (targetNode.kind === 'directory') {
    const migrateContents = (n: FileNode) => {
      if (n.kind === 'file' && n.path) {
        const childOldPath = n.path;
        const childNewPath = n.path.replace(sourcePath, newPath);
        const content = vfsReadFile(childOldPath);
        vfsWriteFile(childNewPath, content);
        localStorage.removeItem(VFS_CONTENT_PREFIX + childOldPath);
      }
      if (n.kind === 'directory' && n.children) {
        n.children.forEach(migrateContents);
      }
    };
    migrateContents(targetNode);
    updateChildPaths(targetNode, sourcePath, newPath);
    targetNode.name = newName;
    targetNode.path = newPath;
  }

  // 5. 대상 디렉토리에 삽입
  const insertNode = (nodes: FileNode[], targetDir: string): boolean => {
    if (!targetDir) {
      nodes.push(targetNode);
      return true;
    }
    for (const node of nodes) {
      if (node.path === targetDir && node.kind === 'directory') {
        if (!node.children) node.children = [];
        node.children.push(targetNode);
        return true;
      }
      if (node.kind === 'directory' && node.children) {
        if (insertNode(node.children, targetDir)) return true;
      }
    }
    return false;
  };

  const inserted = insertNode(files, destDirNorm);
  if (!inserted && destDirNorm) {
    // 대상 폴더를 찾지 못한 경우 안전하게 루트에 삽입
    files.push(targetNode);
  }

  saveVfsFiles(files);
  return newPath;
}
