// ====================================================================
// 📊 [OMD-IO-driveLinkedPath] frontend/src/lib/driveLinkedPath.ts
// 🎯 @KICK  : Drive 작업장 문서 링크의 상대 경로를 현재 작업장 내부 경로로 해석
// 🛡️ @GUARD : 상위 경로 이동으로 작업장 밖 파일을 열지 않도록 차단
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
  const target = targetPath.replace(/\\/g, '/');
  const joined = target.startsWith('GoogleDrive/')
    ? target
    : target.startsWith('/')
      ? `${root}/${target.replace(/^\/+/, '')}`
      : `${source.slice(0, source.lastIndexOf('/') + 1)}${target}`;
  const segments: string[] = [];
  for (const segment of joined.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment && segment !== '.') segments.push(segment);
  }
  const fullPath = segments.join('/');
  if (!fullPath.startsWith(`${root}/`)) return null;
  return { fullPath, relativePath: fullPath.slice(root.length + 1) };
}
