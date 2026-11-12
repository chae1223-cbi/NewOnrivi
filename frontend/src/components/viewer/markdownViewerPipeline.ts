// ====================================================================
// 📊 [OMD-CORE-Viewer-Pipeline] frontend/src/components/viewer/markdownViewerPipeline.ts
// 🎯 @KICK  : 마크다운 뷰어(MarkdownViewer)의 경로 보안 가드(isPathInsideWorkspace), 마크다운 원문 전처리(preprocessMarkdownContent), 줄 번호/개행 Rehype 플러그인 및 전용 CSS 스타일 시트
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 작업장 외부 경로 순회 차단, CommonMark 중첩 코드블록/인용구/위키링크 무결성 보존
// 🚨 @PATCH : 2026-11-12 — [코드블록 자동 줄바꿈(white-space: pre-wrap) 적용]:
//             1) .onrivi-content-root pre 및 pre code에 white-space: pre-wrap, word-break: break-all, overflow-wrap: anywhere를 적용하여 긴 문장이 가로 스크롤 없이 자동 줄바꿈되도록 개선
// 🚨 @PATCH : 2026-11-12 — [번호 목록 직후 동급 글머리 기호의 하위 불릿(circle) 오변환 결함 해결]:
//             1) .onrivi-content-root에서 형제 결합자(ol + ul)를 제거하여, 번호 목록 뒤에 이어지는 동일 레벨(동급) 글머리 목록이 2단계 하위 불릿(circle)으로 오변환되지 않고 정상 1단계(disc)로 렌더링되도록 수정
// 🚨 @PATCH : 2026-11-11 — [글머리 기호 상위 리스트 인식 기반 상대적 레벨(circle/square) 스타일 적용]:
//             1) .onrivi-content-root :is(ul, ol) ul 및 ol + ul에 circle 불릿을 적용하여 상위 번호 목록 아래 글머리 기호의 상대적 2단계 레벨 일관성 확보
//             2) :is(ul, ol) :is(ul, ol) ul에 square 불릿을 적용하여 3단계 이상 상대적 레벨 계층 보장
// 🚨 @PATCH : 2026-11-10 — [제한사용자 다중 리스트 간격 및 마진 전체사용자(VisualDocumentEditor) 규격 100% 일치]:
//             1) .onrivi-content-root ul/ol의 상하 마진(0.5em)을 0으로 격리하고, 중첩 서브리스트(ul ul, ol ol, li ul/ol)의 0.25em 여백을 0으로 통일
//             2) .onrivi-content-root ol > li에 padding-left: 6px, ul > li에 padding-left: 4px를 적용하여 번호/불릿과 텍스트 사이 여백 일치
//             3) li의 line-height를 1.6에서 전체사용자와 동일한 inherit으로 일치시키고 padding-top/bottom 1px를 0으로 통일
// 🚨 @PATCH : 2026-11-10 — [중첩 리스트 및 비정상 list-indent HTML 주석 정제]: preprocessMarkdownContent에서 중첩 리스트 내부나 undefined/null/0으로 기록된 onrivi:list-indent 주석을 자동 소거하여 미리보기 화면에 이상한 주석 문단이 노출되는 현상 방어
// 🚨 @PATCH : 2026-11-10 — [인라인 코드 내부 서식 태그 외부 래핑 자동 정규화]:
//             1) `**텍스트**`, `*텍스트*`, `~~텍스트~~`, `<u>텍스트</u>` 등 인라인 코드 내부로 들어간 서식 태그를 자동으로 외부 래핑(**`텍스트`**, *`텍스트`* 등)으로 정규화하여 미리보기에서 굵게/기울기/밑줄/취소선 서식이 정상 렌더링되도록 개선
// 🚨 @PATCH : 2026-11-07 — [HTML 표 태그 전처리 보호 및 병합 셀(colspan/rowspan) 자동 확장 CSS 지원]: HTML 태그 줄의 선행 공백을 &nbsp;로 치환하지 않도록 방어하고, colspan/rowspan이 있는 표에 table-layout: auto 및 max-content/min-width 100% 스타일을 적용하여 병합 표 레이아웃 완성
// 🚨 @PATCH : 2026-11-04 — [MarkdownViewer 코어 엔진 모듈화]: 경로 보안 가드, 전처리 파이프라인, Rehype 플러그인, 뷰어 전용 CSS 스타일 분리
// 🔗 @CALLS : resolveDocumentLink, resolveWorkspaceHelpLink, extractFrontmatter, partitionAndNormalizeCodeBlocks
// ====================================================================

import React from 'react';
import { resolveDocumentLink, resolveWorkspaceHelpLink } from '@/lib/nativeDocumentPath';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { extractFrontmatter } from '@/lib/frontmatter';
import { partitionAndNormalizeCodeBlocks } from './CodeBlock';

/**
 * ========================================================================================
 * [함수명] getTextFromChildren - React 자식 노드 트리에서 순수 텍스트 문자열을 재귀적으로 추출합니다.
 *
 * @param {React.ReactNode} children - 대상 React 자식 노드
 * @returns {string} 추출된 평문 문자열
 *
 * @example
 * const text = getTextFromChildren(children);
 * ==========================================================================================
 */
export const getTextFromChildren = (children: React.ReactNode): string => {
  if (children === null || children === undefined) return '';
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(getTextFromChildren).join('');
  }
  if (React.isValidElement(children)) {
    return getTextFromChildren((children.props as any).children);
  }
  return '';
};

/**
 * ========================================================================================
 * [함수명] resolveRelativeImagePath - 현재 문서 경로를 기준으로 상대 이미지 경로를 정규화된 경로로 변환합니다.
 *
 * @param {string} srcPath - 원본 이미지 src 경로
 * @param {string | undefined} currentFileNodePath - 현재 열려 있는 마크다운 문서의 경로
 * @returns {string} 정규화된 이미지 경로 문자열
 *
 * @example
 * const resolved = resolveRelativeImagePath('./images/pic.png', 'docs/guide.md');
 * ==========================================================================================
 */
export const resolveRelativeImagePath = (srcPath: string, currentFileNodePath: string | undefined): string => {
  if (!srcPath) return '';

  let cleanSrcPath = srcPath.trim();
  if (cleanSrcPath.startsWith('<') && cleanSrcPath.endsWith('>')) {
    cleanSrcPath = cleanSrcPath.slice(1, -1);
  }

  if (
    cleanSrcPath.startsWith('http://') ||
    cleanSrcPath.startsWith('https://') ||
    cleanSrcPath.startsWith('data:') ||
    cleanSrcPath.startsWith('blob:')
  ) {
    return cleanSrcPath;
  }

  let decoded = cleanSrcPath;
  try {
    decoded = decodeURIComponent(cleanSrcPath);
  } catch {
    decoded = cleanSrcPath;
  }

  const isAbsoluteWin = /^[a-zA-Z]:[\\/]/.test(decoded.replace(/\\/g, '/'));
  if (isAbsoluteWin) {
    return decoded.replace(/\\/g, '/');
  }

  let baseFolder = '';
  if (currentFileNodePath) {
    const normalizedFile = currentFileNodePath.replace(/\\/g, '/');
    const lastSlash = normalizedFile.lastIndexOf('/');
    if (lastSlash !== -1) {
      baseFolder = normalizedFile.substring(0, lastSlash);
    }
  }

  let cleanSrc = decoded.replace(/\\/g, '/');
  let isRootRelative = false;
  if (cleanSrc.startsWith('/')) {
    isRootRelative = true;
    cleanSrc = cleanSrc.substring(1);
  }

  if (cleanSrc.startsWith('./')) {
    cleanSrc = cleanSrc.substring(2);
  }

  let finalPath = '';
  if (isRootRelative) {
    finalPath = cleanSrc;
  } else if (baseFolder) {
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

export interface WorkspaceGuardResult {
  isInside: boolean;
  reason?: string;
  resolvedPath?: string;
}

/**
 * ========================================================================================
 * [함수명] isPathInsideWorkspace - 마크다운 링크(폴더/문서) 클릭 시 대상 경로가 작업장 실폴더 내부인지 엄격히 검증합니다.
 *
 * @param {string} targetHref - 검증할 대상 링크 경로
 * @param {string} [currentFilePath] - 현재 문서 경로
 * @param {string} [rootFolderPath] - 작업장 루트 폴더 절대경로
 * @param {string} [rootFolderName] - 작업장 루트 폴더명
 * @returns {WorkspaceGuardResult} 작업장 내부 여부, 거부 사유 및 해석된 경로
 *
 * @example
 * const guard = isPathInsideWorkspace(href, currentFilePath, rootFolderPath, rootFolderName);
 * ==========================================================================================
 */
export function isPathInsideWorkspace(
  targetHref: string,
  currentFilePath?: string,
  rootFolderPath?: string,
  rootFolderName?: string
): WorkspaceGuardResult {
  if (!targetHref) {
    return { isInside: false, reason: '경로가 비어 있습니다.' };
  }

  let clean = targetHref.trim();
  if (clean.startsWith('<') && clean.endsWith('>')) {
    clean = clean.slice(1, -1).trim();
  }
  clean = clean.replace(/^[<"']|[>"']$/g, '').trim();
  for (let i = 0; i < 8; i++) {
    try {
      const decoded = decodeURIComponent(clean);
      if (decoded === clean) break;
      clean = decoded;
    } catch {
      break;
    }
  }
  if (/%[0-9a-f]{2}/i.test(clean)) {
    return { isInside: false, reason: '경로 인코딩을 확인할 수 없습니다.' };
  }

  clean = clean.split('#')[0].trim();
  if (typeof resolveWorkspaceHelpLink !== 'undefined') {
    const helpResolved = resolveWorkspaceHelpLink(clean, currentFilePath);
    if (helpResolved !== clean) {
      clean = helpResolved;
    }
  }
  if (!clean) {
    return { isInside: true };
  }

  if (clean.startsWith('file:///')) {
    clean = clean.replace(/^file:\/\/\//, '');
  }

  const isWindowsAbsolute = /^[a-zA-Z]:[/\\]/.test(clean);
  const isPosixAbsolute = clean.startsWith('/') && !clean.startsWith('//');
  const nativeApi = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  if (
    nativeApi?.readFromPath &&
    (isWindowsAbsolute || isPosixAbsolute || clean.startsWith('\\\\')) &&
    /\.(md|markdown)$/i.test(clean)
  ) {
    return { isInside: true, resolvedPath: clean.replace(/\\/g, '/') };
  }

  let wsRoot = (rootFolderPath || '').trim();
  if (wsRoot === 'BROWSER_STORAGE' || wsRoot === 'BROWSER_STORAGE_NAME') {
    wsRoot = '';
  }
  if (!wsRoot && typeof window !== 'undefined') {
    try {
      const lsWs = localStorage.getItem('onrivi_workspace_path');
      if (lsWs && lsWs !== 'BROWSER_STORAGE') {
        wsRoot = lsWs;
      }
    } catch {}
  }

  const normalizeSegments = (value: string) => {
    const normalized = value.replace(/\\/g, '/');
    const drive = normalized.match(/^[a-zA-Z]:/);
    const absolute = Boolean(drive) || normalized.startsWith('/');
    const stack: string[] = [];
    for (const part of normalized.replace(/^[a-zA-Z]:/, '').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!stack.length) return null;
        stack.pop();
      } else stack.push(part);
    }
    return `${drive ? drive[0] : absolute ? '/' : ''}${drive ? '/' : ''}${stack.join('/')}`;
  };
  const normTarget = isWindowsAbsolute || isPosixAbsolute ? normalizeSegments(clean) : clean.replace(/\\/g, '/');
  if (normTarget === null) return { isInside: false, reason: '작업장 실폴더 외부에 있는 경로는 연결할 수 없습니다.' };
  const normWsRoot = wsRoot ? normalizeSegments(wsRoot)?.replace(/\/+$/, '') || '' : '';
  const normCurrentFile = (currentFilePath || '').replace(/\\/g, '/');

  const outsideReason =
    '작업장 실폴더 외부에 있는 경로는 연결할 수 없습니다. 작업장 내부의 폴더 및 문서만 연결 가능합니다.';

  if (isWindowsAbsolute) {
    if (!normWsRoot) {
      return { isInside: false, reason: outsideReason };
    }

    const lowerTarget = normTarget.toLowerCase();
    const lowerRoot = normWsRoot.toLowerCase();

    const isMatch = lowerTarget === lowerRoot || lowerTarget.startsWith(lowerRoot + '/');
    if (!isMatch) {
      return { isInside: false, reason: outsideReason };
    }

    return { isInside: true, resolvedPath: normTarget };
  }

  if (isPosixAbsolute) {
    const parts = normTarget.split('/').filter(Boolean);
    let depth = 0;
    for (const p of parts) {
      if (p === '..') {
        depth--;
        if (depth < 0) {
          return { isInside: false, reason: outsideReason };
        }
      } else if (p !== '.') {
        depth++;
      }
    }
    return { isInside: true, resolvedPath: resolveDocumentLink(normTarget, currentFilePath) };
  }

  if (
    normWsRoot &&
    normCurrentFile &&
    (normCurrentFile.toLowerCase() === normWsRoot.toLowerCase() ||
      normCurrentFile.toLowerCase().startsWith(normWsRoot.toLowerCase() + '/'))
  ) {
    const combined = resolveDocumentLink(normTarget, currentFilePath);

    const segments = combined.split('/');
    const stack: string[] = [];
    for (const seg of segments) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') {
        stack.pop();
      } else {
        stack.push(seg);
      }
    }
    const resolved = stack.join('/');
    const lowerResolved = resolved.toLowerCase();
    const lowerRoot = normWsRoot.toLowerCase();

    if (lowerResolved !== lowerRoot && !lowerResolved.startsWith(lowerRoot + '/')) {
      return { isInside: false, reason: outsideReason };
    }
    return { isInside: true, resolvedPath: resolved };
  }

  if (normCurrentFile) {
    let cleanCurrent = normCurrentFile;
    if (rootFolderName && cleanCurrent.startsWith(rootFolderName + '/')) {
      cleanCurrent = cleanCurrent.substring(rootFolderName.length + 1);
    }

    const currentParts = cleanCurrent.split('/').filter(Boolean);
    currentParts.pop();
    let targetDepth = currentParts.length;

    const targetParts = normTarget.split('/').filter(Boolean);
    for (const p of targetParts) {
      if (p === '..') {
        targetDepth--;
        if (targetDepth < 0) {
          return { isInside: false, reason: outsideReason };
        }
      } else if (p !== '.') {
        targetDepth++;
      }
    }
    return { isInside: true, resolvedPath: resolveDocumentLink(normTarget, currentFilePath) };
  }

  if (normTarget.startsWith('..')) {
    return { isInside: false, reason: outsideReason };
  }

  return { isInside: true, resolvedPath: resolveDocumentLink(normTarget, currentFilePath) };
}

/**
 * ========================================================================================
 * [함수명] remarkEmptyDocumentLinkLabels - 빈 텍스트를 가진 마크다운 문서 링크(`[](doc.md)`)에 확장자 없는 파일명을 라벨로 채우는 Remark 플러그인입니다.
 *
 * @returns {(tree: any) => void} AST 변환 함수
 * ==========================================================================================
 */
export function remarkEmptyDocumentLinkLabels() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.type === 'link' && (!node.children || node.children.length === 0)) {
        let target = String(node.url || '').split(/[?#]/)[0];
        try {
          target = decodeURIComponent(target);
        } catch {}
        const filename = target.replace(/\\/g, '/').split('/').pop() || '';
        if (/\.(md|markdown)$/i.test(filename)) {
          node.children = [{ type: 'text', value: filename.replace(/\.(md|markdown)$/i, '') }];
        }
      }
      for (const child of node.children || []) visit(child);
    };
    visit(tree);
  };
}

/**
 * ========================================================================================
 * [함수명] remarkDisableIndentedCode - 4칸 들여쓰기/탭 입력 시 코드블록으로 오인되는 기본 마크다운 동작을 차단하는 Remark 플러그인입니다.
 * ==========================================================================================
 */
export function remarkDisableIndentedCode(this: any) {
  const data = this.data();
  if (!data.micromarkExtensions) {
    data.micromarkExtensions = [];
  }
  data.micromarkExtensions.push({
    disable: { null: ['codeIndented'] },
  });
}

/**
 * ========================================================================================
 * [함수명] preprocessMarkdownContent - 마크다운 원문에서 Frontmatter 제거, 페이지 나누기 정규화, 위키링크 변환, 중첩 코드블록 및 연속 공백 보존 전처리를 수행합니다.
 *
 * @param {string} content - 원본 마크다운 문자열
 * @returns {string} 전처리 완료된 마크다운 문자열
 *
 * @example
 * const cleanContent = preprocessMarkdownContent(content);
 * ==========================================================================================
 */
export function preprocessMarkdownContent(content: string): string {
  if (!content) return '';

  const { content: strippedContent } = extractFrontmatter(content);
  let processed = strippedContent;

  processed = processed.replace(
    /(^[ \t]*)(?:<!--\s*(?:onrivi:)?page-?break\s*-->|<!--\s*\[page-?break\]\s*-->|\\pagebreak\b|\\newpage\b|<(?:div|hr)[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>[\s\S]*?(?:<\/(?:div|hr)>)?)(?=[ \t]*$)/gim,
    '\n\n<div data-onrivi-page-break="true" class="onrivi-page-break page-break" aria-label="수동 페이지 나누기">수동 페이지 나누기</div>\n\n'
  );

  processed = processed.replace(/(^[ \t]*)-([ \t]*)$/gm, '$1\\-$2');
  processed = processed.replace(/(^[ \t]*)=+([ \t]*)$/gm, '$1\\=$2');

  // 🛡️ 중첩 리스트 내부의 잘못된 onrivi:list-indent 주석 및 undefined/null/0 주석 정제
  processed = processed.replace(/^[ \t]+<!--\s*onrivi:list-indent=(?:undefined|null|\d+(?:\.\d+)?)\s*-->[ \t]*\r?\n?/gm, '');
  processed = processed.replace(/^<!--\s*onrivi:list-indent=(?:undefined|null|0)\s*-->[ \t]*\r?\n?/gm, '');

  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  processed = processed.replace(wikiLinkRegex, (_match, linkTarget, customText) => {
    const trimmedTarget = linkTarget.trim();
    let text = '';
    if (customText && customText.trim()) {
      text = customText.trim();
    } else {
      const hashIdx = trimmedTarget.indexOf('#');
      if (hashIdx !== -1) {
        const headingPart = trimmedTarget.slice(hashIdx + 1).trim();
        text = headingPart || trimmedTarget;
      } else {
        const rawFileName = trimmedTarget.split(/[/\\]/).pop() || trimmedTarget;
        text = rawFileName.replace(/\.(md|markdown)$/i, '');
      }
    }
    return `[${text}](<${trimmedTarget}>)`;
  });

  const mdLinkRegex = /\[([^\]]*)\]\(((?:[^()]|\([^()]*\))+)\)/g;
  processed = processed.replace(mdLinkRegex, (match, text, url) => {
    if (url.startsWith('<') && url.endsWith('>')) {
      return match;
    }
    return `[${text}](<${url}>)`;
  });

  const segments = partitionAndNormalizeCodeBlocks(processed);
  processed = segments
    .map(seg => {
      if (seg.isCode) {
        return seg.text;
      }

      let proseText = seg.text;

      // 🌟 [인라인 코드 내부 서식 태그 외부 래핑 정규화]: `**텍스트**` -> **`텍스트`**
      proseText = proseText.replace(
        /(?<!`)`(\*\*\*|___|\*\*|__|\*|_|~~|<u>|<del>|<s>)(.+?)(?:\1|<\/u>|<\/del>|<\/s>)`(?!`)/g,
        (_m, openTag, text) => {
          const closeTag = openTag === '<u>' ? '</u>' : openTag === '<del>' ? '</del>' : openTag === '<s>' ? '</s>' : openTag;
          return `${openTag}\`${text}\`${closeTag}`;
        }
      );

      proseText = proseText.replace(
        /(?<!\*)\*\*([^\s*\n](?:[^*\n]*?[^\s*\n])?)\*\*([가-힣a-zA-Z0-9])/g,
        '**$1** $2'
      );

      return proseText
        .split('\n')
        .map(line => {
          const isListItem = /^[ \t]*([*+-]|\d+\.)\s+/.test(line);
          if (isListItem) {
            const listMatch = line.match(/^([ \t]*[*+-]|[ \t]*\d+\.)\s+(.*)$/);
            if (listMatch) {
              const prefix = listMatch[1];
              let body = listMatch[2];
              body = body
                .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
                .replace(/ {2,}/g, spaces => '&nbsp;'.repeat(spaces.length));
              return `${prefix} ${body}`;
            }
            return line;
          }
          const leadingSpaceQuoteMatch = line.match(/^([ \t]+)((?:>+[ \t]?)+)(.*)$/);
          if (leadingSpaceQuoteMatch) {
            const spaces = leadingSpaceQuoteMatch[1];
            const quotes = leadingSpaceQuoteMatch[2].trim();
            const rest = leadingSpaceQuoteMatch[3];
            line = `${quotes} ${spaces}${rest}`;
          }

          const isQuote = /^[ \t]*>/.test(line);
          if (isQuote) {
            const quoteMatch = line.match(/^([ \t]*>+[ \t]?)(.*)$/);
            if (quoteMatch) {
              const prefix = quoteMatch[1];
              let body = quoteMatch[2];
              const alertTagMatch = body.match(
                /^(\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)\])(.*)$/i
              );
              if (alertTagMatch) {
                const tag = alertTagMatch[1];
                let tagBody = alertTagMatch[2];
                tagBody = tagBody
                  .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
                  .replace(/ {2,}/g, spaces => '&nbsp;'.repeat(spaces.length));
                return `${prefix}${tag}${tagBody}`;
              }
              const innerListMatch = body.match(/^([ \t]*[*+-]|[ \t]*\d+\.)\s+(.*)$/);
              if (innerListMatch) {
                const listPrefix = innerListMatch[1];
                let listBody = innerListMatch[2];
                listBody = listBody
                  .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
                  .replace(/ {2,}/g, spaces => '&nbsp;'.repeat(spaces.length));
                return `${prefix}${listPrefix} ${listBody}`;
              }
              body = body
                .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
                .replace(/ {2,}/g, spaces => '&nbsp;'.repeat(spaces.length));
              return `${prefix}${body}`;
            }
            return line;
          }
          const leadMatch = line.match(/^([ \t]*)(.*)$/);
          if (!leadMatch) return line;
          let lead = leadMatch[1];
          let rest = leadMatch[2];
          // 🛡️ HTML 블록 태그 줄은 앞선 공백을 &nbsp;로 치환하지 않음 (CommonMark 표준 HTML 블록 파싱 보존)
          if (/^<\/?(?:table|thead|tbody|tfoot|tr|th|td|caption|colgroup|col|div|p)\b/i.test(rest)) {
            return line;
          }
          lead = lead.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ /g, '&nbsp;');
          rest = rest
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
            .replace(/ {2,}/g, spaces => '&nbsp;'.repeat(spaces.length));
          return lead + rest;
        })
        .join('\n');
    })
    .join('\n');

  return processed;
}

/**
 * ========================================================================================
 * [함수명] computeNodeIndentStyle - 에디터 원본 텍스트의 해당 줄에 있는 탭/공백 들여쓰기를 계산하여 marginLeft 스타일을 반환합니다.
 *
 * @param {any} node - HAST 노드
 * @param {number[] | undefined} lineMap - 줄 매핑 배열
 * @param {string | undefined} targetContent - 원본 마크다운 문자열
 * @param {string | undefined} listIndent - 목록 들여쓰기 설정 문자열
 * @returns {React.CSSProperties} 계산된 marginLeft 스타일 객체
 * ==========================================================================================
 */
export function computeNodeIndentStyle(
  node: any,
  lineMap: number[] | undefined,
  targetContent: string | undefined,
  listIndent: string | undefined
): React.CSSProperties {
  const line = node?.position?.start?.line;
  const currentLineMap = lineMap || [];
  const origLine = line ? currentLineMap[line - 1] || line : undefined;
  if (!origLine || !targetContent || typeof targetContent !== 'string') return {};

  const lines = targetContent.split('\n');
  const lineText = lines[origLine - 1] || '';

  let indentStr = '';
  const quoteLineMatch = lineText.match(/^([ \t]*)(?:>+[ \t]?)+(.*)$/);
  if (quoteLineMatch) {
    const outerIndent = quoteLineMatch[1] || '';
    const innerContent = quoteLineMatch[2] || '';
    const innerIndentMatch = innerContent.match(/^([ \t]*)/);
    const innerIndent = innerIndentMatch ? innerIndentMatch[1] : '';
    indentStr = outerIndent + innerIndent;
  } else {
    const indentMatch = lineText.match(/^([ \t]*)/);
    indentStr = indentMatch ? indentMatch[1] : '';
  }

  let baseIndentPx = 16;
  if (listIndent) {
    const parsed = parseInt(listIndent, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      baseIndentPx = parsed;
    }
  }

  let marginLeft = 0;
  for (const char of indentStr) {
    if (char === '\t') {
      marginLeft += baseIndentPx;
    } else if (char === ' ') {
      marginLeft += baseIndentPx / 4;
    }
  }

  if (marginLeft > 0) {
    return { marginLeft: `${marginLeft}px` };
  }
  return {};
}

/**
 * ========================================================================================
 * [함수명] createRehypeSourceLinesPlugin - 문단 내 개별 행(`.onrivi-line`) 및 블록 요소에 원본 물리 줄 번호(`data-line`)를 매핑하는 Rehype 플러그인을 생성합니다.
 *
 * @param {React.MutableRefObject<{ lineMap?: number[] }>} dynamicPropsRef - 동적 프로퍼티 Ref
 * @param {React.MutableRefObject<string | undefined>} originalContentRef - 원본 콘텐츠 Ref
 * @param {React.MutableRefObject<string>} contentRef - 현재 콘텐츠 Ref
 * @returns {() => (tree: any) => void} Rehype 플러그인 팩토리
 * ==========================================================================================
 */
export function createRehypeSourceLinesPlugin(
  dynamicPropsRef: React.MutableRefObject<{ lineMap?: number[]; [key: string]: any }>,
  originalContentRef: React.MutableRefObject<string | undefined>,
  contentRef: React.MutableRefObject<string>
) {
  return () => (tree: any) => {
    const currentLineMap = dynamicPropsRef.current.lineMap || [];
    const mapLine = (l?: number): number | undefined => {
      if (!l) return undefined;
      return currentLineMap[l - 1] || l;
    };

    const isMediaParagraph = (node: any) => {
      if (!node.children || node.children.length === 0) return false;
      const nonWs = node.children.filter((c: any) => !(c.type === 'text' && c.value.trim() === ''));
      if (nonWs.length === 1) {
        const onlyChild = nonWs[0];
        if (onlyChild.type === 'element' && ['img', 'video', 'iframe', 'source'].includes(onlyChild.tagName)) {
          return true;
        }
      }
      return false;
    };

    const visit = (node: any, parentLine?: number, listDepth: number = 0) => {
      let currentListDepth = listDepth;
      if (node.type === 'element') {
        if (!node.properties) node.properties = {};

        if (node.tagName === 'ul' || node.tagName === 'ol') {
          currentListDepth = listDepth + 1;
        }
        if (node.tagName === 'li') {
          node.properties['data-list-depth'] = listDepth;
        }

        if (node.tagName === 'p') {
          if (isMediaParagraph(node)) {
            const line = node.position?.start?.line || parentLine;
            if (line) {
              node.properties['data-line'] = mapLine(line);
            }
            if (node.children) {
              node.children.forEach((child: any) => visit(child, line, currentListDepth));
            }
            return;
          }

          const newChildren: any[] = [];
          let currentLineChildren: any[] = [];
          let pLine = node.position?.start?.line || parentLine || 1;

          const pushLine = (lineNum: number) => {
            if (currentLineChildren.length === 0) {
              currentLineChildren.push({ type: 'text', value: '\u200B' });
            }
            newChildren.push({
              type: 'element',
              tagName: 'span',
              properties: {
                className: ['onrivi-line'],
                'data-line': mapLine(lineNum),
              },
              children: currentLineChildren,
            });
            currentLineChildren = [];
          };

          for (const child of node.children) {
            if (child.type === 'element' && child.tagName === 'br') {
              pushLine(pLine);
              pLine++;
            } else if (child.type === 'text' && child.value === '\n') {
              // br 직후의 개행 텍스트 무시
            } else {
              if (child.type === 'element') {
                if (child.position?.start?.line) {
                  pLine = child.position.start.line;
                }
                visit(child, pLine, currentListDepth);
              }
              currentLineChildren.push(child);
            }
          }
          pushLine(pLine);
          node.children = newChildren;
          delete node.properties['data-line'];
          return;
        }

        const line = node.position?.start?.line || parentLine;
        if (line) {
          const mapped = mapLine(line);
          node.properties['data-line'] = mapped;

          if (node.tagName === 'li' && mapped) {
            const rawContent = originalContentRef.current || contentRef.current || '';
            if (rawContent) {
              const lines = rawContent.split(/\r?\n/);
              const lineText = lines[mapped - 1] || '';
              const match = lineText.match(/^(?:[ \t]*>+[ \t]?)*[ \t]*(\d+)\.(?:\s+|$)/);
              if (match) {
                node.properties.value = parseInt(match[1], 10);
              }
            }
          }
        }
      }

      if (node.children) {
        node.children.forEach((child: any) =>
          visit(
            child,
            node.type === 'element' && node.tagName === 'tr' ? node.position?.start?.line : undefined,
            currentListDepth
          )
        );
      }
    };

    visit(tree);
  };
}

/**
 * ========================================================================================
 * [함수명] createRehypeBrRawPlugin - Raw HTML `<br>` 태그 및 수동 페이지 나누기 마커를 안전한 HAST 엘리먼트로 변환하는 Rehype 플러그인을 생성합니다.
 *
 * @returns {() => (tree: any) => void} Rehype 플러그인 팩토리
 * ==========================================================================================
 */
export function createRehypeBrRawPlugin() {
  return () => (tree: any) => {
    const walk = (node: any) => {
      if (node.children) {
        const newChildren: any[] = [];
        for (const child of node.children) {
          const isPageBreakString = (val: string) => {
            if (typeof val !== 'string') return false;
            return (
              /<!--\s*(?:onrivi:)?page-?break\s*-->/i.test(val) ||
              /<!--\s*\[page-?break\]\s*-->/i.test(val) ||
              /\\pagebreak\b/i.test(val) ||
              /\\newpage\b/i.test(val) ||
              val.includes('page-break-before: always') ||
              val.includes('break-before: page') ||
              val.includes('class="page-break"') ||
              val.includes('class="onrivi-page-break"') ||
              val.includes('data-onrivi-page-break')
            );
          };

          const makePageBreakElement = () => ({
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['onrivi-page-break', 'page-break'],
              'data-onrivi-page-break': 'true',
              'aria-label': '수동 페이지 나누기',
            },
            children: [{ type: 'text', value: '수동 페이지 나누기' }],
          });

          if (child.type === 'comment' && isPageBreakString(child.value)) {
            newChildren.push(makePageBreakElement());
          } else if (child.type === 'raw' && /<br\s*\/?>/i.test(child.value)) {
            const parts = child.value.split(/(<br\s*\/?>)/gi);
            for (const part of parts) {
              if (/^<br\s*\/?>$/i.test(part)) {
                newChildren.push({ type: 'element', tagName: 'br', properties: {}, children: [] });
              } else if (part) {
                newChildren.push({ type: 'raw', value: part });
              }
            }
          } else if (child.type === 'raw' && isPageBreakString(child.value)) {
            newChildren.push(makePageBreakElement());
          } else if (
            child.type === 'element' &&
            child.tagName === 'code' &&
            child.children?.length === 1 &&
            child.children[0].type === 'text' &&
            isPageBreakString(child.children[0].value)
          ) {
            newChildren.push(makePageBreakElement());
          } else if (child.type === 'text' && isPageBreakString(child.value)) {
            const parts = child.value.split(
              /(<!--\s*(?:onrivi:)?page-?break\s*-->|<!--\s*\[page-?break\]\s*-->|\\pagebreak\b|\\newpage\b|<div[^>]*page-break[^>]*><\/div>|<hr[^>]*page-break[^>]*\/>)/i
            );
            for (const part of parts) {
              if (isPageBreakString(part)) {
                newChildren.push(makePageBreakElement());
              } else if (part) {
                newChildren.push({ type: 'text', value: part });
              }
            }
          } else {
            if (
              child.type === 'element' &&
              (child.properties?.className?.includes?.('page-break') ||
                child.properties?.className?.includes?.('onrivi-page-break') ||
                child.properties?.['data-onrivi-page-break'])
            ) {
              if (!child.properties) child.properties = {};
              child.properties['data-onrivi-page-break'] = 'true';
              const curClasses = Array.isArray(child.properties.className)
                ? child.properties.className
                : typeof child.properties.className === 'string'
                  ? child.properties.className.split(/\s+/)
                  : [];
              child.properties.className = Array.from(new Set([...curClasses, 'onrivi-page-break', 'page-break']));
            }
            newChildren.push(child);
            if (child.children) walk(child);
          }
        }
        node.children = newChildren;
      }
    };
    walk(tree);
  };
}

export const MARKDOWN_VIEWER_STYLES = `
  .markdown-viewer-root,
  .onrivi-content-root {
    tab-size: 4 !important;
    -moz-tab-size: 4 !important;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  .onrivi-content-root p,
  .onrivi-content-root blockquote,
  .onrivi-content-root h1,
  .onrivi-content-root h2,
  .onrivi-content-root h3,
  .onrivi-content-root h4,
  .onrivi-content-root h5,
  .onrivi-content-root h6 {
    tab-size: 4 !important;
    -moz-tab-size: 4 !important;
  }
  .onrivi-content-root .onrivi-sentence-br {
    display: block !important;
    height: 0px !important;
  }
  .onrivi-content-root ul,
  .onrivi-content-root ol {
    white-space: normal !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-left: var(--list-indent, 28px) !important;
  }
  .onrivi-content-root li ul,
  .onrivi-content-root li ol,
  .custom-preview-container .onrivi-content-root li ul,
  .custom-preview-container .onrivi-content-root li ol {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
  .onrivi-content-root :is(ul, ol) ul {
    list-style-type: circle !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: var(--list-indent, 28px) !important;
  }
  .onrivi-content-root :is(ul, ol) :is(ul, ol) ul {
    list-style-type: square !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: var(--list-indent, 28px) !important;
  }
  .onrivi-content-root ol ol {
    list-style-type: lower-alpha !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: var(--list-indent, 28px) !important;
  }
  .onrivi-content-root ol ol ol {
    list-style-type: lower-roman !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: var(--list-indent, 28px) !important;
  }
  .onrivi-content-root blockquote ul ul,
  .onrivi-content-root blockquote ol ol,
  .onrivi-content-root blockquote ul ol,
  .onrivi-content-root blockquote ol ul {
    padding-left: var(--list-indent, 28px) !important;
  }
  .onrivi-content-root ul + p,
  .onrivi-content-root ol + p {
    margin-top: 1.5em !important;
  }
  .onrivi-content-root p + ul,
  .onrivi-content-root p + ol {
    margin-top: 1.2em !important;
  }
  .onrivi-content-root li {
    white-space: normal !important;
    margin-top: 0 !important;
    margin-left: 0;
    margin-right: 0;
    margin-bottom: var(--li-margin-bottom, 6px);
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-inline-start: var(--li-marker-gap, 0px) !important;
    padding-left: var(--li-marker-gap, 0px) !important;
    line-height: inherit !important;
  }
  .onrivi-content-root ol > li {
    padding-left: 6px;
  }
  .onrivi-content-root ul > li:not(.task-list-item) {
    padding-left: 4px;
  }
  .onrivi-content-root > :is(ul,ol) + :is(ul,ol) {
    margin-top: 4px !important;
  }
  .onrivi-content-root .onrivi-empty-list-row {
    display: none !important;
    list-style: none !important;
    list-style-type: none !important;
    height: 0 !important;
    max-height: 0 !important;
    line-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    pointer-events: none !important;
  }
  .onrivi-content-root li > p,
  .onrivi-content-root li > div,
  .onrivi-content-root li p {
    margin: 0 !important;
    padding: 0 !important;
    display: inline !important;
    white-space: normal !important;
  }
  .onrivi-content-root li p .onrivi-line {
    display: inline !important;
    width: auto !important;
    min-height: 0 !important;
  }
  .onrivi-content-root li p + p {
    display: block !important;
    margin-top: 0.45em !important;
  }
  .onrivi-content-root pre,
  .onrivi-content-root pre code {
    white-space: pre-wrap !important;
    word-break: break-all !important;
    overflow-wrap: anywhere !important;
  }
  .onrivi-content-root code:not(pre code),
  .onrivi-content-root p code,
  .onrivi-content-root li code {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  .markdown-viewer-root figure {
    margin: 0 !important;
  }
  .markdown-viewer-root figure figcaption {
    margin-top: 0.5rem !important;
    margin-bottom: 0 !important;
  }
  .markdown-viewer-root th:not([style*="text-align"]) {
    text-align: center !important;
  }
  .markdown-viewer-root [align="right"],
  .onrivi-content-root [align="right"],
  .markdown-viewer-root [style*="text-align: right"],
  .onrivi-content-root [style*="text-align: right"],
  .markdown-viewer-root [style*="text-align:right"],
  .onrivi-content-root [style*="text-align:right"],
  .markdown-viewer-root .text-right,
  .onrivi-content-root .text-right {
    text-align: right !important;
  }
  .markdown-viewer-root [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
  .onrivi-content-root [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
  .markdown-viewer-root [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
  .onrivi-content-root [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
  .markdown-viewer-root [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th),
  .onrivi-content-root [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th) {
    text-align: right !important;
  }
  .markdown-viewer-root [align="right"] ul,
  .markdown-viewer-root [align="right"] ol,
  .onrivi-content-root [align="right"] ul,
  .onrivi-content-root [align="right"] ol,
  .markdown-viewer-root [style*="text-align: right"] ul,
  .markdown-viewer-root [style*="text-align: right"] ol,
  .onrivi-content-root [style*="text-align: right"] ul,
  .onrivi-content-root [style*="text-align: right"] ol {
    display: inline-block !important;
    text-align: left !important;
  }
  .markdown-viewer-root [align="center"],
  .onrivi-content-root [align="center"],
  .markdown-viewer-root [style*="text-align: center"],
  .onrivi-content-root [style*="text-align: center"],
  .markdown-viewer-root [style*="text-align:center"],
  .onrivi-content-root [style*="text-align:center"],
  .markdown-viewer-root .text-center,
  .onrivi-content-root .text-center {
    text-align: center !important;
  }
  .markdown-viewer-root [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
  .onrivi-content-root [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
  .markdown-viewer-root [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
  .onrivi-content-root [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
  .markdown-viewer-root [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th),
  .onrivi-content-root [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th) {
    text-align: center !important;
  }
  .markdown-viewer-root [align="center"] ul,
  .markdown-viewer-root [align="center"] ol,
  .onrivi-content-root [align="center"] ul,
  .onrivi-content-root [align="center"] ol,
  .markdown-viewer-root [style*="text-align: center"] ul,
  .markdown-viewer-root [style*="text-align: center"] ol,
  .onrivi-content-root [style*="text-align: center"] ul,
  .onrivi-content-root [style*="text-align: center"] ol {
    display: inline-block !important;
    text-align: left !important;
  }
  .markdown-viewer-root .table-wrapper-area,
  .onrivi-content-root .table-wrapper-area {
    display: inline-block !important;
    width: 100% !important;
    vertical-align: top !important;
    margin-top: 4px !important;
    margin-bottom: 16px !important;
  }
  .markdown-viewer-root table,
  .onrivi-content-root table {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    border-collapse: collapse !important;
    border-spacing: 0 !important;
    border-radius: 0 !important;
    overflow: visible !important;
    box-shadow: none !important;
  }
  .markdown-viewer-root .table-wrapper-area table,
  .onrivi-content-root .table-wrapper-area table {
    width: 100% !important;
    table-layout: fixed !important;
  }
  .markdown-viewer-root .table-wrapper-area table:has([colspan], [rowspan]),
  .onrivi-content-root .table-wrapper-area table:has([colspan], [rowspan]) {
    table-layout: auto !important;
    width: max-content !important;
    min-width: 100% !important;
  }
  .markdown-viewer-root .table-wrapper-area :is(th, td),
  .onrivi-content-root .table-wrapper-area :is(th, td) {
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    box-sizing: border-box !important;
    padding: 6px 10px !important;
    vertical-align: middle !important;
    border: 1px solid rgba(203, 213, 225, 0.8);
  }
  .dark .markdown-viewer-root .table-wrapper-area :is(th, td),
  .dark .onrivi-content-root .table-wrapper-area :is(th, td) {
    border-color: rgba(51, 65, 85, 0.8);
  }
  .markdown-viewer-root .table-wrapper-area :is(th, td) code,
  .onrivi-content-root .table-wrapper-area :is(th, td) code {
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
    word-break: break-all !important;
    display: inline !important;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .markdown-viewer-root th,
  .onrivi-content-root th,
  .markdown-viewer-root td,
  .onrivi-content-root td {
    border-top-style: inherit !important;
    border-bottom-style: inherit !important;
    border-left-style: inherit !important;
    border-right-style: inherit !important;
  }
  .markdown-viewer-root :is(p, h1, h2, h3, h4, h5, h6, strong):has(+ .table-wrapper-area),
  .onrivi-content-root :is(p, h1, h2, h3, h4, h5, h6, strong):has(+ .table-wrapper-area) {
    margin-bottom: 6px !important;
  }
  .markdown-viewer-root blockquote,
  .onrivi-content-root blockquote {
    display: inline-block !important;
    width: 100% !important;
    vertical-align: top !important;
  }
`;
