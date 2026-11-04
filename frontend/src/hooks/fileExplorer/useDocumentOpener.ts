// ====================================================================
// 📊 [OMD-HOOK-useDocumentOpener-0001] useDocumentOpener.ts ➔ 문서 오픈 및 경로 탐색 훅
// 🎯 @KICK  : 파일 트리 클릭(handleFileClick) 및 경로/링크 기반 문서 탐색·오픈(handleFileOpenByPath), 지식 DB 및 앵커 점프(#L..) 연동
// 🛡️ @GUARD : 브라우저 FSA 재귀 탐색(findFileHandleInDirectoryDeep), 구글 드라이브 온디맨드 검색, VFS/도움말 폴백 및 세션 동기화
// 🚨 @PATCH : 2026-11-04 — [런타임 버그 수정]: getSavedWorkspaceInfo, EditorTab, helpContentRef, sessionRestoringRef 누락 식별자 보완 및 findFileHandleInDirectoryDeep 모듈 스코프 export
// 🚨 @PATCH : 2026-11-04 — [useFileExplorer 모듈화 분리]:
//             1) useFileExplorer에서 파일 클릭 및 경로 기반 문서 열기, 앵커 점프, 지식 DB 연계 로직을 useDocumentOpener 독립 서브 훅으로 분리 (Rule 3 준수)
// 🔗 @CALLS : readDriveFileContent, vfsReadFile, resolveNativeDocumentPath, knowledgeClient
// ====================================================================
// @ts-nocheck
import { useRef } from 'react';
import { FileNode } from '@/lib/indexedDbHelper';
import { isBundledDocumentPath } from '@/lib/bundledDocument';
import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import { vfsReadFile } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { resolveNativeDocumentPath, matchesLinkedDocument, resolveWorkspaceHelpLink } from '@/lib/nativeDocumentPath';
import { stripFrontmatter } from "@/lib/editorUtils";
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient';
import { isAbsolutePath } from '@/lib/knowledge/pathResolver';
import {
  saveExternalFileHandle,
  getExternalFileHandle,
  verifyHandlePermission,
  pickExternalFile
} from '@/lib/storage/externalFileStore';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  readDriveFileContent,
  type EmergencyDriveSnapshot
} from '@/lib/gdrive/googleDriveClient';
import type { EditorTab } from '@/components/UnifiedTabBar';

export interface UseDocumentOpenerProps {
  editorRef: any;
  contentRef: any;
  currentFileNode: any;
  currentFileName: any;
  lastSavedContentRef: any;
  currentFileParentHandleRef: any;
  tabsRef: any;
  isSearchOpen: any;
  activeTabIdRef: any;
  setContent: any;
  setCurrentFileName: any;
  setCurrentFileNode: any;
  setTabs: any;
  setActiveTabId: any;
  setSaveStatus: any;
  setIsSidebarOpen: any;
  setIsSearchOpen: any;
  setHelpContent: any;
  setHelpTitle: any;
  setPreviewModeRaw: any;
  previewModeRef: any;
  isEditorMountedRef: any;
  showToast: any;
  createNewTab: any;
  switchTab: any;
  rootFolder: any;
  rootFolderRef: any;
  fileList: any;
  workspaceType: any;
  licenseStatus: any;
  isRestrictedUser: boolean;
  helpContentRef?: any;
  sessionRestoringRef?: any;
}


/**
 * 브라우저 FileSystemDirectoryHandle 하위를 재귀 검색하여 파일명에 매칭되는 FileHandle과 상위 디렉토리 Handle을 반환합니다.
 */
export const findFileHandleInDirectoryDeep = async (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  depth = 0,
  maxDepth = 3
): Promise<{ fileHandle: FileSystemFileHandle; parentHandle: FileSystemDirectoryHandle } | null> => {
  if (depth > maxDepth) return null;
  const targetNorm = fileName.toLowerCase().normalize('NFC');
  const targetWithoutMd = targetNorm.replace(/\.md$/i, '');

  try {
    for await (const entry of (dirHandle as any).values()) {
      const entryNorm = entry.name.toLowerCase().normalize('NFC');
      if (entry.kind === 'file') {
        if (entryNorm === targetNorm || entryNorm === `${targetWithoutMd}.md` || entryNorm.replace(/\.md$/i, '') === targetWithoutMd) {
          return { fileHandle: entry as FileSystemFileHandle, parentHandle: dirHandle };
        }
      } else if (entry.kind === 'directory') {
        if (!entry.name.startsWith('.') && !entry.name.startsWith('$') && entry.name !== 'node_modules') {
          const subRes = await findFileHandleInDirectoryDeep(entry as FileSystemDirectoryHandle, fileName, depth + 1, maxDepth);
          if (subRes) return subRes;
        }
      }
    }
  } catch {}
  return null;
};

export function useDocumentOpener({
  editorRef,
  contentRef,
  currentFileNode,
  currentFileName,
  lastSavedContentRef,
  currentFileParentHandleRef,
  tabsRef,
  isSearchOpen,
  activeTabIdRef,
  setContent,
  setCurrentFileName,
  setCurrentFileNode,
  setTabs,
  setActiveTabId,
  setSaveStatus,
  setIsSidebarOpen,
  setIsSearchOpen,
  setHelpContent,
  setHelpTitle,
  setPreviewModeRaw,
  previewModeRef,
  isEditorMountedRef,
  showToast,
  createNewTab,
  switchTab,
  rootFolder,
  rootFolderRef,
  fileList,
  workspaceType,
  licenseStatus,
  isRestrictedUser,
  helpContentRef,
  sessionRestoringRef,
}: UseDocumentOpenerProps) {

  // 🎯 @KICK  : 경로 문자열로 파일을 찾아 열거나 도움말/지식 문서를 로드
  // 🛡️ @GUARD : 따옴표/괄호/헤딩(#) 분리, NFC 정규화, 브라우저 FileSystemHandle 하위 디렉토리 직접 추적, WASM 지식 DB 폴백
  // 🚨 @PATCH : **2026-09-12** — [작업장 하위 폴더 재귀 탐색(findFileHandleInDirectoryDeep) 및 file:/// 경로 오픈]: file:/// 절대경로 유입 시 rootFolder 이름 이후 내부 경로 추출 및 하위 서브폴더(체험하기 등) 3단계 심층 재귀 탐색 연동으로 파일 오픈 및 라인 앵커(#L..) 100% 점프
  //             **2026-09-12** — [웹 브라우저 출처 링크 파일 열기 및 헤딩 점프 결함 완벽 해결]: handleFileOpenByPath에서 decodeURIComponent 및 targetBaseName 3중 매칭, knowledgeClient heading 검색 연동, jumpToAnchor 에디터 모델 헤딩 검색, 미스캔 파일 신규 탭 자동 생성 폴백 지원
  // 🔗 @CALLS : findNodeByPath, handleFileClick, createNewTab, switchTab, setTabs, showToast, knowledgeClient.getDocumentDetail
  // ====================================================================

  // 4. 경로를 기반으로 한 파일 열기 핸들러
  const handleFileOpenByPath = async (resolvedPath: string, hashPart?: string, strictLinkedDocument = false) => {
    let rawDecoded = resolvedPath || '';
    try {
      rawDecoded = decodeURIComponent(rawDecoded);
    } catch {}
    let cleanPath = rawDecoded.replace(/^[<"']|[>"']$/g, '').trim();
    let inlineHash = '';
    let pathWithoutHash = cleanPath;
    if (cleanPath.includes('#')) {
      const parts = cleanPath.split('#');
      pathWithoutHash = parts[0];
      inlineHash = parts[1];
    }
    const targetHash = (hashPart || inlineHash).replace(/^[<"']|[>"']$/g, '').trim();

    const sourceTab = tabsRef.current.find(t => t.id === activeTabIdRef.current);
    const localHelpPath = resolveWorkspaceHelpLink(pathWithoutHash, sourceTab?.path || currentFileNode?.path);
    if (localHelpPath !== pathWithoutHash) {
      pathWithoutHash = localHelpPath;
      cleanPath = localHelpPath;
    }

    const targetBaseName = pathWithoutHash.split(/[/\\]/).pop() || pathWithoutHash;
    const targetBaseNameWithoutMd = targetBaseName.replace(/\.md$/i, '');
    const targetBaseNameWithMd = targetBaseNameWithoutMd ? `${targetBaseNameWithoutMd}.md` : '';
    const cleanPathNoDotSlash = pathWithoutHash.replace(/^\.\//, '').replace(/^\//, '');

    const jumpToAnchor = (anchor?: string) => {
      if (!anchor) return;
      const cleanAnchor = decodeURIComponent(anchor).replace(/^[<"']|[>"']$/g, '').trim();
      const lineRangeMatch = cleanAnchor.match(/^L?(\d+)(?:-L?(\d+))?/i);

      const attemptJump = (attempt = 0) => {
        let editorScrolled = false;
        let previewScrolled = false;

        // 1. 라인 범위 (#L21-L31 또는 #L21) 앵커 점프
        if (lineRangeMatch) {
          const startLine = parseInt(lineRangeMatch[1], 10);
          const endLine = lineRangeMatch[2] ? parseInt(lineRangeMatch[2], 10) : startLine;

          // Monaco 에디터 라인 범위 선택 및 중앙 정렬
          if (editorRef?.current) {
            try {
              const editor = editorRef.current;
              const model = editor.getModel();
              if (model) {
                const monaco = (window as any).monaco;
                const lineCount = model.getLineCount();
                const clampedStart = Math.min(Math.max(1, startLine), Math.max(1, lineCount));
                const clampedEnd = Math.min(Math.max(clampedStart, endLine), Math.max(1, lineCount));
                if (monaco && monaco.Range) {
                  const maxCol = model.getLineMaxColumn(clampedEnd);
                  editor.setSelection(new monaco.Range(clampedStart, 1, clampedEnd, maxCol));
                  editor.revealRangeInCenter(new monaco.Range(clampedStart, 1, clampedEnd, 1));
                } else {
                  editor.revealLineInCenter(clampedStart);
                  editor.setPosition({ lineNumber: clampedStart, column: 1 });
                }
                editor.focus();
                editorScrolled = true;
              }
            } catch (err) {
              console.warn('[jumpToAnchor] Editor line reveal error:', err);
            }
          }

          // 미리보기(Preview) 라인 위치 스크롤 및 시각적 강조 애니메이션
          const lineEl = document.querySelector(`[data-line="${startLine}"]`) as HTMLElement;
          if (lineEl) {
            lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lineEl.classList.add('preview-highlight-line');
            setTimeout(() => lineEl.classList.remove('preview-highlight-line'), 2500);
            previewScrolled = true;
          }
        } else if (cleanAnchor) {
          // 2. 헤딩 텍스트(#제목) 검색 매칭
          let targetLine = 0;
          if (editorRef?.current) {
            try {
              const editor = editorRef.current;
              const model = editor.getModel();
              if (model) {
                const lines = model.getLinesContent();
                const normAnchor = cleanAnchor.replace(/^#+\s*/, '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  const normLine = line.replace(/^#+\s*/, '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                  if (normLine.includes(normAnchor) || normAnchor.includes(normLine)) {
                    targetLine = i + 1;
                    editor.revealLineInCenter(targetLine);
                    editor.setPosition({ lineNumber: targetLine, column: 1 });
                    editor.focus();
                    editorScrolled = true;
                    break;
                  }
                }
              }
            } catch (err) {}
          }

          // 미리보기 헤딩 점프
          const targetId = cleanAnchor.replace(/^#+\s*/, '');
          let targetEl = document.getElementById(targetId);
          if (!targetEl) {
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const cleanTarget = targetId.toLowerCase().replace(/\s+/g, '').normalize('NFC');
            for (const h of Array.from(headings)) {
              const headingText = h.textContent?.trim() || '';
              const cleanHeading = headingText.toLowerCase().replace(/\s+/g, '').normalize('NFC');
              if (cleanHeading === cleanTarget || h.id === targetId || (cleanTarget.length > 2 && cleanHeading.includes(cleanTarget))) {
                targetEl = h as HTMLElement;
                break;
              }
            }
          }
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.classList.add('preview-highlight-line');
            setTimeout(() => targetEl.classList.remove('preview-highlight-line'), 2500);
            previewScrolled = true;
          } else if (targetLine > 0) {
            const lineEl = document.querySelector(`[data-line="${targetLine}"]`) as HTMLElement;
            if (lineEl) {
              lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              lineEl.classList.add('preview-highlight-line');
              setTimeout(() => lineEl.classList.remove('preview-highlight-line'), 2500);
              previewScrolled = true;
            }
          }
        }

        // 탭 전환/마운트 지연 시 재시도 (최대 5회)
        if ((!editorScrolled || !previewScrolled) && attempt < 5) {
          setTimeout(() => attemptJump(attempt + 1), 120 + attempt * 60);
        }
      };

      setTimeout(() => attemptJump(0), 100);
    };

    if (helpContentRef?.current) {
      const api = (window as any).electronAPI;
      const helpPath = pathWithoutHash.startsWith('docs/') ? pathWithoutHash : 'docs/help/' + pathWithoutHash.replace(/^\//, '');
      // ====================================================================
      // 📊 [OMD-FILE-USEFILEEXPLORER-0005] useFileExplorer.ts ➔ loadHelp
      // 🎯 @KICK  : 도움말 파일 내용을 파싱하여 화면에 표시
      // 🛡️ @GUARD : 없음
      // 🚨 @PATCH : 없음
      // 🔗 @CALLS : stripFrontmatter, setHelpContent, setHelpTitle
      // ====================================================================
      const loadHelp = async (content: string) => {
        setHelpContent(stripFrontmatter(content));
        const fileName = helpPath.split('/').pop()?.replace('.md', '') || '';
        const titleMap: Record<string, string> = {
          '00_시작하기': '시작하기', '01_마크다운에디트란': '마크다운 에디트란',
          '02_에디터-기본': '에디터 기본 사용법', '03_파일-관리': '파일 관리',
          '04_미리보기-모드': '미리보기 모드', '05_서식-정의': '서식 정의',
          '06_내보내기': '내보내기', '07_표-체크리스트': '표 및 체크리스트',
          '08_다이어그램-수식': '다이어그램 및 수식', '09_슬래시-명령어': '슬래시 명령어 및 단축키',
          '10_한글-입력': '한글 입력', '11_미디어-삽입': '미디어 삽입',
          '12_내보내기-고급': '내보내기 고급', '13_설정': '설정 및 커스터마이징'
        };
        setHelpTitle(titleMap[fileName] || fileName);
      };
      if (api?.readFromPath) {
        try {
          const file = await api.readFromPath(helpPath);
          await loadHelp(file.content);
        } catch { setHelpContent('## 문서를 불러올 수 없습니다.'); }
      } else {
        try {
          const res = await fetch('./' + helpPath);
          const text = await res.text();
          await loadHelp(text);
        } catch { setHelpContent('## 문서를 불러올 수 없습니다.'); }
      }
      jumpToAnchor(targetHash);
      return;
    }

    // 💡 [기존 열린 탭 우선 검사]
    const existingOpenTab = tabsRef.current.find(t => matchesLinkedDocument(t, pathWithoutHash, rootFolderRef.current));
    if (existingOpenTab) {
      const nativeApi = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      const canonicalPath = nativeApi && existingOpenTab.path ? resolveNativeDocumentPath(existingOpenTab.path, rootFolderRef.current) : existingOpenTab.path;
      if (canonicalPath) {
        existingOpenTab.path = canonicalPath;
        existingOpenTab.node = { ...existingOpenTab.node, name: existingOpenTab.name, kind: 'file', path: canonicalPath };
      }
      // 💡 [빈 플레이스홀더 탭 자동 수화(Hydration) 가드]
      // 이전에 핸들을 찾지 못해 '# 제목'만 있는 빈 탭이 열려있던 경우 실제 디스크 원문 또는 지식 DB 청크로 완벽 보정
      const trimmedContent = (existingOpenTab.content || '').trim();
      const isPlaceholder = !trimmedContent || 
        trimmedContent === `# ${targetBaseNameWithoutMd}` ||
        trimmedContent === `# ${existingOpenTab.name.replace(/\.md$/i, '')}` ||
        (trimmedContent.startsWith(`# ${targetBaseNameWithoutMd}`) && trimmedContent.length < targetBaseNameWithoutMd.length + 15) ||
        trimmedContent.includes('작업장 외부 문서 안내') ||
        trimmedContent.includes('작업장 외부 문서');

      if (isPlaceholder) {
        let hydratedContent = '';
        let resolvedPathFromSource = '';

        // 1) 로컬 디스크 파일 읽기 시도 (데스크톱 Electron IPC 우선, 로컬 개발 서버 폴백)
        const electronApi = typeof window !== 'undefined' ? ((window as any).electronAPI || (window as any).api) : null;
        const hydrationPath = resolveNativeDocumentPath(existingOpenTab.path || pathWithoutHash || cleanPath, rootFolderRef.current);
        if (electronApi?.readFromPath && hydrationPath) {
          try {
            let nativePath = hydrationPath;
            if (nativePath.startsWith('file:///')) {
              nativePath = decodeURIComponent(nativePath.replace(/^file:\/\/\/?/, ''));
            }
            const isAbs = /^(?:[a-zA-Z]:[\/\\]|\/)/i.test(nativePath);
            if (!isAbs && rootFolderRef.current?.name) {
              const root = rootFolderRef.current.name.replace(/[\/\\]+$/, '');
              const sep = root.includes('/') ? '/' : '\\';
              nativePath = `${root}${sep}${nativePath.replace(/^[\/\\]+/, '')}`;
            }
            const fileObj = await electronApi.readFromPath(nativePath);
            if (fileObj && typeof fileObj.content === 'string' && fileObj.content.length > trimmedContent.length) {
              hydratedContent = fileObj.content;
              resolvedPathFromSource = fileObj.path || '';
            }
          } catch (e) {
            console.warn('[existingOpenTab] 데스크톱 디스크 수화 실패:', e);
          }
        } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          try {
            const queryPath = existingOpenTab.path || pathWithoutHash || cleanPath;
            const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(queryPath)}`));
            if (res.ok) {
              const data = await res.json();
              if (data.ok && typeof data.content === 'string' && data.content.length > trimmedContent.length) {
                hydratedContent = data.content;
                resolvedPathFromSource = data.path || '';
              }
            }
          } catch (e) {
            console.warn('[existingOpenTab] 플레이스홀더 디스크 수화 스킵/실패:', e);
          }
        }

        // 2) 웹 WASM SQLite 지식 보관함 청크 수화 시도 (웹 브라우저 및 프로드 환경 100% 지원)
        if (!hydratedContent) {
          try {
            const cleanKnowledgeTarget = (existingOpenTab.path || pathWithoutHash || cleanPath)
              .replace(/^knowledge:\/\//, '')
              .replace(/^file:\/\/\//, '')
              .replace(/^\.\//, '')
              .replace(/^\//, '');
            const isDocId = cleanKnowledgeTarget.startsWith('doc-') || cleanKnowledgeTarget.length === 36;
            const rfHandle = (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);

            let detail = await knowledgeClient.getDocumentDetail({
              documentId: isDocId ? cleanKnowledgeTarget : undefined,
              filePath: !isDocId ? cleanKnowledgeTarget : undefined,
              heading: targetHash || undefined,
              resourceFolderHandle: rfHandle
            });

            if (!strictLinkedDocument && !detail && !isDocId && targetBaseName) {
              detail = await knowledgeClient.getDocumentDetail({
                filePath: targetBaseName,
                heading: targetHash || undefined,
                resourceFolderHandle: rfHandle
              });
            }
            if (!strictLinkedDocument && !detail && !isDocId && targetBaseNameWithoutMd) {
              detail = await knowledgeClient.getDocumentDetail({
                filePath: targetBaseNameWithoutMd,
                heading: targetHash || undefined,
                resourceFolderHandle: rfHandle
              });
            }

            const docObj = detail ? (detail.title ? detail : (detail as any).document) : null;
            if (docObj) {
              const docChunks = docObj.chunks || [];
              const chunksText = docChunks
                .map((c: any) => c.chunkText || c.chunk_text || c.content || '')
                .filter(Boolean)
                .join('\n\n');
              const reconstructed = chunksText.trim() || (docObj.summary ? `# ${docObj.title}\n\n${docObj.summary}\n\n` : '');
              if (reconstructed && reconstructed.length > trimmedContent.length) {
                hydratedContent = reconstructed;
                if (docObj.filePath) resolvedPathFromSource = docObj.filePath;
                existingOpenTab.isKnowledge = true;
                (existingOpenTab as any).documentId = (docObj.id || docObj.documentId);
              }
            }
          } catch (kErr) {
            console.warn('[existingOpenTab] 지식 DB 플레이스홀더 수화 예외:', kErr);
          }
        }

        // 2-1) 브라우저 모드: rootFolder.handle에서 실제 파일 즉시 수화
        if (!hydratedContent && workspaceType === 'browser' && rootFolderRef.current?.handle) {
          try {
            const deepRes = strictLinkedDocument ? null : await findFileHandleInDirectoryDeep(rootFolderRef.current.handle, targetBaseName);
            if (deepRes) {
              const file = await deepRes.fileHandle.getFile();
              const text = await file.text();
              hydratedContent = text;
              existingOpenTab.handle = deepRes.fileHandle;
              currentFileParentHandleRef.current = deepRes.parentHandle;
              const diskNode: FileNode = {
                name: deepRes.fileHandle.name,
                path: existingOpenTab.path || pathWithoutHash || deepRes.fileHandle.name,
                kind: 'file',
                handle: deepRes.fileHandle
              };
              existingOpenTab.node = diskNode;
              setCurrentFileNode(diskNode);
              setCurrentFileName(deepRes.fileHandle.name);
            }
          } catch (rfErr) {
            console.warn('[existingOpenTab] rootFolder.handle 수화 예외:', rfErr);
          }
        }

        // 3) 캐시된 외부 파일 핸들 수화 시도 (IndexedDB)
        if (!hydratedContent) {
          try {
            const cachedHandle = await getExternalFileHandle(existingOpenTab.path || pathWithoutHash || cleanPath || targetBaseName);
            if (cachedHandle) {
              const hasPerm = await verifyHandlePermission(cachedHandle, false);
              if (hasPerm) {
                const file = await cachedHandle.getFile();
                const text = await file.text();
                if (text && text.length > trimmedContent.length) {
                  hydratedContent = text;
                  resolvedPathFromSource = existingOpenTab.path || pathWithoutHash || cleanPath || file.name;
                  const externalNode: FileNode = {
                    name: file.name,
                    path: resolvedPathFromSource,
                    kind: 'file',
                    handle: cachedHandle
                  };
                  existingOpenTab.node = externalNode;
                  (existingOpenTab as any).handle = cachedHandle;
                  setCurrentFileNode(externalNode);
                  setCurrentFileName(file.name);
                }
              }
            }
          } catch (cachedErr) {
            console.warn('[existingOpenTab] 캐시된 외부 파일 핸들 수화 예외:', cachedErr);
          }
        }

        if (hydratedContent) {
          existingOpenTab.content = hydratedContent;
          if (resolvedPathFromSource) {
            existingOpenTab.path = resolvedPathFromSource;
            existingOpenTab.node = { ...existingOpenTab.node, name: existingOpenTab.name, kind: 'file', path: resolvedPathFromSource };
          }
          if (existingOpenTab.model && !existingOpenTab.model.isDisposed()) {
            existingOpenTab.model.setValue(hydratedContent);
          }
          setContent(hydratedContent);
          lastSavedContentRef.current = hydratedContent;
          setTabs(prev => prev.map(t => t.id === existingOpenTab.id ? {
            ...t,
            content: hydratedContent,
            isModified: false,
            path: resolvedPathFromSource || t.path,
            node: existingOpenTab.node || t.node,
            handle: existingOpenTab.handle || t.handle,
            isKnowledge: existingOpenTab.isKnowledge || t.isKnowledge,
            documentId: (existingOpenTab as any).documentId || (t as any).documentId
          } : t));
        }
      }

      switchTab(existingOpenTab.id);
      jumpToAnchor(targetHash);
      return;
    }

    // ====================================================================
    // 📊 [OMD-FILE-USEFILEEXPLORER-0004] useFileExplorer.ts ➔ findNodeByPath
    // 🎯 @KICK  : 파일 경로로 파일 트리 노드를 재귀 탐색
    // 🛡️ @GUARD : 경로 정규화, 대소문자 무효화, 파일명 및 무확장자 3중 매칭
    // 🚨 @PATCH : **2026-09-12** — baseName 및 확장자 유무 상호 비교 지원으로 상대경로/절대경로 노드 매칭 100% 보장
    // 🔗 @CALLS : 없음
    // ====================================================================
    const findNodeByPath = (nodes: FileNode[], targetPath: string): { node: FileNode, parent: any } | null => {
      for (const node of nodes) {
        const isMatch = node.kind === 'file' && matchesLinkedDocument(node, targetPath, rootFolderRef.current);

        if (isMatch) {
          return { node, parent: rootFolder?.handle || null };
        }
        if (node.children && node.children.length > 0) {
          const found = findNodeByPath(node.children, targetPath);
          if (found) {
            return { node: found.node, parent: found.parent || node.handle };
          }
        }
      }
      return null;
    };

    const findResult = findNodeByPath(fileList, pathWithoutHash) ||
                       findNodeByPath(fileList, cleanPath) ||
                       findNodeByPath(fileList, cleanPathNoDotSlash) ||
                       findNodeByPath(fileList, targetBaseName);
    if (findResult) {
      await handleFileClick(findResult.node, findResult.parent);
      jumpToAnchor(targetHash);
      return;

    }

    // 💡 [구글 드라이브(GDRIVE / cloud) 작업장 파일 온디맨드 탐색 및 즉시 로드]
    if (rootFolderRef.current?.type === 'GDRIVE' || workspaceType === 'cloud') {
      try {
        const { getSavedDriveToken, getSavedWorkspaceInfo, findDriveFile } = await import('@/lib/gdrive/googleDriveClient');
        const token = getSavedDriveToken();
        const wsInfo = getSavedWorkspaceInfo();
        if (token) {
          const searchFileName = targetBaseNameWithMd || targetBaseName;
          let foundDriveId: string | null = null;
          if (rootFolderRef.current?.driveFolderId) {
            foundDriveId = await findDriveFile(token, searchFileName, rootFolderRef.current.driveFolderId);
          }
          if (!foundDriveId && wsInfo?.workspaceFolderId) {
            foundDriveId = await findDriveFile(token, searchFileName, wsInfo.workspaceFolderId);
          }
          if (!foundDriveId) {
            foundDriveId = await findDriveFile(token, searchFileName);
          }
          if (foundDriveId) {
            const driveNode: FileNode = {
              name: searchFileName,
              path: pathWithoutHash,
              kind: 'file',
              driveId: foundDriveId,
              driveFileId: foundDriveId,
              id: foundDriveId
            } as any;
            await handleFileClick(driveNode);
            jumpToAnchor(targetHash);
            return;
          }
        }
      } catch (gdriveErr) {
        console.warn('[handleFileOpenByPath] Google Drive 파일 탐색 실패:', gdriveErr);
      }
    }

    // 💡 [FileSystemAccess 로컬 폴더 직접 탐색 가드]
    if (workspaceType === 'browser' && rootFolder?.handle) {
      try {
        const normTarget = pathWithoutHash.replace(/\\/g, '/').normalize('NFC');
        const normRootPath = (rootFolder.path || '').replace(/\\/g, '/').normalize('NFC');
        const normRootName = (rootFolder.handle?.name || rootFolder.displayName || rootFolder.name || '').replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase().normalize('NFC') || '';

        let innerParts: string[] = [];
        if (normRootPath && normTarget.toLowerCase().startsWith(normRootPath.toLowerCase())) {
          const rel = normTarget.slice(normRootPath.length).replace(/^\/+/, '');
          innerParts = rel.split('/').filter(p => p && p !== '.');
        } else {
          const parts = normTarget.split('/').filter(p => p && p !== '.');
          const rootIdx = parts.findIndex(p => p.toLowerCase().normalize('NFC') === normRootName);
          innerParts = rootIdx >= 0 ? parts.slice(rootIdx + 1) : parts;
        }

        // 2) 드라이브 문자(E:, D:, C:)가 아직 맨 앞에 남아있다면 제거
        if (innerParts.length > 0 && /^[a-zA-Z]:$/.test(innerParts[0])) {
          innerParts.shift();
        }

        let currentDir = rootFolder.handle;
        let foundHandle: FileSystemFileHandle | null = null;
        let isSearchSuccess = true;

        for (let i = 0; i < innerParts.length - 1; i++) {
          const dirName = innerParts[i];
          if (!dirName || dirName === '.') continue;
          try {
            currentDir = await currentDir.getDirectoryHandle(dirName, { create: false });
          } catch {
            let foundSubDir: FileSystemDirectoryHandle | null = null;
            try {
              const targetDirNorm = dirName.toLowerCase().normalize('NFC');
              for await (const entry of (currentDir as any).values()) {
                if (entry.kind === 'directory' && entry.name.toLowerCase().normalize('NFC') === targetDirNorm) {
                  foundSubDir = entry;
                  break;
                }
              }
            } catch {}
            if (foundSubDir) {
              currentDir = foundSubDir;
            } else {
              isSearchSuccess = false;
              break;
            }
          }
        }

        if (isSearchSuccess && innerParts.length > 0) {
          const targetFileName = innerParts[innerParts.length - 1];
          try {
            foundHandle = await currentDir.getFileHandle(targetFileName, { create: false });
          } catch {
            try {
              const targetNorm = targetFileName.toLowerCase().normalize('NFC');
              for await (const entry of (currentDir as any).values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().normalize('NFC') === targetNorm) {
                  foundHandle = entry;
                  break;
                }
              }
            } catch {}
          }
        }

        // 폴백 1: 루트 디렉토리 직하에서 파일명(targetBaseName)으로 재시도
        if (!strictLinkedDocument && !foundHandle && targetBaseName) {
          try {
            foundHandle = await rootFolder.handle.getFileHandle(targetBaseName, { create: false });
            currentDir = rootFolder.handle;
          } catch {
            try {
              const targetNorm = targetBaseName.toLowerCase().normalize('NFC');
              for await (const entry of (rootFolder.handle as any).values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().normalize('NFC') === targetNorm) {
                  foundHandle = entry;
                  currentDir = rootFolder.handle;
                  break;
                }
              }
            } catch {}
          }
        }

        // 폴백 2: 하위 폴더 심층 재귀 탐색 (예: 체험하기/추억의_과자선물세트를 기억하시나요.md)
        if (!strictLinkedDocument && !foundHandle && targetBaseName) {
          const deepRes = await findFileHandleInDirectoryDeep(rootFolder.handle, targetBaseName);
          if (deepRes) {
            foundHandle = deepRes.fileHandle;
            currentDir = deepRes.parentHandle;
          }
        }

        if (foundHandle) {
          const dummyNode: FileNode = {
            name: foundHandle.name,
            path: pathWithoutHash,
            kind: 'file',
            handle: foundHandle
          };
          await handleFileClick(dummyNode, currentDir);
          jumpToAnchor(targetHash);
          return;
        }
      } catch (err) {
        console.warn('[handleFileOpenByPath] FileSystemAccess 직접 스캔 실패:', err);
      }
    }

    // 💡 [캐시된 외부 파일 핸들 우선 조회 (IndexedDB 영구 보관소)]
    try {
      const nativeReader = typeof window !== 'undefined' && (window as any).electronAPI?.readFromPath;
      const cachedHandle = nativeReader ? null : (await getExternalFileHandle(pathWithoutHash) ||
                            await getExternalFileHandle(cleanPath) ||
                            (!strictLinkedDocument ? await getExternalFileHandle(targetBaseName) : null));
      if (cachedHandle) {
        const hasPermission = await verifyHandlePermission(cachedHandle, false);
        if (hasPermission) {
          const file = await cachedHandle.getFile();
          const text = await file.text();
          const filename = file.name || targetBaseNameWithMd || '문서.md';
          const resolvedPath = pathWithoutHash || cleanPath || filename;
          const externalNode: FileNode = {
            name: filename,
            path: resolvedPath,
            kind: 'file',
            handle: cachedHandle
          };

          const existingTab = tabsRef.current.find(t => 
            t.path === resolvedPath || 
            t.path === pathWithoutHash || 
            t.name === filename
          );

          if (existingTab) {
            existingTab.content = text;
            existingTab.node = externalNode;
            (existingTab as any).handle = cachedHandle;
            if (existingTab.model && !existingTab.model.isDisposed()) {
              existingTab.model.setValue(text);
            }
            setContent(text);
            switchTab(existingTab.id);
          } else {
            createNewTab(text, filename, false, resolvedPath);
            setTabs(prev => prev.map(t => (t.name === filename || t.path === resolvedPath) ? {
              ...t,
              node: externalNode,
              handle: cachedHandle,
              path: resolvedPath
            } : t));
          }

          setCurrentFileNode(externalNode);
          setCurrentFileName(filename);
          jumpToAnchor(targetHash);
          showToast(`'${filename}' 외부 문서를 승인된 권한으로 열었습니다.`, 'info');
          return;
        }
      }
    } catch (e) {
      console.warn('[handleFileOpenByPath] 캐시된 외부 파일 핸들 열기 예외:', e);
    }

    // 💡 [로컬 디스크 파일 직접 읽기 (데스크톱 Electron IPC 우선, 로컬 개발 서버 디스크 API 폴백)]
    const electronApi = typeof window !== 'undefined' ? ((window as any).electronAPI || (window as any).api) : null;
    const resolvedNativePath = resolveNativeDocumentPath(pathWithoutHash || cleanPath, rootFolderRef.current);
    if (electronApi?.readFromPath && resolvedNativePath) {
      try {
        let nativePath = resolvedNativePath;
        if (nativePath.startsWith('file:///')) {
          nativePath = decodeURIComponent(nativePath.replace(/^file:\/\/\/?/, ''));
        }
        const fileObj = await electronApi.readFromPath(nativePath);
        if (fileObj && typeof fileObj.content === 'string') {
          const filename = fileObj.name || targetBaseNameWithMd || targetBaseName || '문서.md';
          const resolvedDiskPath = fileObj.path || nativePath;
          const diskNode: FileNode = { name: filename, path: resolvedDiskPath, kind: 'file' };

          const existingTab = tabsRef.current.find(t => matchesLinkedDocument(t, resolvedDiskPath, rootFolderRef.current));

          if (existingTab) {
            existingTab.content = fileObj.content;
            existingTab.path = resolvedDiskPath;
            existingTab.node = diskNode;
            setTabs(prev => prev.map(t => t.id === existingTab.id ? { ...t, path: resolvedDiskPath, node: diskNode } : t));
            if (existingTab.model && !existingTab.model.isDisposed()) {
              existingTab.model.setValue(fileObj.content);
            }
            setContent(fileObj.content);
            switchTab(existingTab.id);
          } else {
            createNewTab(fileObj.content, filename, false, resolvedDiskPath, diskNode);
          }
          setCurrentFileNode(diskNode);
          setCurrentFileName(filename);
          jumpToAnchor(targetHash);
          return;
        }
      } catch (electronErr) {
        console.warn('[handleFileOpenByPath] 데스크톱 readFromPath 파일 읽기 시도 예외:', electronErr);
        if (targetBaseNameWithMd === '00_시작하기.md' || /^HELP-\d+/i.test(targetBaseNameWithMd)) {
          const fallbackCandidates = [
            `docs/help/${targetBaseNameWithMd}`,
            `frontend/public/help/${targetBaseNameWithMd}`,
            rootFolderRef.current?.name ? `${rootFolderRef.current.name.replace(/\\/g, '/')}/docs/help/${targetBaseNameWithMd}` : '',
            rootFolderRef.current?.name ? `${rootFolderRef.current.name.replace(/\\/g, '/')}/frontend/public/help/${targetBaseNameWithMd}` : ''
          ].filter(Boolean);
          for (const fbPath of fallbackCandidates) {
            try {
              const fbObj = await electronApi.readFromPath(fbPath);
              if (fbObj && typeof fbObj.content === 'string') {
                const filename = fbObj.name || targetBaseNameWithMd;
                const resolvedDiskPath = fbObj.path || fbPath;
                const diskNode: FileNode = { name: filename, path: resolvedDiskPath, kind: 'file' };
                const existingTab = tabsRef.current.find(t => matchesLinkedDocument(t, resolvedDiskPath, rootFolderRef.current));
                if (existingTab) {
                  existingTab.content = fbObj.content;
                  existingTab.path = resolvedDiskPath;
                  existingTab.node = diskNode;
                  setTabs(prev => prev.map(t => t.id === existingTab.id ? { ...t, path: resolvedDiskPath, node: diskNode } : t));
                  if (existingTab.model && !existingTab.model.isDisposed()) existingTab.model.setValue(fbObj.content);
                  setContent(fbObj.content);
                  switchTab(existingTab.id);
                } else {
                  createNewTab(fbObj.content, filename, false, resolvedDiskPath, diskNode);
                }
                setCurrentFileNode(diskNode);
                setCurrentFileName(filename);
                jumpToAnchor(targetHash);
                return;
              }
            } catch {}
          }
        }
      }
    } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        const queryPath = pathWithoutHash.startsWith('file:///') ? pathWithoutHash : (cleanPath.startsWith('file:///') ? cleanPath : pathWithoutHash);
        const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(queryPath)}`));
        if (res.ok) {
          const data = await res.json();
          if (data.ok && typeof data.content === 'string') {
            const filename = data.title || targetBaseNameWithMd || targetBaseName || '문서.md';
            const resolvedDiskPath = data.path || pathWithoutHash;
            const diskNode: FileNode = { name: filename, path: resolvedDiskPath, kind: 'file' };

            const existingTab = tabsRef.current.find(t => matchesLinkedDocument(t, resolvedDiskPath, rootFolderRef.current));

            if (existingTab) {
              existingTab.content = data.content;
              existingTab.path = resolvedDiskPath;
              existingTab.node = diskNode;
              setTabs(prev => prev.map(t => t.id === existingTab.id ? { ...t, path: resolvedDiskPath, node: diskNode } : t));
              if (existingTab.model && !existingTab.model.isDisposed()) {
                existingTab.model.setValue(data.content);
              }
              setContent(data.content);
              switchTab(existingTab.id);
            } else {
              createNewTab(data.content, filename, false, resolvedDiskPath, diskNode);
            }
            setCurrentFileNode(diskNode);
            setCurrentFileName(filename);
            jumpToAnchor(targetHash);
            return;
          }
        }
      } catch (diskErr) {
        console.warn('[handleFileOpenByPath] /api/file-content 디스크 파일 읽기 시도 예외:', diskErr);
      }
    }

    // 💡 [VFS/IndexedDB 우선 예외 가드]
    const isVfsExist = typeof window !== 'undefined' && (
      vfsReadFile(pathWithoutHash) ||
      vfsReadFile(cleanPath) ||
      vfsReadFile(cleanPathNoDotSlash) ||
      (!strictLinkedDocument && vfsReadFile(targetBaseName)) ||
      (!strictLinkedDocument && vfsReadFile(targetBaseNameWithMd))
    );
    if (isVfsExist) {
      const filename = targetBaseNameWithMd || targetBaseName || '파일.md';
      const dummyNode: FileNode = {
        name: filename,
        path: pathWithoutHash,
        kind: 'file'
      };
      await handleFileClick(dummyNode, rootFolder?.handle || null);
      jumpToAnchor(targetHash);
      return;
    }

    // 💡 [웹 WASM SQLite / 로컬 지식 보관함 문서 폴백 가드]
    try {
      const cleanKnowledgeTarget = pathWithoutHash
        .replace(/^knowledge:\/\//, '')
        .replace(/^file:\/\/\//, '')
        .replace(/^\.\//, '')
        .replace(/^\//, '');
      const isDocId = cleanKnowledgeTarget.startsWith('doc-') || cleanKnowledgeTarget.length === 36;
      const rfHandle = (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
      
      let detail = await knowledgeClient.getDocumentDetail({
        documentId: isDocId ? cleanKnowledgeTarget : undefined,
        filePath: !isDocId ? cleanKnowledgeTarget : undefined,
        heading: targetHash || undefined,
        resourceFolderHandle: rfHandle
      });

      // 1차 검색 실패 시 파일명 또는 제목으로 2차/3차 재시도
      if (!strictLinkedDocument && !detail && !isDocId && targetBaseName) {
        detail = await knowledgeClient.getDocumentDetail({
          filePath: targetBaseName,
          heading: targetHash || undefined,
          resourceFolderHandle: rfHandle
        });
      }
      if (!strictLinkedDocument && !detail && !isDocId && targetBaseNameWithoutMd) {
        detail = await knowledgeClient.getDocumentDetail({
          filePath: targetBaseNameWithoutMd,
          heading: targetHash || undefined,
          resourceFolderHandle: rfHandle
        });
      }

      const docObj = detail ? (detail.title ? detail : (detail as any).document) : null;
      if (docObj) {
        const docTitle = docObj.title || targetBaseNameWithoutMd || '지식문서';
        const docChunks = docObj.chunks || [];
        const chunksText = docChunks
          .map((c: any) => c.chunkText || c.chunk_text || c.content || '')
          .filter(Boolean)
          .join('\n\n');
        const docContent = chunksText.trim() || (docObj.summary 
          ? `# ${docTitle}\n\n${docObj.summary}\n\n`
          : `# ${docTitle}\n\n지식 문서 내용`);
        const targetFilename = docTitle ? `${docTitle.replace(/\.md$/i, '')}.md` : (targetBaseNameWithMd || '지식문서.md');
        const docResolvedPath = docObj.filePath || pathWithoutHash;
        
        const existingTab = tabsRef.current.find(t => 
          t.path === pathWithoutHash || 
          t.path === docResolvedPath ||
          t.path === cleanKnowledgeTarget ||
          t.name === targetFilename || 
          t.name === docTitle || 
          (t as any).documentId === (docObj.id || docObj.documentId)
        );
        if (existingTab) {
          existingTab.content = docContent;
          if (existingTab.model && !existingTab.model.isDisposed()) {
            existingTab.model.setValue(docContent);
          }
          setContent(docContent);
          switchTab(existingTab.id);
        } else {
          createNewTab(docContent, targetFilename, false, docResolvedPath);
          setTabs(prev => prev.map(t => (t.name === targetFilename || t.name === docTitle) ? { ...t, path: docResolvedPath, isKnowledge: true, documentId: (docObj.id || docObj.documentId) } : t));
        }
        jumpToAnchor(targetHash);
        return;
      }
    } catch (e) {
      console.warn('[handleFileOpenByPath] 지식 문서 폴백 조회 실패:', e);
    }

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    if (!isElectron) {
      try {
        const normalized = pathWithoutHash.replace(/\\/g, '/');
        const docsIndex = normalized.indexOf('docs/');
        const isBundledHelp = /^(?:\.?\/)?help\//.test(normalized);
        const isHelpDocName = targetBaseNameWithMd === '00_시작하기.md' || /^HELP-\d+/i.test(targetBaseNameWithMd);
        const isDocSample = isBundledHelp || isHelpDocName || docsIndex !== -1 || normalized.startsWith('docs/') || normalized === 'welcome.md' || normalized.startsWith('./docs/');
        
        if (isDocSample) {
          let fetchPath = isBundledHelp ? '/' + normalized.replace(/^\.?\//, '') : './' + (docsIndex !== -1 ? normalized.substring(docsIndex) : normalized);
          if (isHelpDocName && !isBundledHelp && (!fetchPath.startsWith('/help/') && !fetchPath.startsWith('./help/'))) {
            fetchPath = '/help/' + targetBaseNameWithMd;
          }
          let res = await fetch(fetchPath);
          if (!res.ok && isHelpDocName && fetchPath !== '/help/' + targetBaseNameWithMd) {
            res = await fetch('/help/' + targetBaseNameWithMd);
          }
          if (res.ok) {
            const text = await res.text();
            const filename = targetBaseNameWithMd || targetBaseName || '문서.md';
            
            const existingTab = tabsRef.current.find(t => t.name === filename || t.path === pathWithoutHash);
            if (existingTab) {
              switchTab(existingTab.id);
            } else {
              createNewTab(text, filename);
              setTabs(prev => prev.map(t => t.name === filename ? { ...t, path: isBundledHelp ? undefined : pathWithoutHash, isBundledHelp } : t));
            }
            if (isBundledHelp) { setCurrentFileNode(null); setCurrentFileName(filename); }
            jumpToAnchor(targetHash);
            return;
          }
        }
      } catch (err) {
        console.error('[Browser Open Path Fallback Error]', err);
      }
    }

    if (strictLinkedDocument) {
      showToast(`연결된 문서를 찾을 수 없습니다: ${pathWithoutHash}`, 'error');
      return;
    }

    if (workspaceType !== 'browser') {
      const filename = targetBaseNameWithMd || targetBaseName || '파일.md';
      const dummyNode: FileNode = {
        name: filename,
        path: pathWithoutHash,
        kind: 'file'
      };
      await handleFileClick(dummyNode);
      jumpToAnchor(targetHash);
      return;
    }

    // 웹 브라우저 모드: 미스캔 파일이어도 파일명이 존재할 경우 즉각 신규 탭을 열어 작업 단절 방어 및 온디맨드 권한 요청
    if (targetBaseNameWithoutMd) {
      const filename = targetBaseNameWithMd || `${targetBaseNameWithoutMd}.md`;
      const currentWorkspaceName = rootFolder?.name || '현재 작업장';
      const placeholderContent = `# ${targetBaseNameWithoutMd}\n\n> [!NOTE] 작업장 외부 문서 안내\n> 이 문서는 현재 열린 작업장 폴더(\`${currentWorkspaceName}\`)의 바깥 경로(\`${pathWithoutHash}\`)에 위치해 있습니다.\n> 웹 브라우저(Web SaaS) 보안 격리 정책상 허용된 작업장 외부의 파일은 사용자의 승인 후 직접 연결할 수 있습니다.\n> \n> **해결 방법**:\n> 1. 화면에 표시된 권한 확인 대화상자에서 **[📂 파일 선택 및 권한 허용]**을 누르시면 내 PC의 실제 파일과 즉시 연결되어 편집/저장할 수 있습니다.\n> 2. 또는 상위 폴더(예: 상위 드라이브 또는 부모 폴더)를 작업장 폴더로 연결하시면 하위의 모든 파일 본문이 즉시 연동됩니다.\n> 3. 해당 문서를 **지식 보관함**에 등록해 두시면 작업장 위치와 무관하게 언제든 본문을 복원하여 열람할 수 있습니다.\n\n`;
      createNewTab(placeholderContent, filename);
      setTabs(prev => prev.map(t => t.name === filename ? { ...t, path: pathWithoutHash } : t));
      jumpToAnchor(targetHash);

      showToast(`'${filename}'은(는) 현재 작업장(${currentWorkspaceName}) 외부 파일입니다. 상위 폴더를 여시거나 지식 보관함에 등록하시면 전체 본문이 연동됩니다.`, 'warning');
      return;
    }

    showToast('해당 파일 노드를 찾을 수 없습니다.', 'error');
  };

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0003 ✅ FIXED] useFileExplorer.ts ➔ handleFileClick
  // 🎯 @KICK  : 파일 트리 노드 클릭 시 기존 탭 전환 또는 새 탭 생성 및 파일 내용 로딩
  // 🛡️ @GUARD : node null/kind directory early return, 파일 읽기 실패 시 오류 토스트
  // 🚨 @PATCH : disposed model 가드: 기존 탭 model.isDisposed() 시 스테일 탭 정리 (2026-06-18); **2026-07-06** — 브라우저 모드 핸들 재클릭 시 중복 탭 생성 버그 수정: 경로→핸들→파일명 3단계 fallback 비교로 existingTab 정확도 향상
  // 🔗 @CALLS : createNewTab, switchTab, setContent, setTabs, setActiveTabId, showToast
  // ====================================================================
  const loadingFilesRef = useRef<Set<string>>(new Set());

  // 5. 파일 트리 클릭 시 파일 열기 및 신규 탭 로딩
  const handleFileClick = async (node: FileNode | null, parentHandle?: any) => {
    if (previewModeRef.current === 'css-style') {
      const editor = editorRef.current;
      if (editor && activeTabIdRef.current) {
        const latestVal = editor.getValue();
        setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: latestVal } : t));
      }
      const targetMode = isRestrictedUser ? 'preview' : 'both';
      setPreviewModeRaw(targetMode);
      previewModeRef.current = targetMode;
      isEditorMountedRef.current = targetMode !== 'preview';
    }

    currentFileParentHandleRef.current = parentHandle || null;

    if (!node) {
      createNewTab();
      return;
    }
    if (node.kind === 'directory') return;

    const existingTab = tabsRef.current.find(t => {
      // 0순위: 구글 드라이브 ID 일치 (GDRIVE 모드)
      const nodeDriveId = (node as any).driveFileId || (node as any).driveId || (node as any).id;
      const tabDriveId = (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId || (t.node as any)?.id;
      if (nodeDriveId && tabDriveId && nodeDriveId === tabDriveId) {
        return true;
      }
      if (nodeDriveId || tabDriveId) return false;

      // 구글 드라이브 작업장(또는 클라우드 모드)인 경우, 동일 파일명이면 동일 파일로 판별
      if (rootFolderRef.current?.type === 'GDRIVE' || workspaceType === 'cloud') {
        return false;
      }

      // 1순위: 절대 경로 정규화 일치 (가장 정확, \ vs / 슬래시 차이 무시)
      if (node.path && t.path) {
        const normNode = node.path.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        const normTab = t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        if (normNode === normTab) return true;
        if (normTab.endsWith('/' + normNode) || normNode.endsWith('/' + normTab)) {
          return true;
        }
        return false;
      }

      // 2순위: 이름 기반 일치
      if (node.name && t.name && node.name.toLowerCase().normalize('NFC') === t.name.toLowerCase().normalize('NFC')) {
        if (!node.path || !t.path || !node.path.includes('/') || !t.path.includes('/')) {
          return true;
        }
      }

      // 3순위: 핸들 참조 일치 (브라우저 모드)
      if (node.handle && t.node?.handle) {
        if (typeof node.handle.isSameEntry === 'function') {
          if (node.name === t.node.name && node.kind === t.node.kind) return true;
        } else if (node.handle === t.node.handle || node.name === t.node.name) {
          return true;
        }
      }
      return false;
    });

    if (existingTab) {
      if (existingTab.model && existingTab.model.isDisposed()) {
        const cleaned = tabsRef.current.filter(t => t.id !== existingTab.id);
        tabsRef.current = cleaned;
        setTabs(cleaned);
      } else {
        // 기존 탭의 내용이 비어있고 구글 드라이브 파일인 경우 실시간 수화(Hydration)
        const driveId = (node as any).driveFileId || (node as any).driveId || (node as any).id;
        if (!existingTab.isModified && (!existingTab.content || existingTab.content.trim() === '') && (driveId || rootFolderRef.current?.type === 'GDRIVE')) {
          const token = getSavedDriveToken();
          if (token && driveId) {
            try {
              const freshContent = await readDriveFileContent(token, driveId);
              if (freshContent) {
                existingTab.content = freshContent;
                if (existingTab.model && !existingTab.model.isDisposed()) {
                  existingTab.model.setValue(freshContent);
                }
                setContent(freshContent);
                setTabs(prev => prev.map(t => t.id === existingTab.id ? { ...t, content: freshContent } : t));
              }
            } catch (err) {
              console.warn('[existingTab] 구글 드라이브 수화 실패:', err);
              showToast('구글 드라이브 문서를 읽지 못했습니다. 연결을 갱신한 뒤 다시 열어 주세요.', 'error');
              return;
            }
          } else { showToast('구글 드라이브 연결을 갱신한 뒤 다시 열어 주세요.', 'error'); return; }
        } else if (node.handle && (!existingTab.handle || !existingTab.content || existingTab.content.includes('작업장 외부 문서 안내') || existingTab.content.includes('작업장 외부 문서'))) {
          // 🛡️ [브라우저 모드 핸들 및 본문 즉시 수화]: 기존 탭이 플레이스홀더였거나 handle이 바인딩되지 않은 경우 실제 파일로 교체
          try {
            const file = await node.handle.getFile();
            const text = await file.text();
            existingTab.handle = node.handle;
            existingTab.node = node;
            existingTab.content = text;
            if (existingTab.model && !existingTab.model.isDisposed()) {
              existingTab.model.setValue(text);
            }
            setContent(text);
            lastSavedContentRef.current = text;
            setCurrentFileNode(node);
            setCurrentFileName(node.name);
            setTabs(prev => prev.map(t => t.id === existingTab.id ? {
              ...t,
              handle: node.handle,
              node: node,
              content: text,
              isModified: false
            } : t));
          } catch (hErr) {
            console.warn('[existingTab] handle 수화 예외:', hErr);
          }
        }
        switchTab(existingTab.id);
        setIsSidebarOpen(true);
        return;
      }
    }

    const fileKey = node.path || node.handle?.name || node.name;
    if (fileKey && loadingFilesRef.current.has(fileKey)) {
      return; // 이미 로딩 중인 파일 무시 (더블클릭 중복 탭 생성 방지)
    }
    if (fileKey) loadingFilesRef.current.add(fileKey);

    try {
      let activeMode = workspaceType;
      if (workspaceType === 'browser') {
        activeMode = 'browser';
      } else if (node.path && !node.handle) {
        activeMode = 'local';
      } else if (node.handle && !node.path) {
        activeMode = 'browser';
      }

      let fileContent = '';
      const driveId = (node as any).driveFileId || (node as any).driveId || (node as any).id;
      if (driveId || rootFolderRef.current?.type === 'GDRIVE' || workspaceType === 'cloud') {
        const token = getSavedDriveToken();
        if (!token || !driveId) {
          showToast('구글 드라이브 연결을 갱신한 뒤 다시 열어 주세요.', 'error');
          return;
        }
        if (token && driveId) {
          try {
            fileContent = await readDriveFileContent(token, driveId);
          } catch (e) {
            logError({
              file: 'frontend/src/hooks/useFileExplorer.ts',
              func: 'handleFileClick',
              doing: '구글 드라이브 파일 본문 다운로드 중',
              target: node.name ? `${node.name} (ID: ${driveId})` : driveId,
              error: e,
              context: { driveId }
            });
            showToast('구글 드라이브 파일 읽기 실패', 'error');
            return;
          }
        }
      } else if (activeMode === 'browser') {
        if (node.handle) {
          const file = await node.handle.getFile();
          fileContent = await file.text();
        } else if (node.path) {
          fileContent = vfsReadFile(node.path);
          if (!fileContent && /^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(node.path)) {
            const electronApi = typeof window !== 'undefined' ? ((window as any).electronAPI || (window as any).api) : null;
            if (electronApi?.readFromPath) {
              try {
                let nativePath = node.path;
                if (nativePath.startsWith('file:///')) {
                  nativePath = decodeURIComponent(nativePath.replace(/^file:\/\/\/?/, ''));
                }
                const f = await electronApi.readFromPath(nativePath);
                if (f && typeof f.content === 'string') {
                  fileContent = f.content;
                }
              } catch {}
            } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
              try {
                const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(node.path)}`));
                if (res.ok) {
                  const data = await res.json();
                  if (data.ok && typeof data.content === 'string') {
                    fileContent = data.content;
                  }
                }
              } catch {}
            }
          }
          if (!fileContent && node.path) {
            try {
              const rfHandle = (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
              const detail = await knowledgeClient.getDocumentDetail({
                filePath: node.path,
                resourceFolderHandle: rfHandle
              });
              const docObj = detail ? (detail.title ? detail : (detail as any).document) : null;
              if (docObj) {
                const chunks = docObj.chunks || [];
                const chunksText = chunks.map((c: any) => c.chunkText || c.chunk_text || c.content || '').filter(Boolean).join('\n\n');
                fileContent = chunksText.trim() || (docObj.summary ? `# ${docObj.title}\n\n${docObj.summary}\n\n` : '');
              }
            } catch {}
          }
        }
      } else if (activeMode === 'local' && node.path) {
        const api = (window as any).electronAPI;
        if (api?.readFromPath) {
          try {
            const targetPath = resolveNativeDocumentPath(node.path, rootFolderRef.current);
            if (!targetPath) {
              showToast('로컬 작업장 경로를 확인할 수 없습니다. 작업장을 다시 연결해 주세요.', 'error');
              return;
            }
            const file = await api.readFromPath(targetPath);
            if (file) {
              fileContent = file.content;
              if (file.path) node.path = file.path;
            } else {
              if (sessionRestoringRef?.current) return;
              showToast('파일을 읽을 수 없습니다.', 'error');
              return;
            }
          } catch (e) {
            logError({
              file: 'frontend/src/hooks/useFileExplorer.ts',
              func: 'handleFileClick',
              doing: '로컬 디스크 파일 읽기 중',
              target: node.path || node.name,
              error: e
            });
            console.warn('[handleFileClick] 파일 읽기 실패:', node.path, e);
            if (!sessionRestoringRef?.current) {
              showToast('파일 읽기 실패', 'error');
            }
            return;
          }
        } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(node.path)}`));
          if (res.ok) {
            const data = await res.json();
            fileContent = data.content;
          }
        }
      }

      // [Bug Fix] CRLF를 LF로 정규화하여 Monaco getValue()와의 비교 시 isModified가 오작동하는 문제 해결
      fileContent = fileContent.replace(/\r\n/g, '\n');

      const monaco = (window as any).monaco;
      let model: any = null;
      const newTabId = driveId ? `gdrive:${getSavedWorkspaceInfo()?.rootFolderId || ''}:${driveId}` : node.path || node.handle?.name || 'tab-' + Date.now();

      if (monaco) {
        model = monaco.editor.createModel(fileContent, 'markdown');
        model.onDidChangeContent(() => {
          const val = model.getValue();
          setContent(val);
          setTabs(prev => prev.map(t => t.id === newTabId ? { ...t, content: val, isModified: val !== t.content } : t));
        });
      }

      const newTab: EditorTab = {
        id: newTabId,
        name: node.name,
        path: node.path || null,
        node: node,
        content: fileContent,
        isModified: false,
        model: model,
        driveFileId: driveId,
        previewMode: isRestrictedUser ? 'preview' : (node.name === '도움말.md' ? 'preview' : previewModeRef.current)
      };

      setTabs(prev => {
        const nodeDriveId = driveId;
        const normNewPath = (node.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
        const exists = prev.some(t => {
          if (t.id === newTabId) return true;
          const tabDriveId = (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId;
          if (nodeDriveId && tabDriveId && nodeDriveId === tabDriveId) return true;
          if (nodeDriveId || tabDriveId) return false;
          if (node.path && t.path) {
            const normTabPath = t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC');
            return normTabPath === normNewPath || normTabPath.endsWith('/' + normNewPath) || normNewPath.endsWith('/' + normTabPath);
          }
          return t.name === node.name;
        });
        if (exists) {
          return prev.map(t => {
            const tabDriveId = (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId;
            const normTabPath = (t.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
            const isMatch = nodeDriveId || tabDriveId
              ? Boolean(nodeDriveId && tabDriveId && nodeDriveId === tabDriveId)
              : t.id === newTabId ||
              (nodeDriveId && tabDriveId && nodeDriveId === tabDriveId) ||
              ((rootFolderRef.current?.type === 'GDRIVE' || workspaceType === 'cloud') && t.name?.toLowerCase() === node.name?.toLowerCase()) ||
              (normNewPath && normTabPath && (normTabPath === normNewPath || normTabPath.endsWith('/' + normNewPath) || normNewPath.endsWith('/' + normTabPath))) ||
              t.name === node.name;
            if (isMatch) {
              return { ...t, id: newTabId, path: node.path || t.path, content: fileContent || t.content, model: model || t.model, node: node || t.node, driveFileId: driveId || (t as any).driveFileId };
            }
            return t;
          });
        }
        return [...prev, newTab];
      });
      setActiveTabId(newTabId);
      setContent(fileContent);
      setCurrentFileName(node.name);
      setCurrentFileNode(node);

      if (editorRef.current && model) {
        try {
          editorRef.current.setModel(model);
          requestAnimationFrame(() => {
            if (editorRef.current) {
              try { editorRef.current.setScrollTop(0); } catch(e) {}
            }
          });
        } catch (e) {
          console.warn("[Monaco] setModel failed, editor might be disposed:", e);
        }
      }

      if (node.name === '도움말.md' || node.name.startsWith('도움말 - ')) {
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
        isEditorMountedRef.current = false;
      }

      const openedMsg = `${node.name} 파일을 열었습니다.`;
      if (!sessionRestoringRef?.current) {
        showToast(openedMsg, "info");
      }
      setIsSidebarOpen(true);
    } catch (err) {
      logError({
        file: 'frontend/src/hooks/useFileExplorer.ts',
        func: 'handleFileClick',
        doing: '파일 열기 및 탭 로딩 처리 중',
        target: node?.name || 'unknown',
        error: err
      });
      showToast("파일을 여는데 실패했습니다.", "error");
    } finally {
      if (fileKey) loadingFilesRef.current.delete(fileKey);
    }
  };

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0010] useFileExplorer.ts ➔ connectGoogleDrive
  // 🎯 @KICK  : 구글 드라이브 원클릭 무설정 연동, 서재 폴더 자동 바인딩 및 0초 즉각 렌더링
  // 🛡️ @GUARD : 기존 로컬 작업장 및 리소스 폴더 백업, 예외 발생 시 안내 토스트
  // 🚨 @PATCH : **2026-10-07** — [구글 드라이브 연결 시 만료 토큰(401) 자동 감지 및 즉시 재인증 팝업 트리거]:
  //             기존 저장된 토큰이 401 만료 상태인 경우 자동 폐기 후 requestGoogleDriveAuth 팝업을 즉시 띄워 새 토큰을 획득하도록 보강

  return {
    handleFileOpenByPath,
    handleFileClick
  };
}
