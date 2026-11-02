"use client";

// ====================================================================
// 📊 [OMD-FILE-FileTreeItem-0001] FileTreeItem ➔ FileTreeItem
// 🎯 @KICK  : 파일 탐색기 트리 항목 컴포넌트 (파일/폴더 렌더링, 컨텍스트 메뉴, 지식 등록/해제)
// 🚨 @PATCH : **2026-10-27** — [파일/폴더 생성 및 이름 변경 프롬프트 모달 타이틀 문장 부호 표준화]: 타이틀 끝의 콜론(:)을 마침표(.)로 변경하여 일관된 문장 부호 스타일 적용
// 🚨 @PATCH : **2026-10-04** — [다른 폴더의 동일 파일명 삭제 시 현재 열린 탭 오종료 결함 해결]: handleDelete 내 단순 파일명 일치(currentFileName === node.name) 시 openFile(null) 강제 호출 로직을 제거하고, file:close-tab-by-path에 isDir 플래그를 추가하여 정확한 경로 기반으로만 탭 닫기 수행
// 🚨 @PATCH : **2026-10-04** — [구글 드라이브 드래그앤드롭 이동(handleDrop) GDRIVE 분기 추가]: 드래그로 폴더 간 이동 시 GDRIVE 환경에서 moveDriveItem 호출로 Drive API 기반 실제 이동 수행
// 🚨 @PATCH : **2026-10-03** — [파일/폴더 삭제 시 열린 탭 즉시 닫기 driveId/name 전면 연동]: handleDelete 시 file:close-tab-by-path에 driveId/name/path 일괄 전달하여 삭제된 파일 탭 미종료 결함 해결
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브(GDRIVE) 파일/폴더 삭제, 생성, 이름 변경 지원 및 /api/delete 404 차단]: 구글 드라이브 항목 삭제 시 trashDriveItem 연동, 생성 시 createDriveMarkdownFile/createDriveFolder 연동, 이름 변경 시 renameDriveItem 연동, 웹 환경 내 불필요한 미구현 /api/delete 등 백엔드 404 호출 원천 차단
// 🚨 @PATCH : **2026-09-30** — [탐색기 폴더 DOM 식별자(data-path/data-kind) 부여]: 미리보기 및 외부 폴더 링크 클릭 시 탐색기 내 해당 폴더 노드로 자동 스크롤 및 코발트 블루 펄스 하이라이트를 즉각 연결할 수 있도록 루트 요소에 data-path 및 data-kind 속성 탑재
// 🚨 @PATCH : **2026-09-30** — [탐색기 폴더 우클릭 '폴더 연결' 커서 위치 즉시 기입 연동]: 컨텍스트 메뉴의 '폴더 링크 복사'를 '폴더 연결'로 개편하여 클릭 시 현재 열린 문서의 커서 위치에 [폴더명](<./상대경로/>)을 즉시 삽입(app:insert-folder-link)하고 클립보드에도 자동 복사
// 🚨 @PATCH : **2026-09-30** — [탐색기 복원 폴더 지연 로딩 누락 및 빈 폴더 오표시 결함 수정]: onrivi_expanded_paths로 복원된 폴더의 localChildren이 빈 배열([])이거나 부모로부터 깡통 노드가 유입되었을 때 !localChildren 가드로 인해 onLazyLoad가 차단되어 파일이 있음에도 '빈 폴더'로 표시되던 결함을 (!localChildren || localChildren.length === 0) 검사 및 초기 덮어쓰기 방어로 완벽 해결
// 🚨 @PATCH : **2026-09-30** — [탐색기 폴더 마크다운 링크 복사 기능 탑재]: 폴더 우클릭 컨텍스트 메뉴에 '폴더 링크 복사' 메뉴 추가, 클릭 시 [폴더명](<./경로/>) 형식으로 클립보드에 자동 복사
// 🚨 @PATCH : **2026-09-28** — 제한사용자 파일·폴더 컨텍스트 메뉴 항목을 모두 표시하되 실행 불가 상태로 렌더링
//             **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import(ChevronRight, ChevronDown, FilePlus, FolderPlus, Pencil, Trash2, Scissors, FolderOpen, Copy, ClipboardPaste, Undo2, FileText) 전체 제거, Icon 컴포넌트로 교체
// 🚨 @PATCH : **2026-09-18** — [폴더 삭제 되돌리기(Undo) 전면 지원 및 탐색기 덜렁거림·깜빡임 완전 해소]:
//             1) 폴더 삭제 되돌리기: 데스크톱 api.backupFolderForUndo, 웹 브라우저 snapshotFsaDirectory/VFS 스냅샷으로 하위 구조 100% 보존 및 Ctrl+Z 복원 완비
//             2) 탐색기 덜렁거림 제거: dragleave 자식 요소 진입 방어, scale-[1.01] 제거(ring-1 교체), transition-all을 transition-colors로 최적화, React Key 고유 경로화로 깜빡임 원천 차단
// 🚨 @PATCH : **2026-09-18** — [데스크톱(Electron) 환경 파일 탐색기 기능 동기화 및 패리티 완성]:
//             1) checkIsCut 경로 비교 시 replace(/\\/g, '/').toLowerCase() 정규화로 데스크톱 잘라내기 반투명 피드백(opacity-40 italic) 100% 보장
//             2) handleDrop: 역슬래시 및 대소문자 무관 하위 폴더 이동 차단, api.moveFile 우선 호출, onrivi_expanded_paths 갱신, file:push-undo-action 연동으로 드래그 이동도 Ctrl+Z 지원
//             3) 폴더 이름 변경 시 onrivi_expanded_paths 대소문자 무관 정규화 및 targetDir 강제 새로고침 연동
//             4) handleDelete: 데스크톱 폴더 삭제 시 onrivi_expanded_paths 하위 경로 완전 제거로 유령 상태 원천 차단
//             5) file:refresh-all-directories 및 file:moved 핸들러에서 대소문자 무관 정규화 비교로 Windows 경로 갱신 누락 방지
// 🚨 @PATCH : **2026-09-18** — [폴더 이름 변경 시 열린 탭 경로·브레드크럼 동기화 및 하위 노드 캐시 리셋]:
//             1) 폴더 이름 변경 시 하위 열린 문서 탭들의 경로를 동기화하기 위해 file:tab-renamed 및 file:refresh-all-directories를 브라우저/Electron 전 환경에서 발송
//             2) in-memory 자식 노드 캐시(children/localChildren)를 리셋하고 refreshThisDirectory(true)로 신규 경로 목록을 즉시 재스캔
//             3) onrivi_expanded_paths의 펼침 상태를 신규 폴더 경로로 일괄 자동 갱신
// 🚨 @PATCH : **2026-09-18** — [타문서 변환 후 탐색기 자동 새로고침 및 디렉토리 자동 펼침 고도화]:
//             1) refreshThisDirectory에 force 파라미터(force=false)를 지원하여 250ms 쿨다운 락을 우회하는 즉시 강제 갱신 체계 구축
//             2) file:refresh-all-directories 이벤트 수신 시 targetDir 대상 폴더 및 상위 폴더를 자동 펼침(isOpen=true) 및 강제 새로고침(force=true) 수행
// 🚨 @PATCH : **2026-09-18** — [탐색기 UX 고도화 및 삭제/잘라내기/되돌리기 무결성 강화]:
//             1) 열려 있는 문서 삭제 및 잘라내기 전면 허용: 열린 파일/폴더 삭제 시 탭을 즉시 자동 닫기(file:close-tab-by-path) 처리하고, 단일 파일 삭제 시 스냅샷을 백업하여 Ctrl+Z 삭제 되돌리기 완벽 지원
//             2) 열려 있는 문서 잘라내기 허용 & 이동/되돌리기 시 탭 경로 자동 동기화(file:tab-renamed)
//             3) 탐색기 파일 클릭 시 에디터로 포커스 이탈 방지(itemRef 포커스 지속 유지)
//             4) 하위 폴더 '타문서 변환'(Ctrl+Alt+O) 컨텍스트 메뉴 신설 및 단축키 연동
//             5) '새 폴더' 및 '파일 탐색기에서 보기' 단축키 및 뱃지 제거
// 🚨 @PATCH : **2026-09-18** — [파일 노드 우클릭 붙여넣기 시 대상 부모 디렉토리 정상 계산 연동]: triggerPaste에서 파일 노드 우클릭 시 targetDirNode로 현재 노드를 온전히 전달하여 부모 폴더 경로가 정상 산출되도록 보강
// 🚨 @PATCH : **2026-09-18** — [탐색기 파일/폴더 잘라내기(Cut) 및 이동(Move) 2단계 되돌리기(Undo) 시스템 탑재]:
//             1) 잘라내기 선택 취소: Esc 및 Ctrl+Z, 컨텍스트 메뉴 '잘라내기 취소'를 통해 클립보드 cut 상태를 즉시 해제하고 반투명 효과를 100% 정상 복원
//             2) 이동 실행 취소: 이동 이력 스택을 기반으로 Ctrl+Z 또는 컨텍스트 메뉴 '이동 되돌리기' 실행 시 Electron/브라우저 FSA/VFS 환경에서 원본 폴더로 역방향 자동 복원 및 파일 트리 실시간 동기화
// 🚨 @PATCH : **2026-09-17** — [탐색기 조작 시 2중 중복 새로고침 결함 완벽 해결]: 파일/폴더 생성·이름변경·삭제·붙여넣기 시 잔존하던 불필요한 setTimeout 지연 재호출(300ms/700ms/800ms)을 전면 제거하고 단일 즉시 갱신 및 250ms 쿨다운 락으로 일원화
// 🚨 @PATCH : **2026-09-17** — [ESLint react-hooks/exhaustive-deps 경고 100% 해소]: refreshThisDirectory 및 handleDelete를 useCallback으로 래핑하여 의존성 배열 안정성 확보 및 불필요한 재렌더링 방지
// 🚨 @PATCH : **2026-09-17** — [탐색기 단축키 고도화 & 붙여넣기 후 즉시 새로고침 연동]: 컨텍스트 메뉴 및 트리 포커스 시 새 폴더 단축키를 Ctrl+Alt+N(⌥⌘N)으로 개편하고, 붙여넣기(Ctrl+V) 완료 시 대상 디렉토리 자동 펼침(isOpen) 및 지연 2중 새로고침(refreshThisDirectory/file:refresh-all-directories)을 즉각 수행하도록 보강
// 🚨 @PATCH : **2026-09-17** — [탐색기 파일/폴더 컨텍스트 메뉴 일반 단축키 적용 및 힌트 뱃지 표기]: 컨텍스트 메뉴 및 트리 항목 포커스 시 F2(이름변경), Del(삭제), Ctrl+C(복사), Ctrl+X(잘라내기), Ctrl+V(붙여넣기), Alt+N(새파일), Ctrl+Alt+N(새폴더), Shift+Alt+R(탐색기보기) 일반 단축키 전면 연동 및 메뉴 우측 단축키 라벨 시각화
// 🚨 @PATCH : **2026-09-17** — [지식 문서 등록/재분석 시 실시간 진행 모달 연동]: performKnowledgeIndex에서 백그라운드 토스트 대신 knowledge:open-index-progress 글로벌 이벤트를 발송하여 전용 실시간 진행 모달(4단계 파이프라인 및 AI 요약/요점/태그 구조화)을 즉시 팝업
// 🚨 @PATCH : **2026-09-16** — [지식 문서 재분석(재색인) 컨텍스트 메뉴 및 실시간 3단계 진행 토스트 탑재]:
//             1) 등록된 지식 문서 우클릭 메뉴에 '🔄 지식 재분석 (재색인)' 항목 신설하여 구버전 레코드 즉시 최신화 지원
//             2) performKnowledgeIndex로 [1/3] 본문 로드 -> [2/3] 헤딩 청킹 및 AI 분석 요청 -> [3/3] 갱신 완료 단계별 실시간 토스트 피드백 제공
//             3) 완료 시 knowledge:show-detail 및 knowledge:updated를 즉시 디스패치하여 화면 실시간 동기화
//             **2026-09-16** — [지식 문서 등록 시 본문 4단계 안전 로드 폴백 탑재]:
//             1) Web File System Access API ➔ 2) electronAPI.readFromPath ➔ 3) electronAPI.readFile ➔ 4) /api/file-content 4단계 안전 읽기 파이프라인 구축
//             2) 구글 드라이브(G:/내 드라이브) 및 로컬 디스크 파일 본문 누락을 100% 방지하여 모든 헤딩 및 청크가 온전히 파싱되도록 무결성 확보
//             **2026-09-16** — [삭제/이동된 폴더 NotFoundError 예외 처리 및 트리 자동 소거]: refreshThisDirectory 및 지연 로드 effect에서 NotFoundError 발생 시 경고 콘솔을 억제하고 isOpen 상태 해제, onrivi_expanded_paths 정리, refreshParent() 호출로 삭제된 폴더를 탐색기 트리에서 즉시 자동 제거하도록 개선
// 🚨 @PATCH : **2026-09-16** — [열려 있는 탭 파일/폴더 잘라내기(Cut) 방어 가드 탑재]: 탭에 열려 있는 파일이나 하위 파일이 포함된 폴더인 경우 우클릭 컨텍스트 메뉴의 '잘라내기' 버튼을 비활성화(disabled, opacity-40)하고, 클릭 시 탭을 먼저 닫도록 안내 토스트를 출력하여 원본 데이터 유실 원천 방어
// 🚨 @PATCH : **2026-09-16** — [웹/데스크톱 폴더 재귀 삭제 완벽 지원 & 삭제 차단 해제]: 비어있지 않은 폴더 삭제 차단 가드를 제거하고 브라우저(removeEntry recursive: true) 및 데스크톱(Electron) 양쪽 모두 하위 파일 포함 폴더 삭제를 완벽 지원, 삭제 후 file:refresh-all-directories 전역 동기화 연동
// 🚨 @PATCH : **2026-09-16** — [시스템 탐색기/Finder 열기 메뉴 데스크톱(Electron) 환경 전용 격리]: 웹 브라우저 환경에서 보안상 구동 불가능한 OS 탐색기 열기 메뉴를 원천 은닉하고 오직 electronAPI가 주입된 데스크톱 앱에서만 선택적으로 노출
// 🚨 @PATCH : **2026-09-16** — [탐색기 우클릭 컨텍스트 메뉴 아이콘 세련된 미니멀리즘 전면 교체]: 새 파일, 새 폴더, 이름 변경, 복사, 잘라내기, 붙여넣기, 탐색기 열기, 삭제 아이콘을 text-current 기반 Lucide 미니멀 라인 아이콘으로 통일하여 폰트 색상과 100% 일치
// 🚨 @PATCH : **2026-09-16** — [탐색기 세련된 미니멀리즘 아이콘 연동]: getFileIcon(node, isSelected, isOpen) 호출로 폴더 열림/닫힘 상태별 미니멀 라인 아이콘 렌더링, text-current 기반 인접 폰트 색상과 100% 동기화
// 🚨 @PATCH : **2026-09-16** — [탐색기 항목 잘라내기(Cut) 및 시스템 탐색기/Finder 열기 연동]: Scissors 아이콘 기반 잘라내기 메뉴(file:cut-node 발송) 추가, 잘라내기 활성 상태 시 opacity-40 반투명 시각 피드백 부여, 데스크톱 환경 파일/폴더 위치 탐색기/Finder 열기 메뉴 연동
// 🚨 @PATCH : **2026-09-13** — [지식관리 기능 데스크톱 전용 전환]: 탐색기 📗 뱃지 및 우클릭 컨텍스트 메뉴(지식문서 등록/해제/상세분석)를 isDesktop 전용으로 한정하여 웹 브라우저 UI 경량화
//             **2026-09-13** — [지식 문서 등록 시 불필요한 입력 팝업 전면 제거 및 무간섭 원클릭 등록 복원]: 웹 환경에서 상단 브레드크럼의 상위 설정(onrivi_web_base_path) 및 작업장 정보를 pathResolver가 자동 감지하도록 연계하고, 사용자에게 경로를 묻는 window.prompt를 전면 제거하여 원클릭 0초 즉시 등록 완벽 복원
//             **2026-09-12** — [스캔 배제 및 로컬스토리지 작업장 절대경로 직결]: 지식문서 등록 시 buildDirectWorkspacePath로 로컬스토리지 작업장 절대경로와 파일 상대경로를 즉시 다이렉트 연결하여 등록
//             **2026-09-12** — [지식 문서 등록 시 절대경로 표준화 및 양방향 캐싱]: 지식 등록 결과(registeredDetail.filePath)의 완전한 절대경로와 기존 상대경로를 동시 캐싱하여 📗 아이콘 표시 무결성 확보
// 🔗 @CALLS : @/lib/knowledge/knowledgeClient, @/lib/knowledge/pathResolver, @/lib/knowledge/knowledgeGuard
// ====================================================================

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { useDragHighlight } from '@/hooks/useDragHighlight';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/Icon';
import { FileNode, getFileIcon } from '@/lib/indexedDbHelper';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { vfsCreateFile, vfsCreateFolder, vfsRename, vfsDelete, vfsReadFile } from '@/lib/virtualFileSystem';
import PromptModal from '@/components/PromptModal';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  readDriveFileContent,
  trashDriveItem,
  renameDriveItem,
  createDriveMarkdownFile,
  createDriveFolder,
  moveDriveItemWithUndo
} from '@/lib/gdrive/googleDriveClient';
import { msg } from '@/lib/systemMessages';
import { useToast } from '@/components/ToastProvider';
import { checkKnowledgeGuard } from '@/lib/knowledge/knowledgeGuard';
import { loadSecureData } from '@/lib/secureStorage';
import { knowledgeClient, canAccessKnowledgeDb } from '@/lib/knowledge/knowledgeClient';
import { buildDirectWorkspacePath, computeRelativeFolderPath } from '@/lib/knowledge/pathResolver';

// 📂 브라우저 File System Access API 폴더 재귀 스냅샷 추출기 (되돌리기 지원용)
export const snapshotFsaDirectory = async (dirHandle: any, prefix = ''): Promise<{ relativePath: string; kind: 'file' | 'directory'; content?: string | Blob }[]> => {
  const items: { relativePath: string; kind: 'file' | 'directory'; content?: string | Blob }[] = [];
  for await (const [name, entry] of dirHandle.entries()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === 'directory') {
      items.push({ relativePath: rel, kind: 'directory' });
      items.push(...await snapshotFsaDirectory(entry, rel));
    } else if (entry.kind === 'file') {
      items.push({ relativePath: rel, kind: 'file', content: await entry.getFile() });
    }
  }
  return items;
};

interface FileTreeItemProps {
  node: FileNode;
  parentHandle: any;
  level: number;
  openFile: (node: FileNode | null, parentHandle?: any) => void;
  previewMode: 'edit' | 'both' | 'preview' | 'css-style';
  setPreviewMode: (v: 'edit' | 'both' | 'preview' | 'css-style') => void;
  currentFileName: string;
  currentFilePath?: string;
  workspaceType: string;
  refreshParent: () => void;
  onRefreshAll?: () => void;
  openTabPaths?: string[];
  askConfirm: (config: { title: string, message: string, onConfirm: () => void, isDanger?: boolean }) => void;
  siblings?: FileNode[];
  isMergeMode?: boolean;
  selectedMergeNodes?: FileNode[];
  toggleMergeNodeSelect?: (node: FileNode) => void;
  onLazyLoad?: (node: FileNode) => Promise<FileNode[]>;
  isRestrictedUser?: boolean;
}

const FileTreeItem = ({ 
  node: rawNode, parentHandle, level, openFile, previewMode, setPreviewMode, currentFileName, currentFilePath, workspaceType, refreshParent, onRefreshAll, openTabPaths,
  askConfirm, siblings,
  isMergeMode = false, selectedMergeNodes = [], toggleMergeNodeSelect, onLazyLoad, isRestrictedUser = false
}: FileTreeItemProps) => {
  const { showToast } = useToast();

  const isDesktop = typeof window !== 'undefined' && (
    !!(window as any).electronAPI ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    new URLSearchParams(window.location.search).get('env') === 'desktop'
  );

  const itemRef = useRef<HTMLDivElement>(null);
  const [isCut, setIsCut] = useState(false);
  const [hasClipboardCut, setHasClipboardCut] = useState(false);
  const [hasUndoableMove, setHasUndoableMove] = useState(false);
  const [lastUndoType, setLastUndoType] = useState<'move' | 'delete'>('move');

  useEffect(() => {
    const checkIsCut = () => {
      const clip = typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null;
      if (clip && clip.op === 'cut' && clip.node) {
        const clipPath = (clip.node.path || clip.node.name || '').replace(/\\/g, '/').toLowerCase();
        const myPath = (rawNode.path || rawNode.name || '').replace(/\\/g, '/').toLowerCase();
        setIsCut(clipPath === myPath);
        setHasClipboardCut(true);
      } else {
        setIsCut(false);
        setHasClipboardCut(false);
      }
    };
    checkIsCut();
    window.addEventListener('file:clipboard-changed', checkIsCut);
    return () => {
      window.removeEventListener('file:clipboard-changed', checkIsCut);
    };
  }, [rawNode.path, rawNode.name]);

  useEffect(() => {
    const onMoveHistoryChanged = (e: any) => {
      setHasUndoableMove((e.detail?.count || 0) > 0);
      if (e.detail?.lastType) {
        setLastUndoType(e.detail.lastType);
      }
    };
    window.addEventListener('file:move-history-changed', onMoveHistoryChanged);
    return () => {
      window.removeEventListener('file:move-history-changed', onMoveHistoryChanged);
    };
  }, []);

  // 🛡️ 백엔드/VFS 노드 규격(type: 'dir'/'file' -> kind) 자동 호환 안전장치
  const node = React.useMemo(() => {
    const kind = rawNode.kind || ((rawNode as any).type === 'dir' || (rawNode as any).type === 'directory' ? 'directory' : 'file');
    return { ...rawNode, kind };
  }, [rawNode]);
  
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('onrivi_expanded_paths');
      if (saved && node.path) {
        const paths: string[] = JSON.parse(saved);
        const normalizedPath = node.path.replace(/\\/g, '/');
        return paths.some(p => p.replace(/\\/g, '/') === normalizedPath);
      }
    } catch (e) {
      // Safe guard
    }
    return false;
  });

  const [localChildren, setLocalChildren] = useState<FileNode[] | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleItemMouseLeave = () => {
    if (contextMenu) {
      if (contextCloseTimerRef.current) clearTimeout(contextCloseTimerRef.current);
      contextCloseTimerRef.current = setTimeout(() => {
        setContextMenu(null);
      }, 150);
    }
  };

  const handleMenuMouseEnter = () => {
    if (contextCloseTimerRef.current) {
      clearTimeout(contextCloseTimerRef.current);
      contextCloseTimerRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (contextMenu) {
      if (contextCloseTimerRef.current) clearTimeout(contextCloseTimerRef.current);
      contextCloseTimerRef.current = setTimeout(() => {
        setContextMenu(null);
      }, 100);
    }
  };

  useEffect(() => {
    return () => {
      if (contextCloseTimerRef.current) clearTimeout(contextCloseTimerRef.current);
    };
  }, []);

  // 📌 폴더 펼침/접힘 상태 변경 시 localStorage 동기화
  useEffect(() => {
    if (node.kind !== 'directory' || !node.path) return;
    try {
      const saved = localStorage.getItem('onrivi_expanded_paths');
      let paths: string[] = saved ? JSON.parse(saved) : [];
      const normalizedPath = node.path.replace(/\\/g, '/');

      if (isOpen) {
        if (!paths.some(p => p.replace(/\\/g, '/') === normalizedPath)) {
          paths.push(node.path);
        }
      } else {
        paths = paths.filter(p => p.replace(/\\/g, '/') !== normalizedPath);
      }
      localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
    } catch (e) {
      // Safe guard
    }
  }, [isOpen, node.path, node.kind]);

  // 📌 폴더가 열려있는(isOpen) 상태로 복구되었는데 자식 데이터가 없거나 비어있는 경우 자동으로 비동기 지연 로드 복원
  useEffect(() => {
    if (isOpen && node.kind === 'directory' && (!localChildren || localChildren.length === 0) && onLazyLoad) {
      setIsLoading(true);
      onLazyLoad(node)
        .then((children) => {
          setLocalChildren(children);
        })
        .catch((err) => {
          if (err?.name === 'NotFoundError' || err?.message?.includes('could not be found')) {
            setIsOpen(false);
            if (typeof refreshParent === 'function') {
              refreshParent();
            }
          } else {
            console.error("폴더 자동 갱신 실패", err);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, node.path, node.kind, onLazyLoad]);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClose);
      window.addEventListener('close-context-menus', handleClose);
      return () => {
        window.removeEventListener('click', handleClose);
        window.removeEventListener('close-context-menus', handleClose);
      };
    }
  }, [contextMenu]);

  // ====================================================================
  // 📊 [OMD-FILE-FileTreeItem-0002] FileTreeItem ➔ useEffect (syncChildren)
  // 🎯 @KICK  : node.children 변경 시 localChildren 상태 동기화
  // 🛡️ @GUARD : undefined인 경우 동기화 생략
  // 🚨 @PATCH : **2026-09-30** — 부모로부터 유입된 깡통 빈 배열([])이 localChildren=null인 초기 지연 로딩 대기 상태를 덮어써서 빈 폴더로 고착되는 버그 방어
  // 🔗 @CALLS : 없음
  // ====================================================================
  React.useEffect(() => {
    if (node.children !== undefined && node.children !== null) {
      // 🛡️ [지연 로드 덮어쓰기 방어 가드] 이미 로컬로 지연 로딩 완료된 자식이 있는데,
      // 부모로부터 빈 자식 목록(refresh 시의 깡통 노드)이 유입되면 덮어쓰지 않고 기존 자식을 유지함
      if (node.children.length === 0 && localChildren && localChildren.length > 0) {
        return;
      }
      // 🛡️ [지연 로드 대기 방어 가드] 폴더가 열려 있는데 부모로부터 빈 깡통 목록([])이 전달된 경우,
      // localChildren을 []로 덮어쓰지 않고 onLazyLoad가 실행될 수 있도록 보존
      if (node.children.length === 0 && isOpen) {
        return;
      }
      setLocalChildren(node.children);
    }
  }, [node.children, localChildren, isOpen]);
  // ====================================================================
  // 📊 [OMD-FILE-FileTreeItem-0003] FileTreeItem ➔ refreshThisDirectory
  // 🎯 @KICK  : 현재 디렉토리 노드의 자식 목록을 지연 로딩(onLazyLoad)으로 갱신
  // 🛡️ @GUARD : 디렉토리가 아니거나 onLazyLoad 미존재 시 실행 차단; NotFoundError 시 트리 및 로컬스토리지 정리; 250ms 이내 중복 실행 차단
  // 🚨 @PATCH : **2026-09-17** — [폴더 자식 갱신 시 2중 깜빡임 및 중복 로딩 차단]: 250ms 쿨다운 락을 부여하여 동일 폴더가 짧은 시간 내 2회 이상 연속 갱신되는 현상 방어
  // 🔗 @CALLS : onLazyLoad, refreshParent
  // ====================================================================
  const isDirRefreshingRef = useRef(false);
  const lastDirRefreshTimeRef = useRef(0);
  const refreshThisDirectory = useCallback(async (force = false) => {
    if (node.kind !== 'directory' || !onLazyLoad) return;
    const now = Date.now();
    if (!force && (isDirRefreshingRef.current || now - lastDirRefreshTimeRef.current < 250)) {
      return;
    }
    isDirRefreshingRef.current = true;
    lastDirRefreshTimeRef.current = now;
    setIsLoading(true);
    try {
      const children = await onLazyLoad(node);
      setLocalChildren(children);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('could not be found')) {
        setIsOpen(false);
        try {
          const saved = localStorage.getItem('onrivi_expanded_paths');
          if (saved && node.path) {
            const normPath = node.path.replace(/\\/g, '/');
            const paths = JSON.parse(saved).filter((p: string) => {
              const np = p.replace(/\\/g, '/');
              return np !== normPath && !np.startsWith(normPath + '/');
            });
            localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
          }
        } catch {}
        if (typeof refreshParent === 'function') {
          refreshParent();
        }
      } else {
        msg.warn('폴더 재갱신 실패', err);
      }
    } finally {
      setIsLoading(false);
      isDirRefreshingRef.current = false;
    }
  }, [node, onLazyLoad, refreshParent]);
  // 드래그 이동 완료 후 이 디렉토리가 source/target이면 자식 목록 갱신
  const refreshThisDirectoryRef = useRef(refreshThisDirectory);
  refreshThisDirectoryRef.current = refreshThisDirectory;
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (node.kind !== 'directory' || !node.path) return;
      const normNodePath = node.path.replace(/\\/g, '/').toLowerCase();
      const matches =
        normNodePath === (detail.sourceParentPath || '').replace(/\\/g, '/').toLowerCase() ||
        normNodePath === (detail.targetParentPath || '').replace(/\\/g, '/').toLowerCase() ||
        normNodePath === (detail.targetPath || '').replace(/\\/g, '/').toLowerCase();
      if (matches) refreshThisDirectoryRef.current(true);
    };
    
    const refreshAllHandler = (e?: Event) => {
      if (node.kind !== 'directory') return;
      const detail = (e as CustomEvent)?.detail;
      const isForce = detail?.force === true;
      const targetDir = detail?.targetDir ? detail.targetDir.replace(/\\/g, '/') : null;
      const normNodePath = node.path ? node.path.replace(/\\/g, '/') : '';

      // 대상 디렉토리이거나 대상 디렉토리의 상위 폴더라면 폴더를 즉시 펼치고 강제 갱신
      if (targetDir) {
        const targetDirLower = targetDir.toLowerCase();
        const normNodePathLower = normNodePath.toLowerCase();
        if (normNodePathLower === targetDirLower || targetDirLower.startsWith(normNodePathLower + '/')) {
          setIsOpen(true);
          refreshThisDirectoryRef.current(true);
          return;
        }
      }

      if (isOpen) {
        refreshThisDirectoryRef.current(isForce);
      }
    };

    // 🆕 폴더 생성 후 자동 선택: 이 노드가 대상 경로와 일치하면 openFile 호출
    const selectNodeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.path || !node.path) return;
      const normTarget = detail.path.replace(/\\/g, '/').toLowerCase();
      const normThis = node.path.replace(/\\/g, '/').toLowerCase();
      if (normTarget === normThis && node.kind === 'directory') {
        openFile(node, parentHandle);
      }
    };

    window.addEventListener('file:moved', handler);
    window.addEventListener('file:refresh-all-directories', refreshAllHandler);
    window.addEventListener('file:select-node', selectNodeHandler);
    
    return () => {
      window.removeEventListener('file:moved', handler);
      window.removeEventListener('file:refresh-all-directories', refreshAllHandler);
      window.removeEventListener('file:select-node', selectNodeHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.kind, node.path, isOpen]);
  const [isLoading, setIsLoading] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue: string;
    type: 'rename' | 'createFile' | 'createFolder' | null;
    error?: string;
  }>({ isOpen: false, title: "", defaultValue: "", type: null, error: "" });

  const [isDragOver, setIsDragOver] = useDragHighlight();

  const dispatchMovedEvent = (srcPath: string, tgtPath: string, newPath?: string, sourceName?: string, newHandle?: any) => {
    const normSrc = srcPath.replace(/\\/g, '/');
    const normTgt = tgtPath.replace(/\\/g, '/');
    const srcParentPath = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
    const tgtParentPath = normTgt.includes('/') ? normTgt.substring(0, normTgt.lastIndexOf('/')) : '';
    
    // 트리 목록 갱신용 이벤트
    window.dispatchEvent(new CustomEvent('file:moved', {
      detail: { sourceParentPath: srcParentPath, targetParentPath: tgtParentPath, targetPath: normTgt }
    }));

    // 열린 탭 동기화용 이벤트 발송
    if (newPath && sourceName) {
      window.dispatchEvent(new CustomEvent('file:tab-renamed', {
        detail: { oldPath: srcPath, newPath, newName: sourceName, newHandle }
      }));
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("sourcePath", node.path || "");
    e.dataTransfer.setData("sourceName", node.name);
    e.dataTransfer.setData("sourceKind", node.kind);
    e.dataTransfer.effectAllowed = "move";
    // 💡 FileSystem API 등에서 복잡한 핸들 복사 이동을 위해 드래그 중인 원본 노드 참조 저장
    if (typeof window !== 'undefined') {
      (window as any)._draggedNode = node;
      (window as any)._draggedNodeParentHandle = parentHandle;
      const normPath = (node.path || '').replace(/\\/g, '/');
      const lastSlash = normPath.lastIndexOf('/');
      (window as any)._draggedNodeParentPath = lastSlash !== -1 ? normPath.substring(0, lastSlash) : '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isRestrictedUser || !Array.from(e.dataTransfer.types).includes('sourcepath')) {
      setIsDragOver(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (node.kind === 'directory') {
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 🛡️ 자식 요소(아이콘, 텍스트) 진입으로 인한 가짜 dragleave 방어 (덜렁거림/깜빡임 완전 해소)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  // ====================================================================
  // 📊 [OMD-FILE-FileTreeItem-0004] FileTreeItem ➔ handleDrop
  // 🎯 @KICK  : 파일/폴더 드래그 앤 드롭 이동 처리 - Electron, File System API, VFS 세 환경 지원
  // 🛡️ @GUARD : 자기 자신/하위 폴더 드롭 방지, 디렉토리만 드롭 대상 허용; openTabPaths로 열린 파일/폴더 드롭 차단
  // 🚨 @PATCH : **2026-06-19** — 열린 탭 보호 가드 추가 (파일/포함 폴더 이동 차단); 이동 후 onRefreshAll 전체 트리 갱신
  // 🔗 @CALLS : refreshParent, refreshThisDirectory, onRefreshAll, vfsRename, showToast
  // ====================================================================
  const handleDrop = async (e: React.DragEvent) => {
    setIsDragOver(false);
    if (isRestrictedUser) return; // 제한 사용자는 파일 조작/이동 불가
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (node.kind !== 'directory') return;

    const sourcePath = e.dataTransfer.getData("sourcePath");
    const sourceName = e.dataTransfer.getData("sourceName");
    const sourceKind = e.dataTransfer.getData("sourceKind");
    const draggedNode = typeof window !== 'undefined' ? (window as any)._draggedNode : null;
    const draggedNodeParent = typeof window !== 'undefined' ? (window as any)._draggedNodeParentHandle : null;

    if (sourcePath === node.path) return; // 자기 자신에게 드롭 방지
    // 드롭 대상이 드래그 중인 원본 폴더 하위에 위치하는지 방지 (재귀 루프 방지 - Windows 대소문자 및 슬래시 정규화)
    if (draggedNode && draggedNode.kind === 'directory' && node.path && draggedNode.path) {
      const normNode = (node.path || '').replace(/\\/g, '/').toLowerCase();
      const normDragged = (draggedNode.path || '').replace(/\\/g, '/').toLowerCase();
      if (normNode === normDragged || normNode.startsWith(normDragged + '/')) {
        showToast("하위 폴더로는 이동할 수 없습니다.", "warning");
        return;
      }
    }

    // 열린 탭 보호 해제: 이제 열려있는 문서도 이동 가능합니다.

      try {
        // 0. Google Drive(GDRIVE/cloud) 환경 드래그 이동
        if (workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud')) {
          const token = getSavedDriveToken();
          const srcDriveId = draggedNode?.driveFileId || draggedNode?.driveId || (draggedNode as any)?.id;
          const destDriveId = (node as any).driveFileId || (node as any).driveId || (node as any).id;
          if (!token) {
            showToast('구글 드라이브 토큰이 없습니다. 다시 연결해 주세요.', 'error');
            return;
          }
          if (!srcDriveId || !destDriveId) {
            showToast('구글 드라이브 파일 ID를 찾을 수 없습니다.', 'error');
            return;
          }
          if (srcDriveId === destDriveId) return;
          const srcParentDriveId = (draggedNode as any)?.parentDriveId || (draggedNode as any)?.parentId;
          await moveDriveItemWithUndo(token, srcDriveId, destDriveId, srcParentDriveId, { name: sourceName, kind: sourceKind });
          showToast(`'${sourceName}' 이동 완료`, 'success');
          onRefreshAll?.();
          refreshParent();
          await refreshThisDirectory(true);
          return;
        }

        if (workspaceType === 'local') {
          const cleanDestDir = (node.path || '').replace(/[/\\]+$/, '');
          const sep = cleanDestDir.includes('/') && !cleanDestDir.includes('\\') ? '/' : '\\';
          const newPath = cleanDestDir ? `${cleanDestDir}${sep}${sourceName}` : sourceName;
          const api = (window as any).electronAPI;
          if (api?.moveFile) {
            const res = await api.moveFile(sourcePath, newPath);
            if (res && res.error) throw new Error(res.error);
          } else if (api?.renameFile) {
            await api.renameFile(sourcePath, newPath);
          } else {
            // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 이동 수행
            vfsRename(sourcePath, newPath);
          }

          showToast(`'${sourceName}' 이동 완료`, 'success');
          dispatchMovedEvent(sourcePath, node.path || '', newPath, sourceName);

          // 📂 대상 폴더 자동 펼침 및 하위 펼침 상태 보존
          if (sourceKind === 'directory' && sourcePath) {
            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              let paths: string[] = saved ? JSON.parse(saved) : [];
              const nodePath = node.path;
              if (nodePath) {
                const normNodePath = nodePath.replace(/\\/g, '/').toLowerCase();
                if (!paths.some(p => p.replace(/\\/g, '/').toLowerCase() === normNodePath)) {
                  paths.push(nodePath);
                }
              }
              const normSrc = sourcePath.replace(/\\/g, '/').toLowerCase();
              paths = paths.map((p: string) => {
                const np = p.replace(/\\/g, '/');
                if (np.toLowerCase() === normSrc) return newPath;
                if (np.toLowerCase().startsWith(normSrc + '/')) {
                  const sub = np.substring(normSrc.length);
                  return `${newPath}${sep === '\\' ? sub.replace(/\//g, '\\') : sub.replace(/\\/g, '/')}`;
                }
                return p;
              });
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            } catch {}
          }

          // ↩️ 드래그 앤 드롭 이동 실행 취소(되돌리기) 히스토리 등록
          const normSrc = sourcePath.replace(/\\/g, '/');
          const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
          window.dispatchEvent(new CustomEvent('file:push-undo-action', {
            detail: {
              type: 'move',
              srcPath: sourcePath,
              destPath: newPath,
              srcDirPath: srcDir,
              destDirPath: node.path || '',
              name: sourceName,
              kind: sourceKind || 'file',
              workspaceType: 'local'
            }
          }));

          onRefreshAll?.();
          refreshParent();
          await refreshThisDirectory(true);
        } else if (workspaceType === 'browser') {
          if (draggedNode && draggedNode.handle) {
            // FileSystem API 환경
            const targetDirHandle = node.handle;
            if (!targetDirHandle) return;
  
            let finalNewHandle: any = null;
            if (draggedNode.kind === 'file') {
              // 파일 이동: 새 파일 생성 후 복사 및 기존 파일 엔트리 제거
              const file = await draggedNode.handle.getFile();
              const text = await file.text();
              const newFileHandle = await targetDirHandle.getFileHandle(draggedNode.name, { create: true });
              const writable = await newFileHandle.createWritable();
              await writable.write(text);
              await writable.close();
              if (draggedNodeParent) {
                await draggedNodeParent.removeEntry(draggedNode.name);
              }
              finalNewHandle = newFileHandle;
            } else if (draggedNode.kind === 'directory') {
              // 폴더 이동: 새 폴더를 생성하고 하위 파일/폴더들을 재귀적으로 복사한 뒤 원본 폴더 엔트리 제거
              const newDirHandle = await targetDirHandle.getDirectoryHandle(draggedNode.name, { create: true });
              
              const copyDirectory = async (srcDir: FileSystemDirectoryHandle, destDir: FileSystemDirectoryHandle) => {
                for await (const entry of (srcDir as any).values()) {
                  if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    const text = await file.text();
                    const newFileHandle = await destDir.getFileHandle(entry.name, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(text);
                    await writable.close();
                  } else if (entry.kind === 'directory') {
                    const newSubDir = await destDir.getDirectoryHandle(entry.name, { create: true });
                    await copyDirectory(entry, newSubDir);
                  }
                }
              };
              
              await copyDirectory(draggedNode.handle, newDirHandle);
              if (draggedNodeParent) {
                await draggedNodeParent.removeEntry(draggedNode.name, { recursive: true });
              }
              finalNewHandle = newDirHandle;
            }
            showToast(`'${draggedNode.name}' 이동 완료`, 'success');
            const newPath = node.path ? `${node.path}/${draggedNode.name}` : draggedNode.name;
            dispatchMovedEvent(sourcePath, node.path || '', newPath, draggedNode.name, finalNewHandle);
            onRefreshAll?.();
            refreshParent();
            await refreshThisDirectory();
          } else if (sourcePath) {
            // LocalStorage 가상 파일/폴더 이동
            const oldPath = sourcePath;
            const normalizedPath = oldPath.replace(/\\/g, '/');
            const lastSlashIndex = normalizedPath.lastIndexOf('/');
            const filename = lastSlashIndex !== -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath;
            const newPath = node.path ? `${node.path}/${filename}` : filename;
            
            vfsRename(oldPath, newPath);
            showToast(`'${filename}' 이동 완료`, 'success');
            dispatchMovedEvent(oldPath, node.path || '', newPath, filename);
            onRefreshAll?.();
            refreshParent();
            await refreshThisDirectory();
          }
        }
    } catch (e) {
      showToast("이동 실패: " + e, 'error');
    }
  };

  // ====================================================================
  // 📊 [OMD-FILE-FileTreeItem-0005] FileTreeItem ➔ handleClick
  // 🎯 @KICK  : 파일 트리 노드 클릭 - 폴더 토글/지연 로드, 파일 열기, 병합 선택 처리
  // 🛡️ @GUARD : isMergeMode 시 파일 선택 모드로 전환
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : toggleMergeNodeSelect, openFile, onLazyLoad
  // ====================================================================
  const handleClick = (e: React.MouseEvent) => {
    /* [ONR-UI-005] 파일 트리 노드 클릭 연동: 사용자가 좌측 파일 탐색기 트리의 특정 노드를 클릭 시 폴더인 경우 자식 노드 토글/지연로드를 처리하고, 파일인 경우 openFile 콜백을 트리거하여 탭을 열고 로드합니다. */
    e.stopPropagation();
    itemRef.current?.focus();
    if (isMergeMode && node.kind === 'file' && node.name.toLowerCase().endsWith('.md')) {
      if (toggleMergeNodeSelect) toggleMergeNodeSelect(node);
      return;
    }
    if (node.kind === 'directory') {
      openFile(node, parentHandle);
      const willOpen = !isOpen;
      if (willOpen && onLazyLoad && (!localChildren || localChildren.length === 0)) {
        setIsLoading(true);
        onLazyLoad(node).then((children: FileNode[]) => {
          setLocalChildren(children);
          setIsLoading(false);
          setIsOpen(true);
        }).catch(() => setIsLoading(false));
      } else {
        setIsOpen(willOpen);
      }
    } else if (node.kind === 'file') {
      openFile(node, parentHandle);
      // 탐색기 파일 클릭 시 에디터나 탭으로 포커스가 강제 전환되지 않고 탐색기 항목에 포커스 지속 유지
      setTimeout(() => itemRef.current?.focus(), 50);
      setTimeout(() => itemRef.current?.focus(), 150);
    }
  };

  const handleRename = async (e: any) => {
    e.stopPropagation();
    const isDir = node.kind === 'directory';
    setPromptConfig({
      isOpen: true,
      title: isDir 
        ? `'${node.name}' 폴더의 새 이름을 입력하세요.` 
        : `'${node.name}' 파일의 새 이름을 입력하세요.`,
      defaultValue: node.name,
      type: 'rename'
    });
  };

  const handleCreateFile = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({
      isOpen: true,
      title: `[${node.name}]에 생성할 새 파일의 이름을 입력하세요.`,
      defaultValue: "untitled.md",
      type: 'createFile'
    });
  };

  const handleCreateFolder = async (e: any) => {
    e.stopPropagation();
    setPromptConfig({
      isOpen: true,
      title: `[${node.name}]에 생성할 새 폴더의 이름을 입력하세요.`,
      defaultValue: "",
      type: 'createFolder'
    });
  };

  // ====================================================================
  // 📊 [OMD-FILE-FileTreeItem-0006] FileTreeItem ➔ onPromptConfirm
  // 🎯 @KICK  : 이름 변경/파일 생성/폴더 생성 프롬프트 확인 처리 - 브라우저 VFS 또는 Electron API 연동
  // 🛡️ @GUARD : 중복 체크 및 빈 이름 방어
  // 🚨 @PATCH : setTimeout 800ms 지연 새로고침으로 OS 파일 인덱싱 락 방어, NFC 경로 표준화로 한글 자소 분리 방지
  // 🔗 @CALLS : vfsRename, vfsCreateFile, vfsCreateFolder, openFile, refreshParent, refreshThisDirectory
  // ====================================================================
  const onPromptConfirm = async (name: string) => {
    const type = promptConfig.type;
    setPromptConfig({ ...promptConfig, isOpen: false });
    if (!name) return;

    if (type === 'rename') {
      if (name === node.name) return;
      const finalName = node.kind === 'file' && !(name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.markdown') || name.toLowerCase().endsWith('.bib')) ? `${name}.md` : name;
      
      // 중복 체크
      if (siblings?.some(s => s.name.toLowerCase() === finalName.toLowerCase() && s.path !== node.path)) {
        setPromptConfig(prev => ({ ...prev, error: "이미 같은 이름의 항목이 존재합니다." }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));

        const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
        if (isDriveNode) {
          const token = getSavedDriveToken();
          const targetDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
          if (token && targetDriveId) {
            await renameDriveItem(token, targetDriveId, finalName);
            const oldPath = node.path || node.name;
            node.name = finalName;
            const normalizedPath = oldPath.replace(/\\/g, '/');
            const lastSlashIndex = normalizedPath.lastIndexOf('/');
            const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : "";
            const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;
            node.path = newPath;
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            window.dispatchEvent(new CustomEvent('file:tab-renamed', {
              detail: { oldPath, newPath, newName: finalName }
            }));
            showToast(`'${finalName}'(으)로 이름이 변경되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (node.handle) {
            if (node.kind === 'file') {
              // 파일 이름 변경: 새 파일을 만들어 쓰고 기존 파일 삭제
              const file = await node.handle.getFile();
              const text = await file.text();
              const newHandle = await parentHandle.getFileHandle(finalName, { create: true });
              const writable = await newHandle.createWritable();
              await writable.write(text);
              await writable.close();
              await parentHandle.removeEntry(node.name);

              // 💡 파일의 새 경로 계산
              const oldPath = node.path || "";
              const oldName = node.name;
              const normalizedPath = oldPath.replace(/\\/g, '/');
              const lastSlashIndex = normalizedPath.lastIndexOf('/');
              const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : "";
              const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;

              node.handle = newHandle;
              node.name = finalName;
              node.path = newPath;

              refreshParent();
              // 💡 탭 메타데이터만 갱신 (새 탭 열지 않음)
              window.dispatchEvent(new CustomEvent('file:tab-renamed', {
                detail: { oldPath, newPath, newName: finalName, newHandle }
              }));
            } else if (node.kind === 'directory') {
              // 폴더 이름 변경: 새 폴더를 만들고 하위 항목들을 재귀적으로 복사한 뒤 기존 폴더 삭제
              const newDirHandle = await parentHandle.getDirectoryHandle(finalName, { create: true });
              
              const copyDirectory = async (srcDir: FileSystemDirectoryHandle, destDir: FileSystemDirectoryHandle) => {
                for await (const entry of (srcDir as any).values()) {
                  if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    const text = await file.text();
                    const newFileHandle = await destDir.getFileHandle(entry.name, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(text);
                    await writable.close();
                  } else if (entry.kind === 'directory') {
                    const newSubDir = await destDir.getDirectoryHandle(entry.name, { create: true });
                    await copyDirectory(entry, newSubDir);
                  }
                }
              };
              
              await copyDirectory(node.handle, newDirHandle);
              await parentHandle.removeEntry(node.name, { recursive: true });
              
              // 💡 폴더의 새 경로 계산
              const oldPath = node.path || "";
              const normalizedPath = oldPath.replace(/\\/g, '/');
              const lastSlashIndex = normalizedPath.lastIndexOf('/');
              const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : "";
              const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;

              // 메모리 내 노드 핸들과 이름 및 경로 즉시 업데이트
              node.handle = newDirHandle;
              node.name = finalName;
              node.path = newPath;

              // 💡 이전 자식 노드 캐시 리셋
              node.children = [];
              setLocalChildren(null);

              refreshParent();
              refreshThisDirectory(true);

              // 💡 폴더 하위 열린 탭 메타데이터 및 경로 동기화 이벤트 발송
              window.dispatchEvent(new CustomEvent('file:tab-renamed', {
                detail: { oldPath, newPath, newName: finalName, newHandle: newDirHandle }
              }));

              // 💡 폴더 펼침 상태(onrivi_expanded_paths) 업데이트
              try {
                const raw = localStorage.getItem('onrivi_expanded_paths');
                if (raw) {
                  const paths: string[] = JSON.parse(raw);
                  const updated = paths.map(p => {
                    if (p === oldPath) return newPath;
                    if (p.startsWith(oldPath + '/')) return newPath + p.substring(oldPath.length);
                    return p;
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
                }
              } catch (_) {}
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            }
          } else if (node.path) {
            // LocalStorage 가상 파일/폴더 이름 변경
            const oldPath = node.path;
            const normalizedPath = oldPath.replace(/\\/g, '/');
            const lastSlashIndex = normalizedPath.lastIndexOf('/');
            const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : "";
            const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;
            const isDir = node.kind === 'directory';

            vfsRename(oldPath, newPath);
            node.path = newPath;
            node.name = finalName;
            if (isDir) {
              node.children = [];
              setLocalChildren(null);
            }
            refreshParent();
            // 💡 탭 메타데이터만 갱신 (새 탭 열지 않음)
            window.dispatchEvent(new CustomEvent('file:tab-renamed', {
              detail: { oldPath, newPath, newName: finalName }
            }));

            if (isDir) {
              try {
                const raw = localStorage.getItem('onrivi_expanded_paths');
                if (raw) {
                  const paths: string[] = JSON.parse(raw);
                  const updated = paths.map(p => {
                    if (p === oldPath) return newPath;
                    if (p.startsWith(oldPath + '/')) return newPath + p.substring(oldPath.length);
                    return p;
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
                }
              } catch (_) {}
              refreshThisDirectory(true);
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            }
          }
        } else {
          const api = (window as any).electronAPI;
          const cleanOldPath = (node.path || "").replace(/[/\\]+$/, '');
          const normalizedPath = cleanOldPath.replace(/\\/g, '/');
          const lastSlashIndex = normalizedPath.lastIndexOf('/');
          const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : "";
          const finalParentPath = parentPath.replace(/\//g, '\\');
          // 🛡️ 한글 자소 분리 깨짐 방지를 위한 NFC 경로 표준화
          const newPath = (finalParentPath ? `${finalParentPath}\\${finalName}` : finalName).normalize('NFC');
          const isDir = node.kind === 'directory';

          if (api?.renameFile) {
            await api.renameFile(cleanOldPath, newPath);
            // 💡 [요구사항 1] 이름 변경 시 노드 메모리 정보 즉시 갱신하여 하위 목록의 404 경로 유실 에러 원천 차단
            node.path = newPath;
            node.name = finalName;
            if (isDir) {
              node.children = [];
              setLocalChildren(null);
            }
            refreshParent();

            if (isDir) {
              try {
                const raw = localStorage.getItem('onrivi_expanded_paths');
                if (raw) {
                  const paths: string[] = JSON.parse(raw);
                  const normOld = cleanOldPath.replace(/\\/g, '/').toLowerCase();
                  const updated = paths.map(p => {
                    const normP = p.replace(/[/\\]+$/, '').replace(/\\/g, '/').toLowerCase();
                    if (normP === normOld) return newPath;
                    if (normP.startsWith(normOld + '/')) {
                      return newPath + p.substring(cleanOldPath.length);
                    }
                    return p;
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
                }
              } catch (_) {}
              refreshThisDirectory(true);
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
                detail: { force: true, targetDir: newPath }
              }));
            }

            // 💡 탭 메타데이터만 갱신 (새 탭 열지 않음) — cleanOldPath 스냅샷 사용
            window.dispatchEvent(new CustomEvent('file:tab-renamed', {
              detail: { oldPath: cleanOldPath, newPath, newName: finalName }
            }));
          } else {
            // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 이름 변경 수행
            vfsRename(cleanOldPath, newPath);
            node.path = newPath;
            node.name = finalName;
            if (isDir) {
              node.children = [];
              setLocalChildren(null);
            }
            refreshParent();

              if (isDir) {
                try {
                  const raw = localStorage.getItem('onrivi_expanded_paths');
                  if (raw) {
                    const paths: string[] = JSON.parse(raw);
                    const normOld = cleanOldPath.replace(/\\/g, '/').toLowerCase();
                    const updated = paths.map(p => {
                      const normP = p.replace(/[/\\]+$/, '').replace(/\\/g, '/').toLowerCase();
                      if (normP === normOld) return newPath;
                      if (normP.startsWith(normOld + '/')) {
                        return newPath + p.substring(cleanOldPath.length);
                      }
                      return p;
                    });
                    localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
                  }
                } catch (_) {}
                refreshThisDirectory(true);
                window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
                  detail: { force: true, targetDir: newPath }
                }));
              }

              // 💡 탭 메타데이터만 갱신 (새 탭 열지 않음) — cleanOldPath 스냅샷 사용
              window.dispatchEvent(new CustomEvent('file:tab-renamed', {
                detail: { oldPath: cleanOldPath, newPath, newName: finalName }
              }));
          }
        }
      } catch(e) { 
        const isDir = node.kind === 'directory';
        showToast((isDir ? "폴더" : "파일") + " 이름 변경 실패: " + e, 'error'); 
      }
    } else if (type === 'createFile') {
      const finalName = (name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.bib')) ? name : `${name}.md`;
      
      // 중복 체크
      if (node.children?.some(c => c.name.toLowerCase() === finalName.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, error: "이미 같은 이름의 파일이 존재합니다." }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));

        const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
        if (isDriveNode) {
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const parentDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id || wsInfo?.workspaceFolderId;
          if (token && parentDriveId) {
            const newDoc = await createDriveMarkdownFile(token, parentDriveId, finalName, '');
            await refreshThisDirectory();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            const filePath = node.path ? `${node.path}/${finalName}` : finalName;
            openFile({
              name: finalName,
              kind: 'file',
              path: filePath,
              driveId: newDoc.id,
              driveFileId: newDoc.id,
              id: newDoc.id
            }, node.handle);
            showToast(`'${finalName}' 파일이 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (node.handle) {
            const handle = await node.handle.getFileHandle(finalName, { create: true });
            refreshParent();
            const filePath = node.path ? `${node.path}/${finalName}` : finalName;
            openFile({ name: finalName, kind: 'file', handle, path: filePath }, node.handle);
          } else if (node.path) {
            // LocalStorage 가상 파일 생성
            vfsCreateFile(node.path, finalName);
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            const filePath = `${node.path}/${finalName}`;
            openFile({ name: finalName, kind: 'file', path: filePath }, node.handle);
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFile) {
            const result = await api.createFile(node.path, finalName);
            if (result.success) {
              await refreshThisDirectory();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
              openFile({ name: finalName, kind: 'file', path: result.path }, node.handle);
            }
          } else if (node.path) {
            // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 파일 생성 수행
            vfsCreateFile(node.path, finalName);
            await refreshThisDirectory();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            const filePath = `${node.path}/${finalName}`;
            openFile({ name: finalName, kind: 'file', path: filePath }, node.handle);
          }
        }
      } catch(e) { showToast("생성 실패: " + e, 'error'); }
    } else if (type === 'createFolder') {
      // 중복 체크
      if (node.children?.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, error: "이미 같은 이름의 폴더가 존재합니다." }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));

        const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
        if (isDriveNode) {
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const parentDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id || wsInfo?.workspaceFolderId;
          if (token && parentDriveId) {
            await createDriveFolder(token, name, parentDriveId);
            setIsOpen(true);
            await refreshThisDirectory();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            showToast(`'${name}' 폴더가 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (node.handle) {
            await node.handle.getDirectoryHandle(name, { create: true });
          } else if (node.path) {
            // LocalStorage 가상 폴더 생성
            vfsCreateFolder(node.path, name);
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFolder) {
            await api.createFolder(node.path, name);
          } else if (node.path) {
            // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 폴더 생성 수행
            vfsCreateFolder(node.path, name);
          }
        }
        // 🆕 생성 직후 부모 폴더를 열고 새 폴더를 자동 선택/하이라이트
        setIsOpen(true);
        const newFolderPath = node.path ? `${node.path}/${name}` : name;
        await refreshThisDirectory();
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        // 새로 생성된 폴더 자동 선택 이벤트
        window.dispatchEvent(new CustomEvent('file:select-node', { detail: { path: newFolderPath } }));
      } catch(e) { showToast("생성 실패: " + e, 'error'); }
    }
  };

  // ====================================================================
  // 📊 [OMD-FILE-FileTreeItem-0007] FileTreeItem ➔ handleDelete
  // 🎯 @KICK  : 파일/폴더 삭제 처리 - 브라우저 VFS 또는 Electron API를 통해 삭제
  // 🛡️ @GUARD : askConfirm으로 사용자 재확인 후 실행; openTabPaths로 열린 파일/폴더 삭제 차단
  // 🚨 @PATCH : setTimeout 300ms 지연 인덱싱 동기화 갱신으로 OS 파일 락 방어; **2026-06-19** — 열린 탭 보호 가드 추가
  // 🔗 @CALLS : askConfirm, refreshParent, vfsDelete, openFile, showToast
  // ====================================================================
  const handleDelete = useCallback(async (e: any) => {
    e.stopPropagation();

    const isDir = node.kind === 'directory';
    const rawChildren = localChildren !== null ? localChildren : node.children;
    const hasChildren = isDir && rawChildren && rawChildren.length > 0;

    askConfirm({
      title: isDir ? "폴더 삭제" : "파일 삭제",
      message: isDir 
        ? (hasChildren 
            ? `'${node.name}' 폴더와 그 안의 모든 하위 파일/폴더를 완전히 삭제하시겠습니까?` 
            : `'${node.name}' 폴더를 정말 삭제하시겠습니까?`)
        : `'${node.name}' 파일을 정말 삭제하시겠습니까?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          // 💡 [되돌리기 지원] 파일 및 폴더 삭제 시 복원용 내용/구조 스냅샷 사전 추출
          let content = '';
          let backupPath = '';
          let items: any[] = [];
          const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
          const driveToken = isDriveNode ? getSavedDriveToken() : null;
          const driveItemId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
          if (isDriveNode && (!driveToken || !driveItemId)) {
            showToast('구글 드라이브 연결과 삭제 대상 정보를 확인해 주세요.', 'error');
            return;
          }

          try {
            if (isDriveNode) {
              // Drive folders remain intact in the trash; never back them up through OS APIs.
              // The original file ID and contents are preserved in Drive trash.
            } else if (!isDir) {
              if (workspaceType === 'browser') {
                if (node.handle) {
                  const f = await node.handle.getFile();
                  content = f;
                } else if (node.path) {
                  content = vfsReadFile(node.path) || '';
                }
              } else {
                const api = (window as any).electronAPI;
                if (api?.readFromPath && node.path) {
                  const res = await api.readFromPath(node.path);
                  content = res?.content || '';
                } else if (node.path) {
                  const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(node.path)}`));
                  if (res.ok) {
                    const data = await res.json();
                    content = data.content || '';
                  }
                }
              }
            } else {
              // 📂 폴더 삭제 전 전체 하위 파일/폴더 스냅샷 백업
              if (workspaceType === 'browser') {
                if (node.handle) {
                  items = await snapshotFsaDirectory(node.handle);
                } else if (node.path) {
                  // VFS 폴더 하위 항목 스냅샷
                  try {
                    const normPath = node.path.replace(/\\/g, '/').toLowerCase();
                    const allKeys = localStorage.keys();
                    for (const k of allKeys) {
                      if (k.startsWith('vfs:')) {
                        const filePath = k.slice(4);
                        const normFp = filePath.replace(/\\/g, '/').toLowerCase();
                        if (normFp.startsWith(normPath + '/')) {
                          const rel = filePath.slice(node.path.length).replace(/^[/\\]+/, '');
                          items.push({ relativePath: rel, kind: 'file', content: localStorage.getItem(k) || '' });
                        }
                      }
                    }
                  } catch (vfsErr) {
                    console.warn('[handleDelete] VFS folder snapshot error:', vfsErr);
                  }
                }
              } else {
                // Desktop Electron 환경: 임시 백업 폴더 생성
                const api = (window as any).electronAPI;
                if (api?.backupFolderForUndo && node.path) {
                  const res = await api.backupFolderForUndo(node.path);
                  if (res?.success && res.backupPath) {
                    backupPath = res.backupPath;
                  } else throw new Error(res?.error || '폴더를 백업하지 못했습니다.');
                }
              }
            }
          } catch (err) {
            throw new Error('복원용 백업을 만들지 못해 삭제하지 않았습니다: ' + ((err as any).message || err));
          }

          const normalizedPath = (node.path || node.name).replace(/\\/g, '/');
          const lastSlash = normalizedPath.lastIndexOf('/');
          const parentPath = lastSlash !== -1 ? normalizedPath.substring(0, lastSlash) : '';

          const undoAction = {
              type: 'delete',
              name: node.name,
              path: node.path || node.name,
              parentPath,
              kind: node.kind,
              content,
              backupPath,
              items,
              parentHandle,
              workspaceType: isDriveNode ? 'cloud' : workspaceType,
              driveId: isDriveNode ? driveItemId : undefined,
              accountEmail: isDriveNode ? getSavedWorkspaceInfo()?.userEmail : undefined,
          };

          if (isDriveNode) {
            const token = getSavedDriveToken();
            const targetDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
            if (token && targetDriveId) {
              await trashDriveItem(token, targetDriveId);
              if (isDir && node.path) {
                try {
                  const saved = localStorage.getItem('onrivi_expanded_paths');
                  if (saved) {
                    const normPath = node.path.replace(/\\/g, '/');
                    const paths = JSON.parse(saved).filter((p: string) => {
                      const np = p.replace(/\\/g, '/');
                      return np !== normPath && !np.startsWith(normPath + '/');
                    });
                    localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
                  }
                } catch {}
              }
              refreshParent();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            } else {
              showToast("구글 드라이브 삭제 대상 식별자가 누락되었습니다.", "error");
              return;
            }
          } else if (workspaceType === 'browser') {
            if (node.handle) {
              // 🚀 폴더 및 파일 재귀 삭제 지원 (recursive: true)
              await parentHandle.removeEntry(node.name, { recursive: true });
              if (isDir && node.path) {
                try {
                  const saved = localStorage.getItem('onrivi_expanded_paths');
                  if (saved) {
                    const normPath = node.path.replace(/\\/g, '/');
                    const paths = JSON.parse(saved).filter((p: string) => {
                      const np = p.replace(/\\/g, '/');
                      return np !== normPath && !np.startsWith(normPath + '/');
                    });
                    localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
                  }
                } catch {}
              }
              refreshParent();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            } else if (node.path) {
              // LocalStorage 가상 파일/폴더 삭제
              vfsDelete(node.path);
              if (isDir && node.path) {
                try {
                  const saved = localStorage.getItem('onrivi_expanded_paths');
                  if (saved) {
                    const normPath = node.path.replace(/\\/g, '/');
                    const paths = JSON.parse(saved).filter((p: string) => {
                      const np = p.replace(/\\/g, '/');
                      return np !== normPath && !np.startsWith(normPath + '/');
                    });
                    localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
                  }
                } catch {}
              }
              refreshParent();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            }
          } else {
            const api = (window as any).electronAPI;
            if (api?.deleteFile) {
              await api.deleteFile(node.path);
            } else if (node.path) {
              // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 삭제 수행
              vfsDelete(node.path);
            }
            if (isDir && node.path) {
              try {
                const saved = localStorage.getItem('onrivi_expanded_paths');
                if (saved) {
                  const normPath = node.path.replace(/\\/g, '/').toLowerCase();
                  const paths = JSON.parse(saved).filter((p: string) => {
                    const np = p.replace(/\\/g, '/').toLowerCase();
                    return np !== normPath && !np.startsWith(normPath + '/');
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
                }
              } catch {}
            }
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
          }
          window.dispatchEvent(new CustomEvent('file:push-undo-action', { detail: undoAction }));
          // 🚀 삭제된 파일/폴더와 연관된 탭들을 즉시 닫도록 이벤트 발송 (클라우드 driveId, 정확한 path, isDir 전수 전송)
          // 🛡️ [동일 파일명 오종료 방어]: 단순 파일명(currentFileName === node.name) 비교로 openFile(null)을 호출하지 않고
          // MainEditorApp의 handleCloseTabByPath에서 정확한 경로/ID 기반으로 대상 탭만 안전하게 종료합니다.
          const targetDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
          window.dispatchEvent(new CustomEvent('file:tab-deleted', { detail: { deletedPath: node.path || node.name, driveId: targetDriveId } }));
          window.dispatchEvent(new CustomEvent('file:close-tab-by-path', { 
            detail: { 
              path: node.path || node.name, 
              name: node.name, 
              driveId: targetDriveId,
              isDir: isDir
            } 
          }));
          showToast(`[${node.name}] ${isDir ? "폴더" : "파일"}가 삭제되었습니다.`, 'success');
        } catch(e: any) { 
          const errStr = e.message || e.toString();
          showToast("삭제 실패: " + errStr, 'error'); 
        }
      }
    });
  }, [node, showToast, localChildren, askConfirm, workspaceType, parentHandle, refreshParent]);

  const isSelected = (() => {
    if (currentFilePath && node.path) {
      const normCur = currentFilePath.replace(/\\/g, '/').toLowerCase();
      const normNode = node.path.replace(/\\/g, '/').toLowerCase();
      return normCur === normNode;
    }
    // 🛡️ 한쪽이라도 경로가 있으면 서로 다른 경로이므로 동명 파일이라도 false 처리
    if (currentFilePath || node.path) {
      return false;
    }
    if (currentFileName && node.name) {
      return currentFileName.toLowerCase() === node.name.toLowerCase();
    }
    return false;
  })();

  const isMergeSelected = node.kind === 'file' && selectedMergeNodes.some(n => n.path ? n.path === node.path : n.name === node.name);
  const isMarkdown = node.kind === 'file' && node.name.toLowerCase().endsWith('.md');
  const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

  const triggerCreateFile = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    setPromptConfig({
      isOpen: true,
      title: `[${node.name}]에 생성할 새 파일의 이름을 입력하세요.`,
      defaultValue: "untitled.md",
      type: 'createFile'
    });
  }, [node.name]);

  const triggerCreateFolder = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    setPromptConfig({
      isOpen: true,
      title: `[${node.name}]에 생성할 새 폴더의 이름을 입력하세요.`,
      defaultValue: "",
      type: 'createFolder'
    });
  }, [node.name]);

  const triggerRename = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    const isDir = node.kind === 'directory';
    setPromptConfig({
      isOpen: true,
      title: isDir 
        ? `'${node.name}' 폴더의 새 이름을 입력하세요.` 
        : `'${node.name}' 파일의 새 이름을 입력하세요.`,
      defaultValue: node.name,
      type: 'rename'
    });
  }, [node.kind, node.name]);

  const triggerCopy = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:copy-node', {
      detail: { node, parentHandle }
    }));
  }, [node, parentHandle]);

  const triggerCut = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:cut-node', {
      detail: { node, parentHandle }
    }));
  }, [node, parentHandle]);

  const triggerPaste = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    if (node.kind === 'directory') {
      if (!isOpen) {
        setIsOpen(true);
      }
    }
    window.dispatchEvent(new CustomEvent('file:paste-node', {
      detail: { 
        targetDirNode: node, 
        targetHandle: node.kind === 'directory' ? node.handle : parentHandle 
      }
    }));
  }, [node, parentHandle, isOpen]);

  const triggerReveal = useCallback(async (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    const api = (window as any).electronAPI;
    if (node.kind === 'file' && api?.showItemInFolder && node.path) {
      await api.showItemInFolder(node.path);
    } else if (api?.openPath && node.path) {
      await api.openPath(node.path);
    }
  }, [node.kind, node.path]);

  const triggerCancelCut = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:cancel-cut'));
  }, []);

  const triggerUndoMove = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:undo-move'));
  }, []);

  const triggerDelete = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    handleDelete(e);
  }, [handleDelete]);

  // ⌨️ [단축키 연동] 컨텍스트 메뉴 오픈 시 일반 단축키 즉각 실행
  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        e.preventDefault();
        setContextMenu(null);
        if (hasClipboardCut) {
          window.dispatchEvent(new CustomEvent('file:cancel-cut'));
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        triggerRename(e);
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        triggerDelete(e);
        return;
      }

      if (isCtrl && e.altKey && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        if (node.kind === 'directory') {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu(null);
          window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { node, parentHandle: node.handle || parentHandle } }));
        }
        return;
      }

      if (e.altKey && !isCtrl && (e.key === 'N' || e.key === 'n')) {
        if (node.kind === 'directory') {
          e.preventDefault();
          e.stopPropagation();
          triggerCreateFile(e);
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        triggerCopy(e);
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        triggerCut(e);
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        e.stopPropagation();
        triggerPaste(e);
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu(null);
        if (hasClipboardCut) {
          window.dispatchEvent(new CustomEvent('file:cancel-cut'));
        } else if (hasUndoableMove) {
          window.dispatchEvent(new CustomEvent('file:undo-move'));
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [contextMenu, isMac, hasClipboardCut, hasUndoableMove, node, parentHandle, triggerRename, triggerDelete, triggerCreateFile, triggerCopy, triggerCut, triggerPaste]);

  // 🧠 지식 베이스 등록 여부 추적 (데스크톱 전용 기능)
  const [isKnowledgeRegistered, setIsKnowledgeRegistered] = useState(false);
  useEffect(() => {
    if (!isDesktop || !isMarkdown) {
      setIsKnowledgeRegistered(false);
      return;
    }
    const checkRegistered = () => {
      try {
        const registeredList = JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
        if (!Array.isArray(registeredList) || registeredList.length === 0) {
          setIsKnowledgeRegistered(false);
          return;
        }

        const norm = (s: string) => (s || '').replace(/\\/g, '/').toLowerCase().trim();
        const myPath = norm(node.path || node.name);
        const myName = norm(node.name);

        const matched = registeredList.some((rawP: string) => {
          const p = norm(rawP);
          return (
            p === myPath ||
            p === myName ||
            p.endsWith('/' + myName) ||
            myPath.endsWith('/' + p) ||
            p.endsWith(myPath) ||
            myPath.endsWith(p)
          );
        });

        setIsKnowledgeRegistered(matched);
      } catch {
        setIsKnowledgeRegistered(false);
      }
    };

    checkRegistered();
    window.addEventListener('knowledge:updated', checkRegistered);
    window.addEventListener('file:refresh-all-directories', checkRegistered);
    return () => {
      window.removeEventListener('knowledge:updated', checkRegistered);
      window.removeEventListener('file:refresh-all-directories', checkRegistered);
    };
  }, [node.path, node.name, isMarkdown, isDesktop]);

  return (
    <div className="select-none">
      <PromptModal 
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        defaultValue={promptConfig.defaultValue}
        error={promptConfig.error}
        onConfirm={onPromptConfirm}
        onCancel={() => setPromptConfig({ ...promptConfig, isOpen: false, error: '' })}
      />
      <div 
        ref={itemRef}
        data-path={node.path}
        data-kind={node.kind}
        title={node.name}
        tabIndex={0}
        role="treeitem"
        aria-selected={isSelected}
        draggable={!isMergeMode && !isRestrictedUser}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseLeave={handleItemMouseLeave}
        onMouseDown={() => {
          itemRef.current?.focus();
        }}
        onKeyDown={(e) => {
          if (isMergeMode || isRestrictedUser) return;
          const target = e.target as HTMLElement;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

          const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

          if (e.key === 'F2') {
            e.preventDefault();
            e.stopPropagation();
            triggerRename(e);
            return;
          }
          if (e.key === 'Delete') {
            e.preventDefault();
            e.stopPropagation();
            triggerDelete(e);
            return;
          }
          if (isCmdOrCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
            e.preventDefault();
            e.stopPropagation();
            triggerCopy(e);
            return;
          }
          if (isCmdOrCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
            e.preventDefault();
            e.stopPropagation();
            triggerCut(e);
            return;
          }
          if (isCmdOrCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
            e.preventDefault();
            e.stopPropagation();
            triggerPaste(e);
            return;
          }
          if (isCmdOrCtrl && e.altKey && !e.shiftKey && (e.key === 'o' || e.key === 'O') && node.kind === 'directory') {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { node, parentHandle: node.handle || parentHandle } }));
            return;
          }
          if (e.altKey && !isCmdOrCtrl && (e.key === 'N' || e.key === 'n') && node.kind === 'directory') {
            e.preventDefault();
            e.stopPropagation();
            triggerCreateFile(e);
            return;
          }
        }}
        className={`group relative flex items-center w-full py-1 pr-2 my-0.5 rounded-lg transition-colors duration-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]/40 ${
          isSelected 
            ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-sm' 
            : isDragOver
              ? 'bg-[#1d4ed8]/20 ring-1 ring-[#1d4ed8]'
              : 'text-[#2A2A2A] dark:text-[#D4D4D4] hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60 hover:text-black dark:hover:text-white hover:shadow-2xs'
        } ${isCut ? 'opacity-40 italic' : ''}`}
        style={{ 
          paddingLeft: `${(level * 12) + 8}px`,
          fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif"
        }}
        onClick={handleClick}
        onContextMenu={(e) => {
          if (isMergeMode) return;
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('close-context-menus'));
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center mr-0.5 opacity-60 origin-center">
          {node.kind === 'directory' ? (
            isOpen ? <Icon name="ArrowDown" size={12} /> : <Icon name="ArrowRight" size={12} />
          ) : null}
        </span>
        
        {isMergeMode && isMarkdown && (
          <input 
            type="checkbox" 
            checked={isMergeSelected}
            onChange={() => toggleMergeNodeSelect?.(node)}
            className="w-2.5 h-2.5 mr-1.5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-1 cursor-pointer shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 origin-center text-current">
          {getFileIcon(node, isSelected, isOpen)}
        </span>
        
        <span className="ml-1.5 truncate text-[12px] font-bold text-left flex-1 flex items-center gap-1">
          <span className="truncate">{node.name}</span>
          {isKnowledgeRegistered && (
            <span className="text-[11px] shrink-0 select-none animate-in fade-in zoom-in-75 duration-200" title="지식 베이스에 등록된 문서입니다">📗</span>
          )}
        </span>

        {contextMenu && !isMergeMode && createPortal(
          <div
            ref={(el) => {
              if (el && typeof window !== 'undefined') {
                const rect = el.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 10) {
                  const newTop = Math.max(10, window.innerHeight - rect.height - 12);
                  el.style.top = `${newTop}px`;
                }
                if (rect.right > window.innerWidth - 10) {
                  const newLeft = Math.max(10, window.innerWidth - rect.width - 12);
                  el.style.left = `${newLeft}px`;
                }
              }
            }}
            className="fixed z-[100000] py-1 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-black/10 dark:border-white/10 min-w-[210px] max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100"
            style={{ 
              top: Math.max(10, Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 340 : contextMenu.y)), 
              left: Math.max(10, Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 240 : contextMenu.x)) 
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            <fieldset disabled={isRestrictedUser} className="flex flex-col text-[12px] text-gray-700 dark:text-gray-300 font-medium [&_button:disabled]:pointer-events-none [&_button:disabled]:opacity-40 [&_button:disabled]:cursor-not-allowed">
              {node.kind === 'directory' && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); triggerCreateFile(e); }}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="FileAdd" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                      <span className="truncate">새 파일</span>
                    </div>
                    <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌥N' : 'Alt+N'}</kbd>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); triggerCreateFolder(e); }}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="FolderAdd" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                      <span className="truncate">새 폴더</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setContextMenu(null);
                      window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { node, parentHandle: node.handle || parentHandle } })); 
                    }}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors text-blue-600 dark:text-blue-400 font-medium"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="Document" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                      <span className="truncate">파일 열기</span>
                    </div>
                    <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌥⌘O' : 'Ctrl+Alt+O'}</kbd>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu(null);
                      const targetPath = node.path || node.name;
                      const relPath = computeRelativeFolderPath(currentFilePath, targetPath);
                      const folderLink = `[${node.name}](<${relPath}>)`;
                      try {
                        navigator.clipboard.writeText(folderLink);
                      } catch {}
                      window.dispatchEvent(new CustomEvent('app:insert-folder-link', {
                        detail: { link: folderLink, folderName: node.name }
                      }));
                    }}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors text-blue-600 dark:text-blue-400 font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="Link" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                      <span className="truncate">폴더 연결</span>
                    </div>
                  </button>
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); triggerRename(e); }}
                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="Pencil" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">이름 변경</span>
                </div>
                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">F2</kbd>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); triggerCopy(e); }}
                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="Copy" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">복사하기</span>
                </div>
                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘C' : 'Ctrl+C'}</kbd>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); triggerCut(e); }}
                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="Cut" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">잘라내기</span>
                </div>
                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘X' : 'Ctrl+X'}</kbd>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); triggerPaste(e); }}
                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="ClipboardPaste" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">붙여넣기</span>
                </div>
                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘V' : 'Ctrl+V'}</kbd>
              </button>
              {hasClipboardCut && (
                <button
                  onClick={(e) => { e.stopPropagation(); triggerCancelCut(e); }}
                  className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors text-amber-600 dark:text-amber-400 font-medium"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon name="Undo2" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                    <span className="truncate">잘라내기 취소</span>
                  </div>
                  <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">Esc</kbd>
                </button>
              )}
              {hasUndoableMove && (
                <button
                  onClick={(e) => { e.stopPropagation(); triggerUndoMove(e); }}
                  className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon name="Undo2" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                    <span className="truncate">{lastUndoType === 'delete' ? '삭제 되돌리기' : '이동 되돌리기'}</span>
                  </div>
                  <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘Z' : 'Ctrl+Z'}</kbd>
                </button>
              )}
              {(() => {
                const isElectronApp = typeof window !== 'undefined' && !!(window as any).electronAPI;
                if (!isElectronApp || !node.path) return null;
                const label = isMac ? 'Finder에서 보기' : '파일 탐색기에서 보기';
                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerReveal(e);
                    }}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon name="FolderOpen" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                      <span className="truncate">{label}</span>
                    </div>
                  </button>
                );
              })()}
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  triggerDelete(e); 
                }}
                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 w-full text-left transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="Delete" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">삭제</span>
                </div>
                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">Del</kbd>
              </button>

                  {/* 🧠 지식 베이스 등록 버튼 (마크다운 전용) */}
                  {node.kind === 'file' && isMarkdown && (() => {
                    let rawFolder = (
                      loadSecureData<string>('resourceFolder') ||
                      (typeof window !== 'undefined' ? localStorage.getItem('onrivi_resource_folder_path') : '') ||
                      (typeof window !== 'undefined' ? localStorage.getItem('onrivi_resource_folder') : '') ||
                      (() => {
                        try {
                          const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
                          return raw ? JSON.parse(raw).resourceFolder || '' : '';
                        } catch { return ''; }
                      })() ||
                      'Onrivi_Asset'
                    ).trim();

                    if (rawFolder.startsWith('U2FsdGVkX1')) {
                      const decrypted = loadSecureData<string>('resourceFolder');
                      rawFolder = (decrypted && !decrypted.startsWith('U2FsdGVkX1')) ? decrypted : 'Onrivi_Asset';
                    }
                    const resourceFolder = rawFolder || 'Onrivi_Asset';

                    const geminiApiKey = (
                      (typeof window !== 'undefined' ? localStorage.getItem('onrivi_gemini_api_key') : '') ||
                      loadSecureData<string>('geminiApiKey') ||
                      loadSecureData<string>('onrivi_gemini_api_key') ||
                      (() => {
                        try {
                          const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
                          return raw ? JSON.parse(raw).geminiApiKey || '' : '';
                        } catch { return ''; }
                      })() ||
                      ''
                    ).trim();

                    const planCode = (() => {
                      try {
                        const status = loadSecureData<any>('onrivi_license_status');
                        if (status?.planName) return String(status.planName);
                      } catch {}
                      return loadSecureData<string>('planCode') || 'ELITEPRO';
                    })();

                    const aiModelName = (
                      (typeof window !== 'undefined' ? localStorage.getItem('onrivi_ai_model_name') : '') ||
                      (() => {
                        try {
                          const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
                          return raw ? JSON.parse(raw).aiModelName || '' : '';
                        } catch { return ''; }
                      })() ||
                      'gemini-3.8-flash'
                    ).trim();

                    const isDesktopEnv = typeof window !== 'undefined' && (
                      !!(window as any).electronAPI ||
                      navigator.userAgent.toLowerCase().includes('electron') ||
                      new URLSearchParams(window.location.search).get('env') === 'desktop'
                    );

                    // 🚀 웹 브라우저(SaaS) 환경에서는 지식문서 등록/해제 메뉴를 숨김 (데스크톱 전용 기능)
                    if (!isDesktopEnv) {
                      return null;
                    }

                    const guard = checkKnowledgeGuard({ resourceFolder, geminiApiKey, planCode });

                    const performKnowledgeIndex = async (isReindex: boolean) => {
                      setContextMenu(null);
                      const canUseLocalDb = await canAccessKnowledgeDb();
                      if (!canUseLocalDb) {
                        showToast('로컬 지식 베이스를 사용하려면 먼저 공통 리소스 폴더(Onrivi_Asset)를 지정해 주세요.', 'info');
                        return;
                      }
                      if (!guard.canUseKnowledge) {
                        showToast(guard.blockMessage || '지식 엔진을 사용할 수 없습니다.', 'warning');
                        window.dispatchEvent(new CustomEvent('app:dispatch-command', { detail: 'SETTINGS' }));
                        return;
                      }

                      // 🛡️ [스캔 배제]: 로컬스토리지 작업장 절대경로와 다이렉트 직결!
                      const directFilePath = buildDirectWorkspacePath(node.path || node.name);

                      // 🚀 전용 실시간 진행 모달 팝업 및 파이프라인 가동
                      window.dispatchEvent(new CustomEvent('knowledge:open-index-progress', {
                        detail: {
                          filePath: directFilePath,
                          title: node.name.replace(/\.md$/i, ''),
                          isReindex,
                          fileNode: node,
                          resourceFolder,
                          geminiApiKey,
                          planCode,
                          aiModelName,
                        }
                      }));
                    };

                    return (
                      <>
                        <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
                        {isKnowledgeRegistered ? (
                          <>
                            {/* 📑 지식 문서 상세 분석 (KUI-010) */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setContextMenu(null);
                                const canUseLocalDb = await canAccessKnowledgeDb();
                                if (!canUseLocalDb) {
                                  showToast('로컬 지식 베이스를 사용하려면 먼저 공통 리소스 폴더(Onrivi_Asset)를 지정해 주세요.', 'info');
                                  return;
                                }
                                const myPath = node.path || node.name;
                                try {
                                  showToast(`[${node.name}] 지식 상세 분석을 불러오는 중...`, 'info');
                                  const detail = await knowledgeClient.getDocumentDetail({
                                    filePath: myPath,
                                    resourceFolder,
                                    geminiApiKey,
                                    planCode,
                                    resourceFolderHandle: typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined,
                                  });
                                  if (detail) {
                                    window.dispatchEvent(new CustomEvent('knowledge:show-detail', { detail }));
                                  } else {
                                    showToast('지식 상세 정보를 찾을 수 없습니다.', 'warning');
                                  }
                                } catch {
                                  showToast('지식 상세 정보 로드 실패', 'error');
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
                              title="이 문서의 AI 요약, 핵심 요점, 청크 구조 및 태그를 상세 열람합니다"
                            >
                              <span className="text-[14px]">📑</span>
                              <span>지식 분석 상세 (KUI-010)</span>
                            </button>

                            {/* 🔄 지식 재분석 (최신 규칙으로 재색인) */}
                            <button
                              type="button"
                              disabled={!guard.canUseKnowledge}
                              onClick={(e) => {
                                e.stopPropagation();
                                performKnowledgeIndex(true);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-500/10 text-[#1d4ed8] dark:text-blue-400 font-bold cursor-pointer"
                              title="최신 청킹 규칙 및 AI 분석 모델로 이 문서를 다시 분석하여 갱신합니다"
                            >
                              <span className="text-[14px]">🔄</span>
                              <span>지식 재분석 (재색인)</span>
                            </button>

                            {/* 🧠 지식문서 해제 버튼 */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setContextMenu(null);
                                const canUseLocalDb = await canAccessKnowledgeDb();
                                if (!canUseLocalDb) {
                                  showToast('로컬 지식 베이스를 사용하려면 먼저 공통 리소스 폴더(Onrivi_Asset)를 지정해 주세요.', 'info');
                                  return;
                                }
                                const myPath = node.path || node.name;
                                if (!confirm(`'${node.name}' 문서를 지식 베이스에서 해제하시겠습니까?`)) return;

                                 try {
                                  showToast(`[${node.name}] 지식 문서 해제를 진행합니다...`, 'info');
                                  const ok = await knowledgeClient.deleteDocument({
                                    filePath: myPath,
                                    resourceFolder,
                                    geminiApiKey,
                                    planCode,
                                    resourceFolderHandle: typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined,
                                  });
                                  if (!ok) {
                                    throw new Error('지식 문서 해제에 실패했습니다.');
                                  }

                                  // 로컬 캐시에서 제거 (슬래시/역슬래시 및 파일명 접미사 정규화 비교로 완벽 제거)
                                  try {
                                    const list = JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
                                    const norm = (s: string) => (s || '').replace(/\\/g, '/').toLowerCase().trim();
                                    const targetP = norm(myPath);
                                    const targetN = norm(node.name);

                                    const updated = (Array.isArray(list) ? list : []).filter((rawP: string) => {
                                      const p = norm(rawP);
                                      const isTarget =
                                        p === targetP ||
                                        p === targetN ||
                                        p.endsWith('/' + targetN) ||
                                        targetP.endsWith('/' + p) ||
                                        p.endsWith(targetP) ||
                                        targetP.endsWith(p);
                                      return !isTarget;
                                    });
                                    localStorage.setItem('onrivi_registered_knowledge_docs', JSON.stringify(updated));
                                  } catch {}

                                  showToast(`[${node.name}] 지식 문서 등록이 성공적으로 해제되었습니다.`, 'info');
                                  setIsKnowledgeRegistered(false);
                                  window.dispatchEvent(new CustomEvent('knowledge:updated'));
                                  window.dispatchEvent(new CustomEvent('knowledge:refresh'));
                                  window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                                } catch (err: any) {
                                  showToast(`지식 해제 실패: ${err?.message || '알 수 없는 오류'}`, 'error');
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold cursor-pointer"
                              title="이 마크다운 문서를 지식 베이스에서 해제합니다"
                            >
                              <span className="text-[14px]">📗</span>
                              <span>지식문서 해제</span>
                            </button>
                          </>
                        ) : (
                          /* ⭐ 지식 베이스에 등록 버튼 */
                          <button
                            type="button"
                            disabled={!guard.canUseKnowledge}
                            onClick={(e) => {
                              e.stopPropagation();
                              performKnowledgeIndex(false);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors font-bold ${
                              !guard.canUseKnowledge
                                ? 'opacity-40 cursor-not-allowed grayscale text-zinc-400 dark:text-zinc-500'
                                : 'hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-pointer'
                            }`}
                            title={guard.canUseKnowledge ? "이 마크다운 문서를 개인 지식 베이스에 등록합니다" : (guard.blockMessage || "지식 베이스에 등록하려면 AI 연동 설정이 필요합니다")}
                          >
                            <span className="text-[14px]">⭐</span>
                            <span>지식문서 등록{!guard.canUseKnowledge ? ' (연동 필요)' : ''}</span>
                          </button>
                        )}
                      </>
                    );
                  })()}
            </fieldset>
          </div>,
          document.body
        )}
      </div>

      {node.kind === 'directory' && isOpen && (() => {
        const rawChildren = localChildren !== null ? localChildren : node.children;
        if (!rawChildren) return null;
        const children = rawChildren.filter(child => child.kind === 'directory' || child.name.toLowerCase().endsWith('.md') || child.name.toLowerCase().endsWith('.markdown') || child.name.toLowerCase().endsWith('.bib'));
        if (isLoading) {
          return <div className="text-[10px] text-zinc-400 pl-6 py-1 italic">불러오는 중...</div>;
        }
        return (
          <div className="mt-px">
            {children.length === 0 && (
              <div className="text-[10px] text-zinc-400 pl-6 py-1 italic">빈 폴더</div>
            )}
            {children.map((child) => (
              <FileTreeItem 
                key={child.path || (node.path ? `${node.path}/${child.name}` : child.name)} 
                node={child} 
                parentHandle={node.handle}
                level={level + 1}
                openFile={openFile}
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
                currentFileName={currentFileName}
                currentFilePath={currentFilePath}
                workspaceType={workspaceType}
                refreshParent={refreshThisDirectory}
                onRefreshAll={onRefreshAll}
                openTabPaths={openTabPaths}
                askConfirm={askConfirm}
                siblings={children}
                isMergeMode={isMergeMode}
                selectedMergeNodes={selectedMergeNodes}
                toggleMergeNodeSelect={toggleMergeNodeSelect}
                onLazyLoad={onLazyLoad}
                isRestrictedUser={isRestrictedUser}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default FileTreeItem;
