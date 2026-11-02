// ====================================================================
// 📊 [OMD-UI-LeftSidebar-0001] LeftSidebar.tsx ➔ 에디터 좌측 탐색기 사이드바
// 🚨 @PATCH : **2026-10-27** — [탐색기 새 파일/폴더 생성 대화상자 타이틀 문장 부호 마침표(.) 표준화]:
//             1) triggerCreateRootFile 및 triggerCreateRootFolder의 title 문구 끝 콜론(':')을 표준 마침표('.')로 수정
// 🚨 @PATCH : **2026-10-16** — [전역 검색(GlobalSearch) 전 환경 경로·하위 폴더 파일 열기 및 줄 점프 무결성 완비]:
//             1) GlobalSearch에 rootFolder, currentFilePath 및 유효 로컬 작업장 경로를 정확히 전달하여 상대 경로/구글 드라이브 가상 경로 혼선에 의한 검색 불능 해결
//             2) onFileOpenAndJump에서 검색 결과의 handle / driveFileId 직접 열기, 브라우저 FSA 하위 폴더 경로 재귀 추적(getDirectoryHandle ➔ getFileHandle), VFS 폴백 및 비동기 openFile 완료 후 executeJumpAndHighlight 실행 보장
//             3) 검색 탭 클릭 시 onrivi:focus-global-search 이벤트를 발송하여 검색어 입력창 자동 포커스 연동
// 🚨 @PATCH : **2026-10-15** — [웹드라이브 작업장 상태 시 내 PC 로컬 작업장 원클릭 복구 버튼 신설]:
//             1) 웹드라이브(GDRIVE) 상태에서 상단 워크스페이스 바에 [🔌 로컬 복귀] 버튼을 명확히 노출
//             2) 웹드라이브 작업장 폴더가 비어있을 때 사용자가 당황하지 않도록 [🏠 내 PC 로컬 작업장으로 복귀] 원클릭 카드 제공
// 🚨 @PATCH : **2026-10-15** — [개인 웹드라이브 명칭 및 계정 선택 표준화]:
//             '내 구글 드라이브 연결' 및 '구글 드라이브 재접속' 버튼/타이틀을 '개인 웹드라이브 연결' 및 '개인 웹드라이브 재접속'으로 일원화
// 🚨 @PATCH : **2026-10-14** — [전역 검색(GlobalSearch) 작업장 경로 3중 연동 및 실시간 하이브리드 검색 지원]:
//             1) GlobalSearch에 rootFolder.name 부재 시 localStorage의 onrivi_workspace_path를 자동 연계하여 데스크톱 작업장 검색 무결성 보장
// 🚨 @PATCH : **2026-10-13** — [React Hooks exhaustive-deps 린트 경고 완전 해소 및 의존성 최적화]:
//             1) openImportPicker 및 chooseImportDestination을 useCallback으로 메모이제이션하고 루트 액션 트리거 상단으로 스코프 재배치
//             2) triggerImportRoot의 useCallback 및 TRIGGER_IMPORT 이벤트 리스너의 useEffect 의존성 배열에 openImportPicker를 안전하게 주입하여 Next.js ESLint 경고 완전 제거
// 🚨 @PATCH : **2026-10-11** — [탐색기 스크롤 조작 최우선권 보장 및 리사이저 바 경계선 외곽 격리]:
//             1) 사이드바 내부 12px 스크롤바를 덮고 마우스 이벤트를 가로채던 right-0 리사이저 바를 left-[calc(100%-1px)] 외곽으로 완전 격리하여 스크롤 조작 100% 보장
//             2) 호버 시 번쩍이던 두꺼운 파란색 띠를 경계선 전용 2px 코발트 인디케이터로 슬림화하여 시각적 간섭 및 혼선 완전 해결
// 🚨 @PATCH : **2026-10-10** — [탐색기 및 사이드바 스크롤바 폭 100% 확대 (6px -> 12px) 및 시인성 강화]: 기존 6px 규격의 얇은 스크롤바로 인한 조작 불편을 해소하기 위해 explorer-scrollbar를 적용하고 폭을 12px(100% 확대)로 확장, 호버 반응 및 다크모드 대비 최적화
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더(참조파일 등) media 하위폴더 직결 바인딩]: 타문서 변환 이미지 저장 시 cloudSettings.mediaFolderId 우선 참조 및 부모 리소스 폴더 하위 탐색으로 안전 업로드
// 🚨 @PATCH : **2026-10-04** — [구글 드라이브 파일/폴더 복사·잘라내기·붙여넣기·루트 이동 전면 지원]: handlePasteNode 및 handleDropRoot에 GDRIVE/cloud 분기 신설 — moveDriveItem(이동), copyDriveFile(파일 복사), copyDriveFolderRecursive(폴더 재귀 복사) 연동
// 🚨 @PATCH : **2026-10-03** — [AI 타문서 변환 Google 503 High Demand 오류 명확한 안내 및 기본 모델 최신화]: 구글 일시적 과부하(503) 시 정확한 원인 안내 토스트 표출 및 기본 모델 gemini-3.8-flash 일원화
// 🚨 @PATCH : **2026-10-03** — [타문서 변환 이미지 저장 시 리소스 폴더(구글 드라이브 및 로컬) media 자동 연동]: 문서 가져오기 변환 시 구글 드라이브(OnriviAuthor/참조파일/media) 및 로컬 리소스 폴더의 media 디렉토리로 이미지 자동 업로드 및 연동
// 🚨 @PATCH : **2026-10-03** — [문구 표준화 및 보편적 사용자 경험 확립]: 탐색기 미연결 안내 카드의 대상을 모든 사용자로 보편화하여 누구나 편안하게 사용할 수 있는 클라우드 연동 안내로 통일
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 무설정(Zero-Config) 자동 연동 및 파일/폴더 생성 VFS 폴백 404 차단]: 폴더 미연결 상태 시 '☁️ 내 구글 드라이브 연결' 원클릭 카드 제공, 상단 워크스페이스 바 구글 계정 이름 및 연결 해제 버튼 노출, 구글 드라이브(GDRIVE) 파일 트리 탐색기 렌더링, 파일/폴더 생성(onPromptConfirm) 시 웹 환경 404 fetch 원천 차단 및 VFS/GDRIVE 연동 완벽 보장
//             **2026-09-28** — macOS 작업장 전체 경로는 내부 파일 처리에 유지하고 탐색기 선택 바·루트에는 폴더 이름만 표시
//             **2026-09-28** — 제한사용자 루트 컨텍스트 메뉴 전체 표시, 새로고침 외 항목 비활성화 및 변환 이벤트 차단
//             **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import(Plus, Scissors, FolderOpen, FolderTree, FilePlus, FolderPlus, Copy, ClipboardPaste, RotateCw, FolderInput, Undo2) 제거, Icon 컴포넌트로 교체
//             **2026-09-20** — [eslint exhaustive-deps 경고 해소] moveHistoryRef alias 제거 및 deps 배열 정리
//             **2026-09-20** — [폴더 삭제 되돌리기] 데스크탑/웹 폴더 삭제 시 스냅샷 기반 되돌리기 지원 추가
// 🔗 @CALLS : FileTreeItem, GlobalSearch, PromptModal, virtualFileSystem, indexedDbHelper
// ====================================================================
// @ts-nocheck
"use client";


import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import NewDocumentModal from '@/components/NewDocumentModal';
import { IMPORT_ACCEPT, IMPORT_PICKER_OPTIONS, isSupportedImportFile } from '@/lib/importFormats';
import { importStartFolder } from '@/lib/importStartFolder';
import { assertUndoNameAvailable } from '@/lib/explorerUndo';
import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { useDragHighlight } from '@/hooks/useDragHighlight';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import GlobalSearch from './GlobalSearch';
import FileTreeItem from './FileTreeItem';
import { FileNode } from '@/lib/indexedDbHelper';
import { vfsRename, vfsCopyItem, vfsMoveItem } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import PromptModal from '@/components/PromptModal';
import { Icon } from '@/components/icons/Icon';

import { msg } from '@/lib/systemMessages';
import { useUIStore } from '@/store/useUIStore';

import { useEditorContext } from '@/context/EditorContext';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { knowledgeClient, canAccessKnowledgeDb } from '@/lib/knowledge/knowledgeClient';
import { loadSecureData } from '@/lib/secureStorage';
import { uploadDriveImage, getSavedDriveToken, hasValidDriveToken, getSavedWorkspaceInfo, moveDriveItem, moveDriveItemWithUndo, restoreDriveItem, copyDriveFile, copyDriveFolderRecursive, prepareGoogleDriveAuth, readDriveImportFile } from '@/lib/gdrive/googleDriveClient';
import { copyImageToClipboard } from '@/lib/mediaMarkup';

// ====================================================================
// 📊 [OMD-FILE-LeftSidebar-0007] LeftSidebar ➔ LeftSidebar
// 🎯 @KICK  : 좌측 사이드바 - 탐색기(파일트리), 개요(TOC), 검색 탭 제공
// 🚨 @PATCH : **2026-10-14** — [좌측 사이드바 개요(TOC) 및 검색(GlobalSearch) 결과 클릭 시 문서 보기(VisualDocumentEditor) 1:1 연동 및 양방향 스크롤·하이라이트 완비]:
//             1) 개요(TOC) 클릭 시 VisualDocumentEditor 내의 h1~h6 헤딩 요소를 텍스트 및 인덱스 기반으로 정밀 매핑하여 previewContainer 스크롤 및 .preview-highlight-line 펄스 하이라이트 적용
//             2) 검색(GlobalSearch) 결과 클릭 시 VisualDocumentEditor(ProseMirror) 블록 내의 검색어 및 텍스트를 감지하여 해당 위치로 중앙 스크롤, .preview-highlight-line 및 CSS Custom Highlight API 검색어 인라인 하이라이트 동시 적용
//             3) onrivi:source-cursor 커스텀 이벤트를 발송하여 문서 보기 내부 ProseMirror 캐럿(Cursor) 및 텍스트 선택 영역을 실시간 동기화
//             4) 문서 보기 스크롤 시 개요(TOC) 탭의 활성 헤딩 자동 추적(Auto-follow) 및 부모 헤딩 자동 펼침 연동
// 🚨 @PATCH : **2026-10-17** — [탐색기 루트 폴더로의 파일/폴더 이동 및 붙여넣기(Cut & Paste/Drag & Drop) 전면 정상화]:
//             1) 드래그 앤 드롭 이동 수정: handleDragOverRoot에 dropEffect = "move" 부여, e.dataTransfer.getData 소문자/전역참조 폴백 보장
//             2) 루트 헤더 드롭 및 하이라이트 정상화: 루트 아이템 및 상단 워크스페이스 바, 스크롤 컨테이너 빈 영역에 onDragOver/onDrop 연동 및 코발트 블루 하이라이트(bg-[#1d4ed8]/10) 적용
//             3) 루트 붙여넣기/선택 연동: 루트 아이템 클릭 및 mousedown 시 포커스 및 선택 상태(isSelectedRoot) 활성화, Ctrl+V 단축키 연동, 상단 바 우클릭 컨텍스트 메뉴 제공
// 🚨 @PATCH : **2026-10-14** — [탐색기/리소스 폴더 이미지 파일 복사 시 네이티브 비트맵 클립보드 동기화(copyImageToClipboard)]: 탐색기에서 이미지 파일(.png, .jpg 등) 복사(Ctrl+C 또는 복사하기) 시 인메모리 노드 복사뿐만 아니라 OS 시스템 클립보드에도 실제 비트맵 이미지를 직접 기록하여 그림판/Word/카카오톡/ImageModal/에디터에 100% 정상 붙여넣기 지원
// 🚨 @PATCH : **2026-09-30** — [미리보기 폴더 링크 클릭 시 탐색기 증발 결함 수정 및 트리 자동 전개 완비]: handleFocusTreeFolder에서 탐색기 탭 ID('explorer') 오기입('files' -> 'explorer')으로 인해 트리 영역이 hidden 처리되던 결함을 수정하고, 웹 환경에서 루트 폴더명이 접두어로 붙은 상대 경로(relativeToRoot)를 자동 분리하여 onrivi_expanded_paths에 동시 등록함으로써 하위/상위 폴더가 즉시 펼쳐지고 부드러운 스크롤 및 코발트 블루 링 하이라이트가 100% 완벽 연동되도록 조치
// 🚨 @PATCH : **2026-09-18** — [폴더 삭제 되돌리기(Undo) 전면 지원 및 탐색기 덜렁거림·깜빡임 완전 해소]:
//             1) 폴더 삭제 되돌리기: handleUndoMove에서 kind === 'directory' 지원(데스크톱 api.restoreFolderFromUndo, 웹 FSA restoreFsaDirectory, VFS 복원 및 onrivi_expanded_paths 자동 전개)
//             2) 탐색기 덜렁거림 제거: 120ms 중복 재새로고침 제거(단일 갱신 일원화), aside 너비 고정(shrink-0 min-w/max-w), [scrollbar-gutter:stable], handleDragLeaveRoot 자식 진입 방어
// 🚨 @PATCH : **2026-09-18** — [데스크톱(Electron) 환경 파일 탐색기 기능 동기화 및 패리티 완성]:
//             1) handlePasteNode: destDirPath 끝 슬래시 정규화, 대소문자 무관 이동 가드, api.moveFile/copyFile 에러 검증 및 onrivi_expanded_paths/undoHistory 갱신
//             2) handleUndoMove: 폴더 이동 되돌리기 시 onrivi_expanded_paths 역방향 갱신 및 삭제 되돌리기 시 parentPath 강제 새로고침 전달
//             3) handleDropRoot: actualRootPath 정규화, api.moveFile 우선 호출, undoHistory 및 onrivi_expanded_paths 갱신
// 🚨 @PATCH : **2026-09-18** — [열린 문서가 포함된 폴더의 잘라내기/붙여넣기 및 되돌리기 전면 허용]:
//             1) handlePasteNode에서 열린 탭 존재 시 폴더 이동을 차단하던 가드를 전면 해제하여 열린 문서가 있는 폴더도 자유롭게 잘라내기/붙여넣기 가능
//             2) 폴더 이동 시 대상 폴더 자동 펼침(onrivi_expanded_paths) 및 하위 열린 탭들의 경로를 file:tab-renamed를 통해 일괄 갱신
//             3) 이동 되돌리기(Undo) 히스토리에 type: 'move'를 명시하여 원본 위치 복원 및 열린 탭 역방향 원복 완벽 보장
// 🚨 @PATCH : **2026-09-18** — [타문서 변환 후 탐색기 자동 새로고침 및 디렉토리 자동 펼침 고도화]:
//             1) 변환 완료 후 triggerExplorerRefresh를 통해 refreshFileList(true) 강제 호출 및 file:refresh-all-directories(force: true, targetDir) 발송
//             2) 하위 폴더 타문서 변환 시 대상 폴더 및 상위 경로를 onrivi_expanded_paths에 자동 추가하여 파일 트리 자동 펼침 및 새로고침 완비
//             3) OS 디스크 I/O 레이스 컨디션 방어용 120ms 2차 안전 갱신 및 생성 파일 자동 선택(file:select-node) 연동
// 🚨 @PATCH : **2026-09-18** — [타문서 변환 명칭 및 Ctrl+Alt+O 변경 / 하위 폴더 변환 지원 / 삭제 되돌리기(Undo) 복원 지원 / 열린 파일 잘라내기 허용 / 새폴더·탐색기보기 단축키 제거]:
//             1) '가져오기'를 '타문서 변환'으로 변경하고 단축키를 Ctrl+Alt+O로 변경, 하위 폴더 타문서 변환 지원
//             2) 열린 파일 잘라내기 허용 및 이동/되돌리기 시 탭 경로 동기화
//             3) 삭제 작업도 Undo 스택(undoHistoryRef)에 보존하여 Ctrl+Z 시 탐색기에 원본 내용 복원
//             4) 새 폴더(Ctrl+Alt+N) 및 탐색기에서 보기(Shift+Alt+R) 단축키 제거
// 🚨 @PATCH : **2026-09-18** — [루트 붙여넣기 시 원래 위치 잔존 결함 해결 & 빈 영역 우클릭 메뉴 지원]:
//             1) triggerPasteRoot/triggerCutRoot/triggerCopyRoot의 의존성 누락(stale closure) 제거 및 handlePasteNode useCallback 최신화
//             2) 루트 붙여넣기 시 destDirPath 정상화(VFS 및 Browser FSA 환경에서 루트를 빈 상대경로 ''로 정규화)
//             3) VFS 잘라내기 이동 시 단순 이름변경 대신 실제 부모 배열에서 분리 및 이동하는 vfsMoveItem 연동 및 dispatchMovedEvent 전파로 원래 위치 잔존 현상 원천 차단
//             4) 브라우저 FSA 부모 핸들 탐색 시 루트 경로 접두사 정규화 제거 및 삭제 시 동일 디렉토리 방어 가드 강화
//             5) 탐색기 빈 영역 우클릭 시 루트 컨텍스트 메뉴 즉각 호출 연동
// 🚨 @PATCH : **2026-09-18** — [탐색기 파일/폴더 잘라내기(Cut) 및 이동(Move) 2단계 되돌리기(Undo) 시스템 탑재]:
//             1) 잘라내기 선택 취소: Esc 및 Ctrl+Z, 컨텍스트 메뉴 '잘라내기 취소'를 통해 클립보드 cut 상태를 즉시 해제하고 반투명 효과를 100% 정상 복원
//             2) 이동 실행 취소: 이동 이력 스택(moveHistoryRef)을 기반으로 Ctrl+Z 또는 컨텍스트 메뉴 '이동 되돌리기' 실행 시 Electron/브라우저 FSA/VFS 환경에서 원본 폴더로 역방향 자동 복원 및 탭/트리 실시간 동기화
// 🚨 @PATCH : **2026-09-17** — [붙여넣기 시 불필요한 2중/3중 지연 새로고침 제거]: handlePasteNode에서 250ms 및 700ms로 중복 호출되던 setTimeout 지연 리프레시를 전면 제거하고 1회 즉시 갱신으로 최적화
// 🚨 @PATCH : **2026-09-17** — [탐색기 단축키 고도화 & 붙여넣기 후 지연 다중 새로고침 연동]: 탐색기 루트 및 컨텍스트 메뉴 단축키 개편(새로고침: Ctrl+F5/⌘F5, 새 폴더: Ctrl+Alt+N/⌥⌘N), 웹 브라우저 환경에서 Electron 미주입 시 FSA/VFS로의 안전 폴백 보장 및 붙여넣기 후 다중 디렉토리 새로고침 완비
// 🚨 @PATCH : **2026-09-16** — [삭제/이동된 폴더 지연 로딩 시 NotFoundError 콘솔 경고 억제 및 onrivi_expanded_paths 자동 소거]: handleLazyLoad에서 이미 삭제되거나 이동된 폴더의 NotFoundError 발생 시 불필요한 콘솔 경고 스팸을 차단하고 localStorage의 onrivi_expanded_paths에서 해당 경로를 즉시 자동 소거하며, handlePasteNode 이동 시에도 기존 폴더의 확장 상태를 정리하여 클린 트리 유지
// 🚨 @PATCH : **2026-09-16** — [웹 브라우저 루트 붙여넣기 오류 수정 & 열린 탭 잘라내기 방어 가드 강화]: 1) handlePasteNode에서 rootFolderHandle 오참조를 rootFolder?.handle로 교체하여 웹 루트 붙여넣기 실패 결함 해결, 2) handleCutNode 및 handlePasteNode에서 openTabPaths 검사로 열려 있는 파일/하위 파일 포함 폴더 잘라내기 원천 차단
// 🚨 @PATCH : **2026-09-16** — [루트 시스템 탐색기/Finder 열기 메뉴 데스크톱 전용 격리]: 웹 브라우저 환경에서 보안상 지원 불가능한 OS 탐색기 열기 메뉴를 원천 은닉하고 오직 electronAPI가 주입된 데스크톱 환경에서만 선택적으로 노출
// 🚨 @PATCH : **2026-09-16** — [탐색기 우클릭 컨텍스트 메뉴 아이콘 세련된 미니멀리즘 전면 교체]: 기존 다색상 PNG 이미지 및 유색 아이콘을 전면 제거하고, 폰트 색상과 100% 일치(text-current)하는 strokeWidth 1.75 Lucide 미니멀 라인 아이콘(FilePlus, FolderPlus, Copy, Scissors, ClipboardPaste, RotateCw, FolderInput, FolderOpen)으로 통일
// 🚨 @PATCH : **2026-09-16** — [탐색기 루트 및 폴더/파일 아이콘 세련된 미니멀리즘 통일]: 루트 이모지(📁)를 FolderTree 미니멀 라인 아이콘으로 교체, text-current를 통해 폰트 색상과 100% 일치하도록 일원화
// 🚨 @PATCH : **2026-09-16** — [탐색기 잘라내기(Cut & Paste) 이동 엔진 & 루트 탐색기/Finder 보기 탑재]: 1) handleCutNode 및 file:cut-node 수신 추가, handlePasteNode에 cut 분기 탑재하여 Electron(api.moveFile), 브라우저(copy+removeEntry), VFS(vfsRename) 전 환경 안전 이동 지원, 2) 루트 컨텍스트 메뉴에 OS 자동 감지 기반 '파일 탐색기에서 보기 / Finder에서 보기' 버튼 추가
// 🚨 @PATCH : **2026-09-16** — [워크스페이스 검색 줄 이동 & 검색 텍스트 하이라이트 연동 및 토스트 알림 제거] 1) previewMode === 'preview' 및 분할 모드에서 [data-line] 기반 중앙 스크롤 및 행 하이라이트(preview-highlight-line), 검색어 텍스트 노드 인라인 마킹(onrivi-search-text-highlight)을 수행하는 executeJumpAndHighlight 구축, 2) '...번째 줄로 이동했습니다' 토스트 팝업 4개소 전면 제거
//             **2026-09-13** — [지식관리 기능 데스크톱 전용 전환]: syncKnowledgeDocs를 데스크톱 환경(isDesktop) 전용으로 한정하여 웹 브라우저 백그라운드 DB 스캔 및 콘솔 노이즈 원천 제거
//             **2026-09-11** — 좌측 사이드바 폰트를 Pretendard 최우선으로 일원화 적용
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-06** — [데스크톱 탐색기 📗 지식 문서 뱃지 복원] effectiveResourceFolder 결정 시 loadSecureData 복호화 및 Onrivi_Asset 기본값 폴백을 완비하여 데스크톱 환경에서 등록된 지식 문서 4건이 탐색기에 즉시 📗 뱃지로 노출되도록 보장
//             **2026-09-06** — [AES 암호문 리소스 폴더 방어 및 지식 문서 동기화 안전 정규화] localStorage.getItem 직접 호출로 암호문(U2FsdGVkX1...)이 전달되어 가짜 DB가 생성되던 결함을 차단하고 loadSecureData 복호화 및 Onrivi_Asset 안전 폴더 정규화 적용
//             **2026-09-12** — [Modern Technical Editorial LNB 탭 버튼 디자인 표준화] 상단 탭 버튼(탐색기/개요/검색)의 활성 상태 배경을 Cobalt Authority(#1d4ed8) 및 8px 라운드 뱃지로 정돈하고 Pretendard 글꼴 완벽 유지
//             **2026-09-06** — [지식 문서 목록 조회 resourceFolderHandle 연동 보강] 웹 브라우저 WASM SQLite 연동 시 listDocuments에 window.__resourceFolderHandle을 전달하여 프로드 환경에서도 탐색기 📗 뱃지가 로컬 DB와 100% 동일하게 동기화되도록 보장
//             **2026-09-06** — [웹 브라우저 WASM SQLite 기반 지식 문서 뱃지 실시간 동기화 연동] 데스크톱/로컬뿐만 아니라 웹 프로드(onrivi.com) 환경에서도 knowledgeClient를 통해 사용자 PC의 onrivi_knowledge.db로부터 등록 문서 목록을 읽어와 탐색기 📗 뱃지를 실시간으로 완벽 동기화
//             **2026-09-06** — [localhost 지식 베이스 동기화 지원] 데스크톱뿐만 아니라 로컬 웹 개발 환경(localhost, 127.0.0.1)에서도 /api/knowledge/list를 통한 지식 문서 및 📗 뱃지 동기화를 활성화하고, 실서버 prod 웹에서만 안전하게 스킵 처리
//             **2026-09-06** — [웹 환경 로컬 지식 API 호출 가드] 로컬 SQLite 지식 베이스는 데스크톱 전용 기능이므로 웹 브라우저 환경(!isDesktop)에서는 /api/knowledge/list 호출을 안전하게 스킵하여 콘솔 405/404 에러 원천 방어
//             **2026-09-05** — [ONRIVI-KNOWLEDGE-REFRESH-SYNC] 파일 탐색기 새로고침(file:refresh-all-directories) 및 컨텍스트 메뉴 새로고침 시 지식 등록 문서 목록(/api/knowledge/list) 자동 재호출 및 등록 뱃지(📗) 실시간 재동기화 연동
//             **2026-09-04** — [ONRIVI-CONTEXTMENU-CLAMP] 화면 하단 근처에서 우클릭 시 컨텍스트 메뉴가 하단 작업표시줄 밖으로 잘리지 않도록 뷰포트 바운더리 동적 클램핑(BoundingRect) 및 스크롤 가드 적용
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 지식 보관함 등록 문서 목록(onrivi_registered_knowledge_docs) 자동 백그라운드 동기화 및 탐색기 뱃지 실시간 연동 탑재
//             **2026-09-02** — File System Access API(브라우저 실폴더), Electron IPC(file:copy), VFS 3대 환경 전체에서 파일/폴더 복사 및 붙여넣기(Copy & Paste) 엔진 전면 고도화 및 중복 이름 충돌 방지 구현
//             **2026-09-02** — 우클릭 팝업 메뉴(Context Menu) 마우스 벗어남(Mouse Leave) 시 자동 닫기 처리
//             **2026-09-02** — 루트 상단 액션버튼 제거 및 신규 붙여넣기 아이콘(/icons/icon-paste.png) 컨텍스트 메뉴 동기화
//             **2026-09-02** — 파일 및 폴더 복사/붙여넣기(Copy & Paste) 엔진 탑재
//             **2026-09-02** — 좌측 사이드바 워크스페이스 실폴더 라벨 및 파일 트리/목차 폰트를 font-bold 및 고대비 색상으로 굵기/선명도 강화
//             **2026-09-02** — [ONRIVI-DS-SYSTEM-002 v5.0] LINE Design System (LDSG) LNB 표준 디자인 적용 (Clean White Surface, LINE Green #1d4ed8 탭 배지, LineSeed 폰트)
//             **2026-08-12** — 개요(TOC) 클릭 시 preview/both(분할) 모드에 맞춰 스크롤 동작을 이원화하고 하위 수준 존재 여부와 무관하게 정상 스크롤되도록 보완; H3 이하의 뎁스 목차가 기본적으로 접힌 채 렌더링에서 누락되던 조건 버그(undefined!==false)를 ===true 접힘으로 전면 교정하여 전체 펼침 구현; **2026-08-12** — 미리보기 스크롤 시 좌측 개요(TOC) 탭 목록도 활성 헤딩 위치를 자동으로 추적하여 뷰포트 내로 자동 스크롤(Auto-scroll Follow)되는 지능형 연동 기능 구현; **2026-08-12** — 개요(TOC) 클릭 시 에디터-미리보기 간의 양방향 스크롤 동기화 간섭을 일시 차단하는 락킹(isScrollingRef) 루틴을 적용하고 미리보기 컨테이너(previewRef) 내에서 부드러운 스크롤(scrollTo)이 동작하도록 개선; **2026-08-12** — 사이드바 배경을 라이트모드에 최적화된 고급스러운 아이스 블루 및 실버 톤 그라데이션(linear-gradient)으로 교체하고 탭 헤더 및 워크스페이스 바를 반투명 처리하는 프리미엄 디자인 리뉴얼 패치 적용; **2026-08-12** — 사이드바 폰트 크기를 상태바와 동일하게 12px 굵은 글씨로 통일 적용 및 탐색기 폴더 명칭을 '작업장 실폴더'로 명명 변경; **2026-07-05** — MainEditorApp의 Props 의존성을 전면 제거하고 EditorContext 참조 방식으로 아키텍처 완전 개편 및 ts-nocheck 우회 적용; **2026-06-19** — openTabPaths prop 추가; **2026-07-06** — 탭 헤더 바로 아래 항상 표시되는 워크스페이스 선택 바 추가: FileTreeItem으로 전달하여 드래그 이동 시 열린 파일 보호
// 🔗 @CALLS : fetchDrives, handleLazyLoad, onPromptConfirm, onFileOpenAndJump, executeJumpAndHighlight, FileTreeItem, GlobalSearch, PromptModal
// ====================================================================
// 📂 브라우저 File System Access API 폴더 재귀 복원기 (되돌리기 지원용)
const restoreFsaDirectory = async (parentHandle: any, folderName: string, items: { relativePath: string; kind: 'file' | 'directory'; content?: string | Blob }[]) => {
  if (!parentHandle) throw new Error('복원할 폴더의 접근 권한을 확인해 주세요.');
  await assertUndoNameAvailable(parentHandle, folderName);
  const folderHandle = await parentHandle.getDirectoryHandle(folderName, { create: true });
  const dirHandles = new Map<string, any>();
  dirHandles.set('', folderHandle);

  for (const item of items) {
    const parts = item.relativePath.split('/');
    if (item.kind === 'directory') {
      let current = folderHandle;
      let currentPath = '';
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!dirHandles.has(currentPath)) {
          const sub = await current.getDirectoryHandle(part, { create: true });
          dirHandles.set(currentPath, sub);
          current = sub;
        } else {
          current = dirHandles.get(currentPath)!;
        }
      }
    } else if (item.kind === 'file') {
      const fileName = parts.pop()!;
      let targetDir = folderHandle;
      if (parts.length > 0) {
        let curr = folderHandle;
        let cp = '';
        for (const p of parts) {
          cp = cp ? `${cp}/${p}` : p;
          if (!dirHandles.has(cp)) {
            const sub = await curr.getDirectoryHandle(p, { create: true });
            dirHandles.set(cp, sub);
            curr = sub;
          } else {
            curr = dirHandles.get(cp)!;
          }
        }
        targetDir = curr;
      }
      const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(item.content || '');
      await writable.close();
    }
  }
};

export default function LeftSidebar() {
  const {
    isSearchOpen, setIsSearchOpen,
    content, currentFileName, setCurrentFileName,
    setCurrentFileNode, setContent, lastSavedContentRef,
    editorRef, previewRef, toc = [], scrollToLine,
    isScrollingRef, scrollTimeoutRef, // 💡 동기식 스크롤 락 제어용 refs 추가
    showToast, fileList, rootFolder, resourceFolder, resourceFolderHandle, workspaceType,
    openFile, currentFileNode, refreshFileList, openTabPaths = [],
    askConfirm, isMergeMode = false, selectedMergeNodes = [],
    toggleMergeNodeSelect, onOpenMergeModal,
    onSelectRootFolder, onRestoreFolder, previewMode, setPreviewMode,
    tabs = [], activeTabId, switchTab, licenseStatus,
    setIsMergeMode, setSelectedMergeNodes,
    geminiApiKey, aiModelName,
    connectGoogleDrive, disconnectGoogleDrive,
    isDriveAuthExpired
  } = useEditorContext();

  const [isReconnectingDrive, setIsReconnectingDrive] = useState(false);
  const isGdriveAuthNeeded = rootFolder?.type === 'GDRIVE' && (isDriveAuthExpired || !hasValidDriveToken());

  const handleReconnectDrive = async () => {
    if (isReconnectingDrive) return;
    setIsReconnectingDrive(true);
    try {
      if (connectGoogleDrive) {
        await connectGoogleDrive(false);
      }
    } catch (err: any) {
      console.error('[handleReconnectDrive Error]', err);
      showToast?.(err?.message || '구글 드라이브 재접속에 실패했습니다.', 'error');
    } finally {
      setIsReconnectingDrive(false);
    }
  };

  const searchHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 언마운트 시 CSS 하이라이트 및 타이머 정리
  useEffect(() => {
    return () => {
      if (searchHighlightTimeoutRef.current) clearTimeout(searchHighlightTimeoutRef.current);
      if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
        try {
          (CSS as any).highlights.delete('onrivi-search-text-highlight');
        } catch (e) {}
      }
    };
  }, []);

  // ====================================================================
  // 📊 [OMD-FILE-LeftSidebar-0008 ✅ FIXED] LeftSidebar ➔ executeJumpAndHighlight
  // 🎯 @KICK  : 검색 결과 또는 목차 클릭 시 에디터와 미리보기 동시 스크롤 및 검색어 텍스트 하이라이트
  // 🛡️ @GUARD : React DOM 절대 불변(Zero Mutation) 보장 - CSS Custom Highlight API 사용으로 React removeChild 에러 원천 차단
  // 🚨 @PATCH : 2026-09-16 — [React removeChild 크래시 원천 차단] DOM 노드를 임의 교체(replaceChild/mark)하던 구 로직을 전면 폐기하고, React Fiber 트리를 100% 보존하는 브라우저 표준 CSS.highlights API 및 preview-highlight-line 클래스 기반으로 전면 리팩토링
  // 🔗 @CALLS : editorRef.current.revealLineInCenter, previewRef.current.scrollTo, CSS.highlights
  // ====================================================================
  const executeJumpAndHighlight = useCallback((targetLine: number, term?: string) => {
    let attempt = 0;
    const maxAttempts = 10;

    const doJump = () => {
      let previewSuccess = false;
      let editorSuccess = false;

      // 스크롤 동기화 간섭 방지 락
      if (isScrollingRef && scrollTimeoutRef) {
        isScrollingRef.current = 'preview';
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          if (isScrollingRef) isScrollingRef.current = null;
        }, 800);
      }

      // 1. Monaco 에디터 줄 이동 및 단어 선택
      if (editorRef.current) {
        const editor = editorRef.current;
        try {
          editor.revealLineInCenter(targetLine);
          editor.setPosition({ lineNumber: targetLine, column: 1 });
          if (term && term.trim()) {
            const model = editor.getModel?.();
            if (model && !model.isDisposed()) {
              const lineContent = model.getLineContent(targetLine) || '';
              const colIdx = lineContent.toLowerCase().indexOf(term.toLowerCase());
              if (colIdx !== -1) {
                const startCol = colIdx + 1;
                const endCol = startCol + term.length;
                editor.setSelection({
                  startLineNumber: targetLine,
                  startColumn: startCol,
                  endLineNumber: targetLine,
                  endColumn: endCol
                });
                editor.revealRangeInCenter({
                  startLineNumber: targetLine,
                  startColumn: startCol,
                  endLineNumber: targetLine,
                  endColumn: endCol
                });
              }
            }
          }
          editorSuccess = true;
        } catch (e) {
          // Monaco error ignore
        }
      }

      // 2. 미리보기(Preview) DOM 줄 이동 및 하이라이트 (Zero DOM Mutation)
      if (previewRef.current) {
        const previewContainer = previewRef.current;
        const elements = Array.from(previewContainer.querySelectorAll('[data-line]')) as HTMLElement[];

        if (elements.length > 0) {
          let bestEl: HTMLElement | null = null;
          let bestDiff = Infinity;

          for (const el of elements) {
            const line = parseInt(el.getAttribute('data-line') || '1', 10);
            if (line === targetLine) {
              bestEl = el;
              break;
            }
            if (line <= targetLine) {
              const diff = targetLine - line;
              if (diff < bestDiff) {
                bestDiff = diff;
                bestEl = el;
              }
            }
          }

          if (!bestEl) {
            bestEl = elements[0];
          }

          if (bestEl) {
            const targetLineVal = bestEl.getAttribute('data-line');
            const matchingLineEls = elements.filter(el => el.getAttribute('data-line') === targetLineVal);

            // 이전 하이라이트 타이머 취소
            if (searchHighlightTimeoutRef.current) {
              clearTimeout(searchHighlightTimeoutRef.current);
              searchHighlightTimeoutRef.current = null;
            }

            // 기존 줄 하이라이트 클래스 해제
            elements.forEach(el => el.classList.remove('preview-highlight-line'));

            // 기존 CSS Custom Highlight 해제 (DOM을 건드리지 않음)
            if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
              try {
                (CSS as any).highlights.delete('onrivi-search-text-highlight');
              } catch (e) {}
            }

            // 해당 줄 하이라이트 클래스 부여
            matchingLineEls.forEach(el => el.classList.add('preview-highlight-line'));

            // 미리보기 컨테이너 중앙 스크롤
            const scrollTarget = matchingLineEls[0] || bestEl;
            const containerRect = previewContainer.getBoundingClientRect();
            const elRect = scrollTarget.getBoundingClientRect();
            const targetScrollTop = previewContainer.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
            previewContainer.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });

            // 🔍 CSS Custom Highlight API로 검색어 인라인 하이라이트 (DOM 노드를 전혀 생성/치환/삭제하지 않음)
            if (term && term.trim() !== '' && typeof CSS !== 'undefined' && (CSS as any).highlights && typeof (window as any).Highlight !== 'undefined') {
              const trimmedTerm = term.trim();
              const ranges: Range[] = [];

              for (const lineEl of (matchingLineEls.length > 0 ? matchingLineEls : [bestEl])) {
                const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
                let currNode: Node | null;
                while ((currNode = walker.nextNode())) {
                  const text = currNode.nodeValue || '';
                  const lowerText = text.toLowerCase();
                  const lowerTerm = trimmedTerm.toLowerCase();
                  let startIdx = 0;
                  while ((startIdx = lowerText.indexOf(lowerTerm, startIdx)) !== -1) {
                    try {
                      const range = new Range();
                      range.setStart(currNode, startIdx);
                      range.setEnd(currNode, startIdx + trimmedTerm.length);
                      ranges.push(range);
                    } catch (e) {
                      // ignore range errors
                    }
                    startIdx += lowerTerm.length;
                  }
                }
              }

              if (ranges.length > 0) {
                try {
                  const highlight = new (window as any).Highlight(...ranges);
                  (CSS as any).highlights.set('onrivi-search-text-highlight', highlight);
                } catch (e) {}
              }
            }

            // 4초 후 하이라이트 자동 정리
            searchHighlightTimeoutRef.current = setTimeout(() => {
              matchingLineEls.forEach(el => el.classList.remove('preview-highlight-line'));
              if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
                try {
                  (CSS as any).highlights.delete('onrivi-search-text-highlight');
                } catch (e) {}
              }
            }, 4000);

            previewSuccess = true;
          }
        } else {
          // B. VisualDocumentEditor ("문서 보기" / ProseMirror 기반)
          const proseMirror = (previewContainer.querySelector('.ProseMirror') || previewContainer.querySelector('.visual-document-editor')) as HTMLElement | null;
          if (proseMirror) {
            const lines = (content || '').split(/\r?\n/);
            const lineIdx = Math.max(0, Math.min(lines.length - 1, targetLine - 1));
            const lineContent = lines[lineIdx] || '';
            let offset = 0;
            for (let l = 0; l < lineIdx; l++) {
              offset += lines[l].length + 1;
            }
            if (term && term.trim()) {
              const termIdx = lineContent.toLowerCase().indexOf(term.trim().toLowerCase());
              if (termIdx !== -1) {
                offset += termIdx;
              }
            }

            // ProseMirror 커서/선택영역 동기화
            window.dispatchEvent(new CustomEvent('onrivi:source-cursor', { 
              detail: { offset, term, force: true, highlight: true } 
            }));

            let targetBlock: HTMLElement | null = null;
            const trimmedTerm = term?.trim();

            // 1) 검색어 텍스트 노드가 포함된 블록 검색
            if (trimmedTerm) {
              const lowerTerm = trimmedTerm.toLowerCase();
              const walker = document.createTreeWalker(proseMirror, NodeFilter.SHOW_TEXT);
              let currNode: Node | null;
              while ((currNode = walker.nextNode())) {
                if ((currNode.nodeValue || '').toLowerCase().includes(lowerTerm)) {
                  targetBlock = (currNode.parentElement?.closest('p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote, figure') || currNode.parentElement) as HTMLElement;
                  break;
                }
              }
            }

            // 2) 줄 내용 기반 블록 검색
            if (!targetBlock && lineContent.trim()) {
              const cleanLineText = lineContent.replace(/^[#>*+\-\d.\s\[\]xX]+/, '').trim().toLowerCase();
              if (cleanLineText.length > 1) {
                const blocks = Array.from(proseMirror.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote, figure')) as HTMLElement[];
                targetBlock = blocks.find(b => (b.textContent || '').toLowerCase().includes(cleanLineText)) || null;
              }
            }

            if (searchHighlightTimeoutRef.current) {
              clearTimeout(searchHighlightTimeoutRef.current);
              searchHighlightTimeoutRef.current = null;
            }

            // 이전 하이라이트 제거
            previewContainer.querySelectorAll('.preview-highlight-line').forEach(el => el.classList.remove('preview-highlight-line'));
            if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
              try { (CSS as any).highlights.delete('onrivi-search-text-highlight'); } catch (e) {}
            }

            if (targetBlock) {
              targetBlock.classList.add('preview-highlight-line');

              const containerRect = previewContainer.getBoundingClientRect();
              const elRect = targetBlock.getBoundingClientRect();
              const targetScrollTop = previewContainer.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
              previewContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
              });

              if (trimmedTerm && typeof CSS !== 'undefined' && (CSS as any).highlights && typeof (window as any).Highlight !== 'undefined') {
                const walker = document.createTreeWalker(targetBlock, NodeFilter.SHOW_TEXT);
                let currNode: Node | null;
                const ranges: Range[] = [];
                const lowerTerm = trimmedTerm.toLowerCase();
                while ((currNode = walker.nextNode())) {
                  const text = currNode.nodeValue || '';
                  const lowerText = text.toLowerCase();
                  let startIdx = 0;
                  while ((startIdx = lowerText.indexOf(lowerTerm, startIdx)) !== -1) {
                    try {
                      const range = new Range();
                      range.setStart(currNode, startIdx);
                      range.setEnd(currNode, startIdx + trimmedTerm.length);
                      ranges.push(range);
                    } catch (e) {}
                    startIdx += trimmedTerm.length;
                  }
                }
                if (ranges.length > 0) {
                  try {
                    const highlight = new (window as any).Highlight(...ranges);
                    (CSS as any).highlights.set('onrivi-search-text-highlight', highlight);
                  } catch (e) {}
                }
              }

              searchHighlightTimeoutRef.current = setTimeout(() => {
                targetBlock?.classList.remove('preview-highlight-line');
                if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
                  try { (CSS as any).highlights.delete('onrivi-search-text-highlight'); } catch (e) {}
                }
              }, 4000);

              previewSuccess = true;
            } else {
              // 폴백: 줄 비율 기반 스크롤
              const totalLines = Math.max(1, lines.length);
              const ratio = Math.max(0, Math.min(1, targetLine / totalLines));
              const targetScrollTop = (previewContainer.scrollHeight - previewContainer.clientHeight) * ratio;
              previewContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
              });
              previewSuccess = true;
            }
          }
        }
      }

      // 렌더링 지연 대응 재시도 가드
      const isPreviewVisible = previewMode === 'preview' || previewMode === 'both';
      const isSuccess = isPreviewVisible ? previewSuccess : editorSuccess;

      attempt++;
      if (!isSuccess && attempt < maxAttempts) {
        setTimeout(doJump, 80 * attempt);
      }
    };

    requestAnimationFrame(doJump);
  }, [editorRef, previewRef, isScrollingRef, scrollTimeoutRef, previewMode, content]);

  const isRestrictedUser = !!(
    licenseStatus?.isExpired ||
    licenseStatus?.isRestricted ||
    licenseStatus?.planName?.includes('제한') ||
    licenseStatus?.planName?.includes('만료')
  );
  const rootFolderDisplayName = rootFolder?.type === 'GDRIVE'
    ? `☁️ ${(rootFolder.name || '작업장').split('/').pop()}`
    : (rootFolder?.name
        ? (rootFolder.handle?.name || rootFolder.name.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || rootFolder.name)
        : '');
  const onCancelMerge = () => {
    if (setIsMergeMode) setIsMergeMode(false);
    if (setSelectedMergeNodes) setSelectedMergeNodes([]);
  };

  const { 
    isSidebarOpen, setIsSidebarOpen, 
    sidebarWidth, setSidebarWidth, 
    sidebarTab, setSidebarTab, 
    isDarkMode 
  } = useUIStore();
  
  const [drives, setDrives] = useState<FileNode[]>([]);
  const [isDrivesLoading, setIsDrivesLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [collapsedH1s, setCollapsedH1s] = useState<Record<string, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);
  // TOC 활성 헤딩 상태
  const [activeTocId, setActiveTocId] = useState<string>('');

  const [isDragOverRoot, setIsDragOverRoot] = useDragHighlight();
  const [isSelectedRoot, setIsSelectedRoot] = useState(false);
  const rootItemRef = useRef<HTMLDivElement>(null);
  const explorerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (rootItemRef.current && !rootItemRef.current.contains(e.target as Node)) {
        setIsSelectedRoot(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 🧠 등록된 지식 문서 경로 목록 동기화 (데스크톱 전용 기능)
  useEffect(() => {
    // 🚀 웹 브라우저(SaaS) 환경에서는 백그라운드 지식 DB 동기화 완전 스킵
    if (!isDesktop) return;

    const syncKnowledgeDocs = async () => {
      const effectiveResourceFolder = getEffectiveResourceFolder();
      if(!effectiveResourceFolder || getResourceSettings()?.kind === 'drive') return;

      const effectiveApiKey = (
        geminiApiKey ||
        (typeof window !== 'undefined' ? localStorage.getItem('onrivi_gemini_api_key') : '') ||
        (() => {
          try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
            return raw ? JSON.parse(raw).geminiApiKey || '' : '';
          } catch { return ''; }
        })() ||
        'DUMMY_KEY_FOR_LIST'
      );

      const canUseDb = await canAccessKnowledgeDb();
      if (!canUseDb) {
        return;
      }

      try {
        const docs = await knowledgeClient.listDocuments({
          resourceFolder: effectiveResourceFolder,
          geminiApiKey: effectiveApiKey,
          planCode: 'ELITEPRO',
          resourceFolderHandle: typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined,
        });
        if (Array.isArray(docs)) {
          const paths = docs.map((d: any) => d.filePath || d.file_path).filter(Boolean);
          localStorage.setItem('onrivi_registered_knowledge_docs', JSON.stringify(paths));
          window.dispatchEvent(new CustomEvent('knowledge:updated'));
        }
      } catch {}
    };

    syncKnowledgeDocs();

    window.addEventListener('knowledge:updated-from-hub', syncKnowledgeDocs);
    window.addEventListener('knowledge:refresh', syncKnowledgeDocs);
    window.addEventListener('file:refresh-all-directories', syncKnowledgeDocs);
    return () => {
      window.removeEventListener('knowledge:updated-from-hub', syncKnowledgeDocs);
      window.removeEventListener('knowledge:refresh', syncKnowledgeDocs);
      window.removeEventListener('file:refresh-all-directories', syncKnowledgeDocs);
    };
  }, [resourceFolder, geminiApiKey, isDesktop]);

  // 📂 [미리보기/외부 폴더 링크 클릭 시 사이드바 트리 자동 펼침 및 포커스 하이라이트]
  useEffect(() => {
    const handleFocusTreeFolder = async (e: any) => {
      const { folderPath, folderName } = e.detail || {};
      if (!folderPath) return;
      try {
        if (!isSidebarOpen) setIsSidebarOpen(true);
        // 🚨 [핵심 수정] 탭 이름은 'files'가 아닌 'explorer'입니다 ('files' 설정 시 hidden 클래스로 트리 증발 방지)
        if (sidebarTab !== 'explorer') setSidebarTab('explorer');

        const saved = localStorage.getItem('onrivi_expanded_paths');
        let paths: string[] = saved ? JSON.parse(saved) : [];
        const norm = folderPath.replace(/\\/g, '/').replace(/\/+$/, '');
        const rootName = (rootFolder?.name || '').replace(/\\/g, '/').replace(/\/+$/, '');

        // 웹 FSA 트리 호환: 루트 폴더명이 앞에 붙어있는 경우 루트 폴더명을 제거한 상대 경로도 동시 계산
        let relativeToRoot = norm;
        if (rootName && (norm === rootName || norm.startsWith(rootName + '/'))) {
          relativeToRoot = norm.slice(rootName.length).replace(/^\/+/, '');
        }

        const candidatePaths = [norm, relativeToRoot].filter(Boolean);
        for (const candidate of candidatePaths) {
          const parts = candidate.split('/').filter(Boolean);
          let cur = '';
          for (const part of parts) {
            cur = cur ? `${cur}/${part}` : (candidate.startsWith('/') ? `/${part}` : part);
            if (!paths.some(p => p.replace(/\\/g, '/').replace(/\/+$/, '') === cur)) {
              paths.push(cur);
            }
          }
        }

        localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: relativeToRoot || norm }
        }));

        const normParts = norm.split('/').filter(Boolean);
        const displayName = folderName || normParts[normParts.length - 1] || '폴더';
        showToast(`'📁 ${displayName}' 폴더를 탐색기에서 열었습니다.`, 'info');

        // 🎯 트리 렌더링 완료 후 해당 폴더 노드로 부드럽게 스크롤 및 코발트 블루 펄스 하이라이트
        setTimeout(() => {
          try {
            const allItems = Array.from(document.querySelectorAll('[data-path]')) as HTMLElement[];
            const normTarget = norm.toLowerCase();
            const relTarget = relativeToRoot.toLowerCase();
            const targetBase = (normParts[normParts.length - 1] || '').toLowerCase();

            let targetEl = allItems.find(el => {
              const p = (el.getAttribute('data-path') || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
              return p === normTarget || p === relTarget || (targetBase && p.endsWith('/' + targetBase)) || p === targetBase;
            });

            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              targetEl.focus();
              targetEl.classList.add('ring-2', 'ring-[#1d4ed8]', 'bg-[#1d4ed8]/15', 'rounded-lg', 'shadow-xs');
              setTimeout(() => {
                targetEl?.classList.remove('ring-2', 'ring-[#1d4ed8]', 'bg-[#1d4ed8]/15', 'rounded-lg', 'shadow-xs');
              }, 2500);
            }
          } catch (domErr) {
            console.warn('[handleFocusTreeFolder] DOM highlight error:', domErr);
          }
        }, 220);
      } catch (err) {
        console.warn('[handleFocusTreeFolder] error:', err);
      }
    };

    window.addEventListener('app:focus-tree-folder', handleFocusTreeFolder);
    return () => {
      window.removeEventListener('app:focus-tree-folder', handleFocusTreeFolder);
    };
  }, [isSidebarOpen, setIsSidebarOpen, sidebarTab, setSidebarTab, refreshFileList, showToast, rootFolder?.name]);

  // 📋 파일/폴더 복사 및 붙여넣기/잘라내기 클립보드 상태
  const [clipboardNode, setClipboardNode] = useState<{ node: FileNode; parentHandle?: any; op?: 'copy' | 'cut' } | null>(null);

  // ↩️ 파일/폴더 이동 및 삭제 실행 취소(Undo) 히스토리 스택
  interface MoveActionItem {
    type: 'move';
    srcPath: string;
    destPath: string;
    srcDirPath: string;
    destDirPath: string;
    name: string;
    kind: 'file' | 'directory';
    workspaceType: string;
    sourceParentHandle?: any;
    destParentHandle?: any;
    srcNode?: FileNode;
  }
  interface DeleteActionItem {
    type: 'delete';
    path: string;
    parentPath: string;
    name: string;
    kind: 'file' | 'directory';
    workspaceType: string;
    content?: string;
    parentHandle?: any;
  }
  type UndoActionItem = MoveActionItem | DeleteActionItem;

  const undoHistoryRef = useRef<UndoActionItem[]>([]);
  const undoBusyRef = useRef(false);
  const [hasUndoableMove, setHasUndoableMove] = useState(false);
  const [lastUndoType, setLastUndoType] = useState<'move' | 'delete'>('move');

  // ✂️ 잘라내기 선택 상태 취소 핸들러
  const handleCancelCut = useCallback(() => {
    const clip = clipboardNode || (typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null);
    if (!clip || clip.op !== 'cut') return;

    const nodeName = clip.node?.name || '항목';
    setClipboardNode(null);
    if (typeof window !== 'undefined') {
      (window as any)._omdClipboardNode = null;
      window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
    }
    showToast(`'${nodeName}' 잘라내기가 취소되었습니다.`, 'info');
  }, [clipboardNode, showToast]);

  // 📡 이동 완료 전역 이벤트 발송 (FileTreeItem 디렉토리 갱신 및 에디터 탭 동기화)
  const dispatchMovedEvent = useCallback((srcPath: string, tgtPath: string, newPath?: string, sourceName?: string, newHandle?: any) => {
    const normSrc = srcPath.replace(/\\/g, '/');
    const normTgt = tgtPath.replace(/\\/g, '/');
    const srcParentPath = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
    const tgtParentPath = normTgt.includes('/') ? normTgt.substring(0, normTgt.lastIndexOf('/')) : '';
    
    window.dispatchEvent(new CustomEvent('file:moved', {
      detail: { sourceParentPath: srcParentPath, targetParentPath: tgtParentPath, targetPath: normTgt }
    }));

    if (newPath && sourceName) {
      window.dispatchEvent(new CustomEvent('file:tab-renamed', {
        detail: { oldPath: srcPath, newPath, newName: sourceName, newHandle }
      }));
    }
  }, []);

  // ↩️ 실행 취소(되돌리기) 핸들러 - 이동 및 삭제 완벽 복원
  const handleUndoMove = useCallback(async () => {
    if (undoBusyRef.current || isRestrictedUser) return;
    undoBusyRef.current = true;
    try {
    const history = undoHistoryRef.current;
    if (history.length === 0) {
      showToast('되돌릴 작업이 없습니다.', 'info');
      return;
    }

    const lastAction = history.pop();
    setHasUndoableMove(history.length > 0);
    const nextLastType = history.length > 0 ? history[history.length - 1].type : 'move';
    setLastUndoType(nextLastType);
    window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: history.length, lastType: nextLastType } }));

    if (!lastAction) return;

    if (lastAction.type === 'move' || (!lastAction.type && (lastAction as any).srcPath)) {
      const { srcPath, destPath, destDirPath, srcDirPath, name, kind, sourceParentHandle, destParentHandle, workspaceType: moveWorkspaceType } = lastAction;
      const isDir = kind === 'directory';

      try {
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

        // 1. Electron 데스크톱 환경
        if (moveWorkspaceType === 'cloud') {
          const token = getSavedDriveToken();
          if (!token || !lastAction.driveId || !lastAction.srcParentDriveId) throw new Error('웹드라이브 연결과 원래 폴더를 확인해 주세요.');
          if (lastAction.accountEmail && lastAction.accountEmail !== getSavedWorkspaceInfo()?.userEmail) throw new Error('이 작업을 실행한 웹드라이브 계정으로 연결해 주세요.');
          await moveDriveItem(token, lastAction.driveId, lastAction.srcParentDriveId, lastAction.destParentDriveId);
        } else if ((moveWorkspaceType || workspaceType) === 'local' && api) {
          if (api?.moveFile) {
            const res = await api.moveFile(destPath, srcPath, { failIfExists: true });
            if (res?.success === false || res?.error) throw new Error(res.error || '원래 위치로 이동하지 못했습니다.');
          } else if (api?.renameFile) {
            await api.renameFile(destPath, srcPath);
          } else {
            const res = await fetch(getApiUrl('/api/rename'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oldPath: destPath, newPath: srcPath })
            });
            if (!res.ok) throw new Error('되돌리기 API 호출 실패');
          }
          if (isDir && destPath && srcPath) {
            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              if (saved) {
                const normDest = destPath.replace(/\\/g, '/').toLowerCase();
                const paths: string[] = JSON.parse(saved);
                const updated = paths.map(p => {
                  const normP = p.replace(/\\/g, '/').toLowerCase();
                  if (normP === normDest || normP.startsWith(normDest + '/')) {
                    return srcPath + p.slice(destPath.length);
                  }
                  return p;
                });
                localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
              }
            } catch (e) {
              console.error('Error reverting expanded paths on undo:', e);
            }
          }
        }
        // 2. 브라우저 FSA 환경
        else if (destParentHandle && sourceParentHandle) {
          await assertUndoNameAvailable(sourceParentHandle, name);
          if (isDir) {
            const copyDirRecursive = async (sourceDirHandle: any, targetParentHandle: any, dirName: string) => {
              const newDir = await targetParentHandle.getDirectoryHandle(dirName, { create: true });
              for await (const [entryName, entryHandle] of sourceDirHandle.entries()) {
                if (entryHandle.kind === 'directory') {
                  await copyDirRecursive(entryHandle, newDir, entryName);
                } else {
                  const f = await entryHandle.getFile();
                  const newF = await newDir.getFileHandle(entryName, { create: true });
                  const w = await newF.createWritable();
                  await w.write(f);
                  await w.close();
                }
              }
            };
            const targetDir = await destParentHandle.getDirectoryHandle(name);
            await copyDirRecursive(targetDir, sourceParentHandle, name);
            await destParentHandle.removeEntry(name, { recursive: true });
          } else {
            const fileHandle = await destParentHandle.getFileHandle(name);
            const file = await fileHandle.getFile();
            const newFileHandle = await sourceParentHandle.getFileHandle(name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(file);
            await writable.close();
            await destParentHandle.removeEntry(name);
          }
        }
        // 3. VFS 환경
        else if (destPath && srcPath) {
          vfsMoveItem(destPath, srcDirPath);
        }

        if (moveWorkspaceType !== 'cloud') dispatchMovedEvent(destPath, srcDirPath, srcPath, name);
        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: srcDirPath }
        }));
        showToast(`'${name}'을(를) 원래 위치로 되돌렸습니다.`, 'success');
      } catch (err: any) {
        showToast(`이동 되돌리기 실패: ${err.message || err}`, 'error');
        history.push(lastAction);
        setHasUndoableMove(true);
        setLastUndoType('move');
        window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: history.length, lastType: 'move' } }));
      }
    } else if (lastAction.type === 'delete') {
      const { path, parentPath, name, kind, content = '', backupPath, items = [], parentHandle } = lastAction;
      const isDir = kind === 'directory';
      const deleteWorkspaceType = lastAction.workspaceType || workspaceType;
      try {
        if (deleteWorkspaceType === 'cloud') {
          const token = getSavedDriveToken();
          if (!token || !lastAction.driveId) throw new Error('웹드라이브 연결과 복원할 항목 ID를 확인해 주세요.');
          if (lastAction.accountEmail && lastAction.accountEmail !== getSavedWorkspaceInfo()?.userEmail) throw new Error('이 항목을 삭제한 웹드라이브 계정으로 연결해 주세요.');
          await restoreDriveItem(token, lastAction.driveId);
          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
          showToast(`삭제되었던 '${name}'을(를) 웹드라이브에 복원했습니다.`, 'success');
        } else if (isDir) {
          if (deleteWorkspaceType === 'browser') {
            if (parentHandle) {
              await restoreFsaDirectory(parentHandle, name, items);
            } else {
              // VFS 환경 폴더 복원
              const { vfsCreateFolder, vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
              vfsCreateFolder(parentPath, name);
              for (const item of items) {
                const subParent = item.relativePath.includes('/')
                  ? `${path}/${item.relativePath.substring(0, item.relativePath.lastIndexOf('/'))}`
                  : path;
                const fileName = item.relativePath.includes('/')
                  ? item.relativePath.substring(item.relativePath.lastIndexOf('/') + 1)
                  : item.relativePath;
                const filePath = `${path}/${item.relativePath}`;
                vfsCreateFile(subParent, fileName);
                vfsWriteFile(filePath, item.content || '');
              }
            }
          } else {
            // Electron 데스크톱 환경 폴더 복원
            const api = (window as any).electronAPI;
            if (api?.restoreFolderFromUndo && backupPath) {
              const res = await api.restoreFolderFromUndo(backupPath, path);
              if (res?.success === false || res?.error) throw new Error(res.error || '폴더 복원에 실패했습니다.');
            } else throw new Error('폴더 백업을 찾을 수 없어 복원하지 못했습니다.');
          }

          // 📂 복원된 폴더 자동 펼침 상태 복구
          try {
            const saved = localStorage.getItem('onrivi_expanded_paths');
            let paths: string[] = saved ? JSON.parse(saved) : [];
            const normPath = path.replace(/\\/g, '/').toLowerCase();
            if (!paths.some(p => p.replace(/\\/g, '/').toLowerCase() === normPath)) {
              paths.push(path);
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            }
          } catch {}

          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
            detail: { force: true, targetDir: parentPath }
          }));
          showToast(`삭제되었던 '${name}' 폴더를 탐색기에 복원했습니다.`, 'success');
        } else {
          // 단일 파일 복원
          if (deleteWorkspaceType === 'browser') {
            if (parentHandle && kind === 'file') {
              await assertUndoNameAvailable(parentHandle, name);
              const handle = await parentHandle.getFileHandle(name, { create: true });
              const w = await handle.createWritable();
              await w.write(content);
              await w.close();
            } else {
              const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
              vfsCreateFile(parentPath, name);
              vfsWriteFile(path, content);
            }
          } else {
            // Electron 데스크톱 환경 파일 복원
            const api = (window as any).electronAPI;
            if (api?.createFile && api?.saveFile) {
              const res = await api.createFile(parentPath, name);
              if (res?.success) {
                const saved = await api.saveFile(res.path || path, content);
                if (saved === false || saved?.success === false) throw new Error(saved?.error || '복원한 파일을 저장하지 못했습니다.');
              } else throw new Error(res?.error || '복원할 파일을 만들지 못했습니다.');
            } else {
              // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 복원 수행
              const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
              vfsCreateFile(parentPath, name);
              vfsWriteFile(path, content);
            }
          }
          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
            detail: { force: true, targetDir: parentPath }
          }));
          showToast(`삭제되었던 '${name}'을(를) 탐색기에 복원했습니다.`, 'success');
        }
      } catch (err: any) {
        showToast(`삭제 되돌리기 실패: ${err.message || err}`, 'error');
        history.push(lastAction);
        setHasUndoableMove(true);
        setLastUndoType('delete');
        window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: history.length, lastType: 'delete' } }));
      }
    }
    } finally { undoBusyRef.current = false; }
  }, [workspaceType, refreshFileList, showToast, dispatchMovedEvent, isRestrictedUser]);

  // ⌨️ 되돌리기 단축키(Ctrl+Z) 통합 트리거 (잘라내기 취소 우선, 그 다음 이동/삭제 되돌리기)
  const triggerUndo = useCallback(() => {
    const clip = clipboardNode || (typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null);
    if (clip && clip.op === 'cut') {
      handleCancelCut();
      return;
    }
    if (undoHistoryRef.current.length > 0) {
      handleUndoMove();
    } else {
      showToast('되돌릴 작업이 없습니다.', 'info');
    }
  }, [clipboardNode, handleCancelCut, handleUndoMove, showToast]);

  const handleCopyNode = useCallback((targetNode?: FileNode, parentHandle?: any) => {
    const nodeToCopy = targetNode || currentFileNode;
    if (!nodeToCopy) {
      showToast('복사할 파일 또는 폴더를 선택하세요.', 'warning');
      return;
    }
    const item = { node: nodeToCopy, parentHandle, op: 'copy' as const };
    setClipboardNode(item);
    if (typeof window !== 'undefined') {
      (window as any)._omdClipboardNode = item;
      window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: item }));
    }

    // 🖼️ 이미지 파일인 경우 OS 시스템 클립보드에 비트맵 복사 병행 수행
    const isImageFile = nodeToCopy.kind === 'file' && /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(nodeToCopy.name);
    if (isImageFile) {
      const imgPath = nodeToCopy.path || nodeToCopy.name;
      void copyImageToClipboard(imgPath);
    }

    showToast(`'${nodeToCopy.name}'이(가) 클립보드에 복사되었습니다.`, 'success');
  }, [currentFileNode, showToast]);

  const handleCutNode = useCallback((targetNode?: FileNode, parentHandle?: any) => {
    const nodeToCut = targetNode || currentFileNode;
    if (!nodeToCut) {
      showToast('잘라낼 파일 또는 폴더를 선택하세요.', 'warning');
      return;
    }

    // 💡 열려 있는 문서도 자유롭게 잘라내기 허용 (이동 완료 및 되돌리기 시 탭 경로 동기화)
    const item = { node: nodeToCut, parentHandle, op: 'cut' as const };
    setClipboardNode(item);
    if (typeof window !== 'undefined') {
      (window as any)._omdClipboardNode = item;
      window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: item }));
    }
    showToast(`'${nodeToCut.name}'이(가) 잘라내기되었습니다. 붙여넣을 위치를 선택하세요.`, 'info');
  }, [currentFileNode, showToast]);

  const handlePasteNode = useCallback(async (targetDirNode?: FileNode, targetHandle?: any) => {
    const clip = clipboardNode || (typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null);
    if (!clip || !clip.node) {
      showToast('클립보드에 복사되거나 잘라낸 파일 또는 폴더가 없습니다.', 'warning');
      return;
    }

    const srcNode = clip.node;
    const isCut = clip.op === 'cut';
    let destDirPath = targetDirNode ? (targetDirNode.path || '') : '';
    if (!targetDirNode) {
      if (workspaceType === 'local') {
        destDirPath = (rootFolder?.name || rootFolder?.path || '');
      } else {
        destDirPath = (rootFolder?.path && rootFolder.path !== BROWSER_STORAGE_NAME && rootFolder.path !== '브라우저 로컬 저장소')
          ? rootFolder.path
          : '';
      }
    }

    // 대상 노드가 파일인 경우 부모 디렉토리로 계산
    if (targetDirNode && targetDirNode.kind === 'file') {
      const lastSlash = Math.max(destDirPath.lastIndexOf('\\'), destDirPath.lastIndexOf('/'));
      destDirPath = lastSlash >= 0 ? destDirPath.substring(0, lastSlash) : '';
    }

    // 동일 위치 이동 방지 가드
    if (isCut && srcNode.path) {
      const normSrc = srcNode.path.replace(/\\/g, '/').toLowerCase();
      const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
      const normDest = destDirPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
      if (normSrc === normDest || srcDir === normDest) {
        showToast('동일한 위치로는 이동할 수 없습니다.', 'warning');
        return;
      }
      if (srcNode.kind === 'directory' && (normDest === normSrc || normDest.startsWith(normSrc + '/'))) {
        showToast('하위 폴더로는 이동할 수 없습니다.', 'warning');
        return;
      }
    }

    try {
      // 0. Google Drive(GDRIVE/cloud) 환경 — 최우선 분기
      if (workspaceType === 'cloud' || rootFolder?.type === 'GDRIVE') {
        const token = getSavedDriveToken();
        if (!token) {
          showToast('구글 드라이브 인증 토큰이 없습니다. 다시 연결해 주세요.', 'error');
          return;
        }

        const srcDriveId = srcNode.driveFileId || srcNode.driveId || (srcNode as any).id;
        if (!srcDriveId) {
          showToast('구글 드라이브 파일 ID를 찾을 수 없습니다.', 'error');
          return;
        }

        // 대상 폴더 Drive ID 결정
        let destDriveId: string | undefined;
        if (targetDirNode && targetDirNode.kind === 'directory') {
          destDriveId = (targetDirNode as any).driveFileId || (targetDirNode as any).driveId || (targetDirNode as any).id;
        }
        if (!destDriveId) {
          const wsInfo = getSavedWorkspaceInfo();
          destDriveId = wsInfo?.workspaceFolderId;
        }
        if (!destDriveId) {
          showToast('붙여넣기 대상 폴더를 확인할 수 없습니다.', 'error');
          return;
        }

        if (isCut) {
          const srcParentDriveId = (srcNode as any).parentDriveId || (srcNode as any).parentId;
          await moveDriveItemWithUndo(token, srcDriveId, destDriveId, srcParentDriveId, srcNode);
          setClipboardNode(null);
          if (typeof window !== 'undefined') {
            (window as any)._omdClipboardNode = null;
            window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
          }
          showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
        } else {
          const isFolder = srcNode.kind === 'directory';
          if (isFolder) {
            await copyDriveFolderRecursive(token, srcDriveId, destDriveId, srcNode.name);
          } else {
            const ext = srcNode.name.match(/\.[^.]+$/)?.[0] ?? '';
            const base = ext ? srcNode.name.slice(0, -ext.length) : srcNode.name;
            const wsInfo = getSavedWorkspaceInfo();
            const isSameFolder = destDriveId === wsInfo?.workspaceFolderId;
            const copyName = isSameFolder ? `${base}_copy${ext}` : srcNode.name;
            await copyDriveFile(token, srcDriveId, destDriveId, copyName);
          }
          showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
        }

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', { detail: { force: true } }));
        return;
      }

      // 1. Electron Desktop 환경
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (workspaceType === 'local' && api) {
        if (srcNode.path) {
          const cleanDestDir = destDirPath.replace(/[/\\]+$/, '');
          const sep = cleanDestDir.includes('/') ? '/' : '\\';
          const newPath = cleanDestDir ? `${cleanDestDir}${sep}${srcNode.name}` : srcNode.name;

          if (isCut) {
            let movedPath = newPath;
            if (api?.moveFile) {
              const res = await api.moveFile(srcNode.path, newPath);
              if (res && res.error) throw new Error(res.error);
              if (res && res.newPath) movedPath = res.newPath;
            } else if (api?.renameFile) {
              await api.renameFile(srcNode.path, newPath);
            }
            showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
            dispatchMovedEvent(srcNode.path, cleanDestDir, movedPath, srcNode.name);

            // 📂 대상 디렉토리 자동 펼침 및 하위 펼침 상태 보존
            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              let paths: string[] = saved ? JSON.parse(saved) : [];
              const normCleanDest = cleanDestDir.replace(/\\/g, '/').toLowerCase();
              if (cleanDestDir && !paths.some(p => p.replace(/\\/g, '/').toLowerCase() === normCleanDest)) {
                paths.push(cleanDestDir);
              }
              if (srcNode.kind === 'directory' && srcNode.path) {
                const normSrc = srcNode.path.replace(/\\/g, '/').toLowerCase();
                paths = paths.map((p: string) => {
                  const np = p.replace(/\\/g, '/').toLowerCase();
                  if (np === normSrc) return movedPath;
                  if (np.startsWith(normSrc + '/')) {
                    const sub = p.substring(srcNode.path.length);
                    return `${movedPath}${sep === '\\' ? sub.replace(/\//g, '\\') : sub.replace(/\\/g, '/')}`;
                  }
                  return p;
                });
              }
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            } catch (expErr) {
              console.warn('[handlePasteNode] expanded_paths 갱신 오류:', expErr);
            }

            // ↩️ 이동 실행 취소(되돌리기) 히스토리 등록
            const normSrc = srcNode.path.replace(/\\/g, '/');
            const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
            undoHistoryRef.current.push({
              type: 'move',
              srcPath: srcNode.path,
              destPath: movedPath,
              srcDirPath: srcDir,
              destDirPath: cleanDestDir,
              name: srcNode.name,
              kind: srcNode.kind || 'file',
              workspaceType: 'local',
              srcNode
            });
            setHasUndoableMove(true);
            setLastUndoType('move');
            window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

            setClipboardNode(null);
            if (typeof window !== 'undefined') {
              (window as any)._omdClipboardNode = null;
              window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
            }
          } else {
            if (api?.copyFile) {
              const res = await api.copyFile(srcNode.path, newPath);
              if (res && res.error) throw new Error(res.error);
              showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
            }
          }
          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
            detail: { force: true, targetDir: cleanDestDir }
          }));
          return;
        }
      }

      // 2. 브라우저 File System Access API 환경 (rootFolder.handle 또는 targetHandle이 존재하는 경우)
      const effectiveDirHandle = targetHandle || (targetDirNode?.kind === 'directory' ? targetDirNode.handle : null) || rootFolder?.handle;
      if (effectiveDirHandle && typeof effectiveDirHandle.getFileHandle === 'function') {
        const srcName = srcNode.name;
        const isDir = srcNode.kind === 'directory';
        let ext = '';
        let baseName = srcName;
        if (!isDir) {
          const extMatch = srcName.match(/\.[^.]+$/);
          ext = extMatch ? extMatch[0] : '';
          baseName = ext ? srcName.slice(0, -ext.length) : srcName;
        }

        let newName = srcName;
        let counter = 0;
        while (true) {
          try {
            const checkName = counter === 0 
              ? srcName 
              : `${baseName}_copy${counter > 1 ? counter : ''}${ext}`;
            if (isDir) {
              await effectiveDirHandle.getDirectoryHandle(checkName);
            } else {
              await effectiveDirHandle.getFileHandle(checkName);
            }
            counter++;
          } catch {
            newName = (counter === 0 && destDirPath === (srcNode.path ? srcNode.path.substring(0, srcNode.path.lastIndexOf('/')) : ''))
              ? `${baseName}_copy${ext}`
              : (counter === 0 ? srcName : `${baseName}_copy${counter > 1 ? counter : ''}${ext}`);
            break;
          }
        }

        if (isDir && srcNode.handle) {
          const copyDirRecursive = async (sourceDirHandle: any, targetParentHandle: any, dirName: string) => {
            const newDir = await targetParentHandle.getDirectoryHandle(dirName, { create: true });
            for await (const [entryName, entryHandle] of sourceDirHandle.entries()) {
              if (entryHandle.kind === 'directory') {
                await copyDirRecursive(entryHandle, newDir, entryName);
              } else {
                const f = await entryHandle.getFile();
                const newF = await newDir.getFileHandle(entryName, { create: true });
                const w = await newF.createWritable();
                await w.write(f);
                await w.close();
              }
            }
          };
          await copyDirRecursive(srcNode.handle, effectiveDirHandle, isCut ? srcName : newName);
        } else {
          let content: any = null;
          if (srcNode.handle && typeof srcNode.handle.getFile === 'function') {
            content = await srcNode.handle.getFile();
          } else if (srcNode.content) {
            content = srcNode.content;
          } else if (typeof readFileText === 'function') {
            content = await readFileText(srcNode);
          }

          const targetFileName = isCut ? srcName : newName;
          const newFileHandle = await effectiveDirHandle.getFileHandle(targetFileName, { create: true });
          const writable = await newFileHandle.createWritable();
          if (content instanceof Blob || content instanceof File) {
            await writable.write(content);
          } else {
            await writable.write(content || '');
          }
          await writable.close();
        }

        // 잘라내기인 경우 원래 부모 핸들에서 기존 항목 제거
        let sourceParentHandle = clip.parentHandle;
        if (!sourceParentHandle && rootFolder?.handle) {
          let normSrc = (srcNode.path || '').replace(/\\/g, '/');
          const rootNorm = (rootFolder?.path || '').replace(/\\/g, '/');
          if (rootNorm && normSrc.startsWith(rootNorm + '/')) {
            normSrc = normSrc.slice(rootNorm.length + 1);
          } else if (rootNorm && normSrc === rootNorm) {
            normSrc = '';
          }
          if (rootFolder?.name && normSrc.startsWith(rootFolder.name + '/')) {
            normSrc = normSrc.slice(rootFolder.name.length + 1);
          }
          normSrc = normSrc.replace(/^\/+/, '');

          const parts = normSrc.split('/').filter(Boolean);
          if (parts.length <= 1) {
            sourceParentHandle = rootFolder.handle;
          } else {
            try {
              let curr = rootFolder.handle;
              for (let i = 0; i < parts.length - 1; i++) {
                curr = await curr.getDirectoryHandle(parts[i]);
              }
              sourceParentHandle = curr;
            } catch (pErr) {
              console.warn('[handlePasteNode] 부모 핸들 탐색 실패:', pErr);
            }
          }
        }
        if (isCut && sourceParentHandle && typeof sourceParentHandle.removeEntry === 'function' && sourceParentHandle !== effectiveDirHandle) {
          try {
            await sourceParentHandle.removeEntry(srcNode.name, { recursive: isDir });
          } catch (delErr) {
            console.warn('[handlePasteNode] 기존 항목 제거 실패:', delErr);
          }
        }
        if (isCut) {
          const normSrc = (srcNode.path || srcNode.name).replace(/\\/g, '/');
          const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
          const newPath = destDirPath ? `${destDirPath}/${srcNode.name}` : srcNode.name;

          if (srcNode.kind === 'directory' && srcNode.path) {
            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              let paths: string[] = saved ? JSON.parse(saved) : [];
              if (destDirPath && !paths.includes(destDirPath)) {
                paths.push(destDirPath);
              }
              const normNew = newPath.replace(/\\/g, '/');
              paths = paths.map((p: string) => {
                const np = p.replace(/\\/g, '/');
                if (np === normSrc) return newPath;
                if (np.startsWith(normSrc + '/')) {
                  const sub = np.substring(normSrc.length);
                  return `${newPath}${sub}`;
                }
                return p;
              });
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            } catch (expErr) {
              console.warn('[handlePasteNode] expanded_paths 갱신 오류:', expErr);
            }
          }
          // ↩️ 이동 실행 취소(되돌리기) 히스토리 등록
          undoHistoryRef.current.push({
            type: 'move',
            srcPath: srcNode.path || srcNode.name,
            destPath: newPath,
            srcDirPath: srcDir,
            destDirPath: destDirPath,
            name: srcNode.name,
            kind: srcNode.kind || 'file',
            workspaceType: 'browser',
            sourceParentHandle: sourceParentHandle,
            destParentHandle: effectiveDirHandle,
            srcNode
          });
          setHasUndoableMove(true);
          setLastUndoType('move');
          window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

          dispatchMovedEvent(srcNode.path || srcNode.name, destDirPath, newPath, srcNode.name);

          setClipboardNode(null);
          if (typeof window !== 'undefined') {
            (window as any)._omdClipboardNode = null;
            window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
          }
          showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
        } else {
          showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
        }

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: destDirPath }
        }));
        return;
      }

      // 3. VFS (Web LocalStorage 가상 파일 시스템)
      if (srcNode.path) {
        if (isCut) {
          const newPath = vfsMoveItem(srcNode.path, destDirPath);

          if (srcNode.kind === 'directory') {
            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              let paths: string[] = saved ? JSON.parse(saved) : [];
              if (destDirPath && !paths.includes(destDirPath)) {
                paths.push(destDirPath);
              }
              const normSrc = srcNode.path.replace(/\\/g, '/');
              paths = paths.map((p: string) => {
                const np = p.replace(/\\/g, '/');
                if (np === normSrc) return newPath;
                if (np.startsWith(normSrc + '/')) {
                  return `${newPath}${np.substring(normSrc.length)}`;
                }
                return p;
              });
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            } catch {}
          }

          // ↩️ 이동 실행 취소(되돌리기) 히스토리 등록
          const normSrc = srcNode.path.replace(/\\/g, '/');
          const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
          undoHistoryRef.current.push({
            type: 'move',
            srcPath: srcNode.path,
            destPath: newPath,
            srcDirPath: srcDir,
            destDirPath: destDirPath,
            name: srcNode.name,
            kind: srcNode.kind || 'file',
            workspaceType: 'vfs',
            srcNode
          });
          setHasUndoableMove(true);
          setLastUndoType('move');
          window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

          dispatchMovedEvent(srcNode.path, destDirPath, newPath, srcNode.name);

          setClipboardNode(null);
          if (typeof window !== 'undefined') {
            (window as any)._omdClipboardNode = null;
            window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
          }
          showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
        } else {
          vfsCopyItem(srcNode.path, destDirPath);
          showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
        }
        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: destDirPath }
        }));
        return;
      }
    } catch (e: any) {
      showToast((isCut ? '이동' : '붙여넣기') + ' 실패: ' + (e.message || e), 'error');
    }
  }, [clipboardNode, rootFolder, workspaceType, showToast, refreshFileList, dispatchMovedEvent]);

  const handleRenameActive = () => {
    if (!currentFileName && !currentFileNode) {
      showToast('이름을 변경할 활성 파일을 선택하세요.', 'warning');
      return;
    }
    const targetName = currentFileNode?.name || currentFileName;
    setPromptConfig({
      isOpen: true,
      title: `이름 변경:`,
      defaultValue: targetName,
      type: 'rename',
      node: currentFileNode,
      parentHandle: null
    });
  };

  useEffect(() => {
    const onCopyEvent = (e: any) => handleCopyNode(e.detail?.node, e.detail?.parentHandle);
    const onCutEvent = (e: any) => handleCutNode(e.detail?.node, e.detail?.parentHandle);
    const onPasteEvent = (e: any) => handlePasteNode(e.detail?.targetDirNode, e.detail?.targetHandle);
    const onCancelCutEvent = () => handleCancelCut();
    const onUndoMoveEvent = () => handleUndoMove();

    const onPushUndoAction = (e: any) => {
      if (e.detail) {
        undoHistoryRef.current.push(e.detail);
        setHasUndoableMove(true);
        setLastUndoType(e.detail.type || 'delete');
        window.dispatchEvent(new CustomEvent('file:move-history-changed', {
          detail: { count: undoHistoryRef.current.length, lastType: e.detail.type || 'delete' }
        }));
      }
    };

    window.addEventListener('file:copy-node', onCopyEvent);
    window.addEventListener('file:cut-node', onCutEvent);
    window.addEventListener('file:paste-node', onPasteEvent);
    window.addEventListener('file:cancel-cut', onCancelCutEvent);
    window.addEventListener('file:undo-move', onUndoMoveEvent);
    window.addEventListener('file:push-undo-action', onPushUndoAction);
    return () => {
      window.removeEventListener('file:copy-node', onCopyEvent);
      window.removeEventListener('file:cut-node', onCutEvent);
      window.removeEventListener('file:paste-node', onPasteEvent);
      window.removeEventListener('file:cancel-cut', onCancelCutEvent);
      window.removeEventListener('file:undo-move', onUndoMoveEvent);
      window.removeEventListener('file:push-undo-action', onPushUndoAction);
    };
  }, [handleCopyNode, handleCutNode, handlePasteNode, handleCancelCut, handleUndoMove]);

  // ⌨️ [전역 탐색기 단축키] Esc(잘라내기 취소) 및 Ctrl+Z(이동 되돌리기) 연동
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
      const isCtrl = isMacPlatform ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        const clip = typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null;
        if (clip && clip.op === 'cut') {
          handleCancelCut();
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        const target = e.target as HTMLElement;
        if (target) {
          const isFormElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
          const isInsideMonaco = !!target.closest('.monaco-editor');
          if (isFormElement || isInsideMonaco) {
            return;
          }
        }
        const clip = typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null;
        if (clip && clip.op === 'cut') {
          e.preventDefault();
          e.stopPropagation();
          handleCancelCut();
        } else if (undoHistoryRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleUndoMove();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [handleCancelCut, handleUndoMove]);

  // 📝 루트 디렉토리 생성을 위한 Prompt 상태 제어 및 비동기 처리
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue: string;
    type: 'createFile' | 'createFolder' | null;
    error?: string;
  }>({ isOpen: false, title: "", defaultValue: "", type: null, error: "" });

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [showImportSource, setShowImportSource] = useState(false);
  const selectingImportRef = useRef(false);
  const importNameRef = useRef<string | null>(null);
  const targetImportNodeRef = useRef<FileNode | null>(null);
  const targetImportParentHandleRef = useRef<any>(null);

  const chooseImportDestination = useCallback((file: File) => {
    if (!isSupportedImportFile(file.name)) {
      showToast('지원하지 않는 파일 형식입니다.', 'warning');
      return;
    }
    setPendingImportFile(file);
  }, [showToast]);

  const openImportPicker = useCallback(async (source?: 'local' | 'drive') => {
    if (isRestrictedUser || isImporting || selectingImportRef.current) return;
    if (!source) { setShowImportSource(true); return; }
    setShowImportSource(false);
    const start = importStartFolder(rootFolder, targetImportNodeRef.current, targetImportParentHandleRef.current, fileList, getSavedWorkspaceInfo()?.workspacePath);
    if (source === 'drive') {
      selectingImportRef.current = true;
      const prepared = !getSavedDriveToken() || !hasValidDriveToken() ? prepareGoogleDriveAuth({ isStandalone: true }) : null;
      try {
        const token = prepared ? await prepared.request() : getSavedDriveToken();
        if (!token) throw new Error('웹드라이브 인증이 필요합니다.');
        const { pickAccessibleDriveFolder } = await import('@/lib/gdrive/WorkspaceFolderPicker');
        const initialPath = !prepared ? start.drivePath : [{ id: 'root', name: '내 드라이브' }];
        const selected = await pickAccessibleDriveFolder(token, initialPath, {
          title: '웹드라이브에서 파일 가져오기',
          description: '계정·드라이브·폴더를 선택한 뒤 가져올 문서를 눌러 주세요. 원본 파일은 유지됩니다.',
          selectFile: true,
          acceptFile: item => isSupportedImportFile(item.name) && !item.mimeType.startsWith('application/vnd.google-apps.'),
        });
        if (selected) chooseImportDestination(await readDriveImportFile(selected.token || token, selected));
      } catch (error: any) {
        if (error?.name !== 'AbortError') showToast(error?.message || '웹드라이브 파일을 가져오지 못했습니다.', 'error');
      } finally {
        prepared?.close();
        selectingImportRef.current = false;
      }
      return;
    }
    const api = (window as any).electronAPI;
    if (api?.chooseImportDocument) {
      try {
        const selected = await api.chooseImportDocument(start.localPath);
        if (!selected) return;
        const bytes = await api.readTransferFile(selected.path);
        chooseImportDestination(new File([bytes], selected.name));
      } catch (error: any) {
        if (error?.name !== 'AbortError') showToast(error?.message || '파일 선택창을 열지 못했습니다.', 'error');
      }
      return;
    }
    const picker = (window as any).showOpenFilePicker;
    if (typeof picker !== 'function') {
      importFileInputRef.current?.click();
      return;
    }
    try {
      const options = { ...IMPORT_PICKER_OPTIONS, id: 'onrivi-import-document', ...(start.localHandle ? { startIn: start.localHandle } : {}) };
      let handles;
      try {
        handles = await picker.call(window, options);
      } catch (error: any) {
        if (!start.localHandle || !['NotFoundError', 'TypeError'].includes(error.name)) throw error;
        handles = await picker.call(window, IMPORT_PICKER_OPTIONS);
      }
      const [handle] = handles;
      const file = await handle.getFile();
      chooseImportDestination(file);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        showToast(error?.message || '파일 선택창을 열지 못했습니다.', 'error');
      }
    }
  }, [isRestrictedUser, isImporting, chooseImportDestination, showToast, rootFolder, fileList]);

  // ⌨️ [루트 액션 트리거]
  const triggerCreateRootFile = useCallback(() => {
    setContextMenu(null);
    setPromptConfig({
      isOpen: true,
      title: "루트 워크스페이스에 생성할 새 파일의 이름을 입력하세요.",
      defaultValue: "untitled.md",
      type: 'createFile'
    });
  }, []);

  const triggerCreateRootFolder = useCallback(() => {
    setContextMenu(null);
    setPromptConfig({
      isOpen: true,
      title: "루트 워크스페이스에 생성할 새 폴더의 이름을 입력하세요.",
      defaultValue: "",
      type: 'createFolder'
    });
  }, []);

  const triggerCopyRoot = useCallback(() => {
    setContextMenu(null);
    handleCopyNode();
  }, [handleCopyNode]);

  const triggerCutRoot = useCallback(() => {
    setContextMenu(null);
    handleCutNode();
  }, [handleCutNode]);

  const triggerPasteRoot = useCallback(() => {
    setContextMenu(null);
    handlePasteNode();
  }, [handlePasteNode]);

  const triggerCancelCutRoot = useCallback(() => {
    setContextMenu(null);
    handleCancelCut();
  }, [handleCancelCut]);

  const triggerUndoMoveRoot = useCallback(() => {
    setContextMenu(null);
    handleUndoMove();
  }, [handleUndoMove]);

  const triggerRefreshRoot = useCallback(async () => {
    setContextMenu(null);
    await refreshFileList();
    window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
  }, [refreshFileList]);

  const triggerImportRoot = useCallback(() => {
    setContextMenu(null);
    targetImportNodeRef.current = null;
    targetImportParentHandleRef.current = null;
    void openImportPicker();
  }, [openImportPicker]);

  const triggerRevealRoot = useCallback(async () => {
    setContextMenu(null);
    const targetPath = (workspaceType === 'local' ? rootFolder?.name : rootFolder?.path) || rootFolder?.path || rootFolder?.name;
    const api = (window as any).electronAPI;
    if (api?.openPath && targetPath) {
      await api.openPath(targetPath);
    }
  }, [workspaceType, rootFolder]);

  // ⌨️ [단축키 연동] 루트 컨텍스트 메뉴 오픈 시 일반 단축키 즉각 실행
  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
      const isCtrl = isMacPlatform ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        e.preventDefault();
        setContextMenu(null);
        if (clipboardNode?.op === 'cut') {
          handleCancelCut();
        }
        return;
      }

      // Ctrl+F5: 새로고침
      if (isCtrl && e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        triggerRefreshRoot();
        return;
      }

      // Ctrl+Alt+O: 타문서 변환
      if (isCtrl && e.altKey && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerImportRoot();
        }
        return;
      }

      // Alt+N: 새 파일
      if (e.altKey && !isCtrl && !e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerCreateRootFile();
        }
        return;
      }

      // Ctrl+C: 복사
      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerCopyRoot();
        }
        return;
      }

      // Ctrl+X: 잘라내기
      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerCutRoot();
        }
        return;
      }

      // Ctrl+V: 붙여넣기
      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerPasteRoot();
        }
        return;
      }

      // Ctrl+Z: 되돌리기 (잘라내기 취소 또는 이동/삭제 되돌리기)
      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu(null);
        triggerUndo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [contextMenu, isRestrictedUser, clipboardNode, handleCancelCut, triggerUndo, triggerRefreshRoot, triggerImportRoot, triggerCreateRootFile, triggerCopyRoot, triggerCutRoot, triggerPasteRoot]);

  const handleDragOverRoot = (e: React.DragEvent) => {
    if (isRestrictedUser || !Array.from(e.dataTransfer.types).includes('sourcepath')) {
      setIsDragOverRoot(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsDragOverRoot(true);
  };

  const handleDragLeaveRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverRoot(false);
  };

  const handleDropRoot = async (e: React.DragEvent) => {
    setIsDragOverRoot(false);
    if (isRestrictedUser) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRoot(false);

    const draggedNode = typeof window !== 'undefined' ? (window as any)._draggedNode : null;
    const sourcePath = e.dataTransfer.getData("sourcePath") || e.dataTransfer.getData("sourcepath") || draggedNode?.path || "";
    const sourceName = e.dataTransfer.getData("sourceName") || e.dataTransfer.getData("sourcename") || draggedNode?.name || "";
    const sourceKind = e.dataTransfer.getData("sourceKind") || e.dataTransfer.getData("sourcekind") || draggedNode?.kind || 'file';
    const sourceParentPath = typeof window !== 'undefined' ? (window as any)._draggedNodeParentPath : null;

    const actualRootPath = (workspaceType === 'local' ? rootFolder?.name : rootFolder?.path) || '';

    const normSource = sourcePath.replace(/\\/g, '/').toLowerCase();
    const normRoot = actualRootPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    const normSourceParent = (sourceParentPath || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

    if (!sourcePath || normSource === normRoot) return;
    // 이미 최상위(루트) 폴더에 있는 파일이면 이동하지 않음
    if (normSourceParent && normSourceParent === normRoot) {
      showToast('이미 최상위 루트 폴더에 위치해 있습니다.', 'info');
      return;
    }

    try {
      // 0. Google Drive(GDRIVE/cloud) 루트 이동
      if (workspaceType === 'cloud' || rootFolder?.type === 'GDRIVE') {
        const token = getSavedDriveToken();
        const wsInfo = getSavedWorkspaceInfo();
        const rootDriveId = wsInfo?.workspaceFolderId;
        const srcDriveId = draggedNode?.driveFileId || draggedNode?.driveId || (draggedNode as any)?.id;

        if (!token) {
          showToast('구글 드라이브 토큰이 없습니다. 다시 연결해 주세요.', 'error');
          return;
        }
        if (!srcDriveId || !rootDriveId) {
          showToast('구글 드라이브 파일 또는 루트 폴더 ID를 찾을 수 없습니다.', 'error');
          return;
        }
        if (srcDriveId === rootDriveId) return;

        const srcParentDriveId = (draggedNode as any)?.parentDriveId || (draggedNode as any)?.parentId;
        await moveDriveItemWithUndo(token, srcDriveId, rootDriveId, srcParentDriveId, { name: sourceName, kind: sourceKind });
        showToast(`'${sourceName}' 루트로 이동 완료`, 'success');

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: rootDriveId }
        }));
        return;
      }

      if (workspaceType === 'local') {
        const rootPath = actualRootPath.replace(/[/\\]+$/, '');
        const sep = rootPath.includes('/') ? '/' : '\\';
        const newPath = rootPath ? `${rootPath}${sep}${sourceName}` : sourceName;
        const api = (window as any).electronAPI;
        let movedPath = newPath;
        if (api?.moveFile) {
          const res = await api.moveFile(sourcePath, newPath);
          if (res && res.error) throw new Error(res.error);
          if (res && res.newPath) movedPath = res.newPath;
        } else if (api?.renameFile) {
          await api.renameFile(sourcePath, newPath);
        } else {
          const res = await fetch(getApiUrl('/api/rename'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath: sourcePath, newPath })
          });
          if (!res.ok) throw new Error('루트 이동 실패');
        }

        showToast(`'${sourceName}' 루트로 이동 완료`, 'success');
        dispatchMovedEvent(sourcePath, rootPath, movedPath, sourceName);

        // 📂 expanded_paths 갱신
        try {
          const saved = localStorage.getItem('onrivi_expanded_paths');
          if (saved && draggedNode?.kind === 'directory') {
            const normSrc = sourcePath.replace(/\\/g, '/').toLowerCase();
            let paths: string[] = JSON.parse(saved);
            paths = paths.map((p: string) => {
              const np = p.replace(/\\/g, '/').toLowerCase();
              if (np === normSrc) return movedPath;
              if (np.startsWith(normSrc + '/')) {
                const sub = p.substring(sourcePath.length);
                return `${movedPath}${sep === '\\' ? sub.replace(/\//g, '\\') : sub.replace(/\\/g, '/')}`;
              }
              return p;
            });
            localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
          }
        } catch (expErr) {
          console.warn('[handleDropRoot] expanded_paths 갱신 오류:', expErr);
        }

        // ↩️ undo history push
        undoHistoryRef.current.push({
          type: 'move',
          srcPath: sourcePath,
          destPath: movedPath,
          srcDirPath: sourceParentPath || '',
          destDirPath: rootPath,
          name: sourceName,
          kind: draggedNode?.kind || 'file',
          workspaceType: 'local',
          srcNode: draggedNode
        });
        setHasUndoableMove(true);
        setLastUndoType('move');
        window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: rootPath }
        }));
        return;
      } else if (workspaceType === 'browser') {
        if (draggedNode && draggedNode.handle && rootFolder?.handle) {
          const targetDirHandle = rootFolder.handle as FileSystemDirectoryHandle;
          let finalNewHandle: any = null;

          if (draggedNode.kind === 'file') {
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
          showToast(`'${draggedNode.name}' 루트로 이동 완료`, 'success');
          const newPath = rootFolder.path ? `${rootFolder.path}/${draggedNode.name}` : draggedNode.name;
          dispatchMovedEvent(sourcePath, rootFolder.path || '', newPath, draggedNode.name, finalNewHandle);
          await refreshFileList();
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        } else if (sourcePath) {
          // LocalStorage 루트로 이동
          const oldPath = sourcePath;
          const normalizedPath = oldPath.replace(/\\/g, '/');
          const lastSlashIndex = normalizedPath.lastIndexOf('/');
          const filename = lastSlashIndex !== -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath;
          const newPath = rootFolder?.path ? `${rootFolder.path}/${filename}` : filename;
          
          vfsRename(oldPath, newPath);
          showToast(`'${filename}' 루트로 이동 완료`, 'success');
          dispatchMovedEvent(oldPath, rootFolder?.path || '', newPath, filename);
          await refreshFileList();
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        }
      }
    } catch (e) {
      showToast("이동 실패: " + e, 'error');
    }
  };

  useEffect(() => {
    const previewContainer = previewRef?.current;
    if (!previewContainer) return;

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!toc || toc.length === 0) return;
        
        let foundId = '';
        const containerTop = previewContainer.getBoundingClientRect().top;

        // 아래에서 위로 스크롤하며, 화면 상단에 가장 가까운 헤딩을 찾음
        const headings = Array.from(previewContainer.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
        for (let i = toc.length - 1; i >= 0; i--) {
          let el = document.getElementById(toc[i].id);
          if (!el && headings[i]) {
            el = headings[i];
          }
          if (el) {
            const rect = el.getBoundingClientRect();
            // 약간의 오프셋(예: 150px)을 주어 제목이 상단에 닿기 직전에 하이라이트되도록 함
            if (rect.top - containerTop <= 150) {
              foundId = toc[i].id;
              break;
            }
          }
        }
        
        // 스크롤이 맨 위에 있어서 어떤 헤딩도 조건을 만족하지 않으면 첫 번째 헤딩 활성화
        if (!foundId && toc.length > 0) {
          foundId = toc[0].id;
        }

        if (foundId && foundId !== activeTocId) {
          setActiveTocId(foundId);

          // 활성화된 헤딩의 부모들을 모두 펼침 (Auto-expand)
          const activeIndex = toc.findIndex((t: any) => t.id === foundId);
          if (activeIndex >= 0) {
            const activeLevel = toc[activeIndex].level;
            let parentH1Id = '';
            let parentH2Id = '';
            let parentH3Id = '';
            for (let i = activeIndex - 1; i >= 0; i--) {
              const item = toc[i];
              if (item.level === 1 && !parentH1Id) parentH1Id = item.id;
              if (item.level === 2 && !parentH2Id && !parentH1Id) parentH2Id = item.id;
              if (item.level === 3 && !parentH3Id && !parentH2Id && !parentH1Id) parentH3Id = item.id;
              if (parentH1Id && parentH2Id && parentH3Id) break;
            }

            setCollapsedH1s(prev => {
              const next = { ...prev };
              let changed = false;

              if (parentH1Id && next[parentH1Id] === true) {
                next[parentH1Id] = false;
                changed = true;
              }
              if (parentH2Id && next[parentH2Id] !== false) {
                next[parentH2Id] = false;
                changed = true;
              }
              if (parentH3Id && next[parentH3Id] !== false) {
                next[parentH3Id] = false;
                changed = true;
              }

              if (activeLevel === 1 && next[foundId] === true) {
                next[foundId] = false;
                changed = true;
              } else if (activeLevel >= 2 && activeLevel <= 3 && next[foundId] !== false) {
                next[foundId] = false;
                changed = true;
              }

              return changed ? next : prev;
            });
          }
        }
      });
    };

    previewContainer.addEventListener('scroll', handleScroll, { passive: true });
    // 초기 렌더링 시 스크롤 위치 계산
    handleScroll();

    return () => {
      previewContainer.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [toc, previewRef, activeTocId]);

  const tocContainerRef = useRef<HTMLDivElement>(null); // 💡 개요 스크롤 동기화용 ref

  // 📝 활성화된 개요(TOC) 항목이 화면 밖으로 벗어날 경우 개요 탭 목록 컨테이너 자동 스크롤 동기화
  useEffect(() => {
    if (!activeTocId || sidebarTab !== 'toc' || !tocContainerRef.current) return;

    const activeItem = tocContainerRef.current.querySelector(`#toc-item-${activeTocId}`);
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest' // 💡 화면에 이미 보이면 대기, 화면 밖 이탈 시에만 부드럽게 복구
      });
    }
  }, [activeTocId, sidebarTab]);

  useEffect(() => {
    const handleTriggerImport = (e?: any) => {
      if (isRestrictedUser) return;
      targetImportNodeRef.current = e?.detail?.node || null;
      targetImportParentHandleRef.current = e?.detail?.parentHandle || null;
      void openImportPicker(e?.detail?.source);
    };
    window.addEventListener('TRIGGER_IMPORT', handleTriggerImport);
    return () => window.removeEventListener('TRIGGER_IMPORT', handleTriggerImport);
  }, [isRestrictedUser, openImportPicker]);

// ====================================================================
// 📊 [OMD-FILE-LeftSidebar-0006] LeftSidebar ➔ onPromptConfirm
// 🎯 @KICK  : PromptModal 확인 시 파일/폴더 생성 (브라우저/로컬/LocalStorage VFS 대응)
// 🛡️ @GUARD : 이름 중복 체크 후 중복 시 에러 메시지 재표시
// 🚨 @PATCH : 없음
// 🔗 @CALLS : refreshFileList, openFile, vfsCreateFile, vfsCreateFolder, fetch, api.createFile, api.createFolder
// ====================================================================
  const onPromptConfirm = async (name: string) => {
    const type = promptConfig.type;
    setPromptConfig({ ...promptConfig, isOpen: false });
    if (!name) return;

    const rootPath = rootFolder?.name || "";

    if (type === 'createFile') {
      const finalName = (name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.bib')) ? name : `${name}.md`;
      
      // 중복 체크
      if (fileList.some((c: any) => c.name.toLowerCase() === finalName.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, error: "이미 같은 이름의 파일이 존재합니다." }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));
        if (rootFolder?.type === 'GDRIVE') {
          const { getSavedDriveToken, getSavedWorkspaceInfo, createDriveMarkdownFile, listDriveChildren } = await import('@/lib/gdrive/googleDriveClient');
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const targetFolderId = rootFolder?.id || wsInfo?.workspaceFolderId;
          if (token && targetFolderId) {
            const newFile = await createDriveMarkdownFile(token, targetFolderId, finalName, '');
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({
              name: finalName,
              kind: 'file',
              path: `${rootFolder?.path || 'GoogleDrive'}/${finalName}`,
              driveId: newFile.id,
              id: newFile.id
            });
            showToast(`'${finalName}' 파일이 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (rootFolder?.handle) {
            const handle = await rootFolder.handle.getFileHandle(finalName, { create: true });
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({ name: finalName, kind: 'file', handle, path: finalName }, rootFolder?.handle);
          } else {
            // LocalStorage 가상 파일 생성
            const { vfsCreateFile } = await import('@/lib/virtualFileSystem');
            vfsCreateFile("", finalName);
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({ name: finalName, kind: 'file', path: finalName });
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFile) {
            const result = await api.createFile(rootPath, finalName);
            if (result.success) {
              await refreshFileList();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
              openFile({ name: finalName, kind: 'file', path: result.path });
            }
          } else {
            // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 파일 생성 수행
            const { vfsCreateFile } = await import('@/lib/virtualFileSystem');
            vfsCreateFile("", finalName);
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({ name: finalName, kind: 'file', path: finalName });
          }
        }
      } catch(e) { showToast("생성 실패: " + e, 'error'); }
    } else if (type === 'createFolder') {
      // 중복 체크
      if (fileList.some((c: any) => c.name.toLowerCase() === name.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, error: "이미 같은 이름의 폴더가 존재합니다." }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));
        if (rootFolder?.type === 'GDRIVE') {
          const { getSavedDriveToken, getSavedWorkspaceInfo, createDriveFolder } = await import('@/lib/gdrive/googleDriveClient');
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const targetFolderId = rootFolder?.id || wsInfo?.workspaceFolderId;
          if (token && targetFolderId) {
            await createDriveFolder(token, name, targetFolderId);
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            showToast(`'${name}' 폴더가 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (rootFolder?.handle) {
            await rootFolder.handle.getDirectoryHandle(name, { create: true });
          } else {
            // LocalStorage 가상 폴더 생성
            const { vfsCreateFolder } = await import('@/lib/virtualFileSystem');
            vfsCreateFolder("", name);
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFolder) {
            await api.createFolder(rootPath, name);
          } else {
            // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 폴더 생성 수행
            const { vfsCreateFolder } = await import('@/lib/virtualFileSystem');
            vfsCreateFolder("", name);
          }
        }
        await refreshFileList();
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
      } catch(e) { showToast("생성 실패: " + e, 'error'); }
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isImporting) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupportedImportFile(file.name)) {
      e.target.value = '';
      showToast('지원하지 않는 형식입니다. DOCX, HWP, PDF, EPUB, TXT, MD, HTML 파일을 선택해 주세요.', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      showToast('파일에서 텍스트를 추출 중입니다...', 'info');
      const imageSaveCallback = async (base64Data: string, contentType: string) => {
        requireResourceSettings();
        const ext = contentType.split('/')[1] || 'png';
        let imgName = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        try {
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
          imgName = `img_${hashHex}.${ext}`;
        } catch (e) {
          console.warn('해시 생성 실패, 기본 시간 기반 이름 사용', e);
        }
        const assetsDir = 'assets';
        const imgPath = `${assetsDir}/${imgName}`;

        const isDriveEnv = getResourceSettings()?.kind === 'drive';
        if (isDriveEnv) {
          const token = getSavedDriveToken();
          const cloudSettings = getResourceSettings('cloud');
          const wsInfo = getSavedWorkspaceInfo();
          let mediaFolderId = cloudSettings?.mediaFolderId || wsInfo?.mediaFolderId;
          if (!mediaFolderId && token && (cloudSettings?.folderId || wsInfo?.resourceFolderId)) {
            try {
              const parentId = cloudSettings?.folderId || wsInfo?.resourceFolderId;
              const { listDriveChildren } = await import('@/lib/gdrive/googleDriveClient');
              const children = await listDriveChildren(token, parentId!);
              const m = children.find(c => c.isFolder && c.name === 'media');
              if (m) mediaFolderId = m.id;
            } catch {}
          }
          if (token && mediaFolderId) {
            try {
              const res = await fetch(`data:${contentType};base64,${base64Data}`);
              const blob = await res.blob();
              const uploaded = await uploadDriveImage(token, mediaFolderId, blob, imgName);
              if (uploaded?.id) {
                return `/media/${encodeURIComponent(uploaded.name)}?driveId=${encodeURIComponent(uploaded.id)}`;
              }
            } catch (gErr) {
              console.error('[LeftSidebar GDrive upload error]', gErr);
              throw new Error('가져온 이미지를 구글 드라이브에 저장하지 못했습니다. 연결 상태를 확인해 주세요.');
            }
          }
          throw new Error('이미지 저장을 위한 구글 드라이브 연결 또는 미디어 폴더를 찾지 못했습니다.');
        }

        if (workspaceType === 'browser') {
          if (resourceFolderHandle) {
            const mediaDir = await resourceFolderHandle.getDirectoryHandle('media', { create: true });
            const fileHandle = await mediaDir.getFileHandle(imgName, { create: true });
            const writable = await fileHandle.createWritable();
            const res = await fetch(`data:${contentType};base64,${base64Data}`);
            const blob = await res.blob();
            await writable.write(blob);
            await writable.close();
            return `/media/${imgName}`;
          } else { requireResourceSettings(); throw new Error('리소스 폴더 접근 권한을 다시 설정해 주세요.'); }
        } else {
          // Electron 데스크톱 환경
          const api = (window as any).electronAPI;
          if (api && api.saveImage) {
            const folder=requireResourceSettings().path;
            const sep = folder.includes('\\') ? '\\' : '/';
            const targetFolder = folder + sep + 'media';
            const saveResult = await api.saveImage(targetFolder, base64Data, imgName);
            if (saveResult && saveResult.success) {
              if (saveResult.mediaPath) {
                return saveResult.mediaPath;
              } else if (saveResult.absolutePath) {
                return `media://local/serve?url=${encodeURIComponent(saveResult.absolutePath)}`;
              }
            }
          }
        }
        
        throw new Error('가져온 이미지 파일을 저장하지 못했습니다. 공통 자원 폴더를 확인해 주세요.');
      };

      const { convertFileToMarkdown } = await import('@/lib/fileImporter');
      let markdown = await convertFileToMarkdown(file, imageSaveCallback);

      if (!markdown.trim()) throw new Error('문서에서 변환할 내용을 추출할 수 없습니다.');
      const targetNode = targetImportNodeRef.current;
      const targetParentHandle = targetImportParentHandleRef.current;
      targetImportNodeRef.current = null;
      targetImportParentHandleRef.current = null;

      const requestedName = importNameRef.current; importNameRef.current = null;
      const originalName = requestedName ? requestedName.replace(/\.md$/i, '') : file.name.split('.').slice(0, -1).join('.') || file.name;
      let finalName = `${originalName}.md`;

      const targetPath = targetNode ? (targetNode.path || targetNode.name || "") : (rootFolder?.path || rootFolder?.name || "");

      let counter = 1;
      while (fileList.some((c: any) => c.name.toLowerCase() === finalName.toLowerCase())) {
        finalName = `${originalName}_${counter}.md`;
        counter++;
      }

      // 📂 [하위 폴더 펼침 보장] 대상 폴더 및 상위 폴더 경로를 onrivi_expanded_paths에 즉시 등록
      if (targetNode?.path) {
        try {
          const saved = localStorage.getItem('onrivi_expanded_paths');
          let paths: string[] = saved ? JSON.parse(saved) : [];
          const norm = targetNode.path.replace(/\\/g, '/');
          const parts = norm.split('/');
          let cur = '';
          for (const part of parts) {
            cur = cur ? `${cur}/${part}` : part;
            if (!paths.some(p => p.replace(/\\/g, '/') === cur)) {
              paths.push(cur);
            }
          }
          localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
        } catch (e) {}
      }

      // 🔄 탐색기 즉시 새로고침 및 2차 안전 갱신 헬퍼
      const triggerExplorerRefresh = async (createdFilePath?: string) => {
        const refreshDir = targetNode?.path || targetPath;
        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: refreshDir }
        }));
        if (createdFilePath) {
          window.dispatchEvent(new CustomEvent('file:select-node', {
            detail: { path: createdFilePath }
          }));
        }
        setTimeout(async () => {
          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
            detail: { force: true, targetDir: refreshDir }
          }));
        }, 120);
      };

      // ☁️ [Google Drive 작업장 시 구글 드라이브 문서 생성]
      if (rootFolder?.type === 'GDRIVE') {
        const { getSavedDriveToken, getSavedWorkspaceInfo, createDriveMarkdownFile, listDriveChildren } = await import('@/lib/gdrive/googleDriveClient');
        const token = getSavedDriveToken();
        const wsInfo = getSavedWorkspaceInfo();
        const targetFolderId = targetNode?.driveId || targetNode?.driveFileId || targetNode?.id || rootFolder?.driveFolderId || wsInfo?.workspaceFolderId;
        if (token && targetFolderId) {
          const existing = await listDriveChildren(token, targetFolderId);
          while (existing.some(item => item.name.toLowerCase() === finalName.toLowerCase())) finalName = `${originalName}_${counter++}.md`;
          const newDoc = await createDriveMarkdownFile(token, targetFolderId, finalName, markdown);
          const createdPath = `${targetNode?.path || rootFolder?.path || 'GoogleDrive'}/${finalName}`;
          await triggerExplorerRefresh(createdPath);
          openFile({
            name: finalName,
            kind: 'file',
            path: createdPath,
            driveId: newDoc.id,
            driveFileId: newDoc.id,
            id: newDoc.id
          });
          showToast(`'${file.name}' 문서가 구글 드라이브에 성공적으로 변환 저장되었습니다.`, 'success');
          return;
        }
      }

      if (workspaceType === 'browser') {
        const destDirHandle = targetNode?.handle || (targetNode ? targetParentHandle : rootFolder?.handle);
        if (destDirHandle && typeof destDirHandle.getFileHandle === 'function') {
          const existingNames: string[] = [];
          for await (const [name] of destDirHandle.entries()) existingNames.push(name.toLowerCase());
          while (existingNames.includes(finalName.toLowerCase())) finalName = `${originalName}_${counter++}.md`;
          const handle = await destDirHandle.getFileHandle(finalName, { create: true });
          const writable = await handle.createWritable();
          await writable.write(markdown);
          await writable.close();
          const createdPath = targetNode?.path ? `${targetNode.path}/${finalName}` : finalName;
          await triggerExplorerRefresh(createdPath);
          openFile({ name: finalName, kind: 'file', handle, path: createdPath }, destDirHandle);
        } else {
          const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
          const vfsDir = targetNode ? (targetNode.path || targetNode.name || "") : "";
          vfsCreateFile(vfsDir, finalName);
          const createdPath = vfsDir ? `${vfsDir}/${finalName}` : finalName;
          vfsWriteFile(createdPath, markdown);
          await triggerExplorerRefresh(createdPath);
          openFile({ name: finalName, kind: 'file', path: createdPath });
        }
      } else {
        const api = (window as any).electronAPI;
        const parentDir = targetPath || rootFolder?.name || "";
        if (api?.createFile && api?.saveFile) {
          const result = await api.createFile(parentDir, finalName);
          if (result.success) {
            const saved = await api.saveFile(result.path, markdown);
            if (saved === false || saved?.success === false) throw new Error(saved?.error || '변환 문서를 저장하지 못했습니다. 작업장 경로와 쓰기 권한을 확인해 주세요.');
            await triggerExplorerRefresh(result.path);
            openFile({ name: finalName, kind: 'file', path: result.path });
          } else throw new Error(result.error || '변환 문서 파일을 만들지 못했습니다. 작업장 폴더를 확인해 주세요.');
        } else {
          // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 생성 수행
          const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
          vfsCreateFile("", finalName);
          vfsWriteFile(finalName, markdown);
          await triggerExplorerRefresh(finalName);
          openFile({ name: finalName, kind: 'file', path: finalName });
        }
      }
      showToast(`'${file.name}' 문서가 성공적으로 변환되었습니다.`, 'success');
    } catch (error: any) {
      showToast(error.message || '파일을 변환하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsImporting(false);
    }
    
    // input 초기화
    e.target.value = '';
  };

// ====================================================================
// 📊 [OMD-FILE-LeftSidebar-0005] LeftSidebar ➔ useEffect (isDesktop)
// 🎯 @KICK  : 클라이언트 환경이 데스크톱(electron)인지 감지하여 isDesktop 상태 설정
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setIsDesktop
// ====================================================================
  useEffect(() => {
    setIsDesktop(typeof window !== 'undefined' && !!(window as any).electronAPI);
  }, []);

// ====================================================================
// 📊 [OMD-FILE-LeftSidebar-0004] LeftSidebar ➔ fetchDrives
// 🎯 @KICK  : electronAPI 또는 REST API를 통해 시스템 드라이브 목록 조회
// 🛡️ @GUARD : api 존재 여부에 따라 분기 처리
// 🚨 @PATCH : 없음
// 🔗 @CALLS : api.getDrives, fetch, msg.warn
// ====================================================================
  const fetchDrives = async () => {
    setIsDrivesLoading(true);
    try {
      const api = (window as any).electronAPI;
      if (api?.getDrives) {
        const list = await api.getDrives();
        setDrives(list.map((d: string) => ({ name: d, kind: 'directory' as const, path: d + '\\', children: [] })));
      } else if (!api) {
        const res = await fetch(getApiUrl('/api/drives'));
        if (res.ok) {
          setDrives(await res.json());
        }
      }
    } catch (err) {
      msg.warn('드라이브 목록 조회 실패', err);
    } finally {
      setIsDrivesLoading(false);
    }
  };

// ====================================================================
// 📊 [OMD-FILE-LeftSidebar-0003] LeftSidebar ➔ useEffect (drives fetch)
// 🎯 @KICK  : 탐색기 탭이 활성화되고 데스크톱 환경일 때 드라이브 목록 자동 조회
// 🛡️ @GUARD : sidebarTab === 'explorer' && isDesktop 조건 검사
// 🚨 @PATCH : 없음
// 🔗 @CALLS : fetchDrives
// ====================================================================
  useEffect(() => {
    if (sidebarTab === 'explorer' && isDesktop) {
      fetchDrives();
    }
  }, [sidebarTab, isDesktop]);

// ====================================================================
// 📊 [OMD-FILE-LeftSidebar-0002] LeftSidebar ➔ handleLazyLoad
// 🎯 @KICK  : FileSystem API 또는 로컬 API로 폴더 내 .md 파일 목록을 지연 로딩
// 🛡️ @GUARD : 파일 확장자가 .md/.markdown인 경우만 포함, NotFoundError 예외 억제 및 자동 정리
// 🚨 @PATCH : **2026-09-16** — [삭제/이동된 폴더 NotFoundError 콘솔 경고 억제 및 onrivi_expanded_paths 자동 소거]: 폴더가 삭제되거나 이동되어 File System Access API에서 NotFoundError 발생 시 경고 스팸을 차단하고 localStorage 경로를 정리한 뒤 NotFoundError 예외를 전달하여 상위 컴포넌트가 트리를 즉시 정리하도록 보강
// 🔗 @CALLS : fetch, getVfsFiles, listDirectory
// ====================================================================
  const handleLazyLoad = async (node: FileNode): Promise<FileNode[]> => {
    try {
      // ☁️ [Google Drive 하위 폴더 지연 로딩]
      if ((node as any).driveId || rootFolder?.type === 'GDRIVE') {
        const { getSavedDriveToken, fetchDriveFileNodes } = await import('@/lib/gdrive/googleDriveClient');
        const token = getSavedDriveToken();
        const folderId = (node as any).driveId || (node as any).id;
        if (token && folderId) {
          const children = await fetchDriveFileNodes(token, folderId, node.path || node.name);
          return children;
        }
      }

      if (workspaceType === 'browser') {
        if (node.handle) {
          const children: FileNode[] = [];
          for await (const entry of node.handle.values()) {
            const kind = entry.kind === 'directory' ? 'directory' : 'file';
            const path = node.path ? `${node.path}/${entry.name}` : entry.name;
            if (kind === 'file') {
              const nameLower = entry.name.toLowerCase();
              if (!nameLower.endsWith('.md') && !nameLower.endsWith('.markdown') && !nameLower.endsWith('.bib')) {
                continue;
              }
            }
            children.push({
              name: entry.name,
              kind,
              path,
              handle: entry
            });
          }
          children.sort((a, b) => {
            if (a.kind !== b.kind) {
              return a.kind === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
          return children;
        } else {
          // LocalStorage VFS용 폴백
          const { getVfsFiles } = await import('@/lib/virtualFileSystem');
          const allVfs = getVfsFiles();
          const findChildren = (nodes: FileNode[]): FileNode[] => {
            for (const n of nodes) {
              if (n.path === node.path) return n.children || [];
              if (n.kind === 'directory' && n.children) {
                const found = findChildren(n.children);
                if (found.length > 0 || n.path === node.path) return found;
              }
            }
            return [];
          };
          return findChildren(allVfs);
        }
      }

      const api = (window as any).electronAPI;
      if (api?.listDirectory) {
        return await api.listDirectory(node.path);
      }
      const res = await fetch(getApiUrl(`/api/list-files?path=${encodeURIComponent(node.path || '')}`));
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('could not be found')) {
        // 🛡️ [삭제/이동된 폴더 NotFoundError 안전 가드]
        // 폴더가 삭제되었거나 이동되어 물리적으로 존재하지 않는 경우 불필요한 콘솔 경고 스팸을 차단하고
        // 호출자(FileTreeItem)가 부모를 갱신하여 트리에서 깨끗하게 제거할 수 있도록 예외 전달
        if (typeof window !== 'undefined' && node.path) {
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
        throw err;
      }
      msg.warn('폴더 목록 조회 실패', err);
      return [];
    }
  };

  const importControls = <>
    {showImportSource && <div className="fixed inset-0 z-[1000000] bg-black/60 flex items-center justify-center p-4" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setShowImportSource(false); } }}>
      <section role="dialog" aria-modal="true" aria-label="파일 가져올 위치 선택" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">파일 열기 · 가져오기</h2>
        <p className="text-sm">가져올 파일의 위치를 선택해 주세요. 파일은 Markdown(.md)으로 변환한 뒤 선택한 작업장 폴더에 저장합니다.</p>
        <button type="button" autoFocus className="block w-full border rounded-lg p-3 text-left" onClick={() => void openImportPicker('local')}>📁 내 PC(로컬)에서 가져오기</button>
        <button type="button" className="block w-full border rounded-lg p-3 text-left" onClick={() => void openImportPicker('drive')}>☁️ 웹드라이브에서 가져오기</button>
        <p className="text-xs">DOCX · HWP · PDF · EPUB · TXT · MD · HTML</p>
        <div className="text-right"><button type="button" className="border rounded px-4 py-2" onClick={() => setShowImportSource(false)}>취소</button></div>
      </section>
    </div>}
    <input type="file" ref={importFileInputRef} style={{display:'none'}} accept={IMPORT_ACCEPT} onChange={event => {const file=event.target.files?.[0];event.target.value='';if(file)chooseImportDestination(file);}} />
    <NewDocumentModal isOpen={!!pendingImportFile} onClose={() => setPendingImportFile(null)} fileList={fileList} rootFolder={rootFolder} workspaceType={workspaceType} initialName={pendingImportFile?.name.replace(/\.[^.]+$/, '') || '문서'} dialogTitle="파일 가져올 폴더와 이름" initialFolderNode={targetImportNodeRef.current} onConfirm={async (name,node) => {
      if (!pendingImportFile) return;
      const file=pendingImportFile;
      targetImportNodeRef.current=node;
      targetImportParentHandleRef.current=node?.handle || rootFolder?.handle || null;
      importNameRef.current=name;
      await handleImportFile({target:{files:[file],value:''}} as unknown as React.ChangeEvent<HTMLInputElement>);
      setPendingImportFile(null);
    }} />
  </>;
  if (!isSidebarOpen) return importControls;

  return (
    <>
      {importControls}
      <aside 
        style={{ 
          width: sidebarWidth,
          fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif",
        }} 
        className="flex flex-col shrink-0 min-w-[180px] max-w-[450px] border-r border-slate-300 dark:border-zinc-700 select-none relative z-10 bg-sidebar-luxury text-on-surface shadow-sm"
      >
        {/* 탭 헤더 (Modern Technical Editorial - Cobalt Authority & Hairline) */}
        <div className="h-10 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center px-2 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md justify-between">
          <div className="flex gap-1.5 w-full">
            <button
              onClick={() => {
                setSidebarTab('explorer');
                setIsSearchOpen(false);
              }}
              className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'explorer' 
                  ? 'bg-[#1d4ed8] text-white shadow-xs font-black' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon name="Explorer" size={13} strokeWidth={2.2} />
              <span>탐색기</span>
            </button>
            <button
              onClick={() => {
                setSidebarTab('toc');
                setIsSearchOpen(false);
              }}
              className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'toc' 
                  ? 'bg-[#1d4ed8] text-white shadow-xs font-black' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon name="Toc" size={13} strokeWidth={2.2} />
              <span>개요</span>
            </button>
            <button
              onClick={() => {
                setSidebarTab('search');
                setIsSearchOpen(true);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('onrivi:focus-global-search'));
                }
              }}
              className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'search' 
                  ? 'bg-[#1d4ed8] text-white shadow-xs font-black' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon name="Search" size={13} strokeWidth={2.2} />
              <span>검색</span>
            </button>
          </div>
        </div>
      
        {/* 항상 표시되는 워크스페이스 선택 바 */}
        <div 
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[#E2E8F0] dark:border-white/[0.08] transition-colors backdrop-blur-xs ${
            isDragOverRoot ? 'bg-blue-500/15 border-blue-400 dark:border-blue-500' : 'bg-white/40 dark:bg-white/[0.02]'
          }`}
          onDragOver={handleDragOverRoot}
          onDragLeave={handleDragLeaveRoot}
          onDrop={handleDropRoot}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('close-context-menus'));
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide shrink-0">작업장 실폴더</span>
          {typeof window !== 'undefined' && !(window as any).electronAPI && rootFolder?.type !== 'GDRIVE' && (
            <button type="button" className="shrink-0 px-1.5 py-1 rounded text-[11px] font-bold text-blue-700 hover:bg-blue-50"
              title="파일을 삭제하지 않고 기본 브라우저 작업장으로 연결을 초기화합니다."
              onClick={() => window.dispatchEvent(new Event('onrivi:reset-browser-workspace'))}>
              초기화
            </button>
          )}
          <button
            onClick={onSelectRootFolder}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[12px] font-bold transition-all
              bg-white/95 dark:bg-[#202328] hover:bg-white dark:hover:bg-[#282C33]
              border border-slate-300 dark:border-zinc-700 hover:border-[#1d4ed8] dark:hover:border-[#1d4ed8]
              text-slate-800 dark:text-zinc-100 hover:text-[#1d4ed8] dark:hover:text-[#1d4ed8]
              shadow-2xs truncate"
            title={rootFolder?.name ? `워크스페이스 변경 (현재: ${rootFolder.name})` : '워크스페이스 폴더 선택'}
          >
            <Icon name="FolderTree" 
              size={14} 
              strokeWidth={1.75} 
              className="shrink-0 text-current opacity-75" 
            />
            <span className="truncate font-bold">
              {rootFolderDisplayName || '폴더를 선택하세요'}
            </span>
            {isGdriveAuthNeeded && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-500 text-white rounded-full shrink-0 shadow-2xs animate-pulse">
                재연결
              </span>
            )}
          </button>
          {rootFolder?.type === 'GDRIVE' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (disconnectGoogleDrive) disconnectGoogleDrive();
              }}
              title="개인 웹드라이브 연결을 해제하고 내 PC 로컬 작업장으로 돌아갑니다."
              className="px-2 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>🔌</span>
              <span>로컬 복귀</span>
            </button>
          )}
        </div>

      {/* 탭 바디 — 항상 마운트, hidden으로 표시/숨김 제어 */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <div 
          ref={explorerScrollRef}
          className={`flex-1 overflow-y-auto [scrollbar-gutter:stable] explorer-scrollbar p-2 ${sidebarTab !== 'explorer' ? 'hidden' : ''}`}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[role="treeitem"]')) {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('close-context-menus'));
              setContextMenu({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          {(rootFolder as any)?.needPermission ? (
            // 이전 워크스페이스 권한 복구 안내
            <div className="text-zinc-500 dark:text-zinc-400 text-[12px] text-center py-5 space-y-2.5 px-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 space-y-1.5 text-left">
                <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  ⚠️ 이전 폴더 연결 대기
                </p>
                <p className="text-[12px] leading-relaxed opacity-90">
                  브라우저 보안 제약으로 인해 새로고침 후 폴더 권한 승인이 필요합니다. 아래 버튼을 눌러 이전 폴더(<strong>{rootFolder?.name}</strong>)의 복구를 승인하세요.
                </p>
              </div>
              <button
                onClick={onRestoreFolder}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[12px] font-bold transition-all shadow-md shadow-amber-500/20"
              >
                🔄 워크스페이스 복구
              </button>
            </div>
          ) : rootFolder?.handle || (isDesktop && rootFolder?.name) || rootFolder?.name === BROWSER_STORAGE_NAME || rootFolder?.type === 'GDRIVE' ? (
            // 폴더 연결됨 → 파일 트리 표시
            // 🛡️ [빈 폴더 방어] fileList가 비어있어도 루트 폴더 헤더(풀경로+버튼)를 항상 유지
            <div 
              className={`space-y-0.5 min-h-[50px] transition-colors rounded-lg ${isDragOverRoot ? 'bg-blue-500/10 border-2 border-dashed border-blue-500/50' : ''}`}
              onDragOver={handleDragOverRoot}
              onDragLeave={handleDragLeaveRoot}
              onDrop={handleDropRoot}
            >
              <div 
                ref={rootItemRef}
                tabIndex={0}
                role="treeitem"
                aria-selected={isSelectedRoot}
                onMouseDown={() => {
                  setIsSelectedRoot(true);
                  rootItemRef.current?.focus();
                }}
                onClick={() => {
                  setIsSelectedRoot(true);
                  explorerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDragOver={handleDragOverRoot}
                onDragLeave={handleDragLeaveRoot}
                onDrop={handleDropRoot}
                className={`group relative flex items-center justify-between px-1.5 py-1 text-[12px] font-bold border-b border-outline-variant/20 mb-1 cursor-pointer rounded-t transition-colors focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]/40 ${
                  isSelectedRoot 
                    ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-blue-700 dark:text-blue-400 font-extrabold shadow-xs rounded-lg' 
                    : isDragOverRoot 
                      ? 'bg-blue-500/20 ring-1 ring-blue-500 text-blue-700 dark:text-blue-400 font-extrabold' 
                      : 'text-on-surface hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                onKeyDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

                  const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
                  const isCtrl = isMacPlatform ? e.metaKey : e.ctrlKey;

                  if (isCtrl && e.key === 'F5') {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerRefreshRoot();
                    return;
                  }
                  if (isRestrictedUser) return;
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'o' || e.key === 'O')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerImportRoot();
                    return;
                  }
                  if (isCtrl && e.altKey && !e.shiftKey && (e.key === 'N' || e.key === 'n')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCreateRootFolder();
                    return;
                  }
                  if (e.altKey && !isCtrl && !e.shiftKey && (e.key === 'N' || e.key === 'n')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCreateRootFile();
                    return;
                  }
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCopyRoot();
                    return;
                  }
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCutRoot();
                    return;
                  }
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerPasteRoot();
                    return;
                  }
                  if (e.shiftKey && e.altKey && (e.key === 'R' || e.key === 'r')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerRevealRoot();
                    return;
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('close-context-menus'));
                  setContextMenu({ x: e.clientX, y: e.clientY });
                }}
              >
                <div className="flex items-center gap-1.5 truncate flex-1 font-bold">
                  <Icon name="FolderTree" size={14} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">{rootFolderDisplayName}</span>
                </div>

                {/* Context Menu Portal */}
                {contextMenu && createPortal(
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
                      top: Math.max(10, Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 250 : contextMenu.y)), 
                      left: Math.max(10, Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 240 : contextMenu.x)) 
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseEnter={handleMenuMouseEnter}
                    onMouseLeave={handleMenuMouseLeave}
                  >
                    {(() => {
                      const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
                      const isCurrentOpen = !!currentFileNode?.path && !!openTabPaths?.length && (() => {
                        const normPath = currentFileNode.path.replace(/\\/g, '/');
                        if (currentFileNode.kind === 'directory') {
                          return openTabPaths.some(tp => {
                            const normTp = tp.replace(/\\/g, '/');
                            return normTp === normPath || normTp.startsWith(normPath + '/');
                          });
                        }
                        return openTabPaths.some(tp => tp.replace(/\\/g, '/') === normPath);
                      })();

                      return (
                        <div className="flex flex-col text-[12px] text-gray-700 dark:text-gray-300 font-medium py-0.5">
                          <fieldset disabled={isRestrictedUser} className="flex flex-col [&_button:disabled]:pointer-events-none [&_button:disabled]:opacity-40 [&_button:disabled]:cursor-not-allowed">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerCreateRootFile();
                                }}
                                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon name="FileAdd" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                  <span className="truncate">새 파일</span>
                                </div>
                                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌥N' : 'Alt+N'}</kbd>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerCreateRootFolder();
                                }}
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
                                  triggerCopyRoot();
                                }}
                                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon name="Copy" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                  <span className="truncate">복사하기</span>
                                </div>
                                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘C' : 'Ctrl+C'}</kbd>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerCutRoot();
                                }}
                                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon name="Cut" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                  <span className="truncate">잘라내기</span>
                                </div>
                                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘X' : 'Ctrl+X'}</kbd>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerPasteRoot();
                                }}
                                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon name="ClipboardPaste" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                  <span className="truncate">붙여넣기</span>
                                </div>
                                <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘V' : 'Ctrl+V'}</kbd>
                              </button>
                              {clipboardNode?.op === 'cut' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerCancelCutRoot();
                                  }}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerUndoMoveRoot();
                                  }}
                                  className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Icon name="Undo2" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                    <span className="truncate">{lastUndoType === 'delete' ? '삭제 되돌리기' : '이동 되돌리기'}</span>
                                  </div>
                                  <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘Z' : 'Ctrl+Z'}</kbd>
                                </button>
                              )}
                          </fieldset>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerRefreshRoot();
                            }}
                            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon name="RotateCw" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                              <span className="truncate">새로고침</span>
                            </div>
                            <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘F5' : 'Ctrl+F5'}</kbd>
                          </button>
                          <fieldset disabled={isRestrictedUser} className="flex flex-col [&_button:disabled]:pointer-events-none [&_button:disabled]:opacity-40 [&_button:disabled]:cursor-not-allowed">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerImportRoot();
                              }}
                              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon name="FolderInput" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                <span className="truncate">파일 열기</span>
                              </div>
                              <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌥⌘O' : 'Ctrl+Alt+O'}</kbd>
                            </button>
                          {(() => {
                            const isDesktopApp = typeof window !== 'undefined' && !!(window as any).electronAPI;
                            if (!isDesktopApp) return null;
                            const explorerLabel = isMacPlatform ? 'Finder에서 보기' : '파일 탐색기에서 보기';
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerRevealRoot();
                                }}
                                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                                title={explorerLabel}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon name="FolderOpen" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                  <span className="truncate">{explorerLabel}</span>
                                </div>
                              </button>
                            );
                          })()}
                          </fieldset>
                        </div>
                      );
                    })()}
                  </div>,
                  document.body
                )}
              </div>

              {isMergeMode && (
                <div className="flex flex-col gap-1 px-1.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mx-0.5 mb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-semibold text-blue-700 dark:text-blue-300">
                      병합 모드 ({selectedMergeNodes.length}개 선택됨)
                    </span>
                    <button
                      onClick={onCancelMerge}
                      className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                      title="병합 취소"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <button
                    onClick={onOpenMergeModal}
                    disabled={selectedMergeNodes.length < 2}
                    className="w-full px-1.5 py-0.5 text-[12px] font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-md transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    병합 실행
                  </button>
                </div>
              )}

              {isGdriveAuthNeeded && fileList.length === 0 ? (
                // ☁️ 구글 드라이브 세션 만료 및 재접속 안내 패널
                <div className="flex flex-col items-center justify-center p-4 my-2 text-center bg-gradient-to-b from-blue-50/70 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl shadow-xs space-y-3 mx-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800/90 shadow-sm border border-blue-100 dark:border-zinc-700/60 flex items-center justify-center text-2xl">
                    <span role="img" aria-label="cloud">☁️</span>
                  </div>
                  <div className="space-y-1 px-1">
                    <h4 className="font-extrabold text-[13px] text-zinc-900 dark:text-zinc-100">
                      개인 웹드라이브 재접속 필요
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                      보안을 위해 1시간 후 구글 인증 세션이 만료되었습니다. 작성하신 문서와 폴더는 안전하게 보관되어 있습니다.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5 pt-1">
                    <button
                      type="button"
                      disabled={isReconnectingDrive}
                      onClick={handleReconnectDrive}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-blue-400 text-white rounded-xl text-[12px] font-extrabold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                    >
                      {isReconnectingDrive ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>연결 중...</span>
                        </>
                      ) : (
                        <>
                          <Icon name="RotateCw" size={13} strokeWidth={2.2} />
                          <span>개인 웹드라이브 다시 연결</span>
                        </>
                      )}
                    </button>
                    {disconnectGoogleDrive && (
                      <button
                        type="button"
                        onClick={() => disconnectGoogleDrive()}
                        className="w-full px-2 py-1.5 text-[11px] font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      >
                        연결 해제하고 로컬로 돌아가기
                      </button>
                    )}
                  </div>
                </div>
              ) : fileList.length === 0 ? (
                <div className="text-zinc-500 dark:text-zinc-400 text-[12px] text-center py-6 px-3 space-y-3">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {rootFolder?.type === 'GDRIVE' ? '☁️ 웹드라이브 작업장에 파일이 없습니다.' : '연결된 폴더에 파일이 없습니다.'}
                  </p>
                  {rootFolder?.type === 'GDRIVE' ? (
                    <div className="flex flex-col gap-2 pt-1">
                      {disconnectGoogleDrive && (
                        <button
                          type="button"
                          onClick={() => disconnectGoogleDrive()}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-lg text-[12px] font-bold shadow transition-all cursor-pointer"
                        >
                          <span>🏠</span>
                          <span>내 PC 로컬 작업장으로 복귀</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerCreateRootFile()}
                        className="w-full px-3 py-1.5 border border-slate-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                      >
                        + 새 문서 만들기
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerCreateRootFile()}
                      className="text-[#1d4ed8] hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      + 새 문서 만들기
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {isGdriveAuthNeeded && (
                    <div className="mb-2 p-2 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-lg flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold min-w-0">
                        <span>⚠️</span>
                        <span className="truncate">인증 만료 (저장/동기화 위해 재연결)</span>
                      </div>
                      <button
                        onClick={handleReconnectDrive}
                        disabled={isReconnectingDrive}
                        className="shrink-0 px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold cursor-pointer"
                      >
                        다시 연결
                      </button>
                    </div>
                  )}
                  {fileList
                    .filter((node: any) => node.kind === 'directory' || node.name.toLowerCase().endsWith('.md') || node.name.toLowerCase().endsWith('.markdown') || node.name.toLowerCase().endsWith('.bib'))
                    .map((node: any, i: number) => (
                  <FileTreeItem
                    key={node.path || node.name + i}
                    node={node}
                    parentHandle={rootFolder?.handle || null}
                    level={0}
                    openFile={openFile}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                    currentFileName={currentFileName}
                    currentFilePath={currentFileNode?.path}
                    workspaceType={workspaceType}
                    refreshParent={async () => {
                      await refreshFileList();
                      window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                    }}
                    onRefreshAll={async () => {
                      await refreshFileList();
                      window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                    }}
                    openTabPaths={openTabPaths}
                    isRestrictedUser={isRestrictedUser}
                    askConfirm={askConfirm}
                    isMergeMode={isMergeMode}
                    selectedMergeNodes={selectedMergeNodes}
                    toggleMergeNodeSelect={toggleMergeNodeSelect}
                    onLazyLoad={handleLazyLoad}
                  />
                ))}
                </>
              )}
              </div>
          ) : (
            // 폴더 미연결 상태 — 무설정 구글 드라이브 자동 연동 카드
            <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-zinc-700 dark:text-zinc-200 text-center space-y-4 px-3 py-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#1d4ed8] shadow-sm">
                <span className="text-2xl">☁️</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-[14px] font-extrabold text-zinc-900 dark:text-zinc-100">
                  작업장이 아직 비어있습니다
                </p>
                <p className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  구글 계정만 연결하면 별도 설정 없이<br/>
                  <strong className="text-[#1d4ed8] dark:text-blue-400 font-bold">온리비 서재(작업장)</strong>가 자동 생성됩니다.
                </p>
              </div>

              {/* 원클릭 구글 드라이브 연결 버튼 */}
              <button
                type="button"
                onClick={() => {
                  if (connectGoogleDrive) connectGoogleDrive();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl text-[13px] font-extrabold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-base">☁️</span>
                <span>개인 웹드라이브 연결</span>
              </button>

              <div className="w-full flex items-center gap-2 my-1">
                <div className="h-px bg-slate-300 dark:bg-zinc-700 flex-1" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold">또는</span>
                <div className="h-px bg-slate-300 dark:bg-zinc-700 flex-1" />
              </div>

              {/* 로컬 폴더 열기 보조 버튼 */}
              <button
                type="button"
                onClick={onSelectRootFolder}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-[12px] font-bold border border-slate-300 dark:border-zinc-700 transition-all cursor-pointer"
              >
                <span>📁</span>
                <span>내 컴퓨터 폴더 선택</span>
              </button>
            </div>
          )}
        </div>
        <div 
          ref={tocContainerRef}
          className={`flex-1 overflow-y-auto [scrollbar-gutter:stable] explorer-scrollbar p-2 ${sidebarTab !== 'toc' ? 'hidden' : ''}`}
        >
          <div className="space-y-0 text-[12px] font-bold">
            {!toc || toc.length === 0 ? (
                <div className="text-zinc-400 dark:text-zinc-500 text-center py-5">목차가 없습니다.</div>
              ) : (() => {
                let currentH1Id = '';
                let currentH2Id = '';
                let currentH3Id = '';
                const processedToc = toc.map(item => {
                  if (item.level === 1) {
                    currentH1Id = item.id;
                    currentH2Id = '';
                    currentH3Id = '';
                    return { ...item, parentH1Id: '', parentH2Id: '', parentH3Id: '' };
                  } else if (item.level === 2) {
                    currentH2Id = item.id;
                    currentH3Id = '';
                    return { ...item, parentH1Id: currentH1Id, parentH2Id: '', parentH3Id: '' };
                  } else if (item.level === 3) {
                    currentH3Id = item.id;
                    return { ...item, parentH1Id: currentH1Id, parentH2Id: currentH2Id, parentH3Id: '' };
                  } else {
                    return { ...item, parentH1Id: currentH1Id, parentH2Id: currentH2Id, parentH3Id: currentH3Id };
                  }
                });

                return processedToc.map((item, i) => {
                  let isCollapsed = false;

                  if (item.level === 2) {
                    if (item.parentH1Id && collapsedH1s[item.parentH1Id] === true) {
                      isCollapsed = true;
                    }
                  } else if (item.level === 3) {
                    if (item.parentH1Id && collapsedH1s[item.parentH1Id] === true) {
                      isCollapsed = true;
                    } else if (item.parentH2Id && collapsedH1s[item.parentH2Id] === true) {
                      isCollapsed = true;
                    }
                  } else if (item.level >= 4) {
                    if (item.parentH1Id && collapsedH1s[item.parentH1Id] === true) {
                      isCollapsed = true;
                    } else if (item.parentH2Id && collapsedH1s[item.parentH2Id] === true) {
                      isCollapsed = true;
                    } else if (item.parentH3Id && collapsedH1s[item.parentH3Id] === true) {
                      isCollapsed = true;
                    }
                  }

                  if (isCollapsed) return null;

                  const hasH1Children = item.level === 1 && processedToc.some(child => child.level >= 2 && child.parentH1Id === item.id);
                  const hasH2Children = item.level === 2 && processedToc.some(child => child.level >= 3 && child.parentH2Id === item.id);
                  const hasH3Children = item.level === 3 && processedToc.some(child => child.level >= 4 && child.parentH3Id === item.id);

                  return (
                    <div 
                      key={i} 
                      id={`toc-item-${item.id}`} // 💡 자동 스크롤 동기화 추적용 ID
                      style={{ paddingLeft: `${(item.level - 1) * 8}px` }}
                      className={`cursor-pointer py-0.5 px-1.5 rounded-md transition-all truncate flex items-center gap-1 ${
                        activeTocId === item.id 
                          ? 'bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold shadow-sm border border-blue-200 dark:border-blue-800/50' 
                          : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800/50 hover:text-blue-600 dark:hover:text-blue-400 text-zinc-600 dark:text-zinc-300 border border-transparent'
                      }`}
                      onClick={() => {
                        if (previewMode === 'css-style' || previewMode === 'edit') {
                          setPreviewMode('preview');
                        }

                        // 1. 대상 헤딩 DOM 요소 탐색 (MarkdownViewer id 또는 VisualDocumentEditor h1~h6 매핑)
                        let el: HTMLElement | null = document.getElementById(item.id);
                        if (!el && previewRef.current) {
                          const container = previewRef.current;
                          const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
                          const cleanTarget = (item.text || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                          el = headings.find(h => {
                            const tagLevel = parseInt(h.tagName.replace(/^H/i, ''), 10);
                            const hText = (h.textContent || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                            return (tagLevel === item.level || !item.level) && (hText === cleanTarget || (cleanTarget.length > 2 && hText.includes(cleanTarget)));
                          }) || null;
                          if (!el) {
                            el = headings.find(h => {
                              const hText = (h.textContent || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                              return hText === cleanTarget || (cleanTarget.length > 2 && (hText.includes(cleanTarget) || cleanTarget.includes(hText)));
                            }) || null;
                          }
                          if (!el && typeof i === 'number' && headings[i]) {
                            el = headings[i];
                          }
                        }

                        // 2. 미리보기 / 문서 보기 스크롤 이동 및 펄스 하이라이트
                        if (el && previewRef.current) {
                          const container = previewRef.current;
                          const containerRect = container.getBoundingClientRect();
                          const elRect = el.getBoundingClientRect();
                          const relativeTop = elRect.top - containerRect.top + container.scrollTop;

                          container.scrollTo({
                            top: Math.max(0, relativeTop - 30),
                            behavior: 'smooth'
                          });

                          container.querySelectorAll('.preview-highlight-line').forEach(e => e.classList.remove('preview-highlight-line'));
                          el.classList.remove('preview-highlight-line');
                          void el.offsetWidth;
                          el.classList.add('preview-highlight-line');
                          setTimeout(() => {
                            el?.classList.remove('preview-highlight-line');
                          }, 3000);
                        }

                        // 3. 문서 보기(VisualDocumentEditor) ProseMirror 커서 동기화
                        if (content && typeof item.lineNumber === 'number' && item.lineNumber > 0) {
                          const lines = content.split(/\r?\n/);
                          let offset = 0;
                          for (let l = 0; l < item.lineNumber - 1 && l < lines.length; l++) {
                            offset += lines[l].length + 1;
                          }
                          window.dispatchEvent(new CustomEvent('onrivi:source-cursor', { 
                            detail: { offset, headingText: item.text, force: true, highlight: true } 
                          }));
                        }

                        // 4. Monaco 에디터 줄 이동 (나란히 보기 동기화)
                        scrollToLine(item.lineNumber);
                        setActiveTocId(item.id);

                        if (isScrollingRef && scrollTimeoutRef) {
                          isScrollingRef.current = 'preview';
                          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                          scrollTimeoutRef.current = setTimeout(() => {
                            if (isScrollingRef) isScrollingRef.current = null;
                          }, 500);
                        }
                      }}
                    >
                      {item.level === 1 ? (
                        hasH1Children ? (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setCollapsedH1s(prev => ({ ...prev, [item.id]: !prev[item.id] })); 
                            }}
                            className="mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 text-[7px]"
                            title={collapsedH1s[item.id] === true ? "펼치기" : "접기"}
                          >
                            {collapsedH1s[item.id] === true ? '▶' : '▼'}
                          </button>
                        ) : (
                          <div className="w-3.5 h-3.5 mr-1 shrink-0" />
                        )
                      ) : item.level === 2 ? (
                        hasH2Children ? (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setCollapsedH1s(prev => ({ ...prev, [item.id]: !prev[item.id] })); 
                            }}
                            className="mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 text-[10px]"
                            title={collapsedH1s[item.id] === true ? "펼치기" : "접기"}
                          >
                            {collapsedH1s[item.id] === true ? '▶' : '▼'}
                          </button>
                        ) : (
                          <div className="w-5 h-5 mr-1 shrink-0" />
                        )
                      ) : item.level === 3 ? (
                        hasH3Children ? (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setCollapsedH1s(prev => ({ ...prev, [item.id]: !prev[item.id] })); 
                            }}
                            className="mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 text-[10px]"
                            title={collapsedH1s[item.id] === true ? "펼치기" : "접기"}
                          >
                            {collapsedH1s[item.id] === true ? '▶' : '▼'}
                          </button>
                        ) : (
                          <div className="w-5 h-5 mr-1 shrink-0" />
                        )
                      ) : (
                        <div className="w-5 h-5 mr-1 shrink-0" />
                      )}
                      <span className="truncate flex-1 font-bold">
                        {item.text}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <div className={`flex-1 min-h-0 ${sidebarTab !== 'search' ? 'hidden' : ''}`}>
            <GlobalSearch
            isDarkMode={isDarkMode}
            content={content}
            currentFileName={currentFileName}
            currentFilePath={currentFileNode?.path || null}
            tabs={tabs}
            fileList={fileList}
            rootFolder={rootFolder}
            workspacePath={
              rootFolder?.type === 'GDRIVE'
                ? (rootFolder.path || rootFolder.name)
                : (rootFolder?.path ||
                   (rootFolder?.name && rootFolder.name !== BROWSER_STORAGE_NAME ? rootFolder.name : undefined) ||
                   (typeof window !== 'undefined'
                     ? localStorage.getItem('onrivi_last_local_workspace_path') || localStorage.getItem('onrivi_workspace_path') || undefined
                     : undefined))
            }
            rootFolderHandle={rootFolder?.handle}
            workspaceType={workspaceType}
            onSelectFolder={onSelectRootFolder}
            /* [ONR-UI-002] 전체 검색 더블클릭 연동: 파일 내 특정 줄을 더블클릭할 때 해당 파일 노드를 찾아 오픈한 뒤 지정 줄로 즉시 화면을 포커스시킵니다. */
// ====================================================================
// 📊 [OMD-FILE-LeftSidebar-0001 ✅ FIXED] LeftSidebar ➔ onFileOpenAndJump
// 🎯 @KICK  : 전역 검색 결과 파일을 열고 지정 줄로 이동 및 검색어 하이라이트
// 🛡️ @GUARD : 현재 활성 파일 여부 판별, 탭 전환 우선 처리, 하위 폴더 핸들/구글 드라이브/VFS 재귀 탐색, 이동 완료 팝업 알림 전면 제거
// 🚨 @PATCH : **2026-10-16** — [하위 폴더·구글 드라이브·VFS 검색 결과 파일 열기 및 비동기 줄 점프 무결성 보강]:
//             1) targetMeta(handle, driveFileId) 직접 지원 및 브라우저 FSA 하위 폴더 경로(getDirectoryHandle ➔ getFileHandle) 순차 추적
//             2) 동명 파일 오매칭 방지를 위해 전체 경로 일치 우선 검사 후 openFile 완료 대기(await) 뒤 executeJumpAndHighlight 실행
// 🚨 @PATCH : 2026-09-16 — [검색 결과 줄 이동 및 하이라이트 처리 & 토스트 알림 제거] 1) previewMode === 'preview' 및 분할 모드에서 미리보기 [data-line] 스크롤 및 텍스트 하이라이트 연동, 2) '...번째 줄로 이동했습니다' 불필요한 토스트 알림 4개소 전면 제거
// 🔗 @CALLS : executeJumpAndHighlight, openFile, switchTab, findNodeRecursively
// ====================================================================
            onFileOpenAndJump={async (filePath, lineNumber, term, targetMeta) => {
              // 서식설정 또는 편집 전용 모드인 경우 문서 보기로 전환
              if (previewMode === 'css-style' || previewMode === 'edit') {
                setPreviewMode('preview');
              }

              const targetLine = typeof lineNumber === 'number' && lineNumber > 0 ? lineNumber : 1;
              const normFilePath = (filePath || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
              const fileNameOnly = (targetMeta?.fileName || filePath.split(/[\\/]/).pop() || filePath).normalize('NFC');

              // 1. 현재 열려 있는 활성 문서인지 확인
              const normCurrentPath = currentFileNode?.path ? currentFileNode.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') : '';
              const isAlreadyActive = (
                filePath === 'current' ||
                (normCurrentPath && normCurrentPath === normFilePath) ||
                (!normCurrentPath && currentFileName && (currentFileName.normalize('NFC') === fileNameOnly || currentFileName.normalize('NFC') === filePath.normalize('NFC')))
              );

              if (isAlreadyActive) {
                executeJumpAndHighlight(targetLine, term);
                return;
              }

              // 2. 이미 열려 있는 탭 목록에 있는지 확인 (전체 경로 일치 최우선)
              if (tabs && tabs.length > 0 && switchTab) {
                const exactPathTab = tabs.find(t => {
                  if (!t || !t.path) return false;
                  return t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === normFilePath;
                });
                const fallbackNameTab = !filePath.includes('/') && !filePath.includes('\\')
                  ? tabs.find(t => t && t.name.toLowerCase().normalize('NFC') === fileNameOnly.toLowerCase())
                  : null;
                const matchedTab = exactPathTab || fallbackNameTab;

                if (matchedTab) {
                  switchTab(matchedTab.id);
                  setTimeout(() => {
                    executeJumpAndHighlight(targetLine, term);
                  }, 60);
                  return;
                }
              }

              // 3. 검색 결과에 직접 포함된 핸들(브라우저 FSA) 또는 구글 드라이브 ID가 있는 경우 즉시 오픈
              if (targetMeta?.handle) {
                await Promise.resolve(openFile({
                  name: fileNameOnly,
                  kind: 'file' as const,
                  path: filePath,
                  handle: targetMeta.handle
                }, rootFolder?.handle));
                setTimeout(() => {
                  executeJumpAndHighlight(targetLine, term);
                }, 100);
                return;
              }

              const driveId = targetMeta?.driveFileId || targetMeta?.driveId;
              if (driveId) {
                await Promise.resolve(openFile({
                  name: fileNameOnly,
                  kind: 'file' as const,
                  path: filePath,
                  driveFileId: driveId,
                  driveId: driveId,
                  id: driveId
                } as any));
                setTimeout(() => {
                  executeJumpAndHighlight(targetLine, term);
                }, 120);
                return;
              }

              // 4. 탐색기 트리에서 해당 노드 재귀 탐색 (전체 경로 일치 최우선, 이후 파일명 폴백)
              const findNodeByPath = (nodes: FileNode[], targetP: string): FileNode | null => {
                const normT = targetP.replace(/\\/g, '/').toLowerCase().normalize('NFC');
                for (const n of nodes) {
                  const normN = n.path ? n.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') : '';
                  if (n.kind === 'file' && normN && normN === normT) {
                    return n;
                  }
                  if (n.kind === 'directory' && n.children) {
                    const found = findNodeByPath(n.children, targetP);
                    if (found) return found;
                  }
                }
                return null;
              };

              const findNodeByName = (nodes: FileNode[], targetName: string): FileNode | null => {
                const normName = targetName.toLowerCase().normalize('NFC');
                for (const n of nodes) {
                  if (n.kind === 'file' && n.name.toLowerCase().normalize('NFC') === normName) {
                    return n;
                  }
                  if (n.kind === 'directory' && n.children) {
                    const found = findNodeByName(n.children, targetName);
                    if (found) return found;
                  }
                }
                return null;
              };

              const targetNode = findNodeByPath(fileList, filePath) || findNodeByName(fileList, fileNameOnly);

              if (targetNode) {
                await Promise.resolve(openFile(targetNode));
                setTimeout(() => {
                  executeJumpAndHighlight(targetLine, term);
                }, 100);
              } else if (typeof window !== 'undefined' && (window as any).electronAPI) {
                const dummyNode = { name: fileNameOnly, kind: 'file' as const, path: filePath };
                await Promise.resolve(openFile(dummyNode));
                setTimeout(() => {
                  executeJumpAndHighlight(targetLine, term);
                }, 120);
              } else if (rootFolder?.handle) {
                try {
                  // 하위 폴더 경로(예: "sub/doc.md")를 단계별로 추적하여 FileHandle 획득
                  const parts = filePath.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
                  if (parts.length > 0 && (parts[0] === rootFolder.handle.name || parts[0] === rootFolder.name)) {
                    parts.shift();
                  }
                  let currDir = rootFolder.handle;
                  for (let i = 0; i < parts.length - 1; i++) {
                    currDir = await currDir.getDirectoryHandle(parts[i], { create: false });
                  }
                  const targetFileName = parts.length > 0 ? parts[parts.length - 1] : filePath;
                  const fileHandle = await currDir.getFileHandle(targetFileName, { create: false });
                  if (fileHandle) {
                    const tempNode = { name: fileNameOnly, kind: 'file' as const, path: filePath, handle: fileHandle };
                    await Promise.resolve(openFile(tempNode, currDir));
                    setTimeout(() => {
                      executeJumpAndHighlight(targetLine, term);
                    }, 100);
                  }
                } catch (e) {
                  showToast("파일을 찾지 못했습니다.", "error");
                }
              } else {
                // VFS 폴백
                try {
                  const { vfsReadFile } = await import('@/lib/virtualFileSystem');
                  const vfsText = vfsReadFile(filePath);
                  if (vfsText !== null && vfsText !== undefined) {
                    await Promise.resolve(openFile({ name: fileNameOnly, kind: 'file' as const, path: filePath }));
                    setTimeout(() => {
                      executeJumpAndHighlight(targetLine, term);
                    }, 100);
                    return;
                  }
                } catch {}
                showToast("파일을 찾지 못했습니다.", "error");
              }
            }}
          />
        </div>
      </div>
      
      {/* 크기 조절 드래그 바 (스크롤바 100% 최우선 보장: 사이드바 내부 12px 스크롤바 침범 방지 및 경계선 외곽 배치) */}
      <div 
        className="absolute top-0 left-[calc(100%-1px)] w-2.5 h-full cursor-col-resize z-20 group flex items-stretch justify-start"
        title="사이드바 너비 조절"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;
          const doDrag = (moveEvent: MouseEvent) => {
            setSidebarWidth(Math.max(180, Math.min(450, startWidth + (moveEvent.clientX - startX))));
          };
          const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
          };
          document.addEventListener('mousemove', doDrag);
          document.addEventListener('mouseup', stopDrag);
        }}
      >
        {/* 호버/드래그 시 경계선 위에만 단정하게 표시되는 2px 코발트 인디케이터 라인 */}
        <div className="w-[2px] h-full bg-transparent group-hover:bg-[#1d4ed8] group-active:bg-[#1d4ed8] transition-colors duration-150" />
      </div>
      <PromptModal 
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        defaultValue={promptConfig.defaultValue}
        error={promptConfig.error}
        onConfirm={onPromptConfirm}
        onCancel={() => setPromptConfig({ ...promptConfig, isOpen: false, error: '' })}
      />
      
      {isImporting && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-16 right-6 z-[9999999] pointer-events-none">
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center max-w-sm border border-slate-700/50 text-center animate-in fade-in zoom-in duration-200" role="status" aria-live="polite">
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <img src="./icon.png" alt="Onrivi" className="w-10 h-10 object-contain animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">문서 구조화 및 분석 중...</h3>
            <p className="text-sm text-slate-300 opacity-90 leading-relaxed">
              문서의 텍스트·표·이미지를 추출하여<br/>편집할 수 있는 마크다운으로 변환하고 있습니다.
            </p>
            <p className="text-xs text-blue-400 mt-4 font-medium animate-pulse">
              AI 없이 변환합니다. 문서 크기에 따라 시간이 걸릴 수 있습니다.
            </p>
          </div>
        </div>,
        document.body
      )}
    </aside>
    </>
  );
}
