/**
 * [ONR-STORAGE-001] 외부 파일 핸들 영구 스토리지 및 권한 관리 유틸리티
 * @description 작업장 외부에 위치한 파일의 FileSystemFileHandle을 IndexedDB에 보관하고,
 *              온디맨드 권한 검증 및 파일 선택기를 통한 즉시 열람/편집/저장을 지원합니다.
 */
// ====================================================================
// 📊 [OMD-CORE-externalFileStore-0001] externalFileStore.ts
// 🎯 @KICK  : 작업장 외부 문서의 FileSystemFileHandle 캐싱 및 온디맨드 권한 복원/선택
// 🛡️ @GUARD : NFC 정규화, 대소문자/확장자 상호 보정, AbortError 안전 처리, W3C 호환
// 🚨 @PATCH : **2026-09-13** — 작업장 외부 문서 온디맨드 권한 획득 및 IndexedDB 스마트 캐싱 유틸리티 최초 구현
// 🔗 @CALLS : idb.get, idb.set, idb.del, showOpenFilePicker, queryPermission, requestPermission
// ====================================================================

import { idb } from '@/lib/indexedDbHelper';

/**
 * 파일 경로 또는 파일명을 비교 및 검색 가능한 표준 키로 정규화합니다.
 */
export function normalizeExternalFileKey(rawPath: string): string {
  if (!rawPath) return '';
  return rawPath
    .replace(/^file:\/\/\//i, '')
    .replace(/^knowledge:\/\//i, '')
    .replace(/\\/g, '/')
    .trim()
    .toLowerCase()
    .normalize('NFC');
}

/**
 * 외부 파일 핸들을 IndexedDB에 저장합니다 (경로 및 파일명 다중 인덱싱).
 */
export async function saveExternalFileHandle(
  rawPathOrName: string,
  handle: FileSystemFileHandle
): Promise<void> {
  if (!handle || !rawPathOrName) return;
  const normKey = normalizeExternalFileKey(rawPathOrName);
  const baseName = (normKey.split('/').pop() || normKey).toLowerCase().normalize('NFC');

  try {
    // 1. 전체 정규화 경로 키로 저장
    await idb.set(`ext_handle:path:${normKey}`, handle);

    // 2. 파일명 및 확장자 상호 보정 키로 저장
    if (baseName) {
      await idb.set(`ext_handle:name:${baseName}`, handle);
      const baseNoMd = baseName.replace(/\.md$/i, '');
      await idb.set(`ext_handle:name:${baseNoMd}`, handle);
      await idb.set(`ext_handle:name:${baseNoMd}.md`, handle);
    }
  } catch (err) {
    console.warn('[externalFileStore] 외부 파일 핸들 캐싱 실패:', err);
  }
}

/**
 * 정규화된 경로 또는 파일명을 바탕으로 IndexedDB에 캐싱된 외부 파일 핸들을 조회합니다.
 */
export async function getExternalFileHandle(
  rawPathOrName: string
): Promise<FileSystemFileHandle | null> {
  if (!rawPathOrName) return null;
  const normKey = normalizeExternalFileKey(rawPathOrName);
  const baseName = (normKey.split('/').pop() || normKey).toLowerCase().normalize('NFC');
  const baseNoMd = baseName.replace(/\.md$/i, '');

  try {
    // 1. 전체 경로 키로 조회
    let handle = await idb.get(`ext_handle:path:${normKey}`);
    if (handle) return handle;

    // 2. 파일명 키로 조회
    if (baseName) {
      handle = await idb.get(`ext_handle:name:${baseName}`);
      if (handle) return handle;
      handle = await idb.get(`ext_handle:name:${baseNoMd}.md`);
      if (handle) return handle;
      handle = await idb.get(`ext_handle:name:${baseNoMd}`);
      if (handle) return handle;
    }
  } catch (err) {
    console.warn('[externalFileStore] 외부 파일 핸들 캐시 조회 실패:', err);
  }
  return null;
}

/**
 * 주어진 파일 핸들의 접근 권한을 확인하고 필요한 경우 권한을 요청합니다.
 */
export async function verifyHandlePermission(
  handle: FileSystemFileHandle,
  readWrite = false
): Promise<boolean> {
  if (!handle) return false;
  try {
    const mode = readWrite ? 'readwrite' : 'read';
    if (typeof (handle as any).queryPermission === 'function') {
      const status = await (handle as any).queryPermission({ mode });
      if (status === 'granted') return true;
      if (typeof (handle as any).requestPermission === 'function') {
        const reqStatus = await (handle as any).requestPermission({ mode });
        return reqStatus === 'granted';
      }
    }
    return true;
  } catch (e) {
    console.warn('[externalFileStore] 권한 검증 예외:', e);
    return false;
  }
}

/**
 * 브라우저 Native File System Access API를 호출하여 파일 선택 창을 띄웁니다.
 * (사용자 클릭 이벤트 핸들러 내부에서 직접 실행되어야 브라우저 제스처 차단을 방지할 수 있습니다.)
 */
export async function pickExternalFile(
  suggestedName?: string
): Promise<FileSystemFileHandle | null> {
  if (typeof window === 'undefined' || typeof (window as any).showOpenFilePicker !== 'function') {
    return null;
  }
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      multiple: false,
      suggestedName: suggestedName || undefined,
      types: [{
        description: 'Markdown Files',
        accept: {
          'text/markdown': ['.md', '.markdown'],
          'text/plain': ['.txt', '.md']
        }
      }]
    });
    return handle || null;
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.warn('[externalFileStore] showOpenFilePicker 파일 선택 예외:', e);
    }
    return null;
  }
}
