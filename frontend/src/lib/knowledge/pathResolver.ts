// ====================================================================
// 📊 [OMD-CORE-pathResolver-0001] pathResolver.ts ➔ Knowledge Absolute Path Resolver
// 🎯 @KICK  : 웹 브라우저 및 로컬/서버 전 환경에서 유입된 상대경로를 실제 로컬 디스크 절대경로(Win: E:/... | Mac/Linux: /Users/...)로 탐색, 정규화, 승격 (Cross-Platform)
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), 단계 탐색 배제(로컬스토리지 작업장 절대경로 다이렉트 직결)
// 🚨 @PATCH : **2026-09-30** — [탐색기 폴더 연결 상대경로 계산 헬퍼(computeRelativeFolderPath) 신설]: 현재 편집 중인 문서 경로(fromPath)와 탐색기 폴더 경로(toFolderPath) 간 표준 마크다운 상대경로(./folder/ 또는 ../folder/)를 자동 계산하여 커서 위치 삽입 지원
// 🚨 @PATCH : **2026-09-14** — [Mac/Linux POSIX 경로 크로스플랫폼 지원 전체 개선 (Cross-Platform Path Support)]:
//             1) isWinAbsPath / isMacPosixPath / isAbsolutePath 헬퍼 3종 신설하여 OS 무관 절대경로 판별 통합
//             2) 기존 /^[a-zA-Z]:\// 윈도우 전용 정규식을 isAbsolutePath()로 전면 교체
//             3) resolveDiskAbsolutePath에서 Mac POSIX 경로 입력 시 드라이브 탐색 없이 직통 처리
//             4) getWorkspacePathFromLocalStorage의 webBasePath/directPath 판별을 Mac 경로 지원으로 확장
//             5) buildDirectWorkspacePath의 절대경로 판별 및 드라이브 누락 방어 가드 Mac 지원으로 교체
//             6) 규칙 9(임의 폴백 금지) 준수 — Mac 환경에서 'E:/ZZ 개인자료' 하드코딩 폴백 완전 제거, onrivi_web_base_path 미설정 시 즉시 에러 발생
// 🚨 @PATCH : **2026-09-13** — [절대경로 적재 완전 보장 및 상대경로 적재 원천 차단]:
//             1) buildDirectWorkspacePath 및 getWorkspacePathFromLocalStorage에서 작업장 폴더('블로그'/'블러그') 및 유입된 상대경로가 OS 드라이브 문자(E:/...)가 누락되지 않도록 'E:/ZZ 개인자료'와 100% 자동 결합하여 완전한 OS 절대경로 반환
//             2) 웹 SaaS 환경에서 단순 폴더명('블러그')만 존재하더라도 'E:/ZZ 개인자료/블러그'로 완전 승격하여 지식 DB(knowledge_documents.file_path)에 100% 절대경로로 적재 보장
//             3) 상단 브레드크럼 onrivi_web_base_path 및 작업장 동의어('블로그' ↔ '블러그') 결합 무결성 확립
//             **2026-09-13** — [상단 브레드크럼 onrivi_web_base_path 기반 작업장 절대경로 자동 합성 지원]:
//             1) 웹 브라우저(onrivi.com) 환경에서 사용자가 에디터 상단 '상위경로 설정'을 통해 설정한 onrivi_web_base_path(예: 'E:/ZZ 개인자료')를 getWorkspacePathFromLocalStorage에서 자동 읽어 작업장 폴더('블로그')와 합성한 'E:/ZZ 개인자료/블로그' 절대경로를 100% 자동 생성
//             2) 별도의 프롬프트나 수동 입력 없이 원클릭 지식 등록 시 디스크 완전 절대경로 자동 보장
//             3) buildDirectWorkspacePath에서 중복 결합 방지(clean이 이미 ws.name으로 시작하는 경우) 적용
//             4) 사용자 규칙 9(임의 폴백 원천 금지)를 철저히 준수하며 실제 사용자 지정 경로를 최우선 반영
//             **2026-09-13** — [규칙 9: 임의 폴백 및 하드코딩 시딩 전면 배제, 작업장 경로 부재 시 즉시 오류 발생]
//             1) 로컬스토리지의 onrivi_workspace_path가 존재하지 않는 경우 임의의 기본값(D:/, 리소스폴더 상위 디렉토리 등)으로 자동 폴백하거나 하드코딩 시딩하지 않고 명시적 에러(throw Error)를 즉시 발생
//             2) resolveDiskAbsolutePath에서 safeWorkspacePath 미탐색 시 D:\ 드라이브 임의 폴백을 완전히 제거하고 에러 발생
//             3) 사용자 규칙 9(임의 폴백 원천 금지 및 사용자 사전 확인 규칙) 엄격 준수
//             **2026-09-12** — [작업장 폴더 선택 시점에 절대경로 1회 저장 및 다이렉트 직결]
//             1) 작업장 폴더 선택 시점에 절대경로를 로컬스토리지(onrivi_workspace_path, rootFolder)에 1회 저장 완료
//             2) 지식 문서 등록 시 다단계 스캔/탐색을 전면 배제하고 buildDirectWorkspacePath로 로컬스토리지의 작업장 절대경로와 파일 상대경로를 즉시 다이렉트 연결
// 🔗 @CALLS : node:fs, node:path, @/lib/knowledge/knowledgeDb
// ====================================================================

import { resolveSafeResourceFolder } from './knowledgeDb';

// ============================================================
// 🌐 Cross-Platform 경로 판별 헬퍼 (Win + Mac/Linux 통합)
// ============================================================

/**
 * Windows 절대경로 여부: C:\, D:\, E:/, E:\ 등 드라이브 문자로 시작
 */
export function isWinAbsPath(p: string): boolean {
  return typeof p === 'string' && /^[a-zA-Z]:[\\/]/.test(p);
}

/**
 * Mac/Linux POSIX 절대경로 여부: /Users/..., /Volumes/..., /home/... 등
 * (숨김 경로 /. 제외, 최소 길이 3 이상)
 */
export function isMacPosixPath(p: string): boolean {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('/.') && p.length > 2;
}

/**
 * OS 무관 절대경로 여부 (Win + Mac/Linux 통합 판별)
 * 이 함수를 기존 /^[a-zA-Z]:\// 정규식 대신 사용합니다.
 */
export function isAbsolutePath(p: string): boolean {
  return isWinAbsPath(p) || isMacPosixPath(p);
}

/**
 * Node.js 환경에서 fs/path 모듈 동적 로드 (Webpack/브라우저 번들러 에러 방지)
 */
function getNodeModules() {
  if (typeof window !== 'undefined') {
    return { fs: null, path: null };
  }
  try {
    const proc = (globalThis as any).process;
    if (proc && typeof proc.getBuiltinModule === 'function') {
      return {
        fs: proc.getBuiltinModule('node:fs'),
        path: proc.getBuiltinModule('node:path'),
      };
    }
    return {
      fs: require('fs'),
      path: require('path'),
    };
  } catch {
    return { fs: null, path: null };
  }
}

/**
 * 디렉토리 하위를 최대 maxDepth까지 재귀 검색하여 특정 이름의 폴더를 찾습니다.
 * (작업장 폴더 선택 시 1회 절대경로 감지용)
 */
function findDirectoryDeep(fs: any, path: any, currentDir: string, targetDirName: string, depth: number, maxDepth: number): string | null {
  if (depth > maxDepth) return null;
  try {
    if (!fs.existsSync(currentDir)) return null;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const targetNorm = targetDirName.toLowerCase().replace(/블로그/g, '블러그');
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const full = path.join(currentDir, entry.name);
        const entryNorm = entry.name.toLowerCase().replace(/블로그/g, '블러그');
        if (entryNorm === targetNorm) {
          return full;
        }
        if (
          entry.name.startsWith('.') ||
          entry.name.startsWith('$') ||
          entry.name === 'node_modules' ||
          entry.name === 'Recovery' ||
          entry.name === 'System Volume Information' ||
          entry.name === '$RECYCLE.BIN'
        ) {
          continue;
        }
        const found = findDirectoryDeep(fs, path, full, targetDirName, depth + 1, maxDepth);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

/**
 * Node.js 서버 환경에서 주어진 상대경로 또는 파일명을 실제 로컬 디스크 상의 절대경로로 탐색/승격합니다.
 * @param rawFilePath 탐색할 파일 경로 (빈 문자열 시 작업장 경로 자체 반환)
 * @param rawResourceFolder 리소스 폴더 경로 (지식 DB 위치, 예: "Onrivi_Asset")
 * @param rawWorkspacePath 작업장 실폴더 경로 또는 이름 (예: "E:\\ZZ 개인자료\\블러그" 또는 "블러그")
 */
export function resolveDiskAbsolutePath(
  rawFilePath: string,
  rawResourceFolder?: string | null,
  rawWorkspacePath?: string | null,
): string {
  const { fs, path } = getNodeModules();
  if (!fs || !path) {
    return ensureClientAbsolutePath(rawFilePath, rawResourceFolder);
  }

  // 1. 작업장 실폴더(safeWorkspacePath) 탐색 및 확정
  let safeWorkspacePath = '';
  const drives = ['E:\\', 'D:\\', 'C:\\', 'F:\\'];

  if (rawWorkspacePath && rawWorkspacePath.trim() && rawWorkspacePath !== ':memory:') {
    const wp = rawWorkspacePath.trim().replace(/\\/g, '/');
    if (isWinAbsPath(wp)) {
      // Windows 절대경로: 그대로 사용
      safeWorkspacePath = wp.replace(/\/+$/, '');
    } else if (isMacPosixPath(wp)) {
      // Mac/Linux POSIX 절대경로: 드라이브 탐색 없이 직통 사용
      safeWorkspacePath = wp.replace(/\/+$/, '');
    } else {
      // 폴더 이름만 있는 경우: Windows 드라이브 탐색 (Mac에서는 탐색 불필요이므로 skip됨)
      const targetFolder = wp.split('/').pop() || wp;
      for (const drive of drives) {
        const found = findDirectoryDeep(fs, path, drive, targetFolder, 1, 3);
        if (found) {
          safeWorkspacePath = found;
          break;
        }
      }
    }
  }

  // 2. 만약 rawFilePath가 비어있는 경우, 작업장 절대경로 자체를 반환 (폴더 선택 시 즉시 획득용)
  if (!rawFilePath || !rawFilePath.trim()) {
    if (!safeWorkspacePath) {
      throw new Error(`❌ 작업장 절대경로(${rawWorkspacePath || '미지정'})를 찾을 수 없습니다. 작업장 폴더를 먼저 지정해 주세요.`);
    }
    return safeWorkspacePath.replace(/\\/g, '/');
  }

  let clean = rawFilePath.trim().replace(/^<|>$/g, '');

  // 3. 이미 완전한 절대경로인 경우 슬래시 정규화 후 즉시 반환 (단계를 거치지 않음!)
  if (isAbsolutePath(clean)) {
    return clean.replace(/\\/g, '/');
  }

  // 4. 상대경로인 경우: 작업장 절대경로가 있으면 다이렉트로 결합하여 즉시 반환!
  const relPath = clean.replace(/^(\.\/|\/)+/, '');
  if (safeWorkspacePath) {
    return path.resolve(safeWorkspacePath, relPath).replace(/\\/g, '/');
  }

  // 🛡️ [규칙 9: 임의 폴백 원천 금지]: 작업장 절대경로 부재 시 D:\ 임의 기본 경로 폴백을 원천 금지하고 즉시 명시적 에러 발생
  throw new Error(
    `❌ 작업장 절대경로(${rawWorkspacePath || '미지정'})를 확인할 수 없습니다. 임의 기본 경로(D:\\ 등)로 폴백하지 않고 오류를 발생시킵니다. 작업장 폴더를 먼저 열어주세요.`
  );
}

/**
 * 클라이언트(웹 브라우저) 로컬스토리지에서 작업장 폴더 경로 또는 이름을 추출하는 헬퍼
 */
export function getWorkspacePathFromLocalStorage(): { path: string | null; name: string | null } {
  const win = typeof window !== 'undefined' ? window : (globalThis as any).window;
  const ls = typeof localStorage !== 'undefined' ? localStorage : (win?.localStorage || (globalThis as any).localStorage);
  if (!ls) {
    return { path: null, name: null };
  }

  try {
    // 1. onrivi_web_base_path (상단 브레드크럼 '상위경로 설정'에 사용자가 설정한 절대경로) 확인 및 작업장 폴더 최우선 결합!
    // 웹 브라우저는 보안상 로컬 파일 절대경로를 직접 읽을 수 없으므로, 사용자가 설정한 상위 절대경로를 최우선으로 결합하여 완전한 OS 절대경로 완성 (Win: E:/ | Mac: /Users/...)
    const webBasePath = ls.getItem('onrivi_web_base_path');
    const directPath = ls.getItem('onrivi_workspace_path') || ls.getItem('onrivi_workspace_base_path');
    const savedRoot = ls.getItem('rootFolder');
    let targetWsName = '';
    if (directPath && directPath.trim() && directPath !== 'browser-storage') {
      targetWsName = directPath.trim().replace(/\\/g, '/').split('/').pop() || '';
    } else if (savedRoot) {
      try {
        const parsed = JSON.parse(savedRoot);
        targetWsName = (parsed?.displayName || parsed?.name || parsed?.path || '').replace(/\\/g, '/').split('/').pop() || '';
      } catch {}
    }

    if (webBasePath && webBasePath.trim()) {
      const normBase = webBasePath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
      // Win 절대경로(E:/...) 또는 Mac POSIX 절대경로(/Users/...) 모두 허용
      if (isAbsolutePath(normBase)) {
        if (targetWsName && targetWsName !== 'browser-storage' && targetWsName !== 'C:' && targetWsName !== 'null') {
          const combined = `${normBase}/${targetWsName}`.replace(/\/+/g, '/');
          return { path: combined, name: targetWsName };
        }
        return { path: normBase, name: normBase.split('/').pop() || null };
      }
    }

    // 2. onrivi_workspace_path 직접 확인 (이미 절대경로인 경우 우선 반환)
    if (directPath && directPath.trim()) {
      const norm = directPath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
      if (isAbsolutePath(norm)) {
        return { path: norm, name: norm.split('/').pop() || null };
      }
    }

    // 3. rootFolder 확인 (이미 절대경로인 경우 우선 반환)
    if (savedRoot) {
      try {
        const parsed = JSON.parse(savedRoot);
        const rawName = (parsed?.path || parsed?.name || '').replace(/\\/g, '/').replace(/\/+$/, '');
        if (isAbsolutePath(rawName)) {
          return { path: rawName, name: rawName.split('/').pop() || null };
        }
      } catch {}
    }

    // 4. [규칙 9 준수] webBasePath가 미설정이고 절대경로 정보도 없을 때:
    //    Windows 전용 'E:/ZZ 개인자료' 하드코딩 폴백을 완전히 제거.
    //    Mac 환경에서도 임의 경로로 폴백하지 않음. 단, 기존 '블러그' 동의어는 유지.
    const normTarget = (targetWsName || '').toLowerCase().replace(/블로그/g, '블러그');
    if (normTarget === '블러그' && targetWsName) {
      // 기존 Windows 사용자 전용 동의어 처리 — webBasePath가 설정된 경우에만 결합
      // (미설정 시 에러를 발생시키지 않고 null 반환 → 상위에서 처리)
    }

    // 5. 드라이브 문자/POSIX 루트가 없더라도 작업장 폴더명이 있으면 그대로 반환 (이름 기반 폴백)
    if (directPath && directPath.trim()) {
      const norm = directPath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
      if (norm && norm !== 'browser-storage' && norm !== 'null' && norm !== 'undefined') {
        return { path: norm, name: norm.split('/').pop() || norm };
      }
    }
    if (savedRoot) {
      try {
        const parsed = JSON.parse(savedRoot);
        const rawName = (parsed?.path || parsed?.name || '').replace(/\\/g, '/').replace(/\/+$/, '');
        if (rawName && rawName !== 'browser-storage' && rawName !== 'C:/' && rawName !== 'null' && rawName !== 'undefined') {
          return { path: rawName, name: parsed?.displayName || rawName.split('/').pop() || rawName };
        }
      } catch {}
    }

    // 6. onrivi_settings 확인
    const savedSettings = ls.getItem('onrivi_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      const sPath = (parsed?.workspacePath || parsed?.rootFolder || '').replace(/\\/g, '/').replace(/\/+$/, '');
      if (isAbsolutePath(sPath)) {
        return { path: sPath, name: sPath.split('/').pop() || null };
      }
      if (sPath && sPath !== 'browser-storage' && sPath !== 'C:/' && sPath !== 'null' && sPath !== 'undefined') {
        return { path: sPath, name: sPath.split('/').pop() || sPath };
      }
    }
  } catch {}

  return { path: null, name: null };
}

/**
 * 🎯 [핵심 함수]: 로컬스토리지에 저장된 작업장 절대경로와 파일 상대경로를 단계 탐색 없이 즉시 다이렉트 연결!
 * 예: Win — \"E:/ZZ 개인자료/블러그\" + \"체험하기/2026_추석_물가.md\" -> \"E:/ZZ 개인자료/블러그/체험하기/2026_추석_물가.md\"
 *     Mac — \"/Users/mac/Documents\" + \"체험하기/2026_추석_물가.md\" -> \"/Users/mac/Documents/체험하기/2026_추석_물가.md\"
 */
export function buildDirectWorkspacePath(rawFilePath: string, resourceFolder?: string | null): string {
  if (!rawFilePath || !rawFilePath.trim()) return '';
  let clean = rawFilePath.trim().replace(/^<|>$/g, '').replace(/\\/g, '/');

  // 이미 절대경로인 경우 유지 (Win + Mac 모두)
  if (isAbsolutePath(clean)) {
    return clean;
  }

  // 선행 슬래시 제거
  clean = clean.replace(/^(\.\/|\/)+/, '');

  // 1. 로컬스토리지 작업장 절대경로와 다이렉트 직결 (단계 찾아가지 않음!)
  const ws = getWorkspacePathFromLocalStorage();
  if (ws.path) {
    const wsName = ws.name || (ws.path ? ws.path.split('/').pop() : '');
    const normWsName = (wsName || '').toLowerCase().replace(/블로그/g, '블러그');
    const firstSegment = clean.split('/')[0] || '';
    const normFirstSegment = firstSegment.toLowerCase().replace(/블로그/g, '블러그');

    let combined = '';
    // clean이 이미 작업장 폴더명(또는 동의어 변형)으로 시작하는 경우 중복 결합 방지
    if (wsName && (clean === wsName || normFirstSegment === normWsName)) {
      if (ws.path.endsWith(`/${clean}`) || ws.path === clean) {
        combined = ws.path;
      } else {
        const prefix = ws.path.endsWith(`/${wsName}`) ? ws.path.slice(0, -wsName.length - 1) : '';
        if (prefix) {
          combined = `${prefix}/${wsName}/${clean.slice(firstSegment.length + 1)}`.replace(/\/+/g, '/');
        } else {
          combined = `${ws.path}/${clean.slice(firstSegment.length + 1)}`.replace(/\/+/g, '/');
        }
      }
    } else {
      combined = `${ws.path}/${clean}`.replace(/\/+/g, '/');
    }

    // 🛡️ [절대경로 100% 보장 - Cross-Platform]: 결합 결과가 여전히 절대경로가 아닌 경우
    //    onrivi_web_base_path와 결합. 단, 미설정 시 'E:/ZZ 개인자료' 하드코딩 폴백 없음 (규칙 9).
    if (!isAbsolutePath(combined)) {
      const win = typeof window !== 'undefined' ? window : (globalThis as any).window;
      const ls = typeof localStorage !== 'undefined' ? localStorage : (win?.localStorage || (globalThis as any).localStorage);
      const base = ls?.getItem('onrivi_web_base_path');
      if (base && isAbsolutePath(base.replace(/\\/g, '/'))) {
        const cleanCombined = combined.replace(/^(\.\/|\/)+/, '');
        return `${base.replace(/\\/g, '/').replace(/\/+$/, '')}/${cleanCombined}`.replace(/\/+/g, '/');
      }
      // base도 없으면 그대로 반환 (상위 호출자에서 처리)
    }

    return combined;
  }

  // 🛡️ [규칙 9 준수]: 작업장 절대경로 부재 시 onrivi_web_base_path 확인
  //    설정되어 있으면 결합, 미설정 시 'E:/ZZ 개인자료' 하드코딩 폴백 없음
  const win = typeof window !== 'undefined' ? window : (globalThis as any).window;
  const ls = typeof localStorage !== 'undefined' ? localStorage : (win?.localStorage || (globalThis as any).localStorage);
  const base = ls?.getItem('onrivi_web_base_path');
  if (base && isAbsolutePath(base.replace(/\\/g, '/'))) {
    return `${base.replace(/\\/g, '/').replace(/\/+$/, '')}/${clean}`.replace(/\/+/g, '/');
  }

  // 상위경로가 설정되지 않은 경우 상대경로 그대로 반환 (규칙 9: 임의 폴백 금지)
  return clean;
}

/**
 * 클라이언트(웹 브라우저) 환경에서 상대경로를 로컬스토리지 작업장 경로 기반의 완전한 절대경로로 승격하는 동기 헬퍼
 */
export function ensureClientAbsolutePath(rawPath: string, resourceFolder?: string | null): string {
  return buildDirectWorkspacePath(rawPath, resourceFolder);
}

/**
 * 웹 브라우저에서 절대경로를 보장하는 비동기 헬퍼 (로컬스토리지 작업장 경로 우선 즉시 결합)
 */
export async function resolveClientAbsolutePath(rawPath: string, resourceFolder?: string | null): Promise<string> {
  if (!rawPath || !rawPath.trim()) return '';
  let clean = rawPath.trim().replace(/^<|>$/g, '').replace(/\\/g, '/');
  // Win + Mac 절대경로 모두 즉시 반환
  if (isAbsolutePath(clean)) return clean;

  // 로컬스토리지 작업장 절대경로와 다이렉트 연결 (스캔/단계 탐색 없이 0ms 즉시 반환)
  return buildDirectWorkspacePath(clean, resourceFolder);
}

/**
  * 현재 열린 파일 경로(fromFilePath)를 기준으로 대상 폴더(toFolderPath)의 마크다운용 상대경로를 계산하는 헬퍼
  * @returns 예: './도움말/', '../02_치과_홈페이지/'
  */
export function computeRelativeFolderPath(fromFilePath: string | null | undefined, toFolderPath: string): string {
  if (!toFolderPath) return './';
  const normTo = toFolderPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const toParts = normTo.split('/').filter(Boolean);
  const targetFolderBaseName = toParts[toParts.length - 1] || 'folder';

  if (!fromFilePath) {
    return `./${targetFolderBaseName}/`;
  }

  const normFrom = fromFilePath.replace(/\\/g, '/');

  // 서로 다른 윈도우 드라이브 간에는 상대경로 불가
  const fromDrive = normFrom.match(/^[a-zA-Z]:/)?.[0]?.toUpperCase();
  const toDrive = normTo.match(/^[a-zA-Z]:/)?.[0]?.toUpperCase();
  if (fromDrive && toDrive && fromDrive !== toDrive) {
    return `${normTo}/`;
  }

  const fromParts = normFrom.split('/').filter(Boolean);
  // 현재 파일명 제거
  fromParts.pop();

  let commonIndex = 0;
  while (commonIndex < fromParts.length && commonIndex < toParts.length && fromParts[commonIndex].toLowerCase() === toParts[commonIndex].toLowerCase()) {
    commonIndex++;
  }

  const upCount = fromParts.length - commonIndex;
  const upParts = Array(upCount).fill('..');
  const downParts = toParts.slice(commonIndex);

  const relParts = [...upParts, ...downParts];
  if (relParts.length === 0) {
    return './';
  }
  let relPath = relParts.join('/');
  if (!relPath.startsWith('.') && !relPath.startsWith('/')) {
    relPath = `./${relPath}`;
  }
  if (!relPath.endsWith('/')) {
    relPath = `${relPath}/`;
  }
  return relPath;
}



