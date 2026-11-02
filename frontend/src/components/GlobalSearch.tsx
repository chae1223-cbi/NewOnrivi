"use client";

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, FileText } from 'lucide-react';
import { FileNode, scanDirectoryDeep } from '@/lib/indexedDbHelper';
import { getVfsFiles, vfsReadFile } from '@/lib/virtualFileSystem';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { msg } from '@/lib/systemMessages';

export interface SearchResult {
  fileName: string;
  path: string;
  count: number;
  snippets: string[];
  lineNumbers: number[];
  fileNameMatch?: boolean;
  handle?: any;
  driveFileId?: string;
  driveId?: string;
}

interface TabContent {
  id: string;
  name: string;
  path: string | null;
  content: string;
  node?: any;
}

interface GlobalSearchProps {
  isDarkMode: boolean;
  content: string;
  currentFileName: string;
  currentFilePath?: string | null;
  onFileOpenAndJump: (
    filePath: string,
    lineNumber: number,
    searchTerm?: string,
    targetMeta?: { handle?: any; driveFileId?: string; driveId?: string; fileName?: string }
  ) => void;
  workspacePath?: string;
  rootFolder?: { name: string; path?: string; handle?: any; type?: string; driveFolderId?: string } | null;
  rootFolderHandle?: any;
  onSelectFolder?: () => void;
  tabs?: TabContent[];
  workspaceType?: string;
  fileList?: FileNode[];
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'out', 'dist', 'build', '.wrangler',
  '_dev_api_backup', '.vscode', '.idea', 'scratch', '.next-web-build'
]);

const isSupportedSearchFile = (name: string): boolean => {
  const lower = (name || '').toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.bib');
};

const isLocalFilesystemPath = (p?: string | null): boolean => {
  if (!p || typeof p !== 'string') return false;
  const trimmed = p.trim();
  if (!trimmed || trimmed === BROWSER_STORAGE_NAME || trimmed.startsWith('GoogleDrive')) return false;
  return /^[a-zA-Z]:[/\\]/.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('\\\\') || trimmed.startsWith('file:///');
};

/**
 * 마크다운/HTML 태그 기호(###, **, ***, <u>, >, \* 등)를 제거하고
 * 문서보기(미리보기) 화면에 실제 표시되는 순수 텍스트로 변환합니다.
 */
const stripMarkdownLineToPlainText = (rawLine: string): string => {
  if (!rawLine) return '';
  let s = rawLine.replace(/^Line\s+\d+:\s*/, '').normalize('NFC').trim();
  if (!s) return '';

  // 순수 구분선(---, ===, ***), 표 정렬선(| :--- | --- |), 코드블록 펜스(```)는 표시 문자열 없음 처리
  if (/^(\*{3,}|-{3,}|_{3,}|={3,})$/.test(s)) return '';
  if (/^\|?[\s:|-]+\|[\s:|-]*$/.test(s) && s.includes('-')) return '';
  if (/^(`{3,}|~{3,})/.test(s)) return '';

  // 이스케이프된 마크다운 기호(\*, \_, \# 등) 복원하여 태그 파싱 연동
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1');

  // 블록 접두사 변환 (헤딩, 인용구/콜아웃, 체크리스트, 목록)
  s = s.replace(/^#{1,6}\s+/, '').replace(/\s+#+\s*$/, '');
  s = s.replace(/^(?:>\s*)+(?:\[!([^\]]+)\]\s*)?/, (_, callout) => (callout ? `[${callout}] ` : ''));
  s = s.replace(/^[-*+]\s+\[([ xX])\]\s+/, (_, chk) => (chk.toLowerCase() === 'x' ? '☑ ' : '☐ '));
  s = s.replace(/^[-*+]\s+/, '• ');

  // 표(Table) 파이프 기호 정돈
  if (s.startsWith('|') || s.endsWith('|')) {
    s = s.replace(/^\|\s*/, '').replace(/\s*\|$/, '').replace(/\s*\|\s*/g, ' ｜ ');
  }

  // 이미지 및 링크를 표시 텍스트로 변환
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) => (alt ? `${alt}` : ''));
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // 각주 참조 [^1] -> [1]
  s = s.replace(/\[\^([^\]]+)\]:?/g, '[$1]');

  // 인라인 마크다운 강조 기호 제거 (중첩 고려하여 2회 반복)
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '$1');
    s = s.replace(/___([\s\S]+?)___/g, '$1');
    s = s.replace(/\*\*([\s\S]+?)\*\*/g, '$1');
    s = s.replace(/__([\s\S]+?)__/g, '$1');
    s = s.replace(/~~([\s\S]+?)~~/g, '$1');
    s = s.replace(/==([\s\S]+?)==/g, '$1');
    s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');
    s = s.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1');
    s = s.replace(/`([^`\n]+)`/g, '$1');
  }

  // HTML 태그 제거 (<br>은 공백, 나머지 태그는 내부 텍스트만 유지)
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // HTML 엔티티 디코딩
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return s.replace(/\s+/g, ' ').trim();
};

// ====================================================================
// 📊 [OMD-FILE-GlobalSearch-0001 ✅ FIXED] GlobalSearch ➔ GlobalSearch
// 🎯 @KICK  : 현재 지정된 작업장 실폴더(Workspace) 내에서 md 파일 및 문서 전체 검색 후 클릭 시 해당 줄로 점프
// 🚨 @PATCH : **2026-10-16** — [전역 검색 스니펫 문서보기(렌더링) 스타일 변환 및 전 환경 검색 무결성 복구]:
//             1) 검색 결과 스니펫에 원문 마크다운/HTML 태그 기호(###, **, ***, <u>, >, \* 등)를 그대로 노출하지 않고, 문서보기(미리보기)처럼 굵게·기울임·밑줄·취소선·인라인코드·헤딩·인용구·목록 등 서식이 적용된 문자로 렌더링(renderDocumentStyleSnippet & stripMarkdownLineToPlainText)
//             2) 작업장 경로 해석 고도화: rootFolder.path / rootFolder.name / onrivi_last_local_workspace_path / onrivi_workspace_path 중 실제 유효 로컬 경로를 정확히 식별하여 '작업장' 상대명이나 'GoogleDrive/...' 잔재로 인한 검색 0건 현상 해결
//             3) 브라우저 FSA 환경 하위 폴더 심층 스캔(scanDirectoryDeep) 및 VFS(getVfsFiles/vfsReadFile) 폴백 탑재로 미확장 하위 폴더 내 모든 마크다운 파일 검색 보장
//             4) 구글 드라이브(GDRIVE / cloud) 작업장 재귀 탐색(fetchDriveFileNodes) 및 본문 캐시 읽기(readDriveFileContent) 연동으로 웹드라이브 작업장 전역 검색 지원
//             5) 데스크톱(Electron) searchInFolder 실패/빈 결과 시 listDirectory + readFromPath 재귀 스캔 폴백 탑재
//             6) 유니코드 NFC 정규화(.normalize('NFC')), CRLF(\r\n) 줄바꿈 처리 및 전체 경로 기반 중복 식별자(seenFileIdentifiers) 적용으로 서로 다른 하위 폴더의 동명 파일이 누락되던 버그 해결
// 🚨 @PATCH : 2026-10-14 — [하이브리드 실시간 검색 엔진(메모리+탭+디스크 통합) 탑재 & 검색 결과 0건 버그 완전 해결]
//             1) 현재 활성 문서(content) 및 열려 있는 모든 탭(tabs)의 미저장 최신 내용을 최우선 실시간 메모리 검색하여 방금 작성한 글도 즉시 검색 결과 상단 노출
//             2) Electron 디스크 검색(searchInFolder) 결과와 메모리 검색 결과를 지능적으로 병합(중복 제거 및 최신 메모리 상태 오버레이)
//             3) workspacePath 부재 시 localStorage의 onrivi_workspace_path 자동 연동 및 fileList/Electron fallback 3중 무결성 방어
// 🚨 @PATCH : 2026-09-16 — [검색 결과 긴 문장 전체 노출 및 고대비 시인성 강화] 1) truncate 해제 및 whitespace-normal break-words 적용으로 긴 문장 자연 줄바꿈 전문 표시, 2) 호버 툴팁(title)에 행 번호 및 전체 문장 전문 노출, 3) 규칙 8 준수 고대비 텍스트(text-slate-900/zinc-100) 및 선명한 앰버 검색어 하이라이트(bg-amber-300/400 font-extrabold) 적용
//             2026-09-16 — [워크스페이스 검색 점프 및 검색어 하이라이트 연동] onFileOpenAndJump 시그니처에 searchTerm 파라미터를 추가 전달하여 파일 열기 및 줄 이동 시 일치하는 검색어 텍스트가 하이라이트되도록 연동
//             2026-09-12 — [작업장 실폴더 한정 검색 보장 & 고대비 UI] searchFolder가 현재 선택된 작업장(workspacePath)과 항상 자동 동기화되도록 수정하고, 작업장 내 검색 안내 뱃지 및 Modern Technical Editorial 디자인 시스템 적용
// 🔗 @CALLS : handleSelectFolder, scanDirectoryDeep, searchFile, flattenMdFiles, renderDocumentStyleSnippet
// ====================================================================
export default function GlobalSearch({
  isDarkMode,
  content,
  currentFileName,
  currentFilePath,
  onFileOpenAndJump,
  workspacePath,
  rootFolder,
  rootFolderHandle,
  onSelectFolder,
  tabs,
  workspaceType,
  fileList
}: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resolveEffectiveLocalFolder = useCallback((): string | null => {
    const candidates: (string | null | undefined)[] = [
      rootFolder?.type !== 'GDRIVE' ? rootFolder?.path : null,
      workspacePath,
      rootFolder?.type !== 'GDRIVE' ? rootFolder?.name : null,
      typeof window !== 'undefined' ? localStorage.getItem('onrivi_last_local_workspace_path') : null,
      typeof window !== 'undefined' ? localStorage.getItem('onrivi_workspace_path') : null,
      (() => {
        if (typeof window === 'undefined') return null;
        try {
          const parsed = JSON.parse(localStorage.getItem('rootFolder') || 'null');
          return parsed?.type !== 'GDRIVE' ? (parsed?.path || parsed?.name || null) : null;
        } catch {
          return null;
        }
      })()
    ];

    for (const c of candidates) {
      if (isLocalFilesystemPath(c)) {
        return c!.trim();
      }
    }
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        const t = c.trim();
        if (t && t !== BROWSER_STORAGE_NAME && !t.startsWith('GoogleDrive')) {
          return t;
        }
      }
    }
    return null;
  }, [rootFolder?.path, rootFolder?.name, rootFolder?.type, workspacePath]);

  const [searchFolder, setSearchFolder] = useState<string | null>(() => resolveEffectiveLocalFolder());
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [matchCase, setMatchCase] = useState(false);

  // 구글 드라이브 파일 목록 및 본문 캐시 (타이핑 시 불필요한 네트워크 재호출 방지)
  const driveNodesCacheRef = useRef<{ folderId: string; timestamp: number; nodes: FileNode[] } | null>(null);
  const driveContentCacheRef = useRef<Map<string, { timestamp: number; text: string }>>(new Map());

  // 작업장(workspacePath / rootFolder)이 변경되면 검색 대상 폴더도 즉시 동기화
  useEffect(() => {
    const resolved = resolveEffectiveLocalFolder();
    setSearchFolder(resolved);
  }, [resolveEffectiveLocalFolder]);

  // 단축키(Ctrl+Shift+F) 또는 상단 검색 탭 클릭 시 입력창 즉시 포커스
  useEffect(() => {
    const handleFocusSearch = () => {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 30);
    };
    window.addEventListener('onrivi:focus-global-search', handleFocusSearch);
    return () => window.removeEventListener('onrivi:focus-global-search', handleFocusSearch);
  }, []);

  // 폴더 선택 창 실행
  // ====================================================================
  // 📊 [OMD-FILE-GlobalSearch-0002] GlobalSearch ➔ handleSelectFolder
  // 🎯 @KICK  : 작업장 폴더 선택 또는 변경 연동
  // 🛡️ @GUARD : electronAPI 존재 여부 확인 후 분기 처리
  // 🚨 @PATCH : 2026-09-12 — 상위 작업장 폴더 선택(onSelectFolder)과 연동하여 작업장 일관성 유지
  // 🔗 @CALLS : onSelectFolder
  // ====================================================================
  const handleSelectFolder = async () => {
    if (onSelectFolder) {
      onSelectRootFolderHandler();
    } else if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const result = await (window as any).electronAPI.selectFolder();
        if (result?.status === 'success' && result.path) {
          setSearchFolder(result.path);
        } else if (result?.status === 'canceled') {
          msg.info("폴더 선택이 취소되었습니다.");
        }
      } catch (e) {
        msg.error("폴더 선택 오류", e);
      }
    }
  };

  const onSelectRootFolderHandler = () => {
    if (onSelectFolder) {
      onSelectFolder();
    }
  };

  // 🛠️ fileList 트리를 평탄화하여 모든 .md / .markdown / .bib 파일 노드 추출
  const flattenMdFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    const walk = (list: FileNode[]) => {
      if (!Array.isArray(list)) return;
      for (const node of list) {
        if (!node) continue;
        if (node.kind === 'file' && isSupportedSearchFile(node.name)) {
          result.push(node);
        }
        if (node.kind === 'directory' && Array.isArray(node.children) && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(nodes);
    return result;
  }, []);

  // 🛠️ 단일 파일/탭 검색 함수 (유니코드 NFC 정규화 및 CRLF 대응)
  const searchFile = useCallback((
    text: string,
    fileName: string,
    filePath: string | null,
    regex: RegExp,
    extraMeta?: { handle?: any; driveFileId?: string; driveId?: string }
  ): SearchResult | null => {
    const normText = (text || '').normalize('NFC');
    const normFileName = (fileName || '').normalize('NFC');
    const lines = normText.split(/\r?\n/);
    const snippets: string[] = [];
    const lineNumbers: number[] = [];
    let fileNameMatched = false;

    regex.lastIndex = 0;
    if (regex.test(normFileName)) {
      fileNameMatched = true;
    } else {
      const nameNoExt = normFileName.replace(/\.(md|markdown|bib)$/i, '');
      regex.lastIndex = 0;
      if (regex.test(nameNoExt)) {
        fileNameMatched = true;
      }
    }

    lines.forEach((line: string, index: number) => {
      const plainLine = stripMarkdownLineToPlainText(line);
      if (!plainLine) return;
      regex.lastIndex = 0;
      if (regex.test(plainLine)) {
        snippets.push(`Line ${index + 1}: ${line.trim()}`);
        lineNumbers.push(index + 1);
      }
    });

    if (snippets.length > 0 || fileNameMatched) {
      return {
        fileName: normFileName,
        path: filePath || normFileName,
        count: snippets.length,
        snippets,
        lineNumbers,
        fileNameMatch: fileNameMatched && snippets.length === 0,
        ...(extraMeta || {})
      };
    }
    return null;
  }, []);

  // ====================================================================
  // 📊 [OMD-FILE-GlobalSearch-0003] GlobalSearch ➔ useEffect (searchLogic)
  // 🎯 @KICK  : 실시간 하이브리드 검색: 활성 문서(content) & 열린 탭(tabs) 메모리 최우선 반영 + 데스크톱/웹FSA/구글드라이브/VFS 전체 검색 병합
  // 🛡️ @GUARD : 150ms 디바운스, 취소 플래그(cancelled), 다중 환경 무결성 보장, 미저장 편집본 실시간 검색 지원
  // 🚨 @PATCH : 2026-10-16 — [전 환경 심층 검색 및 중복 파일명 누락 방지]
  // 🔗 @CALLS : electronAPI.searchInFolder, scanDirectoryDeep, searchFile, flattenMdFiles
  // ====================================================================
  useEffect(() => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const normalizedTerm = trimmedTerm.normalize('NFC');
        const escaped = normalizedTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escaped, matchCase ? 'g' : 'gi');

        const normalizePathKey = (p?: string | null) =>
          (p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase().normalize('NFC');

        // 1. 메모리 상의 활성 문서 및 열린 탭 최우선 검색 (미저장 편집본 실시간 반영)
        const memoryResults: SearchResult[] = [];
        const seenPathKeys = new Set<string>();
        const seenBareNamesForUnpathed = new Set<string>();

        const markFileSeen = (filePath?: string | null, fileName?: string | null, driveId?: string | null) => {
          if (driveId) {
            seenPathKeys.add(`gdrive:${driveId}`);
          }
          if (filePath && filePath !== 'current') {
            const normP = normalizePathKey(filePath);
            if (normP) {
              seenPathKeys.add(normP);
              // 상대 경로와 절대 경로 양방향 매칭을 위해 루트 폴더 기준 상대 경로도 등록
              const baseRoot = normalizePathKey(searchFolder || workspacePath || rootFolder?.path || rootFolder?.name);
              if (baseRoot && normP.startsWith(baseRoot + '/')) {
                seenPathKeys.add(normP.slice(baseRoot.length + 1));
              }
            }
          } else if (fileName) {
            seenBareNamesForUnpathed.add(fileName.toLowerCase().normalize('NFC'));
          }
        };

        const isFileAlreadySeen = (filePath?: string | null, fileName?: string | null, driveId?: string | null): boolean => {
          if (driveId && seenPathKeys.has(`gdrive:${driveId}`)) return true;
          if (filePath && filePath !== 'current') {
            const normP = normalizePathKey(filePath);
            if (normP && seenPathKeys.has(normP)) return true;
            const baseRoot = normalizePathKey(searchFolder || workspacePath || rootFolder?.path || rootFolder?.name);
            if (baseRoot && normP.startsWith(baseRoot + '/')) {
              const rel = normP.slice(baseRoot.length + 1);
              if (seenPathKeys.has(rel)) return true;
            }
          }
          if (fileName) {
            const normName = fileName.toLowerCase().normalize('NFC');
            // 경로가 없는 미저장 새 문서가 현재 열려있고 이름이 정확히 같을 때만 중복 처리
            if (!filePath || filePath === fileName) {
              if (seenBareNamesForUnpathed.has(normName)) return true;
            } else if (seenBareNamesForUnpathed.has(normName) && (!currentFilePath && currentFileName.toLowerCase().normalize('NFC') === normName)) {
              return true;
            }
          }
          return false;
        };

        // 1-A. 현재 열려 있는 활성 문서 (content)
        if (content && currentFileName) {
          const activePath = currentFilePath || 'current';
          markFileSeen(currentFilePath, currentFileName);
          const currentResult = searchFile(content, currentFileName, activePath, regex);
          if (currentResult) {
            memoryResults.push(currentResult);
          }
        }

        // 1-B. 열려 있는 다른 탭들 (tabs)
        if (tabs && tabs.length > 0) {
          for (const tab of tabs) {
            if (!tab || typeof tab.content !== 'string') continue;
            const tabDriveId = tab.node?.driveFileId || tab.node?.driveId;
            if (isFileAlreadySeen(tab.path, tab.name, tabDriveId)) continue;
            // 현재 활성 문서와 동일한 탭이면 스킵 (1-A에서 최신 content로 이미 검사됨)
            if (
              (currentFilePath && tab.path && normalizePathKey(tab.path) === normalizePathKey(currentFilePath)) ||
              (!currentFilePath && tab.name.toLowerCase().normalize('NFC') === currentFileName.toLowerCase().normalize('NFC'))
            ) {
              markFileSeen(tab.path, tab.name, tabDriveId);
              continue;
            }

            markFileSeen(tab.path, tab.name, tabDriveId);
            const tabResult = searchFile(tab.content, tab.name, tab.path || tab.name, regex, {
              handle: tab.node?.handle,
              driveFileId: tabDriveId,
              driveId: tabDriveId
            });
            if (tabResult) {
              memoryResults.push(tabResult);
            }
          }
        }

        let workspaceResults: SearchResult[] = [];
        const isGDriveWorkspace = rootFolder?.type === 'GDRIVE' || workspaceType === 'cloud';
        const effectiveHandle = rootFolderHandle || rootFolder?.handle;
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

        // 2. 구글 드라이브(Cloud) 작업장 검색
        if (isGDriveWorkspace) {
          try {
            const { getSavedDriveToken, getSavedWorkspaceInfo, fetchDriveFileNodes, readDriveFileContent } = await import('@/lib/gdrive/googleDriveClient');
            const token = getSavedDriveToken();
            const wsInfo = getSavedWorkspaceInfo();
            const rootDriveId = rootFolder?.driveFolderId || (rootFolder as any)?.driveId || wsInfo?.workspaceFolderId;

            if (token && rootDriveId) {
              let driveMdFiles: FileNode[] = [];
              const now = Date.now();
              if (driveNodesCacheRef.current && driveNodesCacheRef.current.folderId === rootDriveId && (now - driveNodesCacheRef.current.timestamp < 30000)) {
                driveMdFiles = driveNodesCacheRef.current.nodes;
              } else {
                const collected: FileNode[] = [];
                const visitedFolderIds = new Set<string>();
                const collectDriveNodes = async (folderId: string, parentPath: string, depth: number) => {
                  if (depth > 8 || visitedFolderIds.has(folderId) || cancelled) return;
                  visitedFolderIds.add(folderId);
                  try {
                    const children = await fetchDriveFileNodes(token, folderId, parentPath);
                    for (const child of children) {
                      if (child.kind === 'file' && isSupportedSearchFile(child.name)) {
                        collected.push(child);
                      } else if (child.kind === 'directory') {
                        const childDriveId = (child as any).driveId || (child as any).driveFileId || (child as any).id;
                        if (childDriveId && !IGNORED_DIRS.has(child.name.toLowerCase())) {
                          await collectDriveNodes(childDriveId, child.path || `${parentPath}/${child.name}`, depth + 1);
                        }
                      }
                    }
                  } catch {}
                };
                await collectDriveNodes(rootDriveId, rootFolder?.path || rootFolder?.name || 'GoogleDrive', 0);
                if (!cancelled && collected.length > 0) {
                  driveNodesCacheRef.current = { folderId: rootDriveId, timestamp: Date.now(), nodes: collected };
                }
                driveMdFiles = collected;
              }

              // fileList에 이미 로드된 노드들도 누락 없이 병합
              if (fileList && fileList.length > 0) {
                const flatFromList = flattenMdFiles(fileList);
                const existingIds = new Set(driveMdFiles.map(f => (f as any).driveFileId || (f as any).driveId || f.path));
                for (const f of flatFromList) {
                  const fId = (f as any).driveFileId || (f as any).driveId || f.path;
                  if (fId && !existingIds.has(fId)) {
                    driveMdFiles.push(f);
                    existingIds.add(fId);
                  }
                }
              }

              for (const file of driveMdFiles) {
                if (cancelled) break;
                const dId = (file as any).driveFileId || (file as any).driveId || (file as any).id;
                if (isFileAlreadySeen(file.path, file.name, dId)) continue;

                let text = '';
                if (dId) {
                  const cached = driveContentCacheRef.current.get(dId);
                  if (cached && (Date.now() - cached.timestamp < 60000)) {
                    text = cached.text;
                  } else {
                    try {
                      text = await readDriveFileContent(token, dId);
                      driveContentCacheRef.current.set(dId, { timestamp: Date.now(), text });
                    } catch {}
                  }
                }
                if (text) {
                  const r = searchFile(text, file.name, file.path || file.name, regex, {
                    driveFileId: dId,
                    driveId: dId
                  });
                  if (r) {
                    workspaceResults.push(r);
                    markFileSeen(file.path, file.name, dId);
                  }
                }
              }
            }
          } catch (gdriveErr) {
            console.warn('[GlobalSearch] Google Drive search error:', gdriveErr);
          }
        }

        // 3. 데스크톱(Electron) 로컬 워크스페이스 검색
        if (!isGDriveWorkspace && api && !effectiveHandle) {
          const effectiveFolder = resolveEffectiveLocalFolder() || searchFolder || '';
          if (api.searchInFolder) {
            try {
              const data = await api.searchInFolder({
                folderPath: effectiveFolder,
                searchTerm: normalizedTerm,
                matchCase,
                useRegex: false
              });
              if (Array.isArray(data) && data.length > 0) {
                workspaceResults = data
                  .map((wsItem: SearchResult) => {
                    if (wsItem.fileNameMatch || !Array.isArray(wsItem.snippets)) return wsItem;
                    const filteredSnippets: string[] = [];
                    const filteredLines: number[] = [];
                    wsItem.snippets.forEach((snip, idx) => {
                      const plain = stripMarkdownLineToPlainText(snip);
                      if (!plain) return;
                      regex.lastIndex = 0;
                      if (regex.test(plain)) {
                        filteredSnippets.push(snip);
                        filteredLines.push(wsItem.lineNumbers?.[idx] ?? 1);
                      }
                    });
                    if (filteredSnippets.length === 0) return null;
                    return {
                      ...wsItem,
                      count: filteredSnippets.length,
                      snippets: filteredSnippets,
                      lineNumbers: filteredLines
                    };
                  })
                  .filter(Boolean) as SearchResult[];
              }
            } catch (electronErr) {
              console.warn('[GlobalSearch] searchInFolder error:', electronErr);
            }
          }

          // 폴백: searchInFolder 결과가 비어있을 때 listDirectory + readFromPath로 직접 재귀 탐색
          if (workspaceResults.length === 0 && api.listDirectory && api.readFromPath && effectiveFolder) {
            try {
              const visitedDirs = new Set<string>();
              const collectedNodes: FileNode[] = [];
              const scanLocalDir = async (dirPath: string, depth: number) => {
                if (depth > 10 || cancelled) return;
                const normDir = normalizePathKey(dirPath);
                if (!normDir || visitedDirs.has(normDir)) return;
                visitedDirs.add(normDir);
                try {
                  const entries: FileNode[] = await api.listDirectory(dirPath);
                  if (!Array.isArray(entries)) return;
                  for (const entry of entries) {
                    if (entry.kind === 'file' && isSupportedSearchFile(entry.name)) {
                      collectedNodes.push(entry);
                    } else if (entry.kind === 'directory' && entry.path) {
                      const lowerName = (entry.name || '').toLowerCase();
                      if (!lowerName.startsWith('.') && !IGNORED_DIRS.has(lowerName)) {
                        await scanLocalDir(entry.path, depth + 1);
                      }
                    }
                  }
                } catch {}
              };
              await scanLocalDir(effectiveFolder, 0);

              for (const node of collectedNodes) {
                if (cancelled) break;
                if (isFileAlreadySeen(node.path, node.name)) continue;
                try {
                  const res = await api.readFromPath(node.path);
                  const text = typeof res === 'string' ? res : (res?.content || '');
                  if (text) {
                    const r = searchFile(text, node.name, node.path || node.name, regex);
                    if (r) {
                      workspaceResults.push(r);
                      markFileSeen(node.path, node.name);
                    }
                  }
                } catch {}
              }
            } catch {}
          }
        }

        // 4. 브라우저 FSA (FileSystemDirectoryHandle 심층 스캔) 및 VFS / fileList 검색
        if (!isGDriveWorkspace && (effectiveHandle || workspaceType === 'browser' || workspaceResults.length === 0)) {
          const candidateFilesMap = new Map<string, FileNode>();
          const addCandidate = (node: FileNode) => {
            if (!node || !node.name || !isSupportedSearchFile(node.name)) return;
            const key = normalizePathKey(node.path || node.name);
            if (!candidateFilesMap.has(key)) {
              candidateFilesMap.set(key, node);
            } else if (node.handle && !candidateFilesMap.get(key)?.handle) {
              candidateFilesMap.set(key, node);
            }
          };

          // 4-A. FileSystemDirectoryHandle이 있으면 하위 폴더 전체를 심층 재귀 탐색 (scanDirectoryDeep)
          if (effectiveHandle) {
            try {
              const deepFiles = await scanDirectoryDeep(effectiveHandle, "", new Set(), false);
              for (const df of deepFiles) {
                addCandidate(df);
              }
            } catch (deepErr) {
              console.warn('[GlobalSearch] scanDirectoryDeep error:', deepErr);
            }
          }

          // 4-B. fileList 트리 병합
          if (fileList && fileList.length > 0) {
            for (const f of flattenMdFiles(fileList)) {
              addCandidate(f);
            }
          }

          // 4-C. 가상 파일 시스템(VFS) 트리 병합 (웹 브라우저 환경)
          if (!api || workspaceType === 'browser') {
            try {
              const vfsTree = getVfsFiles();
              for (const vf of flattenMdFiles(vfsTree)) {
                addCandidate(vf);
              }
            } catch {}
          }

          const candidateList = Array.from(candidateFilesMap.values());
          for (const file of candidateList) {
            if (cancelled) break;
            if (isFileAlreadySeen(file.path, file.name)) continue;

            try {
              let text = '';
              if (file.handle && typeof file.handle.getFile === 'function') {
                const fileObj = await file.handle.getFile();
                text = await fileObj.text();
              } else if (effectiveHandle && file.path) {
                // 핸들이 누락된 하위 폴더 노드의 경우 rootFolderHandle에서 경로 추적
                try {
                  const parts = String(file.path).replace(/\\/g, '/').split('/').filter((p: string) => p && p !== '.');
                  if (parts.length > 0 && (parts[0] === effectiveHandle.name || parts[0] === rootFolder?.name)) {
                    parts.shift();
                  }
                  let currDir = effectiveHandle;
                  for (let i = 0; i < parts.length - 1; i++) {
                    currDir = await currDir.getDirectoryHandle(parts[i], { create: false });
                  }
                  if (parts.length > 0) {
                    const fh = await currDir.getFileHandle(parts[parts.length - 1], { create: false });
                    text = await (await fh.getFile()).text();
                    file.handle = fh;
                  }
                } catch {}
              }

              if (!text && api?.readFromPath && file.path) {
                try {
                  const res = await api.readFromPath(file.path);
                  text = typeof res === 'string' ? res : (res?.content || '');
                } catch {}
              }

              if (!text && (file.path || file.name)) {
                text = vfsReadFile(file.path || file.name) || '';
              }

              if (text || isSupportedSearchFile(file.name)) {
                const r = searchFile(text, file.name, file.path || file.name, regex, {
                  handle: file.handle
                });
                if (r) {
                  workspaceResults.push(r);
                  markFileSeen(file.path, file.name);
                }
              }
            } catch {
              // 개별 파일 오류 무시
            }
          }
        }

        if (cancelled) return;

        // 5. 최종 결과 병합: 메모리(현재 문서 + 열린 탭) 최우선 + 작업장 파일
        const mergedResults: SearchResult[] = [...memoryResults];
        for (const wsRes of workspaceResults) {
          if (isFileAlreadySeen(wsRes.path, wsRes.fileName, wsRes.driveFileId || wsRes.driveId)) {
            // 단, workspaceResults 수집 과정에서 markFileSeen된 항목이 memoryResults에 있는지 확인
            const isInMemory = memoryResults.some(m => {
              if (m.path === 'current') {
                return currentFilePath
                  ? normalizePathKey(currentFilePath) === normalizePathKey(wsRes.path)
                  : m.fileName.toLowerCase().normalize('NFC') === wsRes.fileName.toLowerCase().normalize('NFC');
              }
              return normalizePathKey(m.path) === normalizePathKey(wsRes.path);
            });
            if (isInMemory) continue;
          }
          // 중복 방지
          const alreadyMerged = mergedResults.some(
            existing => normalizePathKey(existing.path) === normalizePathKey(wsRes.path) && existing.path !== 'current'
          );
          if (!alreadyMerged) {
            mergedResults.push(wsRes);
          }
        }

        setResults(mergedResults);
      } catch (e) {
        if (!cancelled) {
          msg.error("검색 처리 오류", e);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    searchTerm,
    content,
    matchCase,
    currentFileName,
    currentFilePath,
    searchFolder,
    workspacePath,
    rootFolder,
    rootFolderHandle,
    workspaceType,
    fileList,
    tabs,
    flattenMdFiles,
    resolveEffectiveLocalFolder,
    searchFile
  ]);

  // 총 매칭된 개수 계산
  const totalMatchCount = results.reduce((acc, r) => acc + (r.count || 0), 0);

  // 상단 뱃지에 표시할 현재 작업장 이름
  const workspaceBadgeLabel = (() => {
    if (rootFolder?.type === 'GDRIVE' || workspaceType === 'cloud') {
      const cleanName = (rootFolder?.name || workspacePath || '웹드라이브 작업장').split(/[\\/]/).filter(Boolean).pop() || '웹드라이브';
      return `☁️ ${cleanName}`;
    }
    if (rootFolderHandle?.name || rootFolder?.handle?.name) {
      return `📁 ${rootFolderHandle?.name || rootFolder?.handle?.name}`;
    }
    const targetPath = searchFolder || workspacePath || rootFolder?.path || rootFolder?.name;
    if (targetPath && targetPath !== BROWSER_STORAGE_NAME) {
      const base = targetPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || targetPath;
      return `📁 ${base}`;
    }
    return '📁 작업장 전체';
  })();

  const normalizedTermForHighlight = searchTerm.trim().normalize('NFC');
  const escapedHighlightRegex = normalizedTermForHighlight
    ? new RegExp(`(${normalizedTermForHighlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, matchCase ? 'g' : 'gi')
    : null;

  // 순수 텍스트 조각에 검색어 하이라이트(<mark>) 적용 및 잔여 HTML 태그/엔티티 정제
  const renderHighlightedPlainText = (rawText: string, keyPrefix: string): React.ReactNode => {
    if (!rawText) return null;
    const cleaned = rawText
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
    if (!cleaned) return null;

    if (!escapedHighlightRegex || !normalizedTermForHighlight) {
      return <React.Fragment key={keyPrefix}>{cleaned}</React.Fragment>;
    }

    return cleaned.split(escapedHighlightRegex).map((part, pi) => {
      const isMatch = matchCase
        ? part === normalizedTermForHighlight
        : part.toLowerCase() === normalizedTermForHighlight.toLowerCase();
      return (
        <React.Fragment key={`${keyPrefix}-${pi}`}>
          {isMatch ? (
            <mark className="bg-amber-300 dark:bg-amber-400 text-amber-950 dark:text-black font-extrabold px-1 py-0.5 rounded shadow-xs">
              {part}
            </mark>
          ) : (
            part
          )}
        </React.Fragment>
      );
    });
  };

  // 인라인 마크다운 및 HTML 서식 태그(***, **, *, <u>, ~~, ==, `, 링크, 이미지, 각주)를 재귀 파싱하여 문서보기 스타일로 렌더링
  const renderInlineMarkdownNodes = (input: string, keyPrefix: string, depth = 0): React.ReactNode => {
    if (!input) return null;
    if (depth > 6) return renderHighlightedPlainText(input, keyPrefix);

    const patterns: Array<{
      type: string;
      regex: RegExp;
    }> = [
      { type: 'boldItalic', regex: /\*\*\*([\s\S]+?)\*\*\*|___([\s\S]+?)___/ },
      { type: 'bold', regex: /\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|<(?:strong|b)(?:\s[^>]*)?>([\s\S]+?)<\/(?:strong|b)>/i },
      { type: 'underline', regex: /<(?:u|ins)(?:\s[^>]*)?>([\s\S]+?)<\/(?:u|ins)>/i },
      { type: 'strike', regex: /~~([\s\S]+?)~~|<(?:del|s|strike)(?:\s[^>]*)?>([\s\S]+?)<\/(?:del|s|strike)>/i },
      { type: 'mark', regex: /==([\s\S]+?)==|<mark(?:\s[^>]*)?>([\s\S]+?)<\/mark>/i },
      { type: 'code', regex: /`([^`\n]+)`|<code(?:\s[^>]*)?>([\s\S]+?)<\/code>/i },
      { type: 'image', regex: /!\[([^\]]*)\]\([^)]*\)/ },
      { type: 'link', regex: /\[([^\]]+)\]\([^)]*\)/ },
      { type: 'footnote', regex: /\[\^([^\]]+)\]:?/ },
      { type: 'sup', regex: /<sup(?:\s[^>]*)?>([\s\S]+?)<\/sup>/i },
      { type: 'sub', regex: /<sub(?:\s[^>]*)?>([\s\S]+?)<\/sub>/i },
      { type: 'italic', regex: /(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)|<(?:em|i)(?:\s[^>]*)?>([\s\S]+?)<\/(?:em|i)>/i }
    ];

    const nodes: React.ReactNode[] = [];
    let remaining = input;
    let step = 0;

    while (remaining.length > 0 && step < 100) {
      step++;
      let earliestMatch: {
        type: string;
        index: number;
        fullMatch: string;
        innerText: string;
      } | null = null;

      for (const p of patterns) {
        const m = p.regex.exec(remaining);
        if (m && (earliestMatch === null || m.index < earliestMatch.index)) {
          const inner = m[1] ?? m[2] ?? m[3] ?? '';
          earliestMatch = {
            type: p.type,
            index: m.index,
            fullMatch: m[0],
            innerText: inner
          };
        }
      }

      if (!earliestMatch) {
        nodes.push(renderHighlightedPlainText(remaining, `${keyPrefix}-tail-${step}`));
        break;
      }

      if (earliestMatch.index > 0) {
        const before = remaining.slice(0, earliestMatch.index);
        nodes.push(renderHighlightedPlainText(before, `${keyPrefix}-pre-${step}`));
      }

      const innerKey = `${keyPrefix}-${earliestMatch.type}-${step}`;
      const innerContent = earliestMatch.innerText;

      switch (earliestMatch.type) {
        case 'boldItalic':
          nodes.push(
            <strong key={innerKey} className="font-extrabold italic text-slate-950 dark:text-white">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </strong>
          );
          break;
        case 'bold':
          nodes.push(
            <strong key={innerKey} className="font-extrabold text-slate-950 dark:text-white">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </strong>
          );
          break;
        case 'underline':
          nodes.push(
            <u key={innerKey} className="underline decoration-current underline-offset-2">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </u>
          );
          break;
        case 'strike':
          nodes.push(
            <del key={innerKey} className="line-through opacity-75">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </del>
          );
          break;
        case 'mark':
          nodes.push(
            <span key={innerKey} className="bg-yellow-200/70 dark:bg-yellow-500/30 px-1 rounded">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </span>
          );
          break;
        case 'code':
          nodes.push(
            <code
              key={innerKey}
              className="px-1 py-0.5 mx-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-zinc-100 font-mono text-[11px]"
            >
              {renderHighlightedPlainText(innerContent, innerKey)}
            </code>
          );
          break;
        case 'image':
          if (innerContent) {
            nodes.push(
              <span key={innerKey} className="inline-flex items-center gap-0.5 font-semibold text-slate-700 dark:text-zinc-300">
                {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
              </span>
            );
          }
          break;
        case 'link':
          nodes.push(
            <span key={innerKey} className="text-[#1d4ed8] dark:text-blue-400 underline underline-offset-2 font-semibold">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </span>
          );
          break;
        case 'footnote':
          nodes.push(
            <sup key={innerKey} className="text-[10px] font-bold text-[#1d4ed8] dark:text-blue-400 ml-0.5">
              [{renderHighlightedPlainText(innerContent, innerKey)}]
            </sup>
          );
          break;
        case 'sup':
          nodes.push(
            <sup key={innerKey} className="text-[10px]">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </sup>
          );
          break;
        case 'sub':
          nodes.push(
            <sub key={innerKey} className="text-[10px]">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </sub>
          );
          break;
        case 'italic':
          nodes.push(
            <em key={innerKey} className="italic">
              {renderInlineMarkdownNodes(innerContent, innerKey, depth + 1)}
            </em>
          );
          break;
        default:
          nodes.push(renderHighlightedPlainText(innerContent, innerKey));
      }

      remaining = remaining.slice(earliestMatch.index + earliestMatch.fullMatch.length);
    }

    return nodes;
  };

  // 한 줄의 마크다운 스니펫을 문서보기(미리보기)와 동일한 블록+인라인 서식 적용 형태로 렌더링
  const renderDocumentStyleSnippet = (rawSnippet: string, keyPrefix: string): React.ReactNode => {
    let s = (rawSnippet || '').replace(/^Line\s+\d+:\s*/, '').normalize('NFC').trim();
    if (!s) return null;

    // 이스케이프된 마크다운 기호(\*, \_, \# 등) 복원하여 서식 태그로 자연스럽게 적용
    s = s.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1');

    // 1. 헤딩 (### 제목 -> 마크다운 # 기호 제거 및 굵은 제목 스타일 적용)
    const headingMatch = s.match(/^(#{1,6})\s+([\s\S]+)$/);
    if (headingMatch) {
      const headingBody = headingMatch[2].replace(/\s+#+\s*$/, '');
      return (
        <span className="font-extrabold text-slate-950 dark:text-white">
          {renderInlineMarkdownNodes(headingBody, `${keyPrefix}-h`)}
        </span>
      );
    }

    // 2. 인용구 및 콜아웃 (> 인용문, > [!팁] 등 -> > 기호 제거 및 인용구 바 스타일 적용)
    const quoteMatch = s.match(/^(?:>\s*)+(?:\[!([^\]]+)\]\s*)?([\s\S]*)$/);
    if (quoteMatch) {
      const calloutLabel = quoteMatch[1];
      const quoteBody = quoteMatch[2] || '';
      return (
        <span className="inline-block border-l-2 border-[#1d4ed8]/60 dark:border-blue-400/60 pl-2 text-slate-800 dark:text-zinc-200">
          {calloutLabel && (
            <span className="mr-1.5 px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-[#1d4ed8] dark:text-blue-300 font-extrabold text-[11px]">
              {calloutLabel}
            </span>
          )}
          {renderInlineMarkdownNodes(quoteBody, `${keyPrefix}-q`)}
        </span>
      );
    }

    // 3. 체크리스트 (- [ ] 할일, - [x] 완료)
    const taskMatch = s.match(/^[-*+]\s+\[([ xX])\]\s+([\s\S]+)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const taskBody = taskMatch[2];
      return (
        <span>
          <span className="mr-1.5 text-[#1d4ed8] dark:text-blue-400 font-bold">
            {isChecked ? '☑' : '☐'}
          </span>
          {renderInlineMarkdownNodes(taskBody, `${keyPrefix}-task`)}
        </span>
      );
    }

    // 4. 일반 글머리 기호 목록 (- 항목, * 항목, + 항목)
    const listMatch = s.match(/^[-*+]\s+([\s\S]+)$/);
    if (listMatch) {
      return (
        <span>
          <span className="mr-1.5 font-bold text-slate-500 dark:text-zinc-400">•</span>
          {renderInlineMarkdownNodes(listMatch[1], `${keyPrefix}-li`)}
        </span>
      );
    }

    // 5. 표(Table) 행 (| 열1 | 열2 |)
    if (s.startsWith('|') || s.endsWith('|')) {
      const tableBody = s.replace(/^\|\s*/, '').replace(/\s*\|$/, '').replace(/\s*\|\s*/g, ' ｜ ');
      return <span>{renderInlineMarkdownNodes(tableBody, `${keyPrefix}-tbl`)}</span>;
    }

    // 6. 일반 문단
    return <span>{renderInlineMarkdownNodes(s, `${keyPrefix}-p`)}</span>;
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 select-none text-[13px]">
      {/* 1. 검색 설정 패널 (Modern Technical Editorial) */}
      <div className="p-3 border-b border-[#E2E8F0] dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xs">
        {/* 검색 대상 작업장 실폴더 표시 뱃지 */}
        <div className="flex items-center justify-between gap-1.5 mb-2 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-extrabold text-[#1d4ed8] dark:text-blue-400 shrink-0">작업장</span>
            <span className="text-slate-400 dark:text-zinc-500 shrink-0">|</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate" title={searchFolder || workspacePath || rootFolder?.path || rootFolder?.name || '현재 워크스페이스'}>
              {workspaceBadgeLabel}
            </span>
          </div>
          {onSelectFolder && (
            <button
              onClick={handleSelectFolder}
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-zinc-300 hover:text-[#1d4ed8] dark:hover:text-blue-400 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors shrink-0"
              title="작업장 변경"
            >
              변경
            </button>
          )}
        </div>

        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={
              searchFolder || workspacePath || rootFolder?.handle || rootFolder?.type === 'GDRIVE'
                ? "현재 작업장 내 모든 md 파일 검색..."
                : fileList && fileList.length > 0
                ? "작업장 전체 검색..."
                : tabs && tabs.length > 0
                ? "열린 탭 전체 검색..."
                : "현재 문서 내용 검색..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className={`w-full pl-9 pr-8 py-2 text-[12px] font-medium rounded-lg border outline-none transition-all ${
              isDarkMode
                ? 'bg-[#0f172a]/90 border-slate-800 text-zinc-100 placeholder:text-zinc-500 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/30'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 shadow-2xs'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="검색어 지우기"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* 대소문자 구분 토글 (고대비 및 정렬) */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-600 dark:text-zinc-400 font-medium">
            {isLoading ? "검색 중..." : searchTerm ? "실시간 검색" : "검색어 입력"}
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold transition-colors">
            <input 
              type="checkbox" 
              checked={matchCase} 
              onChange={() => setMatchCase(!matchCase)} 
              className="rounded w-3.5 h-3.5 accent-[#1d4ed8] cursor-pointer" 
            />
            <span>대소문자 구분</span>
          </label>
        </div>
      </div>

      {/* 2. 검색 결과 현황 헤더 바 (규칙 8: 고대비 및 뱃지 스타일) */}
      <div className="px-3 py-2 border-b border-[#E2E8F0]/70 dark:border-slate-800/60 bg-slate-100/70 dark:bg-slate-900/60 flex items-center justify-between text-[12px] font-bold text-slate-800 dark:text-zinc-200">
        <div className="flex items-center gap-1.5">
          <span>매칭된 파일:</span>
          <span className="px-1.5 py-0.2 rounded-md bg-[#1d4ed8]/10 text-[#1d4ed8] dark:bg-[#1d4ed8]/25 dark:text-blue-400 font-extrabold text-[11px]">
            {results.length}개
          </span>
        </div>
        {results.length > 0 && totalMatchCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-zinc-300 font-semibold">
            <span>총</span>
            <span className="text-[#1d4ed8] dark:text-blue-400 font-bold">{totalMatchCount}건</span>
            <span>일치</span>
          </div>
        )}
      </div>

      {/* 3. 검색 결과 리스트 */}
      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] explorer-scrollbar p-2 space-y-2.5">
        {results.map((result, idx) => {
          const isCurrentActiveDoc =
            result.path === 'current' ||
            (currentFilePath && result.path.replace(/\\/g, '/').toLowerCase() === currentFilePath.replace(/\\/g, '/').toLowerCase()) ||
            (!currentFilePath && result.fileName === currentFileName);

          return (
            <div 
              key={`${result.path}-${idx}`} 
              className="rounded-lg border border-[#E2E8F0] dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 overflow-hidden shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* 파일 헤더 영역 */}
              <div className="px-2.5 py-1.5 flex items-center justify-between bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                  <FileText size={14} className="text-[#1d4ed8] dark:text-blue-400 shrink-0" />
                  <span className="text-[12px] font-bold text-slate-900 dark:text-zinc-100 truncate" title={result.path}>
                    {result.fileName}
                  </span>
                  {isCurrentActiveDoc && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-[#1d4ed8] dark:text-blue-300 font-extrabold shrink-0 border border-blue-200 dark:border-blue-800/60">
                      현재 문서
                    </span>
                  )}
                </div>
                {!result.fileNameMatch && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1d4ed8]/10 text-[#1d4ed8] dark:bg-[#1d4ed8]/20 dark:text-blue-300 font-extrabold shrink-0">
                    {result.count}건
                  </span>
                )}
                {result.fileNameMatch && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                    파일명 일치
                  </span>
                )}
              </div>
              
              {/* 스니펫 줄 목록 */}
              <div className="p-1.5 space-y-1">
                {result.fileNameMatch ? (
                  <div 
                    onClick={() => onFileOpenAndJump(result.path, 1, normalizedTermForHighlight, {
                      handle: result.handle,
                      driveFileId: result.driveFileId,
                      driveId: result.driveId,
                      fileName: result.fileName
                    })}
                    className="px-2 py-1.5 text-[11px] text-[#1d4ed8] dark:text-blue-400 font-semibold flex items-center gap-1.5 cursor-pointer rounded-md hover:bg-[#1d4ed8]/10 dark:hover:bg-[#1d4ed8]/20 transition-colors"
                  >
                    <span>📄</span> 파일명 일치 (클릭하여 파일 열기)
                  </div>
                ) : (
                  result.snippets.map((snippet, i) => {
                    const lineNum = result.lineNumbers[i];
                    // "Line 1283: " 접두사 분리하여 라인 번호 뱃지와 텍스트 분리
                    const cleanSnippet = snippet.replace(/^Line\s+\d+:\s*/, '').normalize('NFC');
                    const plainTitleText = stripMarkdownLineToPlainText(cleanSnippet) || cleanSnippet;
                    const lineDisplay = lineNum || snippet.match(/^Line\s+(\d+):/)?.[1];

                    return (
                      <div 
                        key={i} 
                        onClick={() => lineNum && onFileOpenAndJump(result.path, lineNum, normalizedTermForHighlight, {
                          handle: result.handle,
                          driveFileId: result.driveFileId,
                          driveId: result.driveId,
                          fileName: result.fileName
                        })}
                        onDoubleClick={() => lineNum && onFileOpenAndJump(result.path, lineNum, normalizedTermForHighlight, {
                          handle: result.handle,
                          driveFileId: result.driveFileId,
                          driveId: result.driveId,
                          fileName: result.fileName
                        })}
                        className="group flex items-start gap-2 px-2.5 py-2 rounded-lg text-slate-900 dark:text-zinc-100 hover:bg-[#1d4ed8]/10 dark:hover:bg-[#1d4ed8]/20 transition-all cursor-pointer leading-relaxed border border-transparent hover:border-[#1d4ed8]/30"
                        title={`[Line ${lineDisplay || '?'}] ${plainTitleText}\n(클릭 시 해당 위치로 이동)`}
                      >
                        {lineDisplay && (
                          <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                            L.{lineDisplay}
                          </span>
                        )}
                        <div className="flex-1 min-w-0 font-sans text-[12px] font-medium break-words whitespace-normal leading-relaxed select-text">
                          {renderDocumentStyleSnippet(cleanSnippet, `snip-${idx}-${i}`)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {searchTerm && results.length === 0 && !isLoading && (
          <div className="text-[12px] text-slate-600 dark:text-zinc-300 font-medium text-center py-12 flex flex-col items-center gap-2">
            <Search size={22} className="text-slate-400 dark:text-zinc-500" />
            <span>검색 결과가 없습니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}

