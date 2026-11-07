// ====================================================================
// 📊 [OMD-HOOK-useEditorDocLinks] frontend/src/hooks/editor/useEditorDocLinks.ts
// 🎯 @KICK  : 문서 간 위키링크/상대경로 연결 팝업, 헤딩(H1~H6) 동적 파싱, 커서 위치 기반 팝업 좌표 계산 훅
// 🛡️ @GUARD : 비동기 파일 트리 로딩, 상대 경로 정규화, 위지윅/모나코 양방향 삽입 지원 및 닫힐 때 상태 완전 소거
// 🚨 @PATCH : 2026-11-07 — [문서 연결(DocLink) 작업장 전체 하위 폴더 문서 탐색 보장]: effectiveWorkspaceType(GDRIVE/driveFolderId 기반 cloud 자동 감지) 도입 및 effectiveRoot 최우선 전달로 구글 드라이브 및 로컬 하위 폴더 문서 누락 결함 원천 해결
// 🚨 @PATCH : 2026-11-07 — [문서 연결(DocLink) 작업장 최신 rootFolderRef 바인딩]: rootFolder 외에 rootFolderRef.current 우선 참조로 작업장 파일 누락 방지
// 🚨 @PATCH : 2026-11-05 — [문서 링크명 기본값]: 선택 영역이 없으면 팝업을 연 커서 위치의 단어를 링크명으로 사용한다.
// 🚨 @PATCH : 2026-11-04 — [표준화 및 에러 처리 강화] logError 5대 진단 필드 선제 기록 적용 및 2단계 함수 JSDoc 표준화
//             2026-11-04 — [MainEditorApp 모듈화]: 문서 연결(DocLinkPicker) 상태, 헤딩 파싱, 파일 읽기(readFileText), 팝업 좌표 계산을 useEditorDocLinks로 분리 위임 (460줄 감축)
// 🔗 @CALLS : fetchAllMdFiles, getRelativePath, resolveNativeDocumentPath, readFileText, extractHeadings, logError
// ====================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { FileNode } from '@/lib/indexedDbHelper';
import { useModalEscape } from '@/hooks/useModalEscape';
import { fetchAllMdFiles, getRelativePath } from '@/utils/editorFileUtils';
import { resolveNativeDocumentPath } from '@/lib/nativeDocumentPath';
import { getSavedDriveToken, readDriveFileContent } from '@/lib/gdrive/googleDriveClient';
import { vfsReadFile } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient';
import { logError } from '@/lib/errorDiagnostics';

export interface UseEditorDocLinksProps {
  workspaceType: string;
  fileList: FileNode[];
  rootFolder: { name?: string; handle?: any; type?: string; path?: string; id?: string; driveFolderId?: string } | null;
  rootFolderRef: React.MutableRefObject<{ name?: string; handle?: any; type?: string; path?: string; id?: string; driveFolderId?: string } | null>;
  resourceFolder?: string | null;
  resourceFolderHandle?: any;
  resourceFolderHandleRef?: React.MutableRefObject<any>;
  currentFileNode?: FileNode | null;
  tabsRef: React.MutableRefObject<any[]>;
  editorRef: React.MutableRefObject<any>;
  lastSelectionRef: React.MutableRefObject<any>;
  docLinkFilesRef: React.MutableRefObject<FileNode[]>;
  readFileTextRef?: React.MutableRefObject<((node: FileNode) => Promise<string>) | null>;
  floatingToolbar?: { top: number; left: number; visible?: boolean };
}

export interface UseEditorDocLinksReturn {
  showDocLinkPicker: boolean;
  setShowDocLinkPicker: React.Dispatch<React.SetStateAction<boolean>>;
  docLinkSearchText: string;
  setDocLinkSearchText: React.Dispatch<React.SetStateAction<string>>;
  allMdFiles: FileNode[];
  setAllMdFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  isDocLinkLoading: boolean;
  setIsDocLinkLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDocNode: FileNode | null;
  setSelectedDocNode: React.Dispatch<React.SetStateAction<FileNode | null>>;
  docHeadings: string[];
  setDocHeadings: React.Dispatch<React.SetStateAction<string[]>>;
  isHeadingLoading: boolean;
  setIsHeadingLoading: React.Dispatch<React.SetStateAction<boolean>>;
  docHeadingSearchText: string;
  setDocHeadingSearchText: React.Dispatch<React.SetStateAction<string>>;
  docLinkCustomTitle: string;
  setDocLinkCustomTitle: React.Dispatch<React.SetStateAction<string>>;
  isDocLinkTitleManuallyEdited: boolean;
  setIsDocLinkTitleManuallyEdited: React.Dispatch<React.SetStateAction<boolean>>;
  visualDocLinkInsertRef: React.MutableRefObject<((targetUrl: string, displayTitle: string) => boolean) | null>;
  visualDocLinkPositionRef: React.MutableRefObject<{ top: number; left: number } | null>;
  closeDocLinkPicker: () => void;
  readFileText: (node: FileNode) => Promise<string>;
  extractHeadings: (text: string) => string[];
  handleDocFileClick: (targetNode: FileNode) => Promise<void>;
  getDocLinkDefaultLabel: (targetNode: FileNode) => string;
  buildDocLinkTarget: (targetNode: FileNode, heading?: string) => string;
  handleDocLinkSelect: (targetNode: FileNode, heading?: string, customTitle?: string) => void;
  docLinkPickerStyle: React.CSSProperties;
}

/**
 * ========================================================================================
 * [함수명] useEditorDocLinks - 마크다운 문서 링크 선택 및 헤딩 연결 전담 훅
 * ========================================================================================
 */
export function useEditorDocLinks({
  workspaceType,
  fileList,
  rootFolder,
  rootFolderRef,
  resourceFolder,
  resourceFolderHandle,
  resourceFolderHandleRef,
  currentFileNode,
  tabsRef,
  editorRef,
  lastSelectionRef,
  docLinkFilesRef,
  readFileTextRef,
  floatingToolbar = { top: 0, left: 0 },
}: UseEditorDocLinksProps): UseEditorDocLinksReturn {
  const [showDocLinkPicker, setShowDocLinkPicker] = useState<boolean>(false);
  const [docLinkSearchText, setDocLinkSearchText] = useState<string>('');
  const [allMdFiles, setAllMdFiles] = useState<FileNode[]>([]);
  const [isDocLinkLoading, setIsDocLinkLoading] = useState<boolean>(false);

  // 다른 문서 헤딩 연결 상태값
  const [selectedDocNode, setSelectedDocNode] = useState<FileNode | null>(null);
  const [docHeadings, setDocHeadings] = useState<string[]>([]);
  const [isHeadingLoading, setIsHeadingLoading] = useState<boolean>(false);
  const [docHeadingSearchText, setDocHeadingSearchText] = useState<string>('');
  const [docLinkCustomTitle, setDocLinkCustomTitle] = useState<string>('');
  const [isDocLinkTitleManuallyEdited, setIsDocLinkTitleManuallyEdited] = useState<boolean>(false);

  const visualDocLinkInsertRef = useRef<((targetUrl: string, displayTitle: string) => boolean) | null>(null);
  const visualDocLinkPositionRef = useRef<{ top: number; left: number } | null>(null);

  /**
   * ========================================================================================
   * [함수명] closeDocLinkPicker - 문서 링크 선택 팝업을 닫고 검색/선택 상태를 초기화합니다.
   *
   * @returns {void}
   * ==========================================================================================
   */
  const closeDocLinkPicker = useCallback(() => {
    setShowDocLinkPicker(false);
    setDocLinkSearchText('');
    setSelectedDocNode(null);
    setDocHeadings([]);
    setIsHeadingLoading(false);
    setDocHeadingSearchText('');
    setDocLinkCustomTitle('');
    setIsDocLinkTitleManuallyEdited(false);
    visualDocLinkInsertRef.current = null;
    visualDocLinkPositionRef.current = null;
  }, []);

  useModalEscape(showDocLinkPicker, closeDocLinkPicker);

  // 문서 링크 선택기 열릴 때 모든 .md 파일 로드
  useEffect(() => {
    if (showDocLinkPicker) {
      if (!isDocLinkTitleManuallyEdited) {
        let selText = '';
        if (editorRef.current) {
          const editor = editorRef.current;
          let selection = editor.getSelection();
          if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
            selection = lastSelectionRef.current;
          }
          if (selection) {
            selText = editor.getModel()?.getValueInRange(selection)?.trim() || '';
          }
          if (!selText) {
            const position = editor.getPosition();
            const model = editor.getModel();
            if (position && model) {
              const word = model.getWordAtPosition(position);
              selText = word?.word?.trim() || '';
            }
          }
        }
        if (selText) {
          setDocLinkCustomTitle(selText);
          setIsDocLinkTitleManuallyEdited(true);
        }
      }
      const loadFiles = async () => {
        setIsDocLinkLoading(true);
        try {
          const effectiveRoot = rootFolder || rootFolderRef?.current;
          const effectiveWorkspaceType =
            effectiveRoot?.type === 'GDRIVE' || effectiveRoot?.driveFolderId || (effectiveRoot?.path || '').startsWith('GoogleDrive/')
              ? 'cloud'
              : workspaceType;
          const files = await fetchAllMdFiles(
            effectiveWorkspaceType,
            fileList,
            effectiveRoot,
            resourceFolder,
            resourceFolderHandle,
            currentFileNode,
            tabsRef.current
          );
          setAllMdFiles(files);
          docLinkFilesRef.current = files;
        } catch (e) {
          logError({
            file: 'frontend/src/hooks/editor/useEditorDocLinks.ts',
            func: 'loadFiles',
            doing: '문서 링크 선택기를 위한 작업장 전체 마크다운(.md) 파일 목록 조회 중',
            target: (rootFolder || rootFolderRef?.current)?.name || workspaceType,
            error: e,
          });
        } finally {
          setIsDocLinkLoading(false);
        }
      };
      loadFiles();
    } else {
      setAllMdFiles([]);
      setDocLinkSearchText('');
      setSelectedDocNode(null);
      setDocHeadings([]);
      setIsHeadingLoading(false);
      setDocHeadingSearchText('');
      visualDocLinkInsertRef.current = null;
      visualDocLinkPositionRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDocLinkPicker, workspaceType, fileList, rootFolder, resourceFolder, resourceFolderHandle, currentFileNode]);

  // 자동완성용 파일 목록 백그라운드 프리로드
  useEffect(() => {
    const effectiveRoot = rootFolder || rootFolderRef?.current;
    const effectiveWorkspaceType =
      effectiveRoot?.type === 'GDRIVE' || effectiveRoot?.driveFolderId || (effectiveRoot?.path || '').startsWith('GoogleDrive/')
        ? 'cloud'
        : workspaceType;
    if (workspaceType && (fileList.length > 0 || effectiveRoot?.handle || effectiveRoot?.name || effectiveRoot?.path || effectiveRoot?.driveFolderId) && !showDocLinkPicker) {
      fetchAllMdFiles(
        effectiveWorkspaceType,
        fileList,
        effectiveRoot,
        resourceFolder,
        resourceFolderHandle,
        currentFileNode,
        tabsRef.current
      ).then(files => {
        docLinkFilesRef.current = files;
      }).catch(() => { });
    }
  }, [workspaceType, fileList, rootFolder, rootFolderRef, showDocLinkPicker, resourceFolder, resourceFolderHandle, currentFileNode, tabsRef, docLinkFilesRef]);

  /**
   * ========================================================================================
   * [함수명] readFileText - 다양한 환경(브라우저, 로컬 Electron, 구글드라이브, 지식보관함)에서 파일 내용을 읽습니다.
   *
   * @param {FileNode} node - 읽을 대상 파일 노드
   * @returns {Promise<string>} 파일 텍스트 본문
   * ==========================================================================================
   */
  const readFileText = useCallback(async (node: FileNode): Promise<string> => {
    let fileContent = '';
    const currentRoot = rootFolderRef.current;
    const driveId = (node as any).driveFileId || (node as any).driveId ||
      (currentRoot?.type === 'GDRIVE' ? (node as any).id : undefined);
    if (driveId || currentRoot?.type === 'GDRIVE' || workspaceType === 'cloud') {
      const token = getSavedDriveToken();
      if (!token || !driveId) {
        throw new Error('구글 드라이브 문서의 연결 정보가 없습니다. 파일 목록에서 다시 열어 주세요.');
      }
      return readDriveFileContent(token, driveId);
    }
    let activeMode = workspaceType;
    if (workspaceType === 'browser') {
      activeMode = 'browser';
    } else if (node.path && !node.handle && /^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(node.path)) {
      activeMode = 'local';
    } else if (node.handle && !node.path) {
      activeMode = 'browser';
    }

    if (activeMode === 'browser') {
      if (node.handle) {
        try {
          const file = await node.handle.getFile();
          fileContent = await file.text();
        } catch (e) {
          console.warn('[readFileText] node.handle.getFile failed:', e);
        }
      }

      // 브라우저 rootFolder.handle 직접 추적 가드
      if (!fileContent && rootFolder?.handle && node.path) {
        try {
          const parts = node.path.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
          if (parts.length > 0 && (parts[0] === rootFolder.handle.name || parts[0] === rootFolder.name)) {
            parts.shift();
          }
          let currentDir = rootFolder.handle;
          for (let i = 0; i < parts.length - 1; i++) {
            currentDir = await currentDir.getDirectoryHandle(parts[i], { create: false });
          }
          if (parts.length > 0) {
            const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: false });
            const file = await fileHandle.getFile();
            fileContent = await file.text();
            node.handle = fileHandle;
          }
        } catch (e) {
          // 탐색 실패 시 다음 폴백으로 이동
        }
      }

      // VFS 가상 파일 시스템 폴백
      if (!fileContent && node.path) {
        fileContent = vfsReadFile(node.path);
        if (!fileContent && /^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(node.path)) {
          try {
            const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(node.path)}`));
            if (res.ok) {
              const data = await res.json();
              if (data.ok && typeof data.content === 'string') {
                fileContent = data.content;
              }
            }
          } catch (e) {}
        }
      }
    } else if (activeMode === 'local' && node.path) {
      let targetPath = node.path;
      if (!/^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(targetPath)) {
        const rootPath = currentRoot?.name || '';
        if (!/^(?:[a-zA-Z]:[/\\]|\/)/.test(rootPath)) {
          const virtualContent = vfsReadFile(targetPath);
          if (virtualContent) return virtualContent;
          throw new Error('로컬 작업장 경로가 없습니다. 작업장을 연결한 뒤 문서를 다시 열어 주세요.');
        }
        targetPath = `${rootPath.replace(/[/\\]+$/, '')}/${targetPath.replace(/^[/\\]+/, '')}`;
      }
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (api?.readFromPath) {
        try {
          const file = await api.readFromPath(targetPath);
          if (file) {
            fileContent = file.content;
          }
        } catch (e) {
          logError({
            file: 'frontend/src/hooks/editor/useEditorDocLinks.ts',
            func: 'readFileText',
            doing: 'Electron api.readFromPath를 통한 로컬 마크다운 파일 읽기 중',
            target: targetPath,
            error: e,
          });
        }
      } else {
        try {
          const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(targetPath)}`));
          if (res.ok) {
            const data = await res.json();
            fileContent = data.content;
          }
        } catch (e) {
          logError({
            file: 'frontend/src/hooks/editor/useEditorDocLinks.ts',
            func: 'readFileText',
            doing: '로컬 파일 읽기 API(/api/file-content) 요청 중',
            target: targetPath,
            error: e,
          });
        }
      }
    }

    // 지식 보관함 WASM & 로컬 폴백
    if (!fileContent && ((node as any).isKnowledge || node.path)) {
      try {
        const rfHandle = resourceFolderHandleRef?.current || resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
        const detail = await knowledgeClient.getDocumentDetail({
          filePath: node.path,
          resourceFolder: resourceFolder || undefined,
          resourceFolderHandle: rfHandle
        });
        const docObj = detail ? (detail.title ? detail : (detail as any).document) : null;
        if (docObj) {
          const chunks = docObj.chunks || [];
          const chunksText = chunks
            .map((c: any) => c.chunkText || c.chunk_text || c.content || '')
            .filter(Boolean)
            .join('\n\n');
          fileContent = chunksText.trim() || (docObj.summary ? `# ${docObj.title}\n\n${docObj.summary}\n\n` : `# ${docObj.title}\n\n`);
        }
      } catch (err) {
        console.warn('[readFileText] knowledgeClient.getDocumentDetail fallback failed:', err);
      }
    }

    return fileContent;
  }, [resourceFolder, resourceFolderHandle, resourceFolderHandleRef, rootFolder, rootFolderRef, workspaceType]);

  useEffect(() => {
    if (readFileTextRef) {
      readFileTextRef.current = readFileText;
    }
  }, [readFileText, readFileTextRef]);

  /**
   * ========================================================================================
   * [함수명] extractHeadings - 마크다운 텍스트를 파싱하여 제목 텍스트 줄(H1-H6) 배열을 추출합니다.
   *
   * @param {string} text - 마크다운 원문 텍스트
   * @returns {string[]} 추출된 제목 문자열 배열
   * ==========================================================================================
   */
  const extractHeadings = useCallback((text: string): string[] => {
    if (!text) return [];
    const headingLines = text.split('\n');
    const headings: string[] = [];
    const headingRegex = /^(#{1,6})\s+(.*)$/;
    headingLines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(headingRegex);
      if (match) {
        const hText = match[2].replace(/#+\s*$/, '').trim();
        if (hText) {
          headings.push(hText);
        }
      }
    });
    return headings;
  }, []);

  /**
   * ========================================================================================
   * [함수명] handleDocFileClick - 선택된 마크다운 문서 파일에서 헤딩(H1-H6) 목록을 로드합니다.
   *
   * @param {FileNode} targetNode - 선택된 대상 파일 노드
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const handleDocFileClick = useCallback(async (targetNode: FileNode) => {
    setSelectedDocNode(targetNode);
    setIsHeadingLoading(true);
    try {
      const text = await readFileText(targetNode);
      const headings = extractHeadings(text);
      setDocHeadings(headings);
    } catch (e) {
      logError({
        file: 'frontend/src/hooks/editor/useEditorDocLinks.ts',
        func: 'handleDocFileClick',
        doing: '선택한 문서 파일 본문 읽기 및 헤딩(H1-H6) 목록 파싱 중',
        target: targetNode.path || targetNode.name,
        error: e,
      });
      setDocHeadings([]);
    } finally {
      setIsHeadingLoading(false);
    }
  }, [extractHeadings, readFileText]);

  /**
   * ========================================================================================
   * [함수명] getDocLinkDefaultLabel - 문서 파일명으로부터 확장자를 제외한 기본 표시 라벨을 생성합니다.
   *
   * @param {FileNode} targetNode - 대상 파일 노드
   * @returns {string} 기본 링크 표시 라벨
   * ==========================================================================================
   */
  const getDocLinkDefaultLabel = useCallback((targetNode: FileNode): string => {
    let filename = (targetNode.path || targetNode.name).split(/[?#]/)[0].replace(/\\/g, '/').split('/').pop() || targetNode.name;
    try { filename = decodeURIComponent(filename); } catch {}
    return filename.replace(/\.(md|markdown)$/i, '');
  }, []);

  /**
   * ========================================================================================
   * [함수명] buildDocLinkTarget - 현재 문서 기준 대상 문서의 상대경로(및 #헤딩 앵커)를 계산합니다.
   *
   * @param {FileNode} targetNode - 연결할 대상 파일 노드
   * @param {string} [heading] - 연결할 섹션 헤딩 텍스트
   * @returns {string} 생성된 상대경로 링크 문자열
   * ==========================================================================================
   */
  const buildDocLinkTarget = useCallback((targetNode: FileNode, heading?: string): string => {
    const targetPath = targetNode.path || '';
    if (!targetPath) return '';
    const headingSuffix = heading && heading.trim() ? `#${heading.trim()}` : '';

    // 도움말 문서 상대경로 보장
    if (typeof currentFileNode !== 'undefined' && currentFileNode?.path) {
      const currentPath = (currentFileNode.path || '').replace(/\\/g, '/');
      const isCurrentHelp = /(?:^|\/)(?:docs\/|frontend\/public\/)?help\/[^/]+\.md$/i.test(currentPath) || /^(?:00_시작하기|HELP-\d+)/i.test(currentFileNode.name || '');
      const isTargetHelp = /(?:^|\/)(?:docs\/|frontend\/public\/)?help\/[^/]+\.md$/i.test(targetPath) || /^(?:00_시작하기|HELP-\d+)/i.test(targetNode.name || '');

      if (isCurrentHelp && isTargetHelp) {
        const targetFileName = targetNode.name || targetPath.split('/').pop() || targetPath;
        return `./${targetFileName}${headingSuffix}`;
      }
    }
    const nativeApi = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    if (nativeApi?.readFromPath && workspaceType !== 'cloud' && !targetPath.startsWith('knowledge://')) {
      const absolutePath = resolveNativeDocumentPath(targetPath, rootFolder);
      if (absolutePath) return absolutePath.replace(/\\/g, '/') + (heading?.trim() ? `#${heading.trim()}` : '');
    }
    let baseFromPath = currentFileNode?.path;
    if (!baseFromPath) {
      if (workspaceType === 'local' && rootFolder?.name) {
        baseFromPath = rootFolder.name.replace(/\\/g, '/') + '/_workspace_root_.md';
      } else {
        baseFromPath = '_workspace_root_.md';
      }
    }
    let relativePath = getRelativePath(baseFromPath, targetPath);

    if (rootFolder?.name && workspaceType === 'local') {
      const normRoot = rootFolder.name.replace(/\\/g, '/').toLowerCase();
      const normTarget = targetPath.replace(/\\/g, '/').toLowerCase();
      if (normTarget.startsWith(normRoot)) {
        const fromRef = baseFromPath || (rootFolder.name.replace(/\\/g, '/') + '/_workspace_root_.md');
        relativePath = getRelativePath(fromRef, targetPath);
      }
    }

    if (!relativePath.startsWith('.') && !relativePath.startsWith('/') && !relativePath.includes(':')) {
      relativePath = './' + relativePath;
    }

    return `${relativePath}${headingSuffix}`;
  }, [currentFileNode, rootFolder, workspaceType]);

  /**
   * ========================================================================================
   * [함수명] handleDocLinkSelect - 선택한 문서/헤딩 링크를 Monaco 에디터 커서 또는 위지윅 본문에 삽입합니다.
   *
   * @param {FileNode} targetNode - 대상 파일 노드
   * @param {string} [heading] - 선택된 헤딩
   * @param {string} [customTitle] - 사용자 지정 링크 텍스트
   * @returns {void}
   * ==========================================================================================
   */
  const handleDocLinkSelect = useCallback((targetNode: FileNode, heading?: string, customTitle?: string) => {
    const titleToUse = customTitle !== undefined ? customTitle : docLinkCustomTitle;
    const insertVisualLink = visualDocLinkInsertRef.current;
    closeDocLinkPicker();

    if (!targetNode || !targetNode.path) return;

    const targetUrl = buildDocLinkTarget(targetNode, heading);
    const displayTitle = (titleToUse || '').trim() || getDocLinkDefaultLabel(targetNode);
    const textToInsert = `[${displayTitle}](<${targetUrl}>)`;

    if (insertVisualLink) {
      insertVisualLink(targetUrl, displayTitle);
      return;
    }

    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.focus();

    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;

    const range = {
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn
    };
    editor.pushUndoStop();
    editor.executeEdits("insertDocLink", [{ range, text: textToInsert, forceMoveMarkers: true }]);
    editor.pushUndoStop();
  }, [buildDocLinkTarget, closeDocLinkPicker, docLinkCustomTitle, editorRef, getDocLinkDefaultLabel, lastSelectionRef]);

  // 커서 위치 기반 docLinkPicker 절대 좌표 계산
  let docLinkPickerStyle: React.CSSProperties = { top: 0, left: 0 };
  if (showDocLinkPicker && visualDocLinkPositionRef.current) {
    let { top, left } = visualDocLinkPositionRef.current;
    const pickerWidth = 420;
    const pickerHeight = 420;
    if (typeof window !== 'undefined') {
      if (left + pickerWidth > window.innerWidth) {
        left = Math.max(16, window.innerWidth - pickerWidth - 16);
      }
      if (left < 16) left = 16;
      if (top + pickerHeight > window.innerHeight) {
        top = Math.max(16, window.innerHeight - pickerHeight - 16);
      }
    }
    docLinkPickerStyle = { top, left };
  } else if (showDocLinkPicker && editorRef.current) {
    const editor = editorRef.current;
    const position = editor.getPosition();
    if (position) {
      const visiblePos = editor.getScrolledVisiblePosition(position);
      if (visiblePos) {
        const editorDom = editor.getContainerDomNode();
        if (editorDom) {
          const rect = editorDom.getBoundingClientRect();
          let top = visiblePos.top + rect.top + 22;
          let left = visiblePos.left + rect.left;
          const pickerWidth = 420;
          const pickerHeight = 420;
          if (typeof window !== 'undefined') {
            if (left + pickerWidth > window.innerWidth) {
              left = Math.max(16, window.innerWidth - pickerWidth - 16);
            }
            if (left < 16) {
              left = 16;
            }
            if (top + pickerHeight > window.innerHeight) {
              top = Math.max(16, visiblePos.top + rect.top - pickerHeight - 6);
            }
          }
          docLinkPickerStyle = { top, left };
        }
      }
    }
  }
  if (docLinkPickerStyle.top === 0 && docLinkPickerStyle.left === 0) {
    let fixedTop = floatingToolbar.top;
    let fixedLeft = floatingToolbar.left;
    if (editorRef.current) {
      const editorDom = editorRef.current.getContainerDomNode();
      if (editorDom) {
        const rect = editorDom.getBoundingClientRect();
        fixedTop += rect.top;
        fixedLeft += rect.left;
      }
    }
    docLinkPickerStyle = { top: fixedTop + 44, left: fixedLeft };
  }

  return {
    showDocLinkPicker,
    setShowDocLinkPicker,
    docLinkSearchText,
    setDocLinkSearchText,
    allMdFiles,
    setAllMdFiles,
    isDocLinkLoading,
    setIsDocLinkLoading,
    selectedDocNode,
    setSelectedDocNode,
    docHeadings,
    setDocHeadings,
    isHeadingLoading,
    setIsHeadingLoading,
    docHeadingSearchText,
    setDocHeadingSearchText,
    docLinkCustomTitle,
    setDocLinkCustomTitle,
    isDocLinkTitleManuallyEdited,
    setIsDocLinkTitleManuallyEdited,
    visualDocLinkInsertRef,
    visualDocLinkPositionRef,
    closeDocLinkPicker,
    readFileText,
    extractHeadings,
    handleDocFileClick,
    getDocLinkDefaultLabel,
    buildDocLinkTarget,
    handleDocLinkSelect,
    docLinkPickerStyle,
  };
}
