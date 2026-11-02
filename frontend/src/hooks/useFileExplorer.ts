// @ts-nocheck
import { isBundledDocumentPath } from '@/lib/bundledDocument';
import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
import { reportClientLog } from '@/lib/clientLogs';
import { getResourceSettings, saveResourceSettings, activateDriveAccount } from '@/lib/resourceSettings';
import { restoreLocalProfileFolder } from '@/lib/profileStorage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FileNode, scanDirectory, idb } from '@/lib/indexedDbHelper';
import { getVfsFiles, vfsReadFile, vfsWriteFile } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { resolveNativeDocumentPath, matchesLinkedDocument, resolveWorkspaceHelpLink } from '@/lib/nativeDocumentPath';
import { stripFrontmatter } from "@/lib/editorUtils";
import { EditorTab } from '@/components/UnifiedTabBar';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { triggerKnowledgeAutoSyncOnSave } from '@/lib/knowledge/knowledgeAutoSync';
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient';
import {
  saveExternalFileHandle,
  getExternalFileHandle,
  verifyHandlePermission,
  pickExternalFile
} from '@/lib/storage/externalFileStore';

/**
 * [ONR-16-005] useFileExplorer 커스텀 훅
 * @description 워크스페이스 폴더 연결, IndexedDB 권한 복원, 파일 트리 스캔, 파일 열기 및 저장(I/O) 등의 책임을 전담합니다.
 */
// 🚨 @PATCH : **2026-10-23** — [문서 링크 누락 대상 처리]: 미리보기에서 연 문서 링크는 경로를 엄격히 확인하고 같은 파일명 폴백 및 미존재 임시 탭 생성을 차단
// 🚨 @PATCH : **2026-10-19** — [작업장 파일 자동저장 복구 및 플레이스홀더 수화 강화]: FileSystemAccess 경로 매칭 시 NFC 정규화 및 상대경로 직접 분해 적용, 기존 탭의 플레이스홀더('작업장 외부 문서 안내') 자동 감지 시 rootFolder.handle에서 실제 파일 즉각 수화(Hydration), handle 누락 시 rootFolder 자동 탐색 바인딩으로 저장 대화상자 불필요 팝업 차단
// 🚨 @PATCH : **2026-10-24** — [구글 드라이브(GDRIVE/cloud) 문서 링크 및 상대경로 온디맨드 즉시 탐색·열기 지원]:
//             1) handleFileOpenByPath에서 GoogleDrive 작업장 내 링크 클릭 시 fileList 미확장 상태여도 findDriveFile을 통해 구글 드라이브 API로 온디맨드 검색하여 즉시 열기 지원
//             2) findNodeByPath에서 targetBaseName 폴백 허용으로 폴더 깊이와 무관하게 대상 문서 정상 매칭
// 🚨 @PATCH : **2026-10-24** — [데스크톱/웹 공통 도움말 문서 링크(../../ 및 파일명) 연결 무결성 보장]:
//             1) handleFileOpenByPath에서 데스크톱 readFromPath 1차 실패 시 대상이 도움말 문서(00_시작하기, HELP-*)이면 docs/help 및 frontend/public/help 위치를 안전하게 자동 탐색·오픈
//             2) 웹 환경(!isElectron)에서도 도움말 문서명 링크 클릭 시 /help/ 정적 리소스로 안전하게 자동 페치·오픈하여 웹/데스크톱 100% 동일 동작 보장
// 🚨 @PATCH : **2026-10-24** — [구글 드라이브 연결 실패 시 불량 토큰 자동 소거 및 즉각 재인증 보장]:
//             1) connectGoogleDrive 실패 시 기존 불량 토큰/만료 시간 키를 즉각 소거하여 다음 클릭 시 즉시 새 인증 팝업이 뜨도록 개선
//             2) about?fields=user 응답이 401 외 오류(400, 403 등)일 때도 토큰을 무효화하여 무한 에러 루프 차단
// 🚨 @PATCH : **2026-10-17** — [경로 기반 파일 열기 시 물리 FileNode 바인딩 및 세션 복원 폴백 차단 해제]:
//             1) handleFileOpenByPath에서 createNewTab 및 setTabs 호출 시 diskNode를 100% 생성·주입하고 setCurrentFileNode/setCurrentFileName을 즉시 동기화하여 자동저장 누락 및 저장 다이얼로그 팝업 결함 해결
//             2) handleFileOpenByPath 하단 sessionRestoringRef 가드를 제거하여 세션 복원 시에도 handleFileClick으로 안전하게 폴백 연결되도록 개선
//             3) handleFileClick에서 기존 탭 재사용 시 matched.id로 activeTabId를 정확히 일치시켜 탭 ID 불일치 방어
// 🚨 @PATCH : **2026-10-17** — [세션 복원 시 미존재 파일 유령 탭 생성 방지]:
//             앱 시작 세션 복원(restoreSessionTabs) 시 디스크에서 삭제/이동된 파일(readFromPath 실패)에 대해 빈 유령 탭을 무작정 생성하지 않고 안전하게 건너뛰도록 방어
// 🚨 @PATCH : **2026-10-15** — [다른 이름으로 저장 및 개인 웹드라이브 연동 시 로컬 작업장 불변 보장 & 원클릭 복구 고도화]:
//             1) selectRootFolder 호출 시 GDRIVE 모드이더라도 type='local' 요청 시 구글 드라이브 선택으로 가로채지 않고 정상 로컬 폴더 선택을 수행하도록 개선
//             2) disconnectGoogleDrive 시 로컬 백업 정보가 없더라도 Electron/시스템 환경 경로를 역추적하여 100% 무손실 복구하고 파일 목록을 즉시 갱신
// 🚨 @PATCH : **2026-10-15** — [작업장 폴더 선택 시 불필요한 구글 연결 확인 팝업 차단]:
//             이미 유효한 구글 토큰이 존재할 때 불필요하게 prepareGoogleDriveAuth() 빈 팝업을 열어
//             브라우저 COOP 차단으로 인해 'Google Drive 연결 확인' 창이 화면에 잔상으로 남던 문제를 완전 해결.
//             토큰이 유효하면 팝업 없이 즉시 폴더 선택/연결을 진행하고, 토큰 미존재/만료 시에만 인증 팝업을 열도록 최적화
// 🚨 @PATCH : **2026-10-11** — [구글 드라이브 토큰 만료 전 자동 저장 플러시 & 만료/해제 시 로컬 비상 백업 안전망 구축]:
//             1) onrivi:drive_token_about_to_expire 수신 시 만료 2분 전 작업 중인 모든 활성 및 수정된 탭 문서를 구글 드라이브에 안전하게 사전 자동 저장(플러시)
//             2) onrivi:drive_auth_expired / onrivi:drive_token_expired 수신 시 현재 열린 모든 탭과 에디터 버퍼를 onrivi_emergency_gdrive_drafts 로컬 스냅샷으로 100% 비상 보존하고 탭 유지
//             3) onrivi:drive_token_updated 수신 시 비상 로컬 보존된 초안을 감지하여 구글 드라이브로 자동 복구 동기화
//             4) disconnectGoogleDrive 시에도 연결 해제 직전 긴급 로컬 스냅샷을 100% 확보하여 작성 내용 유실 원천 차단
// 🚨 @PATCH : **2026-10-11** — [구글 드라이브 인증 만료 상태 관리 useState import 누락 복구]:
//             useFileExplorer 내 isDriveAuthExpired 상태 선언에 필요한 useState가 react import 목록에서 누락되어 발생하던 ReferenceError: useState is not defined 런타임 크래시 완전 해결
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 연결 시 만료 토큰(401) 자동 감지 및 즉시 재인증 팝업 트리거]:
//             기존 저장된 토큰이 401 만료 상태인 경우 onrivi_gdrive_token_expires_at 키 소거 후 requestGoogleDriveAuth 팝업을 즉시 띄워 새 토큰을 획득하도록 보강
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 연결 및 해제 시 로컬 리소스 폴더 격리 보존]:
//             1) connectGoogleDrive 시 saveResourceSettings에 'cloud' 환경을 명시하고 로컬 리소스 경로 변수를 덮어쓰지 않도록 개선
//             2) disconnectGoogleDrive 시 백업된 로컬 리소스 폴더(onrivi_local_backup_resource_folder_path)를 원상 복구하고 saveResourceSettings에 'local'을 명시하여 로컬 작업장 서식 완전 복원
// 🚨 @PATCH : **2026-10-07** — [최초 구글 드라이브 접속 시 작업장 및 참조폴더(5대 하위폴더/기본파일) 자동 생성 & 환경설정 직결]:
//             1) 구글 드라이브 연결 시 팝업 선택창 없이 OnriviAuthor/작업장 및 OnriviAuthor/참조폴더를 100% 자동 생성/바인딩
//             2) 참조폴더 내 5대 필수 폴더(bible, db, media, profiles, prompt) 및 기본 설정 파일들을 무인 자동 구성
//             3) 환경설정 공통 리소스 폴더를 '참조폴더'로 자동 지정하여 SettingsModal에 선명하게 직결 반영
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 최종 접속 상태 재접속 복원 & 백그라운드 토큰 자동 갱신 연동]:
//             1) refreshFileList 내 구글 드라이브 토큰 누락/만료 시 refreshDriveTokenSilently 백그라운드 무음 갱신을 수행하여 새로고침/재접속 시에도 파일 목록이 즉시 정상 복구되도록 개선
//             2) connectGoogleDrive 및 disconnectGoogleDrive 시 onrivi_last_workspace_mode 영구 상태를 동기화하여 다음 로그인/재접속 시 마지막 작업장(구글 드라이브)으로 자동 진입 보장
// 🚨 @PATCH : **2026-10-04** — [데스크톱 파일 열기/수화 시 상대경로 절대경로 자동 승격]: handleFileClick 및 existingOpenTab 수화에서 node.path가 상대경로인 경우 rootFolder.name과 결합하여 완전한 OS 절대경로로 api.readFromPath를 호출하도록 가드 보강
// 🚨 @PATCH : **2026-10-04** — [react-hooks/exhaustive-deps 경고 해소]: captureEnvironment/restoreEnvironment를 useCallback으로 메모이즈하고, connectGoogleDrive/disconnectGoogleDrive 의존성 배열에 누락된 ref(tabsRef, activeTabIdRef, contentRef, lastSavedContentRef) 및 헬퍼를 추가
// 🚨 @PATCH : **2026-10-03** — [saveFile targetTabId ReferenceError 결함 완벽 해결 & 구글 드라이브 무음 저장 연동]: targetTabId 미정의 변수 참조를 activeTabIdRef.current로 교체하고, targetFile/activeTab/currentFileNode에서 driveFileId 및 driveId 포괄 추출하여 자동저장 및 물리 저장 시 구글 드라이브 무음 저장 안정화
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 파일 중복 탭 생성 방지 및 본문 수화 완비]: handleFileClick 내 driveFileId/driveId/id 3중 폴백 본문 로딩 및 existingTab driveId/name 매칭 고도화로 중복 탭 및 빈 본문 결함 완전 박멸
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 무설정 자동 연동 & 리소스 폴더 자동 동기화 & 보편적 사용자 경험]: connectGoogleDrive(0초 즉각 렌더링, OnriviAuthor/참조파일 자동 바인딩, 시작하기.md 자동 오픈, 로컬 작업장/리소스폴더 백업) 및 disconnectGoogleDrive(직전 로컬 작업장/리소스폴더 자동 원상 복구) 구현, saveFile/refreshFileList/handleFileClick 내 구글 드라이브(GDRIVE) 분기 탑재, 사용자 안내 문구 표준화
// 🚨 @PATCH : **2026-09-28** — [워크스페이스 변경 시 사이드바 자동 표시]: selectRootFolder의 Desktop(Electron)/Browser(showDirectoryPicker)/localStorage 3개 성공 경로 모두에 setIsSidebarOpen(true) 추가 — 사이드바 숨김 상태에서 워크스페이스를 변경해도 변경 내용이 시각적으로 즉시 인식되도록 보장
// 🚨 @PATCH : **2026-09-26** — [동일 파일 중복 탭 생성 원천 차단 가드]: handleFileClick 내 setTabs 호출 시 prev 배열을 기준으로 정규화된 경로(NFC/소문자/슬래시) 및 ID 중복 여부를 원자적으로 검사하여, 비동기 파일 읽기 지연 중 동일 파일 탭이 2개 중복 생성되던 결함 완전 해결
// 🚨 @PATCH : **2026-09-18** — [타문서 변환 후 탐색기 전역 새로고침 force 플래그 지원]: file:refresh-all-directories 이벤트로부터 force 플래그를 전달받아 250ms 쿨다운 락에 막히지 않고 즉시 refreshFileList(true)를 수행하도록 보강
// 🚨 @PATCH : **2026-09-17** — [탐색기 변동 시 중복 2중 새로고침 결함 완벽 해결]: refreshFileList에 250ms 쿨다운 락을 부여하고 전역 리프레시 및 Electron 워처 이벤트 수신 시 단일 디바운스를 적용하여, 파일 조작 후 탐색기가 2회 반복 새로고침되던 현상을 1회로 깔끔하게 단일화
// 🚨 @PATCH : **2026-09-17** — [웹 브라우저 파일 목록 새로고침 404 오류 원천 차단 및 VFS/핸들 스캔 정상화]: refreshFileList에서 electronAPI 부재 시(/api/files 404 호출 방지) File System Access API 핸들 스캔 또는 VFS(Virtual File System) 목록을 즉시 갱신하도록 분기 처리
// 🚨 @PATCH : **2026-09-16** — [외부 작업폴더 변경 실시간 자동 감지 & 전역 리프레시 리스너 누락 방어]: watchWorkspace 대상 경로(rootFolder.path || rootFolder.name) 정상화, early return으로 인한 file:refresh-all-directories 리스너 등록 누락 버그 해결, 윈도우 포커스/가시성 복귀 시 자동 새로고침(웹/데스크탑) 연동
// 🚨 @PATCH : **2026-09-13** — [데스크톱 Electron 네이티브 파일 I/O 직접 연동 및 실서버 404 방어]: handleFileOpenByPath, existingOpenTab 수화, handleFileClick, saveFile에서 데스크톱(Electron) 환경 시 electronAPI.readFromPath / saveFile을 최우선으로 직접 호출하도록 개편하고, /api/file-content 웹 호출은 순수 localhost 개발 환경으로 엄격히 제한하여 프로덕션(onrivi.com) 404 에러 영구 차단
// 🚨 @PATCH : **2026-09-13** — [작업장 폴더 선택 시 절대경로 100% 보존 및 onrivi_web_base_path 결합]: selectRootFolder 및 rootFolder 변경 감지 시 웹 브라우저 폴더명(블러그 등)을 onrivi_web_base_path('E:/ZZ 개인자료')와 결합하여 onrivi_workspace_path에 항상 완전한 OS 절대경로('E:/ZZ 개인자료/블러그')를 보존·저장함으로써 지식 문서 등록 시 절대경로 적재 무결성 확립
//             **2026-09-13** — [작업장 폴더 선택 시 기존 절대경로 보존 및 일렉트론 onrivi_workspace_path 동기화]: selectRootFolder에서 일렉트론 finalRoot를 onrivi_workspace_path에 필수 저장하고, 웹 브라우저 showDirectoryPicker 선택 시 기존 로컬스토리지에 저장되어 있던 절대경로(E:/ZZ 개인자료/블러그 등)가 handle.name으로 덮어써져 유실되는 결함을 원천 방어하여 지식 등록 시 완전한 절대경로(E:/...) 적재 보장
//             **2026-09-13** — [대안 1: 지식 보관함(DB) 본문 자동 즉시 복원 및 0초 무팝업 오픈·고속 저장 연동]:
//             1) 출처 링크/외부 문서 클릭 시 번거로운 파일 선택 창(ConfirmModal/showOpenFilePicker) 일체 제거 — 지식 DB(WASM SQLite) 청크에서 원본 마크다운 0초 즉시 복원 및 탭 수화
//             2) 열린 지식 문서 탭에 isKnowledge 플래그 및 documentId 자동 부여로 편집 상태 추적
//             3) 문서 저장(Ctrl+S/자동저장) 시 브라우저 디스크 핸들이 없는 외부 문서라도 knowledgeClient.updateDocumentFast를 통해 WASM SQLite 지식 DB에 5ms 내 원자적 초고속 반영
//             **2026-09-13** — [작업장 외부 미연결 문서 오픈 시 안내 Alert 및 가이드 토스트 연동]: 웹 브라우저 보안 격리로 인해 현재 작업장 밖의 파일 접근이 불가할 때 단순 빈 탭 대신 안내 알림(Alert) 및 상위 폴더 연결 가이드 토스트를 출력하여 사용자 혼란 원천 방지
//             **2026-09-13** — [모나코 에디터 라인 범위 클램프 가드 및 프로드 웹 404 방어]: jumpToAnchor에서 startLine/endLine을 model.getLineCount() 범위 내로 안전 클램핑하여 getLineMaxColumn lineNumber 범위 초과 에러를 영구 차단하고, /api/file-content 디스크 조회를 localhost/Electron 환경으로 한정 가드하여 프로드 웹(onrivi.com) 404 콘솔 오류 원천 제거
//             **2026-09-13** — [작업장 불일치 지식 DB 청크 본문 완전 복원 및 빈 탭 자동 수화 강화]: getDocumentDetail 반환 구조(detail.chunks/chunkText) 연동으로 WASM SQLite 지식 보관함에서 원본 마크다운 본문을 100% 완전 복원하여 탭에 주입, 기존 빈 더미 탭 자동 수화(Hydration) 2중 체계(디스크 API + WASM 지식 DB) 구축으로 웹/프로드/로컬 전 환경 결함 원천 해결
//             **2026-09-13** — [작업장 불일치 외부 절대경로(file:///) 문서 오픈 및 로컬 디스크 원문 로드 연동]: 현재 열린 작업장 폴더와 출처 문서의 폴더가 상이할 때 브라우저 권한 한계를 극복하기 위해 /api/file-content를 호출하여 실제 로컬 디스크 원본 파일(2,000자 이상)을 100% 온전히 로드하고, 기존 빈 플레이스홀더 탭 자동 수화(Hydration) 및 라인 범위(#L시작-L끝) 점프 연동
//             **2026-09-13** — [출처 링크 점프 고도화 및 에디터-미리보기 동시 스크롤·하이라이트]: jumpToAnchor에서 라인 범위(#L시작-L끝) 파싱, Monaco Range 전체 선택 및 중앙 정렬, 미리보기 요소 자동 스크롤 및 preview-highlight-line 시각적 강조 애니메이션 플래시, 탭 마운트 시차 보정을 위한 지연 재시도(Retry) 적용
//             **2026-09-13** — [하드코딩 시딩 배제 및 서버 동적 경로 획득 정착]: selectRootFolder 및 rootFolderRefreshEffect에서 임의 하드코딩 시딩을 완전 배제하고, 서버 API(/api/knowledge/resolve-path)를 통해 OS 실제 작업장 절대경로를 동적 획득하여 onrivi_workspace_path에 저장
//             **2026-09-12** — [file:/// 링크 파일 오픈 및 서브폴더 탐색 결함 해결]:
//             1) handleFileOpenByPath에서 file:/// 절대경로 유입 시 rootFolder 이름 이후 내부 상대경로 분리 추출 및 findFileHandleInDirectoryDeep 하위 폴더 재귀 탐색으로 '체험하기' 등 서브디렉토리 문서 100% 정상 오픈 및 라인 앵커(#L..) 점프 보장
//             2) selectRootFolder에서 브라우저 폴더 선택 시 실제 OS 절대경로를 즉시 획득하여 localStorage(onrivi_workspace_path, rootFolder)에 1회 영구 저장
//             1) handleFileOpenByPath에 decodeURIComponent 정규화 및 targetBaseName 3중 매칭(findNodeByPath, rootFolder, VFS, tabs) 탑재
//             2) knowledgeClient.getDocumentDetail에 heading 연계 및 파일명/제목 다중 폴백으로 WASM SQLite 지식 문서 100% 탐색
//             3) jumpToAnchor에서 Monaco Editor 모델 헤딩 텍스트(#제목) 검색 및 revealLineInCenter 커서 점프 연동
//             4) 웹 브라우저 미스캔 파일 대상 신규 탭 자동 생성 폴백으로 '해당 파일 노드를 찾을 수 없습니다' 에러 토스트 영구 차단
//             **2026-09-12** — [경로 기반 파일 오픈 시 라인 앵커(#L..) 에디터 중앙 점프 연동]: handleFileOpenByPath에 hashPart 매개변수 지원 및 인라인 해시(#L15-L40) 추출, 파일/탭 오픈 후 모나코 에디터 revealLineInCenter 및 커서 포커스 연동
//             **2026-09-11** — [브라우저 파일 열기 폴백 404 방어] docs/ 또는 welcome.md 등 내장 샘플 문서가 아닌 로컬 사용자 경로에 대한 무의미한 웹 서버 fetch 시도를 차단하여 404 콘솔 오류 원천 제거
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 에디터 문서 저장(saveFile) 성공 시 지식 보관함 등록 문서 로컬 비동기 자동 재색인(triggerKnowledgeAutoSyncOnSave) 연동
//             **2026-09-02** — 워크스페이스 변경 시 404 에러를 유발하던 불필요한 레거시 api/set-root fetch 호출 완전 제거
//             **2026-08-27** — 비로그인 즉시 체험 모드로 진입 시, 가상 파일 스토리지(getVfsFiles)가 비어 있는 경우 사용자의 쾌적한 에디터 테스트를 유도하는 샘플 원고(온리비_어서_체험판.md)를 자동으로 로드하여 화면에 출력하도록 초기화 연동; **2026-08-19** — 새로운 작업장 폴더 연결 시 기존에 열려 있던 모든 탭과 문서를 초기화(닫기)하도록 기능 추가
//             **2026-08-19** — 파일 저장 시 대상 경로와 탭 경로 비교 정규화 버그로 인해 자동저장 황금 도트 미해제 결함 픽스 (대소문자/슬래시 무시 매칭 적용)
//             **2026-08-12** — 에디터를 열 때 제한사용자(만료, 동시접속 제한, 미인증 등) 권한 가드가 풀리는 현상 해결을 위해 isRestrictedUser 검사 기준으로 모드 전환 로직 단일화 및 보완 적용
//             **2026-07-04** — 탭 전환/닫기 시 제한(만료) 사용자의 경우 항상 미리보기('preview') 모드로 강제 고정하고, 전체(일반) 사용자는 하단 상태바 등에서 설정된 에디터 뷰잉 모드를 그대로 보존 및 상속하도록 UI 모드 자동 보정 연동 패치
//             **2026-09-14** — [Mac/Linux POSIX 경로 지원 전체 개선]: 작업장 절대경로 판별에 isAbsolutePath() 헬퍼 적용 (Win: /^[a-zA-Z]:/ → isAbsolutePath), Windows 하드코딩 폴백('E:/ZZ 개인자료') 완전 제거, Mac 환경에서도 규칙 9(임의 폴백 금지) 준수
// 🔗 @CALLS : scanDirectory, getVfsFiles, fetch, vfsReadFile, vfsWriteFile, stripFrontmatter, idb.get, api.saveFile, api.listDirectory, api.readFromPath, triggerKnowledgeAutoSyncOnSave, saveExternalFileHandle, getExternalFileHandle, verifyHandlePermission, pickExternalFile, isAbsolutePath
// ====================================================================
import { isAbsolutePath } from '@/lib/knowledge/pathResolver';
import {
  getSavedDriveToken,
  hasValidDriveToken,
  getSavedWorkspaceInfo,
  requestGoogleDriveAuth,
  setupOnriviDriveWorkspace,
  selectOnriviWorkspaceFolder,
  disconnectGoogleDrive as disconnectGDriveClient,
  fetchDriveFileNodes,
  readDriveFileContent,
  saveDriveFileContent,
  createDriveMarkdownFile,
  createDriveFolder,
  saveEmergencyDriveDrafts,
  getEmergencyDriveDrafts,
  clearEmergencyDriveDrafts,
  type EmergencyDriveSnapshot
} from '@/lib/gdrive/googleDriveClient';
export const useFileExplorer = ({
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
  setRootFolder,
  fileList,
  setFileList,
  workspaceType,
  setWorkspaceType,
  licenseStatus,
  sessionRestoringRef,
  setConfirmConfig
}: any) => {

  const isRestrictedUser = licenseStatus?.isExpired ||
    licenseStatus?.isRestricted ||
    licenseStatus?.planName?.includes('미인증') ||
    licenseStatus?.planName?.includes('제한사용자');

  const localEnvironmentRef = useRef<any>(null);
  const driveEnvironmentRef = useRef<any>(null);
  const storageSwitchRef = useRef(false);
  const captureEnvironment = useCallback(() => ({
    root: rootFolderRef.current, tabs: tabsRef.current.map(t => ({ ...t,
      content: t.id === activeTabIdRef?.current ? contentRef.current : t.content,
    })),
    activeId: activeTabIdRef?.current, content: contentRef.current,
    fileNode: currentFileNode, fileName: currentFileName,
    parentHandle: currentFileParentHandleRef.current, savedContent: lastSavedContentRef.current,
  }), [tabsRef, activeTabIdRef, contentRef, currentFileNode, currentFileName, currentFileParentHandleRef, lastSavedContentRef]);
  const restoreEnvironment = useCallback((environment: any) => {
    const tabs = environment?.tabs || [];
    tabsRef.current = tabs;
    if (activeTabIdRef) activeTabIdRef.current = environment?.activeId || null;
    contentRef.current = environment?.content || '';
    lastSavedContentRef.current = environment?.savedContent || '';
    currentFileParentHandleRef.current = environment?.parentHandle || null;
    setTabs(tabs);
    setActiveTabId(environment?.activeId || null);
    setContent(environment?.content || '');
    setCurrentFileNode(environment?.fileNode || null);
    setCurrentFileName(environment?.fileName || '');
  }, [tabsRef, activeTabIdRef, contentRef, lastSavedContentRef, currentFileParentHandleRef, setTabs, setActiveTabId, setContent, setCurrentFileNode, setCurrentFileName]);
  const rootFolderRef = useRef(rootFolder);
  useEffect(() => { rootFolderRef.current = rootFolder; }, [rootFolder]);

  // 🛡️ [중복 새로고침 방어] 파일 변동 시 2중/3중 중복 새로고침 차단용 타임스탬프 및 락 ref
  const [isDriveAuthExpired, setIsDriveAuthExpired] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const savedRoot = localStorage.getItem('rootFolder');
    try {
      if (savedRoot) {
        const parsed = JSON.parse(savedRoot);
        if (parsed?.type === 'GDRIVE') {
          return !hasValidDriveToken();
        }
      }
    } catch {}
    return false;
  });

  // ☁️ [구글 드라이브 라이프사이클 & 데이터 보존 안전망 리스너]
  useEffect(() => {
    // 1. 토큰 만료 2분 전: 작업 중인 문서를 구글 드라이브에 안전하게 사전 자동 저장(플러시)
    let pendingExpirySave: Promise<void> | null = null;
    const preserveAndSave = async () => {
      const activeId = activeTabIdRef?.current;
      const currentVal = contentRef.current;
      const drafts = tabsRef.current.map(t => ({
        tabId: t.id,
        driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
        name: t.name, path: t.path,
        content: t.id === activeId ? currentVal : t.content,
        isModified: t.isModified || (t.id === activeId && currentVal !== lastSavedContentRef.current),
        savedAt: new Date().toISOString()
      }));
      // Preserve first, including new documents that have no cloud file yet.
      const snapshot = { timestamp: Date.now(), activeTabId: activeId, drafts };
      saveEmergencyDriveDrafts(snapshot);
      const token = getSavedDriveToken();
      const saved = new Map<string, string>();
      let failed = false;
      for (const draft of drafts) {
        if (!draft.isModified || !draft.driveFileId) continue;
        try {
          if (!token) throw new Error('Drive token unavailable');
          await saveDriveFileContent(token, draft.driveFileId, draft.content);
          saved.set(draft.tabId, draft.content);
          draft.isModified = false;
        } catch (error) {
          failed = true;
          console.warn('[GDrive] 만료 전 저장 실패, 로컬 초안 유지', error);
        }
      }
      // Do not clear dirty state for failed saves or edits made during the request.
      saveEmergencyDriveDrafts(snapshot);
      if (activeId && saved.has(activeId) && contentRef.current === saved.get(activeId)) {
        lastSavedContentRef.current = currentVal;
        setSaveStatus('saved');
      }
      setTabs(prev => prev.map(t => saved.has(t.id) &&
        (t.id === activeTabIdRef?.current ? contentRef.current : t.content) === saved.get(t.id)
          ? { ...t, isModified: false } : t));
      if (failed) throw new Error('일부 문서를 저장하지 못했습니다. 로컬 초안을 보존했습니다.');
    };
    const handleTokenAboutToExpire = (e: any) => {
      if (!pendingExpirySave) pendingExpirySave = preserveAndSave().finally(() => { pendingExpirySave = null; });
      void pendingExpirySave.then(() => e?.detail?.complete?.(), error => {
        e?.detail?.complete?.(error);
      });
    };

    // 2. 토큰 만료 또는 401 오류 발생 시: 현재 작업 중이던 모든 탭과 에디터 버퍼를 로컬에 긴급 백업 (탭 유지)
    let expiryHandled = false;
    const handleAuthExpired = () => {
      if (rootFolderRef.current?.type !== 'GDRIVE' || expiryHandled) return;
      expiryHandled = true;
      setIsDriveAuthExpired(true);
      try {
        const activeId = activeTabIdRef?.current;
        const currentVal = contentRef.current;
        const snapshot: EmergencyDriveSnapshot = {
          timestamp: Date.now(),
          activeTabId: activeId,
          drafts: tabsRef.current.map(t => ({
            tabId: t.id,
            driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
            name: t.name,
            path: t.path,
            content: t.id === activeId ? currentVal : t.content,
            isModified: t.isModified || (t.id === activeId && currentVal !== lastSavedContentRef.current),
            savedAt: new Date().toISOString()
          }))
        };
        if (snapshot.drafts.length > 0 || !getEmergencyDriveDrafts()?.drafts?.length) {
          saveEmergencyDriveDrafts(snapshot);
        }
        console.warn(`[useFileExplorer] 🛡️ 구글 드라이브 인증 만료: ${snapshot.drafts.length}개 탭 비상 로컬 보존 완료`);
        showToast('☁️ 구글 드라이브 인증이 만료되었지만 작성 중인 내용은 안전하게 로컬에 보존되었습니다. 재인증 시 클라우드로 자동 동기화됩니다.', 'warning');
      } catch (e) {
        console.error('[useFileExplorer] 비상 초안 보존 실패:', e);
      }
    };

    // 3. 토큰 갱신 또는 재연결 시: 보존된 비상 초안이 있으면 클라우드로 자동 복구 동기화
    const handleTokenUpdated = async () => {
      expiryHandled = false;
      setIsDriveAuthExpired(false);
      try {
        const emergencySnapshot = getEmergencyDriveDrafts();
        const token = getSavedDriveToken();
        if (emergencySnapshot && token && emergencySnapshot.drafts?.length > 0) {
          const synced = new Map<string, string>();
          for (const draft of emergencySnapshot.drafts) {
            if (draft.isModified && draft.driveFileId && typeof draft.content === 'string') {
              try {
                await saveDriveFileContent(token, draft.driveFileId, draft.content);
                synced.set(draft.tabId, draft.content);
                draft.isModified = false;
              } catch (error) {
                console.warn('[GDrive] 초안 재저장 실패, 로컬 보존', error);
              }
            }
          }
          if (synced.size > 0) {
            if (emergencySnapshot.drafts.some(draft => draft.isModified)) saveEmergencyDriveDrafts(emergencySnapshot);
            else clearEmergencyDriveDrafts();
            setTabs(prev => prev.map(tab => synced.has(tab.id) &&
              (tab.id === activeTabIdRef?.current ? contentRef.current : tab.content) === synced.get(tab.id)
                ? { ...tab, isModified: false } : tab));
            const activeId = activeTabIdRef?.current;
            if (activeId && synced.has(activeId) && contentRef.current === synced.get(activeId)) {
              lastSavedContentRef.current = contentRef.current;
              setSaveStatus('saved');
            }
          }
        }
      } catch (syncErr) {
        console.error('[useFileExplorer] 재연결 후 초안 동기화 중 예외:', syncErr);
      }
    };

    window.addEventListener('onrivi:drive_token_about_to_expire', handleTokenAboutToExpire);
    window.addEventListener('onrivi:drive_auth_expired', handleAuthExpired);
    window.addEventListener('onrivi:drive_token_expired', handleAuthExpired);
    window.addEventListener('onrivi:drive_token_updated', handleTokenUpdated);
    return () => {
      window.removeEventListener('onrivi:drive_token_about_to_expire', handleTokenAboutToExpire);
      window.removeEventListener('onrivi:drive_auth_expired', handleAuthExpired);
      window.removeEventListener('onrivi:drive_token_expired', handleAuthExpired);
      window.removeEventListener('onrivi:drive_token_updated', handleTokenUpdated);
    };
  }, [setTabs, setSaveStatus, showToast, activeTabIdRef, contentRef, lastSavedContentRef, tabsRef]);

  const lastRefreshTimeRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0009] useFileExplorer.ts ➔ refreshFileList
  // 🎯 @KICK  : 브라우저/Electron/웹 환경별 파일 트리 목록을 새로고침
  // 🛡️ @GUARD : 각 환경별 API 실패 시 console.error로 대응; 250ms 이내 중복 호출 시 2중 새로고침 차단
  // 🚨 @PATCH : **2026-09-17** — [탐색기 변동 시 중복 2중 새로고침 결함 완벽 해결]: 250ms 쿨다운 락(lastRefreshTimeRef/isRefreshingRef)을 구축하여 동일 작업으로 인한 연쇄 중복 새로고침 및 화면 깜빡임을 1회로 깔끔하게 단일화
  // 🔗 @CALLS : scanDirectory, getVfsFiles, api.listDirectory, fetch, setFileList
  // ====================================================================
  // 1. 파일 목록 리프레시 헬퍼 함수
  const refreshFileList = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && (isRefreshingRef.current || now - lastRefreshTimeRef.current < 250)) {
      return;
    }
    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;

    try {
      // ☁️ [구글 드라이브 작업장 파일 트리 갱신]
      if (rootFolderRef.current?.type === 'GDRIVE') {
        let token = getSavedDriveToken();
        const wsInfo = getSavedWorkspaceInfo();
        if (!hasValidDriveToken()) {
          try {
            const { refreshDriveTokenSilently } = await import('@/lib/gdrive/googleDriveClient');
            token = await refreshDriveTokenSilently();
          } catch (_) {}
        }
        if (!token || !hasValidDriveToken()) {
          setIsDriveAuthExpired(true);
          return;
        }
        if (wsInfo?.workspaceFolderId) {
          try {
            const driveNodes = await fetchDriveFileNodes(token, wsInfo.workspaceFolderId);
            setFileList(driveNodes);
            setIsDriveAuthExpired(false);
            console.log(`[refreshFileList] ✅ 구글 드라이브 파일 목록 갱신 완료 (${driveNodes.length}개 노드)`);
          } catch (err) {
            console.error('[refreshFileList GDRIVE Error]', err);
            setIsDriveAuthExpired(true);
          }
        }
        return;
      }

      const api = (window as any).electronAPI;
      const isDesktopApp = typeof window !== 'undefined' && !!api;

      if (!isDesktopApp) {
        const handle = rootFolderRef.current?.handle;
        if (handle) {
          try {
            const tree = await scanDirectory(handle);
            setFileList(tree);
          } catch (err) {
            console.error('[refreshFileList scanDirectory Error]', err);
          }
        } else {
          // 🛡️ [게스트 체험 모드 가이드] 첫 진입 시 가상 스페이스에 예쁜 체험용 웰컴 문서 탑재
          const isGuestMode = typeof window !== 'undefined' && localStorage.getItem('onrivi_guest_mode') === 'Y';
          let vfsList = getVfsFiles();
          if (isGuestMode && vfsList.length === 0) {
            try {
              const { vfsCreateFile, vfsWriteFile } = require('@/lib/virtualFileSystem');
              vfsCreateFile('', '온리비_어서_체험판.md');
              fetch('/welcome.md')
                .then(res => {
                  if (!res.ok) throw new Error("welcome.md 로딩 실패");
                  return res.text();
                })
                .then(text => {
                  vfsWriteFile('온리비_어서_체험판.md', text);
                  setFileList(getVfsFiles());
                })
                .catch(err => {
                  console.error("체험판 웰컴 마크다운 파일 로드 오류:", err);
                  vfsWriteFile('온리비_어서_체험판.md', '# 🚀 온리비 어서 5분 마법의 글쓰기 챌린지!\n\n가이드를 참고하여 체험을 계속해 보셔요.');
                  setFileList(getVfsFiles());
                });
            } catch (e) {
              console.error("체험판 웰컴 문서 생성 오류:", e);
            }
          }
          setFileList(vfsList);
        }
        return;
      }

      if (api?.listDirectory && rootFolderRef.current?.name) {
        try {
          const list = await api.listDirectory(rootFolderRef.current.name);
          setFileList(list);
        } catch (e) {
          console.error('[refreshFileList listDirectory Error]', e);
        }
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [setFileList]);

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0008] useFileExplorer.ts ➔ selectRootFolder
  // 🎯 @KICK  : 로컬/브라우저 워크스페이스 루트 폴더를 선택하고 연결
  // 🛡️ @GUARD : Electron/file picker/로컬스토리지 각 환경별 예외 처리
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : scanDirectory, idb.set, showToast, setRootFolder, setWorkspaceType
  // ====================================================================
  const selectRootFolder = async (type: 'local' | 'browser' | 'cloud' | 'current' = 'current', initialPath?: string | null) => {
    // A generic workspace action follows the active storage; explicit local actions stay local.
    if (type === 'cloud' || (type === 'current' && rootFolderRef.current?.type === 'GDRIVE')) {
      await connectGoogleDrive(true);
      return;
    }
    if (type === 'current') type = 'local';
    const api = (window as any).electronAPI;
    if (type === 'local') {
      if (api) {
        try {
          const current = rootFolderRef.current;
          let currentLocalPath = initialPath || (current?.type !== 'GDRIVE' ? current?.path || current?.name : '') || '';
          if (currentLocalPath && !isAbsolutePath(currentLocalPath.replace(/\\/g, '/'))) currentLocalPath = '';
          try {
            const savedRoot = localStorage.getItem('onrivi_last_local_root_folder');
            if (savedRoot) {
              const parsed = JSON.parse(savedRoot);
              const savedPath = parsed?.path || parsed?.name;
              if (!currentLocalPath && savedPath && isAbsolutePath(savedPath.replace(/\\/g, '/'))) {
                currentLocalPath = savedPath;
              }
            }
          } catch (_) {}

          const targetPath = currentLocalPath || undefined;
          const result = await (window as any).electronAPI.selectFolder(targetPath);
          if (result.status === 'success') {
            const finalRoot = result.path;
            const normFinalRoot = finalRoot.replace(/\\/g, '/');
            setRootFolder({ name: finalRoot, path: normFinalRoot });
            setWorkspaceType('local');
            localStorage.setItem('onrivi_workspace_path', normFinalRoot);
            localStorage.setItem('onrivi_last_local_workspace_path', normFinalRoot);
            localStorage.setItem('onrivi_last_local_root_folder', JSON.stringify({ name: finalRoot, path: normFinalRoot }));
            localStorage.setItem('rootFolder', JSON.stringify({ name: finalRoot, path: normFinalRoot }));
            localStorage.setItem('workspaceType', 'local');

            // 📁 로컬 작업장 복귀 시 리소스 폴더가 구글 드라이브였으면 로컬 작업장 참조파일로 원상복구
            await restoreLocalProfileFolder();
            saveResourceSettings(getResourceSettings('local'), 'local');

            setTabs([]);
            setActiveTabId(null);
            setContent('');
            setCurrentFileNode(null);
            setCurrentFileName('');
            // 🔑 워크스페이스 변경 시 사이드바가 숨겨져 있으면 자동 표시 (변경 내용 시각적 인식 보장)
            setIsSidebarOpen(true);
            showToast(`워크스페이스가 ${finalRoot}(으)로 변경되었습니다.`, 'success');
          } else if (result.status === 'canceled') {
            showToast("폴더 선택이 취소되었습니다.", "info");
          }
        } catch (err: any) {
          showToast("폴더 선택 오류: " + err.message, "error");
        }
      } else if (typeof (window as any).showDirectoryPicker === 'function') {
        try {
          const startIn = rootFolderRef.current?.type !== 'GDRIVE' ? rootFolderRef.current?.handle : undefined;
          const options = { id: 'onrivi-workspace', mode: 'readwrite', ...(startIn ? { startIn } : {}) };
          let handle;
          try {
            handle = await (window as any).showDirectoryPicker(options);
          } catch (error: any) {
            if (!startIn || !['NotFoundError', 'TypeError'].includes(error.name)) throw error;
            handle = await (window as any).showDirectoryPicker({ id: 'onrivi-workspace', mode: 'readwrite' });
          }
          
          // 🛡️ [작업장 폴더 선택 시 절대경로 즉시 로컬스토리지 저장]
          // 기존에 로컬스토리지에 저장되어 있던 절대경로(E:/ZZ 개인자료/블러그, /Users/mac/Documents 등)가 있다면 우선 보존
          let absolutePath = handle.name;
          try {
            const existingWs = typeof window !== 'undefined' ? localStorage.getItem('onrivi_workspace_path') : null;
            if (existingWs && isAbsolutePath(existingWs.replace(/\\/g, '/'))) {
              const normExist = existingWs.replace(/\\/g, '/');
              const existBase = normExist.split('/').pop() || '';
              const normTarget = (handle.name || '').replace(/블로그/g, '블러그');
              if (existBase.replace(/블로그/g, '블러그').toLowerCase() === normTarget.toLowerCase()) {
                absolutePath = normExist;
              }
            }
          } catch {}

          // 🛡️ [절대경로 100% 보장 - Cross-Platform]: onrivi_web_base_path와 결합하여 절대경로 보존 (규칙 9: 하드코딩 폴백 없음)
          if (!isAbsolutePath(absolutePath.replace(/\\/g, '/'))) {
            try {
              const webBase = typeof window !== 'undefined' ? localStorage.getItem('onrivi_web_base_path') : null;
              if (webBase && isAbsolutePath(webBase.replace(/\\/g, '/'))) {
                absolutePath = `${webBase.replace(/\\/g, '/').replace(/\/+$/, '')}/${handle.name}`;
              }
              // webBase 미설정 시: handle.name 그대로 사용 (규칙 9: 임의 폴백 금지)
            } catch {}
          }

          const folder = { name: absolutePath, path: absolutePath, handle, displayName: handle.name };
          await idb.set('rootFolderHandle', handle);
          
          setRootFolder(folder);
          setWorkspaceType('browser');
          localStorage.setItem('onrivi_workspace_path', absolutePath);
          localStorage.setItem('onrivi_last_local_workspace_path', absolutePath);
          localStorage.setItem('onrivi_last_local_root_folder', JSON.stringify({ name: absolutePath, path: absolutePath, displayName: handle.name }));
          localStorage.setItem('rootFolder', JSON.stringify({ name: absolutePath, path: absolutePath, displayName: handle.name }));
          localStorage.setItem('workspaceType', 'browser');

          // 📁 로컬 작업장 복귀 시 리소스 폴더가 구글 드라이브였으면 로컬 작업장 참조파일로 원상복구
          await restoreLocalProfileFolder();
          saveResourceSettings(getResourceSettings('local'), 'local');
          setTabs([]);
          setActiveTabId(null);
          setContent('');
          setCurrentFileNode(null);
          setCurrentFileName('');
          // 🔑 워크스페이스 변경 시 사이드바가 숨겨져 있으면 자동 표시 (변경 내용 시각적 인식 보장)
          setIsSidebarOpen(true);
          showToast(`워크스페이스 연결 완료 (${handle.name})`, "success");
        } catch (err) {
          if ((err as any)?.name !== 'AbortError' && (err as any)?.name !== 'SecurityError') {
            showToast('워크스페이스 선택 중 오류가 발생했습니다.', 'error');
          }
          showToast("폴더 선택이 취소되었습니다.", "info");
        }
      } else {
        const folder = { name: BROWSER_STORAGE_NAME };
        await idb.set('rootFolderHandle', null);
        setRootFolder(folder);
        setWorkspaceType('browser');
        localStorage.setItem('rootFolder', JSON.stringify({ name: BROWSER_STORAGE_NAME }));
        localStorage.setItem('workspaceType', 'browser');
        setTabs([]);
        setActiveTabId(null);
        setContent('');
        setCurrentFileNode(null);
        setCurrentFileName('');
        // 🔑 워크스페이스 변경 시 사이드바가 숨겨져 있으면 자동 표시 (변경 내용 시각적 인식 보장)
        setIsSidebarOpen(true);
        showToast("로컬 스토리지 워크스페이스가 연결되었습니다.", "success");
      }
    }
  };

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0007] useFileExplorer.ts ➔ restoreFolderPermission
  // 🎯 @KICK  : 브라우저 File System Access 권한을 복구하여 워크스페이스 재연결
  // 🛡️ @GUARD : rootFolder.handle 미존재 시 early return, 권한 거부/AbortError 처리
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : showToast, setRootFolder
  // ====================================================================
  // 3. 브라우저 저장소 권한 복구 핸들러
  useEffect(() => {
    let busy = false;
    const reset = async () => {
      if (busy || (window as any).electronAPI || rootFolderRef.current?.type === 'GDRIVE') return;
      busy = true;
      try {
        const { resetBrowserWorkspace } = await import('@/lib/browserDefaultStorage');
        const folder = await resetBrowserWorkspace();
        rootFolderRef.current = folder;
        setRootFolder(folder);
        setWorkspaceType('browser');
        setIsSidebarOpen(true);
        showToast('작업장 연결을 기본 브라우저 작업장으로 초기화했습니다. 기존 파일과 열린 문서는 유지됩니다.', 'success');
      } catch (error: any) { showToast(error.message || '작업장 초기화에 실패했습니다.', 'error'); }
      finally { busy = false; }
    };
    window.addEventListener('onrivi:reset-browser-workspace', reset);
    return () => window.removeEventListener('onrivi:reset-browser-workspace', reset);
  }, [setRootFolder, setWorkspaceType, setIsSidebarOpen, showToast]);

  const restoreFolderPermission = async () => {
    if (!rootFolder?.handle) return;
    try {
      const status = await rootFolder.handle.requestPermission({ mode: 'readwrite' });
      if (status === 'granted') {
        const restoredFolder = { name: rootFolder.handle.name, handle: rootFolder.handle };
        setRootFolder(restoredFolder);
        showToast("이전 워크스페이스 폴더가 정상 복구되었습니다.", "success");
      } else {
        showToast("폴더 읽기/쓰기 권한 승인이 거부되었습니다.", "warning");
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        showToast(`권한 복구 실패: ${err.message}`, "error");
      }
    }
  };

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0006] useFileExplorer.ts ➔ handleFileOpenByPath
  // 🎯 @KICK  : 경로 문자열로 파일을 찾아 열거나 도움말/지식 문서를 로드
  // 🛡️ @GUARD : 따옴표/괄호/헤딩(#) 분리, NFC 정규화, 브라우저 FileSystemHandle 하위 디렉토리 직접 추적, WASM 지식 DB 폴백
  // 🚨 @PATCH : **2026-09-12** — [작업장 하위 폴더 재귀 탐색(findFileHandleInDirectoryDeep) 및 file:/// 경로 오픈]: file:/// 절대경로 유입 시 rootFolder 이름 이후 내부 경로 추출 및 하위 서브폴더(체험하기 등) 3단계 심층 재귀 탐색 연동으로 파일 오픈 및 라인 앵커(#L..) 100% 점프
  //             **2026-09-12** — [웹 브라우저 출처 링크 파일 열기 및 헤딩 점프 결함 완벽 해결]: handleFileOpenByPath에서 decodeURIComponent 및 targetBaseName 3중 매칭, knowledgeClient heading 검색 연동, jumpToAnchor 에디터 모델 헤딩 검색, 미스캔 파일 신규 탭 자동 생성 폴백 지원
  // 🔗 @CALLS : findNodeByPath, handleFileClick, createNewTab, switchTab, setTabs, showToast, knowledgeClient.getDocumentDetail
  // ====================================================================

  /**
   * 브라우저 FileSystemDirectoryHandle 하위를 재귀 검색하여 파일명에 매칭되는 FileHandle과 상위 디렉토리 Handle을 반환합니다.
   */
  const findFileHandleInDirectoryDeep = async (
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
            console.error('[handleFileClick GDRIVE read error]', e);
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
  // 🚨 @PATCH : **2026-10-03** — [구글 드라이브 토큰 추출 타입 불일치 버그 완벽 수정]: requestGoogleDriveAuth 반환값(string) 타입 정규화로 토큰이 undefined로 유입되어 발생하던 401 Unauthorized 결함 박멸
  // 🚨 @PATCH : **2026-10-03** — 구글 드라이브 무설정 자동 연동, 0초 반응속도 렌더링, 리소스 폴더(OnriviAuthor/참조파일) 자동 동기화
  // 🔗 @CALLS : requestGoogleDriveAuth, setupOnriviDriveWorkspace, fetchDriveFileNodes, handleFileClick
  // ====================================================================
  const connectGoogleDrive = useCallback(async (chooseFolder = false) => {
    if (storageSwitchRef.current) return;
    storageSwitchRef.current = true;
    let stage = '인증 확인';
    try {
      const isLocal = rootFolderRef.current?.type !== 'GDRIVE';
      const localResourceBeforeConnect = getResourceSettings('local');
      if (chooseFolder && !isLocal && (tabsRef.current.some(t => t.isModified) ||
          (activeTabIdRef?.current && contentRef.current !== lastSavedContentRef.current))) {
        showToast('작업장을 변경하기 전에 작성 중인 글을 저장해 주세요.', 'warning');
        return;
      }
      let token = getSavedDriveToken();
      if (token && hasValidDriveToken()) {
        const testRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000)
        });
        if (!testRes.ok) {
          const refreshed = getSavedDriveToken();
          if (refreshed && refreshed !== token) token = refreshed;
          else {
            localStorage.removeItem('onrivi_gdrive_access_token');
            localStorage.removeItem('onrivi_gdrive_token_expires_at');
            sessionStorage.removeItem('onrivi_gdrive_access_token');
            token = null;
          }
        }
      } else token = null;

      if (!token) {
        stage = 'Google 인증';
        token = await requestGoogleDriveAuth();
      }
      if (!token) {
        throw new Error("구글 인증 토큰 획득에 실패했습니다. 다시 시도해주세요.");
      }

      stage = '계정 정보 확인';
      const { fetchGoogleUserInfo } = await import('@/lib/gdrive/googleDriveClient');
      const account = await fetchGoogleUserInfo(token);
      const { isFirstConnection } = activateDriveAccount(account.email);
      // Account-specific settings -> validate/create resource folder -> initialize
      // children/files -> connect document workspace.
      const { resolveDriveResourceFolderByName, createDefaultDriveFolders } = await import('@/lib/gdrive/googleDriveClient');
      stage = '참조폴더 복구';
      const resource = await resolveDriveResourceFolderByName(token);
      const selectedResource = { id: resource.folderId, name: resource.name };
      const initial = isFirstConnection ? await createDefaultDriveFolders(token, resource.name) : null;
      stage = '작업장 복구';
      const selectedFolder = initial?.workspace || await selectOnriviWorkspaceFolder(token, !chooseFolder);
      if (!selectedFolder) return;
      const wsInfo = await setupOnriviDriveWorkspace(token, selectedFolder, selectedResource);
      stage = '파일 목록 불러오기';
      const driveNodes = await fetchDriveFileNodes(token, selectedFolder.id);

      // Back up only when leaving local storage; cloud folder changes must not overwrite it.
      if (isLocal) {
        localEnvironmentRef.current = captureEnvironment();
        const localRoot = rootFolderRef.current;
        localStorage.setItem('onrivi_last_local_has_directory_handle', localRoot?.handle ? 'true' : 'false');
        if (localRoot) {
          const { handle, ...metadata } = localRoot;
          localStorage.setItem('onrivi_last_local_root_folder', JSON.stringify(metadata));
          if (handle) await idb.set('rootFolderHandle', handle);
        } else localStorage.removeItem('onrivi_last_local_root_folder');
        localStorage.setItem('onrivi_last_local_workspace_type', workspaceType || 'browser');
        for (const [source, target] of [
          ['onrivi_workspace_path', 'onrivi_last_local_workspace_path'],
        ]) {
          const value = localStorage.getItem(source);
          if (value !== null) localStorage.setItem(target, value);
          else localStorage.removeItem(target);
        }
        if (localResourceBeforeConnect) {
          saveResourceSettings(localResourceBeforeConnect, 'local', { silent: true });
        }
      }

      // 2. 구글 드라이브 작업장 상태 즉시 갱신
      const gdriveFolder = {
        name: selectedFolder.name,
        path: `GoogleDrive/${selectedFolder.name}`,
        displayName: `☁️ ${selectedFolder.name.split('/').pop()}`,
        type: 'GDRIVE',
        driveFolderId: wsInfo.workspaceFolderId
      };
      rootFolderRef.current = gdriveFolder;
      setRootFolder(gdriveFolder);
      setWorkspaceType('cloud');
      localStorage.setItem('rootFolder', JSON.stringify(gdriveFolder));
      localStorage.setItem('workspaceType', 'cloud');
      localStorage.setItem('onrivi_workspace_path', gdriveFolder.path);
      localStorage.setItem('onrivi_last_workspace_mode', 'cloud');

      // 3. 환경설정 공통 리소스 폴더를 구글 드라이브 리소스 폴더로 자동 동기화
      const resourceDisplayName = selectedResource.name;
      saveResourceSettings({
        kind: 'drive',
        path: resourceDisplayName,
        folderId: wsInfo.resourceFolderId,
        profilesFolderId: wsInfo.profilesFolderId,
        promptFolderId: wsInfo.promptFolderId,
        bibleFolderId: wsInfo.bibleFolderId,
        mediaFolderId: wsInfo.mediaFolderId,
        dbFolderId: wsInfo.dbFolderId
      }, 'cloud');
      localStorage.setItem('onrivi_cloud_resource_folder_path', resourceDisplayName);

      // 4. 탐색기 목록 0초 즉각 렌더링
      setFileList(driveNodes);
      setIsDriveAuthExpired(false);

      // 5. 사이드바 열기 및 토스트
      setIsSidebarOpen(true);
      reportClientLog('구글 드라이브 연결 완료', 'INFO', 'DRIVE_CONNECT');
      showToast(`구글 드라이브에 연결되었습니다. (${wsInfo.userEmail || '연결 완료'})`, "success");
      console.log(`[connectGoogleDrive] ✅ 구글 드라이브 연결 완료! (${wsInfo.userEmail || '연결됨'}), 파일 수: ${driveNodes.length}`);

      if (isLocal) {
        const previous = driveEnvironmentRef.current;
        restoreEnvironment(previous?.root?.driveFolderId === wsInfo.workspaceFolderId ? previous : null);
      }
      window.dispatchEvent(new CustomEvent('onrivi:reload_profiles'));
    } catch (err: any) {
      // 🛡️ [연결 실패 시 불량 토큰/만료 시간 즉시 클린업] 다음 클릭 시 백지상태에서 즉각 재인증 보장
      localStorage.removeItem('onrivi_gdrive_access_token');
      localStorage.removeItem('onrivi_gdrive_token_expires_at');
      sessionStorage.removeItem('onrivi_gdrive_access_token');
      reportClientLog(err.message || '구글 드라이브 연결 실패', 'ERROR', 'DRIVE_CONNECT');
      console.error('[connectGoogleDrive Error]', err);
      showToast(`구글 드라이브 ${stage} 실패: ${err.message || '잠시 후 다시 시도해 주세요.'}`, "error");
    } finally {
      storageSwitchRef.current = false;
    }
  }, [setRootFolder, setWorkspaceType, setFileList, setIsSidebarOpen, showToast, workspaceType, activeTabIdRef, captureEnvironment, contentRef, lastSavedContentRef, restoreEnvironment, tabsRef]);

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0011] useFileExplorer.ts ➔ disconnectGoogleDrive
  // 🎯 @KICK  : 구글 드라이브 연결 해제 및 직전 로컬 작업장/리소스 폴더 자동 복구
  // 🛡️ @GUARD : 백업 데이터 검증 후 복원
  // 🚨 @PATCH : **2026-10-03** — 구글 드라이브 토큰 폐기 및 로컬 작업장 원상 복구 연동
  // 🔗 @CALLS : disconnectGDriveClient, setRootFolder, setWorkspaceType
  // ====================================================================
  const disconnectGoogleDrive = useCallback(async () => {
    if (storageSwitchRef.current || rootFolderRef.current?.type !== 'GDRIVE') return;
    storageSwitchRef.current = true;
    try {
      const activeId = activeTabIdRef?.current;
      // 🛡️ [데이터 보존 안전망] 연결 해제 직전 현재 열려있는 모든 탭과 에디터 최신 내용을 비상 로컬 백업
      const snapshot: EmergencyDriveSnapshot = {
        timestamp: Date.now(),
        activeTabId: activeId,
        drafts: tabsRef.current.map(t => ({
          tabId: t.id,
          driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
          name: t.name,
          path: t.path,
          content: t.id === activeId ? contentRef.current : t.content,
          isModified: t.isModified || (t.id === activeId && contentRef.current !== lastSavedContentRef.current),
          savedAt: new Date().toISOString()
        }))
      };
      saveEmergencyDriveDrafts(snapshot);
      const hasUnsaved = tabsRef.current.some(t => t.isModified) ||
        (activeId && contentRef.current !== lastSavedContentRef.current);
      if (hasUnsaved) {
        showToast('저장하지 않은 글이 있습니다. 저장하거나 파일로 내려받은 뒤 연결을 해제해 주세요.', 'warning');
        return;
      }
      // Restore the browser directory handle before revoking the cloud connection.
      const backupRootValue = localStorage.getItem('onrivi_last_local_root_folder');
      let restoredRoot = localEnvironmentRef.current?.root || (backupRootValue ? JSON.parse(backupRootValue) : null);
      if (restoredRoot?.type === 'GDRIVE') restoredRoot = null;

      const api = (window as any).electronAPI;
      // 🛡️ [로컬 작업장 100% 무손실 복구 가드] 백업 정보가 없더라도 환경별 로컬 경로를 역추적하여 자동 복원
      if (!restoredRoot) {
        const backupWs = localStorage.getItem('onrivi_last_local_workspace_path') || localStorage.getItem('onrivi_workspace_path');
        if (api && backupWs && !backupWs.startsWith('GoogleDrive/')) {
          restoredRoot = { name: backupWs, path: backupWs.replace(/\\/g, '/') };
        } else if (api?.ensureLocalEnvironment) {
          try {
            const envRes = await api.ensureLocalEnvironment();
            if (envRes?.workspacePath) {
              restoredRoot = { name: envRes.workspacePath, path: envRes.workspacePath.replace(/\\/g, '/') };
            }
          } catch (_) {}
        } else if (!api) {
          try {
            const handle = await idb.get('rootFolderHandle');
            if (handle) {
              restoredRoot = { name: handle.name, handle };
            }
          } catch (_) {}
        }
      }

      const hadDirectoryHandle = localStorage.getItem('onrivi_last_local_has_directory_handle');
      if (restoredRoot && !api && !restoredRoot.handle &&
          (hadDirectoryHandle === 'true' || (hadDirectoryHandle === null && restoredRoot.displayName))) {
        const handle = await idb.get('rootFolderHandle');
        if (handle) {
          restoredRoot = { ...restoredRoot, handle };
        }
      }
      if (restoredRoot?.handle && !await verifyHandlePermission(restoredRoot.handle, true)) {
        showToast('마지막 로컬 작업장으로 돌아가려면 폴더 접근을 허용해 주세요.', 'warning');
        return;
      }
      driveEnvironmentRef.current = captureEnvironment();
      // Switch resource storage before removing the token, so reloads cannot
      // observe cloud storage with an already-cleared Drive connection.
      const localResource = getResourceSettings('local');
      await restoreLocalProfileFolder();
      saveResourceSettings(localResource, 'local');
      disconnectGDriveClient();
      localStorage.removeItem('onrivi_last_workspace_mode');

      // 백업된 로컬 작업장/리소스 폴더 복원
      const backupWs = localStorage.getItem('onrivi_last_local_workspace_path') || (restoredRoot?.path || restoredRoot?.name);
      const backupRf = localResource?.path;

      setRootFolder(restoredRoot);
      rootFolderRef.current = restoredRoot;
      if (restoredRoot) {
        const { handle, ...metadata } = restoredRoot;
        localStorage.setItem('rootFolder', JSON.stringify(metadata));
      } else localStorage.removeItem('rootFolder');

      if (backupWs && !backupWs.startsWith('GoogleDrive/')) {
        localStorage.setItem('onrivi_workspace_path', backupWs.replace(/\\/g, '/'));
      } else {
        localStorage.removeItem('onrivi_workspace_path');
      }

      const lastWsType = localStorage.getItem('onrivi_last_local_workspace_type') || (api ? 'local' : 'browser');
      setWorkspaceType(lastWsType);
      localStorage.setItem('workspaceType', lastWsType);
      if (backupRf) {
        localStorage.setItem('onrivi_resource_folder_path', backupRf);
        localStorage.setItem('onrivi_resource_folder', backupRf);
        localStorage.setItem('resourceFolder', backupRf);
      }
      restoreEnvironment(localEnvironmentRef.current);
      window.dispatchEvent(new CustomEvent('onrivi:reload_profiles'));
      setIsSidebarOpen(true);
      // 🛡️ 로컬 작업장 파일 목록 즉시 갱신
      await refreshFileList(true);
      showToast('구글 드라이브 연결을 해제하고 내 PC 로컬 작업장으로 돌아왔습니다.', 'success');
    } catch (err: any) {
      console.error('[disconnectGoogleDrive Error]', err);
      showToast('로컬 작업장 복원 실패: ' + (err.message || '폴더 접근 오류'), 'error');
    } finally {
      storageSwitchRef.current = false;
    }
  }, [setRootFolder, setWorkspaceType, setIsSidebarOpen, showToast, activeTabIdRef, captureEnvironment, contentRef, lastSavedContentRef, restoreEnvironment, tabsRef, refreshFileList]);

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0002] useFileExplorer.ts ➔ saveFile
  // 🎯 @KICK  : Electron/웹/브라우저 File System Access 환경에 파일을 물리적으로 저장
  // 🛡️ @GUARD : targetFile null 시 false 반환, 권한 거부 시 오류 토스트
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : vfsWriteFile, api.saveFile, showToast, setTabs
  // ====================================================================
  // 6. 물리적 스토리지 저장 로직
  const saveFile = useCallback(async (targetContent: string, targetFile: FileNode | null) => {
    if (isBundledDocumentPath(targetFile?.path)) return false;
    if (!targetFile) return false;
    try {
      let success = false;
      const activeTabId = activeTabIdRef?.current;
      const activeTab = tabsRef.current?.find((t: any) => t.id === activeTabId);
      const driveFileId = targetFile.driveFileId || 
        (targetFile as any).driveId || 
        (activeTab as any)?.driveFileId || 
        (activeTab as any)?.driveId || 
        (currentFileNode as any)?.driveFileId || 
        (currentFileNode as any)?.driveId;

      if (driveFileId || (!targetFile.path && !targetFile.handle && (rootFolderRef.current?.type === 'GDRIVE' || workspaceType === 'cloud'))) {
        const token = getSavedDriveToken();
        if (token && driveFileId) {
          try {
            await saveDriveFileContent(token, driveFileId, targetContent);
            lastSavedContentRef.current = targetContent;
            success = true;
          } catch (driveErr) {
            console.error('[saveFile GDRIVE Error]', driveErr);
            showToast("구글 드라이브 저장 중 오류가 발생했습니다.", "error");
            return false;
          }
        } else {
          showToast(token ? '구글 드라이브 저장 대상 파일 ID를 찾을 수 없습니다.' : '구글 드라이브 연결이 만료되었습니다. 연결을 갱신한 뒤 다시 저장해 주세요.', 'error');
          return false;
        }
      } else {
        const api = typeof window !== 'undefined' && (window as any).electronAPI;
        const isWebOrAddon = !api;
        const effectiveWorkspaceType = isWebOrAddon ? 'browser' : workspaceType;

        if (api) {
          success = await api.saveFile(targetFile.path, targetContent);
          if (success) {
            lastSavedContentRef.current = targetContent;
          }
        } else if (effectiveWorkspaceType === 'local') {
        const res = await fetch(getApiUrl('/api/save'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: targetFile.path, content: targetContent })
        });
        if (res.ok) {
          lastSavedContentRef.current = targetContent;
          success = true;
        }
      } else if (effectiveWorkspaceType === 'browser') {
        if (!targetFile.handle && rootFolderRef.current?.handle) {
          const targetBaseName = targetFile.name || targetFile.path?.replace(/\\/g, '/').split('/').pop() || '';
          if (targetBaseName && targetBaseName !== '새 파일.md') {
            try {
              const deepRes = await findFileHandleInDirectoryDeep(rootFolderRef.current.handle, targetBaseName);
              if (deepRes) {
                targetFile.handle = deepRes.fileHandle;
                currentFileParentHandleRef.current = deepRes.parentHandle;
                const activeTabId = activeTabIdRef?.current;
                if (activeTabId) {
                  setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, handle: deepRes.fileHandle, node: { ...t.node, handle: deepRes.fileHandle } } : t));
                }
              }
            } catch {}
          }
        }
        if (targetFile.handle) {
          const permissionMode = { mode: 'readwrite' as const };
          let isGranted = (await targetFile.handle.queryPermission(permissionMode)) === 'granted';
          if (!isGranted) {
            isGranted = (await targetFile.handle.requestPermission(permissionMode)) === 'granted';
          }
          if (isGranted) {
            const writable = await targetFile.handle.createWritable();
            await writable.write(targetContent);
            await writable.close();
            lastSavedContentRef.current = targetContent;
            success = true;
          } else {
            showToast("파일 쓰기 권한이 거부되었습니다.", "error");
            return false;
          }
        } else if (targetFile.path) {
          let savedViaApi = false;
          if (/^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(targetFile.path)) {
            const electronApi = typeof window !== 'undefined' ? ((window as any).electronAPI || (window as any).api) : null;
            if (electronApi?.saveFile) {
              try {
                let nativePath = targetFile.path;
                if (nativePath.startsWith('file:///')) {
                  nativePath = decodeURIComponent(nativePath.replace(/^file:\/\/\/?/, ''));
                }
                const saveOk = await electronApi.saveFile(nativePath, targetContent);
                if (saveOk) {
                  savedViaApi = true;
                  lastSavedContentRef.current = targetContent;
                  success = true;
                }
              } catch (e) {
                console.warn('[saveFile] 데스크톱 saveFile 실패:', e);
              }
            } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
              try {
                const saveRes = await fetch(getApiUrl('/api/file-content'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ path: targetFile.path, content: targetContent })
                });
                if (saveRes.ok) {
                  savedViaApi = true;
                  lastSavedContentRef.current = targetContent;
                  success = true;
                }
              } catch {}
            }
          }
          if (!savedViaApi) {
            // 💡 [대안 1]: 지식 보관함 문서 저장 (브라우저 디스크 핸들이 없는 외부 문서 지원)
            let savedViaKnowledge = false;
            try {
              const rfHandle = (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
              const isKnowledgeDoc = targetFile.path && (
                targetFile.path.startsWith('knowledge://') ||
                tabsRef.current.some(t => (t.path === targetFile.path || t.name === targetFile.name) && t.isKnowledge)
              );
              if (isKnowledgeDoc || targetFile.path) {
                savedViaKnowledge = await knowledgeClient.updateDocumentFast({
                  filePathOrId: targetFile.path,
                  fileContent: targetContent,
                  resourceFolderHandle: rfHandle
                });
              }
            } catch (kSaveErr) {
              console.warn('[saveFile] 지식 보관함 고속 저장 예외:', kSaveErr);
            }

            if (savedViaKnowledge) {
              lastSavedContentRef.current = targetContent;
              success = true;
              showToast(`'${targetFile.name}' 문서가 지식 보관함에 안전하게 저장되었습니다.`, 'success');
            } else {
              vfsWriteFile(targetFile.path, targetContent);
              lastSavedContentRef.current = targetContent;
              success = true;
            }
          }
        }
      }
      }

      if (success) {
        setTabs(prev => prev.map(t => {
          let isMatch = false;
          if (targetFile.driveFileId && (t as any).driveFileId) {
            isMatch = (t as any).driveFileId === targetFile.driveFileId;
          } else if (targetFile.path && t.path) {
            isMatch = t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === targetFile.path.replace(/\\/g, '/').toLowerCase().normalize('NFC');
          } else if (targetFile.handle && t.node?.handle) {
            isMatch = t.node.handle === targetFile.handle;
          }
          
          return isMatch ? { ...t, isModified: false, content: targetContent } : t;
        }));

        // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-003] 등록된 지식 문서 저장 시 로컬 비동기 자동 재색인 트리거
        const effectivePath = targetFile.path || targetFile.name;
        if (effectivePath && targetContent) {
          triggerKnowledgeAutoSyncOnSave({
            filePath: effectivePath,
            fileContent: targetContent,
          }).catch(() => {});
        }
      }
      return success;
    } catch (e: any) {
      console.error('[saveFile Error]', e);
      showToast('파일 저장 중 오류가 발생했습니다. 권한을 확인해 주세요.', 'error');
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceType, setTabs, showToast]);

  // ====================================================================
  // 📊 [OMD-FILE-USEFILEEXPLORER-0001] useFileExplorer.ts ➔ rootFolderRefreshEffect
  // 🎯 @KICK  : rootFolder 변경 시 파일 목록 자동 새로고침 또는 초기화, 외부 변경 실시간 감시 연동
  // 🛡️ @GUARD : rootFolder null 시 fileList를 빈 배열로 초기화, unwatch/리스너 누수 방지
  // 🚨 @PATCH : **2026-09-16** — [외부 작업폴더 변경 실시간 감지 & 리스너 등록 누락 방어]: targetWatchPath(path || name) 전달 및 unwatch/전역 리프레시/윈도우 포커스 감지 단일 클린업 통합
  // 🔗 @CALLS : refreshFileList, setFileList, api.watchWorkspace, api.onWorkspaceChanged
  // ====================================================================
  // 폴더가 바뀔 때 리스트 자동 리프레시 연동 및 전역 리프레시 이벤트 수신
  useEffect(() => {
    let unwatchElectron: (() => void) | null = null;
    let focusTimer: any = null;

    if (rootFolder) {
      // 🛡️ 로컬스토리지에 작업장 절대경로 자동 보강 (지식문서 다이렉트 직결용)
      try {
        const savedWs = localStorage.getItem('onrivi_workspace_path');
        if (!savedWs || !isAbsolutePath(savedWs.replace(/\\/g, '/'))) {
          const folderName = rootFolder.name || rootFolder.path || '';
          if (folderName && isAbsolutePath(folderName.replace(/\\/g, '/'))) {
            localStorage.setItem('onrivi_workspace_path', folderName.replace(/\\/g, '/'));
          } else if (folderName && folderName !== 'browser-storage') {
            const webBase = (localStorage.getItem('onrivi_web_base_path') || '').replace(/\\/g, '/').replace(/\/+$/, '');
            const targetFolder = folderName.replace(/\\/g, '/').split('/').pop() || folderName;
            if (webBase && isAbsolutePath(webBase)) {
              const combined = `${webBase}/${targetFolder}`;
              localStorage.setItem('onrivi_workspace_path', combined);
            }
          }
        }
      } catch {}

      refreshFileList();

      // [외부 변경 실시간 감지] Electron 네이티브 chokidar 워처 연동
      const api = (window as any).electronAPI;
      const targetWatchPath = rootFolder.path || (rootFolder.name && isAbsolutePath(rootFolder.name) ? rootFolder.name : null);
      if (workspaceType === 'local' && api?.watchWorkspace && api?.onWorkspaceChanged && targetWatchPath) {
        api.watchWorkspace(targetWatchPath);
        unwatchElectron = api.onWorkspaceChanged(() => {
          if (focusTimer) clearTimeout(focusTimer);
          focusTimer = setTimeout(() => {
            refreshFileList();
          }, 80);
        });
      }
    } else {
      setFileList([]);
    }

    // 전역 수동 리프레시 커스텀 이벤트 수신기 (단일 디바운스로 2중 새로고침 차단)
    const handleGlobalRefresh = (e?: Event) => {
      const isForce = (e as CustomEvent)?.detail?.force === true;
      if (rootFolder) {
        if (focusTimer) clearTimeout(focusTimer);
        focusTimer = setTimeout(() => {
          refreshFileList(isForce);
        }, 80);
      }
    };
    window.addEventListener('file:refresh-all-directories', handleGlobalRefresh);

    // 외부 편집/변경 후 앱 창 복귀 시 자동 새로고침 안전망 (웹/데스크탑 공통)
    const handleFocusRefresh = () => {
      if (rootFolder) {
        if (focusTimer) clearTimeout(focusTimer);
        focusTimer = setTimeout(() => {
          refreshFileList();
        }, 400);
      }
    };
    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleFocusRefresh);

    return () => {
      if (unwatchElectron) {
        unwatchElectron();
      }
      if (focusTimer) clearTimeout(focusTimer);
      window.removeEventListener('file:refresh-all-directories', handleGlobalRefresh);
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, [rootFolder, refreshFileList, setFileList, workspaceType]);

  const helpContentRef = useRef<any>(null);
  useEffect(() => {
    helpContentRef.current = null;
  }, []);

  return {
    refreshFileList,
    selectRootFolder,
    restoreFolderPermission,
    handleFileOpenByPath,
    handleFileClick,
    saveFile,
    connectGoogleDrive,
    disconnectGoogleDrive,
    isDriveAuthExpired
  };
};
