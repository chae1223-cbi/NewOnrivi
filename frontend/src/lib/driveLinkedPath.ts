// ====================================================================
// 📊 [OMD-IO-driveLinkedPath] frontend/src/lib/driveLinkedPath.ts
// 🎯 @KICK  : Drive 작업장 문서 링크의 상대 경로를 현재 작업장 내부 경로로 해석
// 🛡️ @GUARD : 상위 경로 이동으로 작업장 밖 파일을 열지 않도록 차단
// 🚨 @PATCH : 2026-11-07 — [연속 중복 디렉토리 세그먼트 스킵]: joined 경로 분해 시 동일 폴더명(도움말/도움말/)이 연속 반복되는 경우 자동 스킵 처리
// 🚨 @PATCH : 2026-11-07 — [Drive 문서 링크 중복 폴더 세그먼트 결합 방어 및 꺽쇠 정제]: 링크 경로가 이미 상위 디렉토리명을 포함하는 경우(예: 도움말/00_시작하기.md) 부모 디렉토리 중복(도움말/도움말/) 결합을 방어하고 꺽쇠(<...>) 정제 지원
// 🚨 @PATCH : 2026-11-05 — [Drive 문서 링크]: 현재 문서 위치 기준 폴더 경로 정규화 및 작업장 경계 검사.
// 🔗 @CALLS : 없음
// ====================================================================

/**
 * ========================================================================================
 * [함수명] resolveDriveLinkedPath - 현재 문서의 상대 링크를 Drive 작업장 내부 경로로 바꿉니다.
 * @param rootPath - 현재 Drive 작업장 경로
 * @param sourcePath - 링크가 들어 있는 문서 경로
 * @param targetPath - 링크에 기록된 대상 경로
 * @returns 작업장 내부 상대 경로와 정규화된 전체 경로, 아니면 null
 * ========================================================================================
 */
export function resolveDriveLinkedPath(rootPath: string, sourcePath: string, targetPath: string): { fullPath: string; relativePath: string } | null {
  const root = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const source = sourcePath.replace(/\\/g, '/');
  let target = targetPath.replace(/\\/g, '/').trim();
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1).trim();
  }

  // 1. 이미 rootPath 또는 GoogleDrive/ 접두어가 온전히 포함된 경우
  if (target.startsWith(`${root}/`)) {
    const rel = target.slice(root.length + 1);
    return { fullPath: target, relativePath: rel };
  }
  if (target.startsWith('GoogleDrive/')) {
    const rel = target.startsWith(`${root}/`) ? target.slice(root.length + 1) : target.replace(/^GoogleDrive\/[^/]+\//, '');
    return { fullPath: target, relativePath: rel };
  }

  const sourceDir = source.includes('/') ? source.slice(0, source.lastIndexOf('/')) : '';
  const sourceDirName = sourceDir.split('/').pop() || '';

  // 2. target이 이미 resolve되어 sourceDirName으로 시작하고, ./ 나 ../ 로 시작하지 않는 경우 (예: sourceDir가 ".../도움말", target이 "도움말/00_시작하기.md")
  let joined: string;
  if (target.startsWith('/')) {
    joined = `${root}/${target.replace(/^\/+/, '')}`;
  } else if (!target.startsWith('./') && !target.startsWith('../') && sourceDirName && (target === sourceDirName || target.startsWith(sourceDirName + '/'))) {
    // 중복 폴더 접두어 방지: sourceDir의 부모 경로 + target
    const parentDir = sourceDir.includes('/') ? sourceDir.slice(0, sourceDir.lastIndexOf('/')) : '';
    joined = parentDir ? `${parentDir}/${target}` : `${root}/${target}`;
  } else {
    joined = `${sourceDir ? sourceDir + '/' : ''}${target}`;
  }

  const segments: string[] = [];
  for (const segment of joined.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment && segment !== '.') {
      if (segments.length && segments[segments.length - 1].toLowerCase() === segment.toLowerCase()) continue;
      segments.push(segment);
    }
  }
  const fullPath = segments.join('/');
  if (!fullPath.startsWith(`${root}/`)) {
    if (fullPath.startsWith(root)) {
      return { fullPath, relativePath: fullPath.slice(root.length).replace(/^\/+/, '') };
    }
    const fallbackPath = `${root}/${fullPath.replace(/^\/+/, '')}`;
    return { fullPath: fallbackPath, relativePath: fullPath.replace(/^\/+/, '') };
  }
  return { fullPath, relativePath: fullPath.slice(root.length + 1) };
}
