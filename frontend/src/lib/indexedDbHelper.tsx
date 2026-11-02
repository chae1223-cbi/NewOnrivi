"use client";

import React from 'react';
import { browserAccountDatabaseName } from './browserAccountStorage';
import { Icon } from '@/components/icons/Icon';
import { msg } from './systemMessages';

// IndexedDB 헬퍼 (핸들 저장을 위해 필요)
// ====================================================================
// 📊 [OMD-CORE-indexedDbHelper-0001 ✅ FIXED] indexedDbHelper.tsx ➔ idb
// 🎯 @KICK  : IndexedDB 기반 key-value 저장 헬퍼 (get/set/del/clear)
// 🛡️ @GUARD : onupgradeneeded 스토어 생성, objectStoreNames 존재 여부 체크
// 🚨 @PATCH : **2026-10-25** — [임시·테스트 전용 scratch 폴더 디렉토리 스캔 제외]: scanDirectory 및 scanDirectoryDeep 무시 목록에 'scratch' 추가
// 🚨 @PATCH : **2026-10-03** — [FileNode 구글 드라이브 속성 확장]: driveId, driveFileId, id, size 선택적 필드 추가로 클라우드 드라이브 노드 타입 완전 지원
// 🚨 @PATCH : **2026-09-30** — [문서 연결 내 폴더 링크 지원]: scanDirectoryDeep에 includeDirectories 옵션 추가하여 폴더 링크 생성을 위한 디렉토리 노드 수집 지원
//             **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import 제거, Icon 컴포넌트로 교체. getFileIcon 탐색기 아이콘 통일
//             **2026-09-05** — idb.del 및 idb.clear 메서드 구현 추가
// 🔗 @CALLS : 없음
// ====================================================================
export const idb = {
  get: (key: string) => new Promise<any>((resolve, reject) => {
    const req = indexedDB.open(browserAccountDatabaseName(), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('store');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('store')) return resolve(null);
      const tx = db.transaction('store', 'readonly');
      const getReq = tx.objectStore('store').get(key);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
    req.onerror = () => reject(req.error);
  }),
  set: (key: string, val: any) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(browserAccountDatabaseName(), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('store');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('store', 'readwrite');
      const putReq = tx.objectStore('store').put(val, key);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  }),
  del: (key: string) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(browserAccountDatabaseName(), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('store');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('store')) return resolve();
      const tx = db.transaction('store', 'readwrite');
      const delReq = tx.objectStore('store').delete(key);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    };
    req.onerror = () => reject(req.error);
  }),
  clear: () => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(browserAccountDatabaseName(), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('store');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('store')) return resolve();
      const tx = db.transaction('store', 'readwrite');
      const clearReq = tx.objectStore('store').clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    };
    req.onerror = () => reject(req.error);
  })
};

// 파일 트리 노드 타입 (재귀 구조)
export type FileNode = {
  name: string;
  kind: 'file' | 'directory';
  handle?: any;
  path?: string;
  children?: FileNode[];
  driveId?: string;
  driveFileId?: string;
  id?: string;
  size?: number;
};

// 폴더를 재귀적으로 스캔하는 함수 (상대 경로인 parentPath를 인자로 받아 노드별 path 가상 경로 부여)
// ====================================================================
// 📊 [OMD-CORE-indexedDbHelper-0002] indexedDbHelper.tsx ➔ scanDirectory
// 🎯 @KICK  : File System Access API로 폴더를 재귀 스캔하여 .md/.markdown 파일 트리 구축
// 🛡️ @GUARD : directory/file kind 분기, 오류 시 빈 배열 반환, 파일명 필터링
// 🚨 @PATCH : **2026-08-19** — scanDirectory 성능 최적화 (Promise.all 병렬 처리 및 node_modules, 숨김 파일 무시 스킵 로직 적용)
//             localeCompare로 폴더 우선 정렬
// 🔗 @CALLS : msg.error
// ====================================================================
export async function scanDirectory(dirHandle: any, parentPath: string = ""): Promise<FileNode[]> {
  const entries: FileNode[] = [];
  const dirPromises: Promise<void>[] = [];

  try {
    for await (const [name, handle] of dirHandle.entries()) {
      // 🚀 [최적화] 숨김 파일(.git, .obsidian 등), node_modules 및 임시 scratch 폴더는 무시하여 스캔 속도 대폭 향상
      if (name.startsWith('.') || name === 'node_modules' || name === 'scratch') continue;

      const currentPath = parentPath ? `${parentPath}/${name}` : name;
        if (handle.kind === 'directory') {
          // ⚡ [최적화] 웹 환경 초기 로딩 속도 향상을 위해 재귀 스캔을 중단하고 지연 로딩(Lazy Load)으로 전환
          entries.push({ name, kind: 'directory', handle, children: [], path: currentPath });
        } else if (handle.kind === 'file') {
        const nameLower = name.toLowerCase();
        if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown') || nameLower.endsWith('.bib')) {
          entries.push({ name, kind: 'file', handle, path: currentPath });
        }
      }
    }
    // 모든 하위 디렉토리 스캔을 병렬로 기다림
    await Promise.all(dirPromises);
  } catch (e) {
    msg.error("Directory scan error", e);
  }
  return entries.sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
    }
    return a.kind === 'directory' ? -1 : 1;
  });
}

// ====================================================================
// 📊 [OMD-CORE-indexedDbHelper-0004] indexedDbHelper.tsx ➔ scanDirectoryDeep
// 🎯 @KICK  : 웹 환경 문서 링크 검색을 위해 하위 모든 폴더를 지연 로딩 없이 끝까지 재귀 탐색하여 .md/.markdown/.bib FileNode 배열 수집
// 🛡️ @GUARD : visited Set으로 순환 참조 방지, .git 및 node_modules 제외 필터링, 예외 시 안전 빈 배열
// 🚨 @PATCH : **2026-09-30** — [문서 연결 내 폴더 링크 지원]: includeDirectories 플래그 추가하여 파일뿐만 아니라 폴더(directory) 노드도 안전하게 수집
// 🚨 @PATCH : **2026-09-16** — [삭제된 폴더 탐색 시 NotFoundError 콘솔 노이즈 방어]: 폴더 삭제 직후 재귀 스캔 시 이미 삭제된 디렉토리 핸들에 대한 NotFoundError 에러 경고 억제 및 안전 건너뛰기
// 🚨 @PATCH : **2026-09-12** — [웹 환경 문서 연결 검색 완벽 지원] 브라우저 FileSystemDirectoryHandle 하위 모든 디렉토리를 깊숙이 재귀 탐색하여 모든 .md 파일을 100% 수집하는 scanDirectoryDeep 신설
// 🔗 @CALLS : msg.error
// ====================================================================
export async function scanDirectoryDeep(dirHandle: any, parentPath: string = "", visited: Set<any> = new Set(), includeDirectories: boolean = false): Promise<FileNode[]> {
  if (!dirHandle) return [];
  if (visited.has(dirHandle)) return [];
  visited.add(dirHandle);

  const files: FileNode[] = [];

  try {
    for await (const [name, handle] of dirHandle.entries()) {
      const nameLower = name.toLowerCase();
      if (name.startsWith('.') || ['node_modules', 'out', 'dist', 'build', '_dev_api_backup', '.wrangler', '.next-web-build', 'scratch'].includes(nameLower)) continue;

      const currentPath = parentPath ? `${parentPath}/${name}` : name;
      if (handle.kind === 'file') {
        const nameLower = name.toLowerCase();
        if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown') || nameLower.endsWith('.bib')) {
          files.push({ name, kind: 'file', handle, path: currentPath });
        }
      } else if (handle.kind === 'directory') {
        if (includeDirectories) {
          files.push({ name, kind: 'directory', handle, path: currentPath });
        }
        try {
          const subFiles = await scanDirectoryDeep(handle, currentPath, visited, includeDirectories);
          files.push(...subFiles);
        } catch {
          // 이미 삭제되었거나 일시적으로 접근 불가능한 하위 디렉토리는 안전하게 스킵
        }
      }
    }
  } catch (e: any) {
    if (e?.name !== 'NotFoundError') {
      console.warn('[scanDirectoryDeep] directory scan error for path:', parentPath, e);
    }
  }

  return files;
}

// 파일/폴더 확장자에 따른 아이콘 및 색상 반환 함수
// ====================================================================
// 📊 [OMD-CORE-indexedDbHelper-0003] indexedDbHelper.tsx ➔ getFileIcon
// 🎯 @KICK  : 파일/폴더 확장자에 따른 Icon 컴포넌트 렌더링 (폰트 색상과 일치)
// 🛡️ @GUARD : directory/file 분기, isOpen 상태 지원, text-current 상속으로 주변 텍스트와 100% 색상 일치
// 🚨 @PATCH : **2026-09-20** — [아이콘 디자인시스템 통합] lucide 직접 JSX → Icon 컴포넌트로 전면 교체
//             **2026-09-16** — [탐색기 아이콘 세련된 미니멀리즘 전면 개편]: 인접 텍스트와 완벽 일치하는 text-current 및 strokeWidth 1.75 미니멀 라인 아이콘으로 통일
// 🔗 @CALLS : 없음
// ====================================================================
export const getFileIcon = (node: FileNode, isSelected: boolean = false, isOpen: boolean = false) => {
  const baseClass = "shrink-0 text-current transition-colors";

  if (node.kind === 'directory') {
    if (isOpen) {
      return <Icon name="FolderOpen" size={14} strokeWidth={1.75} className={`${baseClass} opacity-80 group-hover:opacity-100`} />;
    }
    return <Icon name="Folder" size={14} strokeWidth={1.75} className={`${baseClass} opacity-80 group-hover:opacity-100`} />;
  }

  const fileName = node.name;
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'md' || ext === 'markdown') {
    return <Icon name="Document" size={14} strokeWidth={1.75} className={`${baseClass} opacity-80 group-hover:opacity-100`} />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return <Icon name="Image" size={14} strokeWidth={1.75} className={`${baseClass} opacity-75 group-hover:opacity-100`} />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'json', 'css', 'scss', 'html', 'py', 'sh', 'bib'].includes(ext || '')) {
    return <Icon name="FileCode" size={14} strokeWidth={1.75} className={`${baseClass} opacity-75 group-hover:opacity-100`} />;
  }

  return <Icon name="FileGeneric" size={14} strokeWidth={1.75} className={`${baseClass} opacity-70 group-hover:opacity-100`} />;
};


