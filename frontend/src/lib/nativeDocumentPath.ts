/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : frontend/src/lib/nativeDocumentPath.ts
 * 🚨 @PATCH : **2026-11-07** — [도움말 상대 링크(./ 및 꺽쇠 <...>) 대상 경로 정규화 강화]:
 *             1) resolveDocumentLink 및 resolveWorkspaceHelpLink에서 꺽쇠(<...>) 및 따옴표 정제 추가
 *             2) 도움말 형제 문서 간 ./00_시작하기.md 상대 링크 시 현재 도움말 폴더 기준 `${sourceDir}/${targetFileName}` 일관 해석 보장
 * 🚨 @PATCH : **2026-11-07** — [연속 중복 디렉토리 세그먼트(도움말/도움말/) 결합 원천 방어]:
 *             1) resolveDocumentLink에서 result의 마지막 세그먼트와 동일한 폴더명이 연속 주입될 때 중복 세그먼트를 자동 스킵 처리
 * 🚨 @PATCH : **2026-11-07** — [문서 링크 단일 디렉토리 중복(도움말/도움말/) 결합 원천 방어]:
 *             1) resolveDocumentLink의 overlap 탐색 루프를 count=2에서 count=1로 개편하여 단일 폴더 계층 중복을 완벽 탐지·제거
 * 🚨 @PATCH : **2026-10-24** — [도움말 문서 간 링크(../../ 및 파일명) 상위 이탈 자동 보정]:
 *             1) resolveWorkspaceHelpLink에서 도움말 문서(00_시작하기, HELP-*) 간 상위 상대경로(../../)나 단독 파일명 링크 연결 시
 *                작업장 루트 대신 현재 도움말 폴더의 형제 파일로 안전하게 자동 보정
 */
// Relative document names are meaningful only inside a connected native workspace.
export function resolveDocumentLink(target: string, currentFile?: string): string {
  let link = target.trim();
  if (link.startsWith('<') && link.endsWith('>')) {
    link = link.slice(1, -1).trim();
  }
  link = link.replace(/^[<"']|[>"']$/g, '').replace(/\\/g, '/');
  try { link = decodeURIComponent(link); } catch {}
  if (link.startsWith('file:///')) return link.slice(8);
  if (/^(?:[a-z]:\/|\/|https?:|knowledge:)/i.test(link) || !currentFile) return link;
  const base = currentFile.replace(/\\/g, '/').split('/').slice(0, -1);
  const relative = link.replace(/^\.\//, '').split('/');
  // Some older document links contain their workspace folder prefix already.
  // Do not append that prefix to the same folder a second time.
  let overlap = 0;
  if (!link.startsWith('../')) {
    for (let count = 1; count <= Math.min(base.length, relative.length - 1); count++) {
      if (base.slice(-count).join('/').toLowerCase() === relative.slice(0, count).join('/').toLowerCase()) overlap = count;
    }
  }
  const parts = [...base, ...relative.slice(overlap)];
  const result: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..' && result.length && result[result.length - 1] !== '..') result.pop();
    else if (result.length && result[result.length - 1].toLowerCase() === part.toLowerCase()) continue;
    else result.push(part);
  }
  return result.join('/');
}

export function resolveNativeDocumentPath(filePath: string, root?: { name?: string; path?: string; type?: string } | null): string | null {
  if (root?.type === 'GDRIVE') return null;
  let value = filePath.normalize('NFC');
  if (value.startsWith('file:///')) value = decodeURIComponent(value.slice(8));
  const absolute = /^(?:[a-zA-Z]:[/\\]|\\\\|\/)/;
  if (absolute.test(value)) return value;
  const rootPath = root?.path || root?.name;
  if (!rootPath || !absolute.test(rootPath)) return null;
  return `${rootPath.replace(/[/\\]+$/, '')}/${value.replace(/^[/\\]+/, '')}`;
}

/** Match document links by location; same-named files in different folders are different documents. */
export function matchesLinkedDocument(candidate: { path?: string; name?: string }, target: string, root?: { name?: string; path?: string; type?: string } | null): boolean {
  let cleanTarget = (target || '').trim();
  if (cleanTarget.startsWith('<') && cleanTarget.endsWith('>')) {
    cleanTarget = cleanTarget.slice(1, -1).trim();
  }
  cleanTarget = cleanTarget.replace(/^[<"']|[>"']$/g, '');
  const normalize = (input: string) => {
    let value = input;
    if (value.startsWith('<') && value.endsWith('>')) {
      value = value.slice(1, -1).trim();
    }
    value = value.replace(/^[<"']|[>"']$/g, '');
    try { value = decodeURIComponent(value); } catch {}
    value = value.replace(/^file:\/\/\//i, '').replace(/\\/g, '/').normalize('NFC');
    const windows = /^[a-z]:\//i.test(value) || value.startsWith('//');
    const parts: string[] = [];
    for (const part of value.split('/')) {
      if (part === '.') continue;
      if (part === '..' && parts.length && parts[parts.length - 1] !== '..') parts.pop();
      else parts.push(part);
    }
    const result = parts.join('/');
    return windows ? result.toLowerCase() : result;
  };
  const targetPath = cleanTarget.replace(/^\.\//, '');
  const bareName = !/[/\\]/.test(targetPath);
  if (candidate.path) {
    const resolvedTarget = resolveNativeDocumentPath(target, root) || target;
    const resolvedCandidate = resolveNativeDocumentPath(candidate.path, root) || candidate.path;
    const normTarget = normalize(resolvedTarget).toLowerCase();
    const normCandidate = normalize(resolvedCandidate).toLowerCase();
    if (normCandidate === normTarget) return true;

    // 💡 [작업장 루트 접두어 정규화]: GoogleDrive/ 또는 작업장명 접두어가 한쪽에만 붙어있는 경우 양방향 일치
    const rootName = (root?.name || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    const rootPath = (root?.path || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    const stripRoot = (p: string) => {
      let res = p;
      if (rootPath && (res === rootPath || res.startsWith(rootPath + '/'))) {
        res = res.slice(rootPath.length).replace(/^\/+/, '');
      }
      if (rootName && (res === rootName || res.startsWith(rootName + '/'))) {
        res = res.slice(rootName.length).replace(/^\/+/, '');
      }
      return res;
    };
    const strippedTarget = stripRoot(normTarget);
    const strippedCandidate = stripRoot(normCandidate);
    if (strippedCandidate && strippedTarget && strippedCandidate === strippedTarget) return true;

    // 💡 [폴더 접미어 일치]: 상대경로로 상위 폴더명이 포함되어 있을 때 일치 판별
    if (normTarget.endsWith('/' + normCandidate) || normCandidate.endsWith('/' + normTarget)) return true;
  }
  return bareName && (normalize(candidate.name || '') === normalize(targetPath) || normalize(candidate.name || '').replace(/\.md$/i, '') === normalize(targetPath).replace(/\.md$/i, ''));
}

/** Older help documents used web-root URLs even when edited as workspace files, and desktop doc links may contain relative traversal. */
export function resolveWorkspaceHelpLink(target: string, currentFile?: string | null): string {
  let link = (target || '').trim();
  if (link.startsWith('<') && link.endsWith('>')) {
    link = link.slice(1, -1).trim();
  }
  link = link.replace(/^[<"']|[>"']$/g, '');
  try { link = decodeURIComponent(link); } catch {}
  if (!currentFile) return target;
  const source = currentFile.replace(/\\/g, '/');
  if (/(?:^|\/)[^/]+\.asar(?:\/|$)/i.test(source)) return target;

  const match = link.replace(/\\/g, '/').match(/^(?:\.?\/)?help\/([^/]+\.md)$/i);
  if (match) {
    if (!/(?:^|\/)help\/[^/]+\.md$/i.test(source)) return target;
    return `${source.slice(0, source.lastIndexOf('/'))}/${match[1]}`;
  }

  // 💡 [도움말 형제 문서 간 상위 이탈(../../) 및 직접 파일명 링크 자동 보정]
  const normLink = link.replace(/\\/g, '/');
  const targetFileName = normLink.split('/').pop() || '';
  const isHelpTarget = targetFileName === '00_시작하기.md' || /^HELP-\d+.*\.md$/i.test(targetFileName);
  const isHelpSource = /(?:^|\/)(?:docs\/|frontend\/public\/)?help\/[^/]+\.md$/i.test(source) || /^(?:00_시작하기|HELP-\d+)/i.test(source.split('/').pop() || '');

  if (isHelpSource && isHelpTarget) {
    if (normLink.startsWith('../') || normLink.includes('/../') || normLink === targetFileName) {
      const sourceDir = source.slice(0, source.lastIndexOf('/'));
      return sourceDir ? `${sourceDir}/${targetFileName}` : `./${targetFileName}`;
    }
  }

  return target;
}
