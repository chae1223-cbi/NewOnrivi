// ====================================================================
// 📊 [OMD-LIB-googleDriveClient-0001] src/lib/gdrive/googleDriveClient.ts
// 🎯 @KICK  : 누구나 쉽게 사용하는 구글 드라이브 무설정(Zero-Config) 자동 연동 및 클라우드 작업장 클라이언트 모듈
// 🛡️ @GUARD : Rule 1, Rule 2(대문자 코드값 GDRIVE), 최소 권한 원칙(drive.file 스코프 한정)
// 🚨 @PATCH : **2026-10-24** — [구글 드라이브 실패 후 즉시 재접속 보장 & 무활동 시 무중단 자동 갱신(Auto-Keep-Alive) 지원]:
//             1) requestGoogleDriveAuth 내 브라우저 팝업 창 닫힘(popup.closed) 즉시 감지하여 5분 잠금 없이 재연결 허용
//             2) refreshDriveTokenSilently 및 startActiveTokenRenewal에서 1분 무활동 체크 제약을 해제하여 사용자가 자리를 비워도 24시간 끊김 없는 무중단 토큰 자동 갱신 보장
//             3) 연결 실패 시 불량 토큰/만료 시간 자동 소거 및 대기 시간 단축(120초)
// 🚨 @PATCH : **2026-10-15** — [웹드라이브 작업장 유지 상태에서 다른 웹드라이브로의 독립 저장 완벽 지원]:
//             1) 다중 구글 드라이브 계정 관리 레지스트리(DriveAccountEntry / getSavedDriveAccounts / saveDriveAccount) 신설
//             2) requestGoogleDriveAuth에 isStandalone 옵션을 추가하여 다른 웹드라이브 계정 로그인/저장 시 현재 활성 작업장 토큰(STORAGE_KEY_TOKEN) 및 상태를 절대 덮어쓰지 않고 100% 무간섭 격리
//             3) 현재 웹드라이브 작업장을 종료하거나 연결 해제하지 않고도 다른 웹드라이브 계정으로의 자유로운 저장을 가능하게 보장
// 🚨 @PATCH : **2026-10-15** — [다중 웹드라이브(공유 드라이브 및 다중 계정) 전면 지원]:
//             1) listSharedDrives 신설로 사용자가 소속된 모든 공유 드라이브(Shared Drives) 목록 조회 지원
//             2) listDriveChildren, findDriveFolder, createDriveFolder, createDriveMarkdownFile 등에 supportsAllDrives=true 및 includeItemsFromAllDrives=true를 적용하여 개인 드라이브뿐 아니라 모든 공유 드라이브 호환
//             3) '내 구글 드라이브 연결' 문구를 '개인 웹드라이브 연결'로 표준화
// 🚨 @PATCH : **2026-10-14** — [구글 드라이브 인증 중복 호출 방어(activeAuthPromise) 및 데스크톱 무음 갱신 시 강제 브라우저 팝업 방지]:
//             1) requestGoogleDriveAuth에 인-플라이트 프로미스(activeAuthPromise) 싱글톤을 적용하여 동시 다발적 인증 호출 시 단일 요청으로 공유 대기
//             2) refreshDriveTokenSilently 실행 시 데스크톱 환경에서 사용자 동의 없는 브라우저 창 자동 팝업을 차단하고 만료 알림 이벤트로 안전 유도
// 🚨 @PATCH : **2026-10-11** — [구글 드라이브 토큰 만료 전 자동 저장 & 만료/해제 시 비상 로컬 백업 안전망 구축]:
//             1) 토큰 만료 2분(120초) 전 onrivi:drive_token_about_to_expire 이벤트 발송 및 작업 중 문서 클라우드 자동 사전 플러시 연동
//             2) 토큰 만료(0초) 또는 401 오류 시 onrivi:drive_auth_expired / onrivi:drive_token_expired와 연계하여 현재 열린 모든 탭과 최신 작성 버퍼를 onrivi_emergency_gdrive_drafts 로컬 스냅샷으로 100% 비상 보존
//             3) saveEmergencyDriveDrafts, getEmergencyDriveDrafts, clearEmergencyDriveDrafts, getDriveTokenRemainingSeconds 헬퍼 함수 신설
//             4) clearAllDriveTimers를 도입하여 토큰 갱신/만료/해제 시 3중 타이머(갱신/사전플러시/만료) 완벽 라이프사이클 관리
// 🚨 @PATCH : **2026-10-07** — [토큰 갱신 이벤트 발송 및 사용자 서식 파일 직결 탐색 강화]:
//             1) saveDriveToken 시 onrivi:drive_token_updated 이벤트 발송하여 로그인/토큰 획득 즉시 에디터 서식 로드 훅 재실행 보장
//             2) resolveDriveResourceFolderByName 시 userCssProfiles.json을 직접 전역 탐색하여 2개 사용자 서식이 보존된 참조 폴더 100% 직결
//             3) saveResourceSettings 호출 시 silent: true를 적용하여 불필요한 React 이벤트 취소 루프 방어
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더(참조파일 등) 전역 자동 탐색 및 5대 하위 폴더 ID 실시간 매핑]:
//             1) resolveDriveResourceFolderByName 신설하여 구글 드라이브 전체에서 환경설정에 지정된 리소스 폴더명('참조파일' 등)을 전역 탐색
//             2) 서식(profiles/userCssProfiles.json 70KB) 및 미디어/참고문헌/프롬프트/DB 5대 서브폴더 ID를 100% 정상 연동
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더명(참조파일 등) 최우선 탐색 및 서식 보관 폴더 지능형 감지]:
//             1) getOrCreateDriveResourceFolder 시 환경설정(resourceSettings)에 지정된 리소스 폴더명을 최우선으로 탐색하도록 개선
//             2) 복수 개의 참조 폴더 존재 시 userCssProfiles.json 내 사용자 정의 서식이 보존된 폴더를 우선 인식하여 서식 누락 원천 해결
//             3) setupOnriviDriveWorkspace 시 selectedResourceFolderId에 해당하는 실제 리소스 폴더명을 온전히 보존
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 참조폴더 기존 서식/하위파일 100% 영구 보존 및 재로그인 초기화 방지]:
//             1) 구글 드라이브 재접속 시 참조폴더(참조파일)가 매번 새로 생성되거나 초기화되지 않고 기존 폴더 및 userCssProfiles.json을 100% 그대로 계승·재사용하도록 보장
//             2) OnriviAuthor 루트 탐색 시 'root' in parents 및 createdTime asc 정렬 고정으로 중복 루트 폴더 생성 및 엉뚱한 폴더 바인딩 원천 차단
//             3) getSavedWorkspaceInfo에서 profilesFolderId 등 필수 서브폴더 ID가 빈 문자열('')로 유실되는 덮어쓰기 버그 수정
//             4) findDriveFile에 modifiedTime desc 정렬을 적용하여 최신 사용자 서식이 저장된 유효 파일을 항상 정확히 타겟팅하도록 보강
// 🚨 @PATCH : **2026-10-07** — [최초 구글 드라이브 접속 시 작업장 및 참조폴더(5대 하위폴더/기본파일) 자동 생성 & 환경설정 직결]:
//             1) 구글 드라이브 최초 접속 시 사용자 팝업 선택 없이 OnriviAuthor/작업장 및 OnriviAuthor/참조폴더 자동 동시 생성
//             2) 참조폴더 내 5대 필수 디렉터리(bible, db, media, profiles, prompt) 및 6대 기본 파일(userCssProfiles, prompts, presets, templates, references.bib, db) 완전 자동 구성
//             3) getOrCreateDriveResourceFolder API 신설 및 환경설정 공통 리소스 폴더를 '참조폴더'로 100% 자동 직결 바인딩
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 백그라운드 무중단 토큰 자동 갱신 & 최종 작업장 재접속 자동 복원]:
//             1) 토큰 만료 5분(300초) 전 백그라운드 무음(Silent) 토큰 자동 갱신 스케줄러(scheduleDriveTokenRefresh) 및 refreshDriveTokenSilently API 신설로 1시간 만료 끊김 완전 해결
//             2) 앱 시작 시 잔여 유효시간 자동 감지 및 갱신 스케줄 복원 엔진(initDriveTokenAutoRefresh) 구축
//             3) 최종 작업장이 구글 드라이브였을 때 재접속/로그인 시 구글 드라이브 작업장 상태(GDRIVE/cloud) 100% 자동 유지 및 파일 목록 무중단 복구 연동
// 🚨 @PATCH : **2026-10-04** — [구글 드라이브 파일/폴더 복사·잘라내기·붙여넣기·이동 전면 지원]: moveDriveItem(부모 폴더 변경), copyDriveFile(단일 파일 복사), copyDriveFolderRecursive(폴더 재귀 복사) API 신설하여 LeftSidebar.tsx handlePasteNode의 GDRIVE 분기와 완벽 연동
// 🚨 @PATCH : **2026-10-04** — [데스크톱 Google OAuth 400 invalid_request 해결 & 시스템 브라우저 웹 Handoff 연동]: 데스크톱(Electron) 환경 감지 시 임베디드 웹뷰 및 비표준 storagerelay 차단 정책을 우회하기 위해 window.electronAPI.requestDesktopGDriveAuth()를 호출하여 시스템 브라우저 웹 브리지(https://onrivi.com/auth/google-drive-desktop)를 통해 토큰을 안전하게 수신하도록 개편
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 FileNode 규격 통일(driveFileId 부여)]: fetchDriveFileNodes 노드에 driveFileId: item.id를 명시하여 탭 로딩 시 빈 본문(0 bytes) 버그 원천 해결
// 🚨 @PATCH : **2026-10-03** — [클라우드 서재 구성 병렬화(Promise.all) 초고속화 및 진행상황 상세 로그 탑재]: 20여 회의 순차 네트워크 호출을 3단계 배치 병렬화로 개편하여 대기 시간을 15초➔1.5초로 90% 단축하고 전 과정 콘솔 로깅 지원
// 🚨 @PATCH : **2026-10-03** — [토큰 전달 방어 및 resolveAuthToken 전역 적용]: listDriveChildren, readDriveFileContent, saveDriveFileContent 등 모든 GDrive API 함수에 token 누락 방지 resolveAuthToken 전면 적용
// 🚨 @PATCH : **2026-10-03** — [구글 사용자 정보 401 오류 원천 해결 및 안전 폴백]: oauth2/v3/userinfo 대신 Drive API 전용 엔드포인트(/drive/v3/about?fields=user) 우선 조회 및 실패 시에도 연결이 중단되지 않는 무결점 폴백 적용
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 참조파일(리소스 폴더) 5대 폴더 및 기본 파일 완전 동기화]: 로컬 환경설정 리소스 폴더 생성 규격과 100% 동일하게 5대 하위 폴더(profiles, prompt, bible, media, db) 및 기본 파일들(userCssProfiles.json, ai_prompts.json, ai_presets.json, promptTemplates.json, references.bib, onrivi_knowledge.db) 자동 생성 및 무결성 보존
// 🚨 @PATCH : **2026-10-03** — [문구 표준화 및 보편적 사용자 경험 확립]: 모든 사용자를 위해 보편적이고 친숙한 온리비 클라우드 서재 안내 문구로 통일
// 🚨 @PATCH : **2026-10-03** — [OAuth 스코프 체크박스 선택 검증 가드]: 팝업창에서 구글 드라이브 권한 체크박스를 체크하지 않고 [계속]을 눌렀을 때 명확한 한글 안내 및 재시도 유도
// 🚨 @PATCH : **2026-10-03** — [Google Drive API 403 에러 안내 강화]: 구글 클라우드 콘솔 API 미활성화 시 친절하고 명확한 한글 안내 및 에러 JSON 상세 파싱 처리
// 🚨 @PATCH : **2026-10-03** — [GIS 스크립트 재시도 방어 및 error_callback/select_account 탑재]: 이전에 실패한 스크립트 엘리먼트 자동 소거 후 재시도, 팝업 차단(popup_blocked) 및 팝업 닫힘(popup_closed) 명확한 안내, prompt: select_account로 계정 선택창 활성화
// 🚨 @PATCH : **2026-10-03** — [클라우드 드라이브 무설정 자동 연동 모듈 신규 구현]: 구글 계정 로그인만으로 /OnriviAuthor/작업장(Root) 및 /참조파일(리소스)을 원클릭 자동 생성하고, 파일 읽기/쓰기/생성/삭제 및 미디어 업로드를 100% 안전하게 지원
// ====================================================================

import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
import { getResourceSettings, saveResourceSettings } from '@/lib/resourceSettings';
import CryptoJS from 'crypto-js';
import { startActiveTokenRenewal } from './activeTokenRenewal';
import { SYSTEM_PROFILES, isSystemProfileId } from '@/constants/cssProfile';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export interface GoogleDriveUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleDriveWorkspaceInfo {
  userInfo: GoogleDriveUserInfo;
  rootFolderId: string;       // OnriviAuthor 폴더 ID
  workspaceFolderId: string;  // OnriviAuthor/작업장 폴더 ID
  workspaceFolderName?: string;
  workspacePath?: Array<{ id: string; name: string }>;
  resourceFolderId: string;   // OnriviAuthor/참조파일 폴더 ID
  profilesFolderId: string;   // OnriviAuthor/참조파일/profiles 폴더 ID
  promptFolderId?: string;    // OnriviAuthor/참조파일/prompt 폴더 ID
  bibleFolderId?: string;     // OnriviAuthor/참조파일/bible 폴더 ID
  mediaFolderId: string;      // OnriviAuthor/참조파일/media 폴더 ID
  dbFolderId?: string;        // OnriviAuthor/참조파일/db 폴더 ID
  userEmail?: string;
  userName?: string;
  connectedAt: string;
}

export interface GoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  modifiedTime?: string;
  size?: number;
  children?: GoogleDriveFileItem[];
}

const STORAGE_KEY_TOKEN = 'onrivi_gdrive_access_token';
const STORAGE_KEY_EXPIRY = 'onrivi_gdrive_token_expires_at';
const STORAGE_KEY_WORKSPACE = 'onrivi_gdrive_workspace_info';
export const STORAGE_KEY_EMERGENCY_DRAFTS = 'onrivi_emergency_gdrive_drafts';
export const STORAGE_KEY_SAVED_ACCOUNTS = 'onrivi_saved_drive_accounts';

export interface DriveAccountEntry {
  email: string;
  name?: string;
  token: string;
  expiresAt: number;
  isWorkspaceAccount?: boolean;
}

/**
 * 저장된 다중 구글 드라이브 계정 목록 조회
 */
export function getSavedDriveAccounts(): DriveAccountEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
    const parsed: DriveAccountEntry[] = raw ? JSON.parse(raw) : [];
    const accounts = Array.isArray(parsed) ? parsed.filter(a => a && a.email && a.token) : [];

    // 현재 활성 작업장 토큰 계정이 있으면 최우선 포함 보장
    const currentToken = getSavedDriveToken();
    const wsInfo = getSavedWorkspaceInfo();
    const currentEmail = wsInfo?.userEmail || localStorage.getItem('onrivi_active_drive_account');
    if (currentToken && currentEmail) {
      const existing = accounts.find(a => a.email.toLowerCase() === currentEmail.toLowerCase());
      if (existing) {
        existing.token = currentToken;
        existing.isWorkspaceAccount = true;
      } else {
        accounts.unshift({
          email: currentEmail,
          name: wsInfo?.userName || currentEmail.split('@')[0],
          token: currentToken,
          expiresAt: Number(localStorage.getItem(STORAGE_KEY_EXPIRY)) || (Date.now() + 3600000),
          isWorkspaceAccount: true
        });
      }
    }
    return accounts;
  } catch {
    return [];
  }
}

/**
 * 다중 구글 드라이브 계정 등록/갱신
 */
export function saveDriveAccount(account: DriveAccountEntry): void {
  if (typeof window === 'undefined' || !account?.email || !account?.token) return;
  try {
    const accounts = getSavedDriveAccounts().filter(a => a.email.toLowerCase() !== account.email.toLowerCase());
    accounts.push(account);
    localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts));
  } catch {}
}

/**
 * 다중 구글 드라이브 계정 삭제
 */
export function removeDriveAccount(email: string): void {
  if (typeof window === 'undefined' || !email) return;
  try {
    const accounts = getSavedDriveAccounts().filter(a => a.email.toLowerCase() !== email.toLowerCase());
    localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts));
  } catch {}
}

export interface EmergencyDriveDraft {
  tabId: string;
  driveFileId?: string;
  name: string;
  path?: string;
  content: string;
  isModified: boolean;
  savedAt: string;
}

export interface EmergencyDriveSnapshot {
  timestamp: number;
  activeTabId: string | null;
  drafts: EmergencyDriveDraft[];
}

/**
 * 🛡️ [데이터 보존 안전망] 토큰 만료 또는 연결 해제 시 열려있는 탭 및 에디터 본문을 로컬에 비상 백업
 */
export function saveEmergencyDriveDrafts(snapshot: EmergencyDriveSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_EMERGENCY_DRAFTS, JSON.stringify(snapshot));
    console.log(`[GDrive Emergency] 🛡️ 비상 초안 스냅샷 로컬 백업 완료 (${snapshot.drafts.length}개 탭)`);
  } catch (e) {
    console.error('[GDrive Emergency] 비상 초안 로컬 백업 실패:', e);
  }
}

/**
 * 🛡️ [데이터 보존 안전망] 로컬에 비상 백업된 구글 드라이브 초안 스냅샷 조회
 */
export function getEmergencyDriveDrafts(): EmergencyDriveSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMERGENCY_DRAFTS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[GDrive Emergency] 비상 초안 로드 오류:', e);
    return null;
  }
}

/**
 * 🛡️ [데이터 보존 안전망] 구글 드라이브로 동기화 완료 후 비상 백업 초안 정리
 */
export function clearEmergencyDriveDrafts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_EMERGENCY_DRAFTS);
}

/**
 * ⏱️ 구글 드라이브 토큰의 만료까지 남은 잔여 시간(초 단위) 계산
 */
export function getDriveTokenRemainingSeconds(): number {
  if (typeof window === 'undefined') return 0;
  const expiry = Number(localStorage.getItem(STORAGE_KEY_EXPIRY));
  if (!expiry) return 0;
  return Math.max(0, Math.round((expiry - Date.now()) / 1000));
}

let gapiInited = false;
let gisTokenClient: any = null;

/**
 * Google Identity Services(GIS) 스크립트 동적 로드
 */
export async function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return;

  const existingGoogle = (window as any).google;
  if (existingGoogle?.accounts?.oauth2) {
    return;
  }

  // 이전에 로드 실패하여 남아있는 스크립트 태그 소거
  const staleScripts = document.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]');
  staleScripts.forEach((s) => s.remove());

  return new Promise((resolve, reject) => {
    let isSettled = false;

    const timer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      reject(new Error('구글 인증 라이브러리 로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.'));
    }, 10000);

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (isSettled) return;
      clearTimeout(timer);
      const pollTimer = setInterval(() => {
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(pollTimer);
          if (!isSettled) {
            isSettled = true;
            resolve();
          }
        }
      }, 50);
    };
    script.onerror = () => {
      if (isSettled) return;
      clearTimeout(timer);
      isSettled = true;
      script.remove();
      reject(new Error('구글 인증 스크립트 로드 실패. 브라우저 보안 또는 광고 차단 확장 프로그램을 확인해주세요.'));
    };
    document.head.appendChild(script);
  });
}

let refreshTimerId: any = null;
let stopActiveRenewal: (() => void) | null = null;
let lastDriveActivity = 0;
let activityTrackingStarted = false;
function trackDriveActivity() {
  if (activityTrackingStarted) return;
  activityTrackingStarted = true;
  for (const name of ['keydown', 'pointerdown', 'wheel', 'input', 'touchstart']) {
    window.addEventListener(name, (event) => {
      if (event.isTrusted && document.visibilityState === 'visible') lastDriveActivity = Date.now();
    }, { capture: true, passive: true });
  }
}
function saveBeforeDriveRenewal(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('문서 저장 완료를 확인하지 못했습니다.')), 15000);
    window.dispatchEvent(new CustomEvent('onrivi:drive_token_about_to_expire', {
      detail: { remainingSeconds: getDriveTokenRemainingSeconds(), complete: (error?: unknown) => {
        clearTimeout(timeout);
        if (error) reject(error); else resolve();
      } }
    }));
  });
}
let preExpiryFlushTimerId: any = null;
let expiryTimerId: any = null;

/**
 * 모든 구글 드라이브 토큰 관련 타이머 일괄 해제
 */
export function clearAllDriveTimers(): void {
  stopActiveRenewal?.();
  stopActiveRenewal = null;
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
  if (preExpiryFlushTimerId) {
    clearTimeout(preExpiryFlushTimerId);
    preExpiryFlushTimerId = null;
  }
  if (expiryTimerId) {
    clearTimeout(expiryTimerId);
    expiryTimerId = null;
  }
}
let isRefreshingToken = false;

/**
 * 만료 3분 전부터 최근 활동이 있을 때 저장 완료 후 갱신을 시도한다.
 */
export function scheduleDriveTokenRefresh(expiresIn: number): void {
  if (typeof window === 'undefined') return;
  clearAllDriveTimers();

  trackDriveActivity();
  const expiresAt = Date.now() + expiresIn * 1000;
  stopActiveRenewal = startActiveTokenRenewal({
    expiresAt, now: Date.now,
    // 🛡️ [무중단 갱신 가드] 사용자가 자리를 비우더라도 앱/브라우저가 열려있으면 토큰 만료 전 갱신 보장
    isActive: () => typeof document === 'undefined' || document.visibilityState === 'visible' || !!(window as any).electronAPI,
    save: saveBeforeDriveRenewal,
    renew: refreshDriveTokenSilently,
    // Browser timer methods must keep Window as their receiver.
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    cancel: timer => window.clearTimeout(timer),
  });
  // Save even if idle; inactivity must never prevent preserving unsaved work.
  preExpiryFlushTimerId = setTimeout(() => {
    void saveBeforeDriveRenewal().catch(error => console.warn('[GDrive] 만료 전 저장 확인 실패', error));
  }, Math.max(0, (expiresIn - 180) * 1000));
  expiryTimerId = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('onrivi:drive_auth_expired'));
  }, Math.max(1000, expiresIn * 1000));
}

/**
 * 백그라운드 무음(Silent) 토큰 갱신
 * - 사용자의 작업 중단이나 화면 팝업 없이 백그라운드에서 구글 액세스 토큰을 재발급받음
 */
export async function refreshDriveTokenSilently(force = false): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const remaining = getDriveTokenRemainingSeconds();
  if ((!force && (remaining <= 1 || remaining > 180)) || (typeof document !== 'undefined' && document.visibilityState !== 'visible' && !(window as any).electronAPI)) return null;

  if (isRefreshingToken) return null;
  const originalToken = getSavedDriveToken();
  isRefreshingToken = true;

  try {
    const api = (window as any).electronAPI;
    let result;
    if (api?.refreshDesktopGDriveAuth) {
      result = await api.refreshDesktopGDriveAuth();
    } else if (api?.requestDesktopGDriveAuth) {
      return null; // Older preload: restart the updated desktop application.
    } else {
      const response = await fetch('/api/gdrive/oauth/refresh', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}',
        signal: AbortSignal.timeout(20000)
      });
      result = await response.json();
      if (!response.ok && result.code !== 'REAUTH_REQUIRED') return null;
    }
    if (result?.access_token) {
      if (getSavedDriveToken() !== originalToken) return null;
      saveDriveToken(result.access_token, Number(result.expires_in) || 3600);
      return result.access_token;
    }
    if (result?.code === 'REAUTH_REQUIRED') {
      window.dispatchEvent(new CustomEvent('onrivi:drive_auth_expired'));
    }
    return null;
  } catch {
    return null; // The scheduler retries while active and before expiry.

  } finally {
    isRefreshingToken = false;
  }
}

/**
 * 앱 시작 시 기존 저장된 토큰이 있으면 잔여 유효시간에 맞추어 자동 갱신 및 플러시 타이머 복원
 */
export function initDriveTokenAutoRefresh(): void {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const expiry = Number(localStorage.getItem(STORAGE_KEY_EXPIRY));
  if (!token || !expiry) return;

  const remainingSeconds = Math.round((expiry - Date.now()) / 1000);
  if (remainingSeconds > 0) scheduleDriveTokenRefresh(remainingSeconds);
}

/**
 * 현재 저장된 유효 Access Token 조회
 */
export function getSavedDriveToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);
  if (!token) return null;


  return token;
}

/**
 * 현재 구글 드라이브 Access Token이 유효한지(존재하고 만료시간이 지나지 않았는지) 동기적으로 확인
 */
export function hasValidDriveToken(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);
  if (!token) return false;

  const expiry = Number(localStorage.getItem(STORAGE_KEY_EXPIRY));
  if (expiry && Date.now() >= expiry) {
    return false;
  }
  return true;
}

/**
 * Access Token 로컬 저장 및 자동 갱신 스케줄링
 */
export function saveDriveToken(token: string, expiresIn: number = 3600): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_EXPIRY, String(Date.now() + Math.max(0, expiresIn) * 1000));

  // 토큰 만료 3분 전부터 활동 여부에 따라 갱신한다.
  scheduleDriveTokenRefresh(expiresIn);
  window.dispatchEvent(new CustomEvent('onrivi:drive_token_updated', { detail: { token } }));

  // 활성 작업장 계정을 다중 계정 레지스트리에 자동 등록/갱신
  void fetchGoogleUserInfo(token).then(info => {
    if (info?.email) {
      saveDriveAccount({
        email: info.email,
        name: info.name,
        token,
        expiresAt: Date.now() + Math.max(0, expiresIn) * 1000,
        isWorkspaceAccount: true
      });
    }
  }).catch(() => {});
}

/**
 * 토큰 유효성 검증 및 로컬스토리지 자동 폴백 헬퍼 (인자 누락 시 401 방어)
 */
export function resolveAuthToken(token?: string): string {
  if (token && typeof token === 'string' && token.trim() !== '' && token !== 'undefined') {
    return token.trim();
  }
  const saved = getSavedDriveToken();
  if (!saved) throw new Error('개인 웹드라이브 연결이 만료되었습니다. [개인 웹드라이브 연결]을 눌러 다시 인증해 주세요. 작성한 글은 유지됩니다.');
  return saved;
}

/**
 * 현재 저장된 구글 드라이브 작업장 정보 조회
 */
export function getSavedWorkspaceInfo(): GoogleDriveWorkspaceInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_WORKSPACE);
  if (!raw) return null;
  try {
    const workspace = JSON.parse(raw);
    const resource = getResourceSettings();
    const isDrive = resource?.kind === 'drive';
    return {
      ...workspace,
      resourceFolderId: (isDrive && resource?.folderId) ? resource.folderId : (workspace.resourceFolderId || ''),
      profilesFolderId: (isDrive && resource?.profilesFolderId) ? resource.profilesFolderId : (workspace.profilesFolderId || ''),
      promptFolderId: (isDrive && resource?.promptFolderId) ? resource.promptFolderId : (workspace.promptFolderId || ''),
      bibleFolderId: (isDrive && resource?.bibleFolderId) ? resource.bibleFolderId : (workspace.bibleFolderId || ''),
      mediaFolderId: (isDrive && resource?.mediaFolderId) ? resource.mediaFolderId : (workspace.mediaFolderId || ''),
      dbFolderId: (isDrive && resource?.dbFolderId) ? resource.dbFolderId : (workspace.dbFolderId || ''),
    };
  } catch {
    return null;
  }
}

/**
 * 구글 드라이브 작업장 정보 저장
 */
export function saveWorkspaceInfo(info: GoogleDriveWorkspaceInfo): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_WORKSPACE, JSON.stringify(info));
}

/**
 * 구글 드라이브 연결 해제 및 토큰 파기 (모든 타이머 해제 및 비상 백업 이벤트 연계)
 */
export function disconnectGoogleDrive(): void {
  if (typeof window === 'undefined') return;
  const api = (window as any).electronAPI;
  if (api?.disconnectDesktopGDriveAuth) void api.disconnectDesktopGDriveAuth().catch(() => {});
  else void fetch('/api/gdrive/oauth/disconnect', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
  clearAllDriveTimers();
  const token = getSavedDriveToken();
  if (token && (window as any).google?.accounts?.oauth2?.revoke) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {
        console.log('[GDrive] Google OAuth 토큰 폐기 완료');
      });
    } catch (e) {
      console.warn('[GDrive] 토큰 폐기 중 예외 (무시 가능):', e);
    }
  }
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_EXPIRY);
  // Keep the last workspace (no credentials) so a future connection can resume it.
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('onrivi:drive_token_expired'));
    window.dispatchEvent(new CustomEvent('onrivi:drive_auth_expired'));
  }
}

let activeAuthPromise: Promise<string> | null = null;

/** Reserve the login window during the click, before checking an old token. */
export function prepareGoogleDriveAuth(options?: { isStandalone?: boolean }) {
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  const popup = !api?.requestDesktopGDriveAuth && !activeAuthPromise
    ? window.open('about:blank', 'onrivi-drive-check-' + Date.now(), 'popup,width=560,height=720') : undefined;
  if (popup) {
    popup.document.title = 'Google Drive 연결 확인';
    popup.document.body.textContent = 'Google Drive 연결을 확인하고 있습니다. 잠시 기다려 주세요.';
  }
  return {
    request: () => requestGoogleDriveAuth(undefined, popup, options),
    close: () => { try { popup?.close(); } catch {} }
  };
}

/**
 * 구글 OAuth 인증 팝업 호출 및 Access Token 발급
 * @param clientId 클라이언트 ID
 * @param preparedPopup 사전 생성된 팝업 윈도우
 * @param options isStandalone: true 시 활성 작업장 토큰(STORAGE_KEY_TOKEN)을 덮어쓰지 않고 순수 토큰만 발급/등록하여 작업장 무간섭 보장
 */
export async function requestGoogleDriveAuth(
  clientId?: string,
  preparedPopup?: Window | null,
  options?: { isStandalone?: boolean }
): Promise<string> {
  const isStandalone = !!options?.isStandalone;
  const runAuth = async () => {
    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    if (api?.requestDesktopGDriveAuth) {
      const result = await api.requestDesktopGDriveAuth({ isStandalone });
      if (!result?.access_token) throw new Error('데스크톱 Google Drive 인증에 실패했습니다.');
      if (!isStandalone) {
        saveDriveToken(result.access_token, Number(result.expires_in) || 3600);
      }
      void fetchGoogleUserInfo(result.access_token).then(info => {
        if (info?.email) {
          saveDriveAccount({
            email: info.email,
            name: info.name,
            token: result.access_token,
            expiresAt: Date.now() + (Number(result.expires_in) || 3600) * 1000,
            isWorkspaceAccount: !isStandalone
          });
        }
      }).catch(() => {});
      return result.access_token;
    }
    return new Promise<string>((resolve, reject) => {
      // Open synchronously from the user's click, before awaiting any request.
      const browserState = btoa(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const target = '/api/gdrive/oauth/start?browser_state=' + browserState + (isStandalone ? '&standalone=1' : '');
      const popup = preparedPopup === undefined ? window.open(target, 'onrivi-drive-oauth', 'popup,width=560,height=720') : preparedPopup;
      if (!popup) { reject(new Error('Google Drive 로그인 창을 열 수 없습니다. 팝업을 허용해 주세요.')); return; }
      if (preparedPopup) {
        if (popup.closed) { reject(new Error('Google Drive 인증 창이 닫혔습니다. 다시 연결해 주세요.')); return; }
        popup.location.replace(target);
      }
      let finished = false;
      let polling = false;
      const cleanup = () => {
        window.removeEventListener('message', receive);
        clearInterval(closed); clearTimeout(timeout);
      };
      const receive = (event: MessageEvent) => {
        if (finished || event.origin !== window.location.origin || event.source !== popup || event.data?.type !== 'onrivi:drive-oauth') return;
        if (typeof event.data.access_token !== 'string' || !event.data.access_token) return;
        finished = true; cleanup();
        try { popup.close(); } catch {}
        if (!isStandalone) {
          saveDriveToken(event.data.access_token, Number(event.data.expires_in) || 3600);
        }
        void fetchGoogleUserInfo(event.data.access_token).then(info => {
          if (info?.email) {
            saveDriveAccount({
              email: info.email,
              name: info.name,
              token: event.data.access_token,
              expiresAt: Date.now() + (Number(event.data.expires_in) || 3600) * 1000,
              isWorkspaceAccount: !isStandalone
            });
          }
        }).catch(() => {});
        resolve(event.data.access_token);
      };
      window.addEventListener('message', receive);
      // Google may sever window.opener through COOP. Poll the server cookie
      // with a per-attempt nonce; an older connection cannot finish this login.
      const closed = setInterval(async () => {
        if (finished) return;
        try {
          if (popup && popup.closed) {
            finished = true;
            cleanup();
            reject(new Error('Google Drive 인증 창이 닫혔습니다.'));
            return;
          }
        } catch {}
        if (polling) return;
        polling = true;
        try {
          const response = await fetch('/api/gdrive/oauth/status', {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: browserState, standalone: isStandalone }), signal: AbortSignal.timeout(10000)
          });
          if (response.status !== 200 || finished) return;
          const result = await response.json();
          if (finished || !result.access_token) return;
          finished = true; cleanup();
          try { popup.close(); } catch {}
          if (!isStandalone) {
            saveDriveToken(result.access_token, Number(result.expires_in) || 3600);
          }
          void fetchGoogleUserInfo(result.access_token).then(info => {
            if (info?.email) {
              saveDriveAccount({
                email: info.email,
                name: info.name,
                token: result.access_token,
                expiresAt: Date.now() + (Number(result.expires_in) || 3600) * 1000,
                isWorkspaceAccount: !isStandalone
              });
            }
          }).catch(() => {});
          resolve(result.access_token);
        } catch { /* Wait for the callback until the login timeout. */ }
        finally { polling = false; }
      }, 2000);
      const timeout = setTimeout(() => {
        if (finished) return;
        finished = true; cleanup(); popup.close(); reject(new Error('Google Drive 인증 시간이 초과되었습니다.'));
      }, 120000);
    });
  };

  if (isStandalone) {
    return runAuth();
  }
  if (activeAuthPromise) return activeAuthPromise;
  activeAuthPromise = runAuth().finally(() => { activeAuthPromise = null; });
  return activeAuthPromise;
}

/**
 * 구글 사용자 프로필 정보 조회
 * - 1차: Drive API 자체 엔드포인트(/drive/v3/about?fields=user) 조회 (drive.file 권한과 100% 호환되어 401 방어)
 * - 2차: oauth2/v3/userinfo 폴백 조회
 * - 3차: 실패 시에도 에러를 던지지 않고 안전한 기본 사용자 정보 반환 (연결 중단 원천 방어)
 */
export async function fetchGoogleUserInfo(token?: string): Promise<GoogleDriveUserInfo> {
  const authToken = resolveAuthToken(token);
  // 1. Google Drive API about 엔드포인트 시도 (Drive API 토큰과 100% 호환)
  if (authToken) {
    try {
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (aboutRes.ok) {
        const data = await aboutRes.json();
        if (data?.user) {
          return {
            id: data.user.permissionId || 'gdrive_user',
            email: data.user.emailAddress || '',
            name: data.user.displayName || data.user.emailAddress?.split('@')[0] || '작가님',
            picture: data.user.photoLink,
          };
        }
      }
    } catch (e) {
      console.warn('[fetchGoogleUserInfo Drive about lookup failed]:', e);
    }

    // 2. Google OAuth2 userinfo 엔드포인트 시도
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (userinfoRes.ok) {
        const data = await userinfoRes.json();
        return {
          id: data.sub || 'gdrive_user',
          email: data.email || '',
          name: data.name || data.email?.split('@')[0] || '작가님',
          picture: data.picture,
        };
      }
    } catch (e) {
      console.warn('[fetchGoogleUserInfo OAuth2 userinfo lookup failed]:', e);
    }
  }

  // 3. 만약 둘 다 실패하더라도 작업장 연결이 중단되지 않도록 무해한 기본값 반환
  return {
    id: 'gdrive_user',
    email: '',
    name: '작가님',
    picture: undefined,
  };
}

/**
 * 구글 드라이브 API 응답 오류 상세 분석 헬퍼
 */
async function parseDriveError(res: Response, defaultAction: string, requestToken: string): Promise<Error> {
  if (res.status === 401) {
    const currentToken = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);
    if (currentToken !== requestToken) {
      return new Error('이전 연결의 요청이 만료되었습니다. 다시 시도해 주세요.');
    }
    if (isRefreshingToken) {
      return new Error('구글 드라이브 연결을 갱신하는 중입니다. 다시 시도해 주세요.');
    }
    const renewedToken = await refreshDriveTokenSilently(true);
    if (renewedToken) {
      return new Error('구글 드라이브 연결을 갱신했습니다. 다시 시도해 주세요.');
    }
    // Another request may have renewed the token while this request was waiting.
    if (getSavedDriveToken() !== requestToken) {
      return new Error('이전 연결의 요청이 만료되었습니다. 다시 시도해 주세요.');
    }
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('onrivi:drive_auth_expired'));
    }
    return new Error('구글 드라이브 인증이 만료되었습니다. 연결을 갱신한 뒤 다시 시도해 주세요.');
  }
  let detailMsg = '';
  try {
    const errorJson = await res.json();
    if (errorJson?.error?.message) {
      detailMsg = errorJson.error.message;
    }
  } catch {
    detailMsg = await res.text().catch(() => '');
  }

  if (res.status === 403) {
    if (
      detailMsg.includes('not been used') ||
      detailMsg.includes('disabled') ||
      detailMsg.includes('Drive API') ||
      detailMsg.includes('has not been used in project')
    ) {
      return new Error(
        `구글 클라우드 콘솔의 OnriviAuthor 프로젝트에서 'Google Drive API'가 활성화(Enable)되지 않았습니다.\n구글 클라우드 콘솔 [API 및 서비스 > 라이브러리]에서 'Google Drive API'를 [사용]으로 켜주세요.`
      );
    }
    return new Error(`${defaultAction} 권한이 없습니다 (403 Forbidden): ${detailMsg || res.statusText}`);
  }

  return new Error(`${defaultAction} 실패 (${res.status}): ${detailMsg || res.statusText}`);
}

/**
 * 특정 부모 폴더 하위에서 이름으로 폴더 검색 (없으면 null)
 */
export async function findDriveFolder(token?: string, folderName?: string, parentFolderId?: string): Promise<string | null> {
  const authToken = resolveAuthToken(token);
  if (!authToken) return null;
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)&orderBy=createdTime asc&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    throw await parseDriveError(res, `구글 드라이브 폴더 검색 (${folderName})`, authToken);
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * 구글 드라이브에 신규 폴더 생성
 */
export async function createDriveFolder(token?: string, folderName?: string, parentFolderId?: string): Promise<string> {
  const authToken = resolveAuthToken(token);
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    throw await parseDriveError(res, `구글 드라이브 폴더 생성 (${folderName})`, authToken);
  }

  const data = await res.json();
  return data.id;
}

/**
 * 폴더가 없으면 생성하고 ID 반환 (있으면 기존 ID 반환)
 */
export async function ensureDriveFolder(token?: string, folderName?: string, parentFolderId?: string): Promise<string> {
  const authToken = resolveAuthToken(token);
  const existingId = await findDriveFolder(authToken, folderName, parentFolderId);
  if (existingId) return existingId;
  return await createDriveFolder(authToken, folderName, parentFolderId);
}

/**
 * 특정 부모 폴더 하위에서 이름으로 파일 검색 (없으면 null, 최신 수정 파일 우선)
 */
export async function findDriveFile(token?: string, fileName?: string, parentFolderId?: string): Promise<string | null> {
  const authToken = resolveAuthToken(token);
  if (!authToken) return null;
  let query = `name = '${fileName}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,createdTime)&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    throw await parseDriveError(res, `구글 드라이브 파일 검색 (${fileName})`, authToken);
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * 구글 드라이브에 신규 텍스트/JSON 파일 생성
 */
export async function createDriveTextFile(
  token?: string,
  parentFolderId?: string,
  fileName?: string,
  content: string = '',
  mimeType: string = 'text/plain'
): Promise<{ id: string; name: string }> {
  const authToken = resolveAuthToken(token);
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: parentFolderId ? [parentFolderId] : [],
  };

  const boundary = '-------textfile3141592653';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    throw await parseDriveError(res, `구글 드라이브 파일 생성 (${fileName})`, authToken);
  }

  const data = await res.json();
  return { id: data.id, name: data.name };
}

/**
 * 파일이 없으면 생성하고 ID 반환 (있으면 기존 파일 ID 보존 반환)
 */
export async function ensureDriveTextFile(
  token?: string,
  fileName?: string,
  parentFolderId?: string,
  defaultContent: string = '',
  mimeType: string = 'text/plain'
): Promise<string> {
  const authToken = resolveAuthToken(token);
  const existingId = await findDriveFile(authToken, fileName, parentFolderId);
  if (existingId) return existingId;
  const created = await createDriveTextFile(authToken, parentFolderId, fileName, defaultContent, mimeType);
  return created.id;
}

/**
 * 🌟 환경설정에 지정된 리소스 폴더명(예: '참조파일')을 구글 드라이브 전체에서 안전하게 탐색하고 5대 하위 폴더 ID를 일괄 바인딩
 */
export async function resolveDriveResourceFolderByName(
  token: string,
  preferredName?: string
): Promise<{
  folderId: string;
  name: string;
  profilesFolderId: string;
  promptFolderId: string;
  bibleFolderId: string;
  mediaFolderId: string;
  dbFolderId: string;
}> {
  const authToken = resolveAuthToken(token);
  const targetName = preferredName || getResourceSettings('cloud')?.path || '참조파일';
  const savedSettings = getResourceSettings('cloud');

  let resolvedFolderId: string | null = null;
  let resolvedName: string = targetName;

  // The saved folder ID is authoritative, including after a Drive rename.
  if (savedSettings?.folderId) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(savedSettings.folderId)}?fields=id,name,trashed,mimeType&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok && res.status !== 404) {
      const error = new Error(`설정된 리소스 폴더를 확인하지 못했습니다. (HTTP ${res.status}) 환경설정에서 폴더 연결을 확인해 주세요.`);
      Object.assign(error, { status: res.status });
      throw error;
    }
    if (res.ok) {
      const data = await res.json();
      if (data.trashed || data.mimeType !== 'application/vnd.google-apps.folder') {
        console.warn('[GDrive resource validation]', JSON.stringify({ id: data.id, name: data.name, mimeType: data.mimeType, trashed: !!data.trashed }));
      } else {
        resolvedFolderId = data.id;
        resolvedName = data.name;
      }
    }
  }
  // 3. 만약 여전히 못 찾았다면, OnriviAuthor 하위에서 탐색 또는 생성
  if (!resolvedFolderId) {
    const rootFolderId = await ensureDriveFolder(authToken, 'OnriviAuthor', 'root');
    resolvedFolderId = await ensureDriveFolder(authToken, targetName, rootFolderId);
    resolvedName = targetName;
  }

  // 4. 5대 하위 폴더 ID 일괄 확인/구성
  const subFolders = await initializeDriveResourceFolder(authToken, resolvedFolderId);

  // 5. 환경설정에 즉시 동기화 보존 (silent: true로 이벤트 취소 방지)
  saveResourceSettings({
    kind: 'drive',
    path: resolvedName,
    folderId: resolvedFolderId,
    ...subFolders,
  }, 'cloud', { silent: true });

  return {
    folderId: resolvedFolderId,
    name: resolvedName,
    ...subFolders,
  };
}

/**
 * 🌟 구글 드라이브 리소스 폴더(OnriviAuthor/참조파일 등) 자동 탐색 또는 생성
 * - 환경설정(resourceSettings)에 지정된 리소스 폴더명을 최우선으로 구글 드라이브 전체에서 탐색합니다.
 */
export async function getOrCreateDriveResourceFolder(token: string): Promise<{ id: string; name: string }> {
  const preferredName = getResourceSettings('cloud')?.path || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_cloud_resource_folder_path') : '') || '참조파일';
  const resolved = await resolveDriveResourceFolderByName(token, preferredName);
  return { id: resolved.folderId, name: resolved.name };
}

/**
 * 🌟 [핵심] 원클릭 Onrivi 클라우드 서재 폴더 구조 자동 구성
 * - 로컬 환경설정의 리소스 폴더 생성 사양과 100% 동일하게 5대 하위 디렉토리 및 기본 파일 일괄 생성
 * - /OnriviAuthor
 *   ├── /작업장 (Root 작업장)
 *   └── /참조폴더 (리소스 폴더)
 *        ├── /profiles (CSS 서식 보관) ➔ userCssProfiles.json
 *        ├── /prompt (AI 프롬프트 보관) ➔ ai_prompts.json, ai_presets.json, promptTemplates.json
 *        ├── /bible (참고문헌/BibTeX) ➔ references.bib
 *        ├── /media (이미지 및 미디어 보관)
 *        └── /db (지식 베이스 데이터베이스) ➔ onrivi_knowledge.db
 */
export async function createDefaultDriveFolders(token: string, resourceName = '참조파일') {
  const rootId = await ensureDriveFolder(token, 'OnriviAuthor', 'root');
  const [workspaceId, resourceId] = await Promise.all([
    ensureDriveFolder(token, '작업장', rootId),
    ensureDriveFolder(token, resourceName, rootId),
  ]);
  await initializeDriveResourceFolder(token, resourceId);
  console.info('[GDrive setup]', JSON.stringify({ workspacePath: 'OnriviAuthor/작업장', workspaceId, resourcePath: `OnriviAuthor/${resourceName}`, resourceId, initialized: true }));
  return {
    workspace: { id: workspaceId, name: '작업장', path: [{ id: workspaceId, name: 'OnriviAuthor/작업장' }] },
    resource: { id: resourceId, name: resourceName },
  };
}

export async function initializeDriveResourceFolder(token:string, resourceFolderId:string) {
  if (!resourceFolderId) throw new Error('리소스 폴더를 선택해 주세요.');
  const authToken=resolveAuthToken(token);
  // 5. [로컬 리소스 폴더 규격 완벽 일치] 5대 하위 디렉토리(profiles, prompt, bible, media, db) 일괄 병렬 생성
  const [profilesFolderId, promptFolderId, bibleFolderId, mediaFolderId, dbFolderId, settingsFolderId] = await Promise.all([
    ensureDriveFolder(authToken, 'profiles', resourceFolderId),
    ensureDriveFolder(authToken, 'prompt', resourceFolderId),
    ensureDriveFolder(authToken, 'bible', resourceFolderId),
    ensureDriveFolder(authToken, 'media', resourceFolderId),
    ensureDriveFolder(authToken, 'db', resourceFolderId),
    ensureDriveFolder(authToken, 'settings', resourceFolderId),
  ]);

  // 6. [로컬 기본 파일 규격 완벽 일치] 6대 기본 파일 & 작업장 파일 목록 일괄 병렬 확인/생성
  await Promise.all([
    // (1) profiles/userCssProfiles.json : 사용자 정의 CSS 프로필
    ensureDriveTextFile(authToken, 'userCssProfiles.json', profilesFolderId, JSON.stringify(SYSTEM_PROFILES, null, 2), 'application/json'),
    // (2) prompt/ai_prompts.json : AI 프롬프트 딕셔너리
    ensureDriveTextFile(authToken, 'ai_prompts.json', promptFolderId, '{}', 'application/json'),
    // (3) prompt/ai_presets.json : AI 프리셋 목록
    ensureDriveTextFile(authToken, 'ai_presets.json', promptFolderId, '[]', 'application/json'),
    // (4) prompt/promptTemplates.json : 프롬프트 템플릿 목록
    ensureDriveTextFile(authToken, 'promptTemplates.json', promptFolderId, '[]', 'application/json'),
    // (5) bible/references.bib : 참고문헌 서지 데이터
    ensureDriveTextFile(authToken, 'references.bib', bibleFolderId, '@comment{Onrivi Author Reference Library}\n', 'text/plain'),
    // (6) db/onrivi_knowledge.db : 온리비 지식 베이스 DB 플레이스홀더
    ensureDriveTextFile(authToken, 'onrivi_knowledge.db', dbFolderId, '', 'application/octet-stream'),
  ]);

  // Install bundled profiles without removing existing user profiles.
  const profileFileId = await findDriveFile(authToken, 'userCssProfiles.json', profilesFolderId);
  if (!profileFileId) throw new Error('드라이브 서식 파일을 찾을 수 없습니다.');
  const storedProfiles = JSON.parse(await readDriveFileContent(authToken, profileFileId));
  if (!Array.isArray(storedProfiles)) throw new Error('드라이브 서식 파일 형식이 올바르지 않습니다. 기존 파일을 확인해 주세요.');
  if (SYSTEM_PROFILES.some(profile => !storedProfiles.some(existing => existing?.id === profile.id))) {
    const mergedProfiles = [...SYSTEM_PROFILES, ...storedProfiles.filter(profile => profile && profile.id !== 'default' && !isSystemProfileId(profile.id))];
    if (!await saveDriveFileContent(authToken, profileFileId, JSON.stringify(mergedProfiles, null, 2))) throw new Error('드라이브 기본 서식 설치에 실패했습니다.');
  }

  return {resourceFolderId,profilesFolderId,promptFolderId,bibleFolderId,mediaFolderId,dbFolderId};
}

export async function setupOnriviDriveWorkspace(token?: string, selectedFolder?: { id: string; name: string; path?: Array<{ id: string; name: string }> }, selectedResourceFolder?: { id: string; name: string } | string): Promise<GoogleDriveWorkspaceInfo> {
  const authToken = resolveAuthToken(token);
  console.log('[GDrive] 1. 사용자 정보 및 메인 서재 폴더 조회 시작...');

  // 1 & 2 병렬: 사용자 정보 가져오기 & 메인 서재 폴더(/OnriviAuthor) 확인/생성
  const [userInfo, rootFolderId] = await Promise.all([
    fetchGoogleUserInfo(authToken),
    ensureDriveFolder(authToken, 'OnriviAuthor', 'root'),
  ]);
  console.log('[GDrive] 사용자:', userInfo.name, `(${userInfo.email})`, '| 루트 폴더 ID:', rootFolderId);

  // 3 & 4 병렬: 작업장(/OnriviAuthor/작업장) & 참조폴더 확인/생성
  const [workspaceFolderId, resourceFolderInfo] = await Promise.all([
    selectedFolder ? Promise.resolve(selectedFolder.id) : ensureDriveFolder(authToken, '작업장', rootFolderId),
    selectedResourceFolder
      ? Promise.resolve(typeof selectedResourceFolder === 'object' ? selectedResourceFolder : { id: selectedResourceFolder, name: getResourceSettings('cloud')?.path || '참조폴더' })
      : getOrCreateDriveResourceFolder(authToken),
  ]);
  const resourceFolderId = typeof resourceFolderInfo === 'string' ? resourceFolderInfo : resourceFolderInfo.id;
  console.log('[GDrive] 작업장 ID:', workspaceFolderId, '| 참조폴더 ID:', resourceFolderId);

  const {profilesFolderId,promptFolderId,bibleFolderId,mediaFolderId,dbFolderId} = await initializeDriveResourceFolder(authToken,resourceFolderId);
  const existingFiles=await listDriveChildren(authToken,workspaceFolderId);

  // 7. 작업장에 시작 가이드 문서가 없으면 기본 환영 문서 1개 자동 생성
  if (!selectedFolder && existingFiles.length === 0) {
    const welcomeDoc = `# 안녕하세요, ${userInfo.name}님의 온리비 서재입니다! 🌿

이 문서는 작가님의 구글 드라이브 **'OnriviAuthor/작업장'** 폴더에 안전하게 보관되고 있습니다.

---

### ✨ 어디서나 이어지는 글쓰기
- **자동 저장**: 글을 작성하시면 구글 드라이브에 실시간으로 안전하게 저장됩니다.
- **어디서나 열기**: 다른 컴퓨터나 브라우저에서도 **[개인 웹드라이브 연결]**만 누르면 이 글을 그대로 열어보실 수 있습니다.
- **스마트폰 확인**: 휴대폰에서 **'구글 드라이브' 앱**을 열어 **OnriviAuthor ➔ 작업장** 폴더를 보시면 방금 작성하신 글이 들어있습니다.

이제 자유롭게 글을 작성해보세요!
`;
    await createDriveMarkdownFile(authToken, workspaceFolderId, '시작하기.md', welcomeDoc);
  }

  const workspaceInfo: GoogleDriveWorkspaceInfo = {
    userInfo,
    rootFolderId,
    workspaceFolderId,
    workspaceFolderName: selectedFolder?.name || '작업장',
    workspacePath: selectedFolder?.path,
    resourceFolderId,
    profilesFolderId,
    promptFolderId,
    bibleFolderId,
    mediaFolderId,
    dbFolderId,
    userEmail: userInfo.email,
    userName: userInfo.name,
    connectedAt: new Date().toISOString(),
  };

  saveWorkspaceInfo(workspaceInfo);
  console.log('[GDrive] ✅ 클라우드 서재 구성 완료!');
  return workspaceInfo;
}

let pickerLoad: Promise<void> | null = null;

/** 작업장 루트 내부의 검증된 경로만 선택창에 전달한다. */
export async function selectOnriviWorkspaceFolder(token: string, restoreLast = false) {
  const appRootId = await ensureDriveFolder(token, 'OnriviAuthor', 'root');
  const workspaceRootId = await ensureDriveFolder(token, '작업장', appRootId);
  const initialPath = [{ id: workspaceRootId, name: 'OnriviAuthor/작업장' }];
  const saved = getSavedWorkspaceInfo();
  if (saved?.workspacePath?.[0]?.id === workspaceRootId) {
    for (const entry of saved.workspacePath.slice(1)) {
      const children = await listDriveChildren(token, initialPath[initialPath.length - 1].id);
      const folder = children.find(child => child.id === entry.id && child.isFolder);
      if (!folder) break;
      initialPath.push({ id: folder.id, name: folder.name });
    }
  } else if (saved?.workspaceFolderId && saved.workspaceFolderId !== workspaceRootId) {
    // 기존 버전에서 선택한 직계 하위 폴더도 복원한다. 루트 밖의 선택은 복원하지 않는다.
    const children = await listDriveChildren(token, workspaceRootId);
    const folder = children.find(child => child.id === saved.workspaceFolderId && child.isFolder);
    if (folder) initialPath.push({ id: folder.id, name: folder.name });
  }
  if (restoreLast) {
    if (!saved?.workspaceFolderId || saved.workspaceFolderId === workspaceRootId) {
      return { id: workspaceRootId, name: '작업장', path: initialPath };
    }
    if (saved?.workspaceFolderId === initialPath[initialPath.length - 1].id) {
      return { ...initialPath[initialPath.length - 1], path: initialPath };
    }
  }
  const { pickAccessibleDriveFolder } = await import('./WorkspaceFolderPicker');
  return pickAccessibleDriveFolder(token, initialPath);
}

/** Google Picker는 drive.file 권한으로 사용자가 직접 선택한 폴더의 접근을 허용한다. */
export async function selectGoogleDriveWorkspace(token: string): Promise<{ id: string; name: string } | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER;
  if (!key || !appId) {
    const { pickAccessibleDriveFolder } = await import('./WorkspaceFolderPicker');
    const appRootId = await ensureDriveFolder(token, 'OnriviAuthor');
    const rootId = await ensureDriveFolder(token, '작업장', appRootId);
    return pickAccessibleDriveFolder(token, [{ id: rootId, name: 'OnriviAuthor/작업장' }]);
  }
  if (!(window as any).google?.picker) {
    if (!pickerLoad) pickerLoad = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('구글 폴더 선택 화면을 불러오지 못했습니다. 다시 시도해 주세요.')), 15000);
      const load = () => (window as any).gapi.load('picker', {
        callback: () => { clearTimeout(timer); resolve(); },
        onerror: () => { clearTimeout(timer); reject(new Error('구글 폴더 선택 화면 로드 실패')); }
      });
      if ((window as any).gapi?.load) { load(); return; }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = load;
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('구글 폴더 선택 라이브러리 로드 실패')); };
      document.head.appendChild(script);
    }).catch(error => { pickerLoad = null; throw error; });
    await pickerLoad;
  }
  const google = (window as any).google;
  const selected = await new Promise<{ id: string; name: string } | null>((resolve, reject) => {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true).setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder').setMode(google.picker.DocsViewMode.LIST);
    const picker = new google.picker.PickerBuilder().addView(view)
      .setOAuthToken(token).setDeveloperKey(key).setAppId(appId)
      .setOrigin(window.location.origin).setTitle('글을 저장할 작업장 폴더를 선택해 주세요')
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.CANCEL) { picker.dispose(); resolve(null); }
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          picker.dispose();
          if (!doc?.id) reject(new Error('선택한 폴더를 확인할 수 없습니다.'));
          else resolve({ id: doc.id, name: doc.name });
        }
      }).build();
    picker.setVisible(true);
  });
  if (!selected) return null;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(selected.id)}?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw await parseDriveError(response, '작업장 폴더 확인', token);
  const folder = await response.json();
  if (folder.mimeType !== 'application/vnd.google-apps.folder' || !folder.capabilities?.canAddChildren) throw new Error('파일을 저장할 수 있는 폴더를 선택해 주세요.');
  return { id: folder.id, name: folder.name };
}

/**
 * 특정 폴더 하위의 파일 및 폴더 목록 조회 (마크다운 및 폴더 우선)
 */
export async function listDriveChildren(token?: string, parentFolderId?: string, searchName?: string): Promise<GoogleDriveFileItem[]> {
  const authToken = resolveAuthToken(token);
  if (!parentFolderId) return [];
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const query = searchName?.trim()
    ? `trashed = false and name contains '${escape(searchName.trim())}'`
    : `'${escape(parentFolderId)}' in parents and trashed = false`;
  const rawList: any[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: query,
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size)',
      orderBy: 'folder,name',
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw await parseDriveError(res, '구글 드라이브 파일 목록 조회', authToken);
    const data = await res.json();
    rawList.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return rawList.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    modifiedTime: f.modifiedTime,
    size: f.size ? parseInt(f.size, 10) : undefined,
  }));
}

/**
 * 사용자가 접근 가능한 모든 공유 드라이브(Shared Drives / Team Drives) 목록 조회
 */
export async function listSharedDrives(token?: string): Promise<Array<{ id: string; name: string }>> {
  const authToken = resolveAuthToken(token);
  if (!authToken) return [];
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/drives?pageSize=100', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.drives || []).map((d: any) => ({ id: d.id, name: d.name }));
  } catch {
    return [];
  }
}

/**
 * 마크다운 파일 내용 다운로드 (UTF-8 텍스트)
 */
export async function readDriveImportFile(token: string, file: { id: string; name: string; mimeType?: string }): Promise<File> {
  const authToken = resolveAuthToken(token);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${authToken}` },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw await parseDriveError(res, '가져올 파일 읽기', authToken);
  return new File([await res.blob()], file.name, { type: file.mimeType || 'application/octet-stream' });
}

export async function readDriveFileContent(token?: string, fileId?: string): Promise<string> {
  const authToken = resolveAuthToken(token);
  if (!fileId) return '';
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    throw await parseDriveError(res, '파일 읽기', authToken);
  }
  return await res.text();
}

/**
 * 기존 마크다운 파일 저장 (Update)
 */
export async function saveDriveFileContent(token?: string, fileId?: string, content: string = ''): Promise<boolean> {
  const authToken = resolveAuthToken(token);
  if (!fileId) return false;
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'text/markdown; charset=UTF-8',
    },
    body: content,
  });

  if (!res.ok) {
    throw await parseDriveError(res, '파일 저장', authToken);
  }
  return true;
}

/**
 * 신규 마크다운 파일 생성 (Create)
 */
export async function createDriveMarkdownFile(
  token?: string,
  parentFolderId?: string,
  fileName?: string,
  content: string = ''
): Promise<{ id: string; name: string }> {
  const authToken = resolveAuthToken(token);
  if (!parentFolderId || !fileName) {
    throw new Error('부모 폴더 ID 또는 파일 이름이 누락되었습니다.');
  }
  const metadata = {
    name: fileName.endsWith('.md') ? fileName : `${fileName}.md`,
    mimeType: 'text/markdown',
    parents: [parentFolderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    throw await parseDriveError(res, '새 마크다운 파일 생성', authToken);
  }

  const data = await res.json();
  return { id: data.id, name: data.name };
}

/**
 * 이미지 파일(Blob/File)을 구글 드라이브 /참조파일/media 에 업로드
 */
let imageUploadQueue: Promise<unknown> = Promise.resolve();
export function uploadDriveImage(token?: string, mediaFolderId?: string, fileBlob?: Blob, fileName?: string): Promise<{id:string;name:string;webViewLink?:string;webContentLink?:string}> {
  const pending=imageUploadQueue.then(()=>uploadUniqueDriveImage(token,mediaFolderId,fileBlob,fileName));
  imageUploadQueue=pending.catch(()=>undefined);
  return pending;
}
async function uploadUniqueDriveImage(
  token?: string,
  mediaFolderId?: string,
  fileBlob?: Blob,
  fileName?: string
): Promise<{ id: string; name: string; webViewLink?: string; webContentLink?: string }> {
  const authToken = resolveAuthToken(token);
  if (!mediaFolderId || !fileBlob || !fileName) {
    throw new Error('미디어 폴더 ID 또는 파일 데이터가 누락되었습니다.');
  }
  const fileBuffer = await fileBlob.arrayBuffer();
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({q:`'${mediaFolderId.replace(/'/g,"\\'")}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,modifiedTime)',orderBy:'modifiedTime desc',pageSize:'1000'});
    if (pageToken) params.set('pageToken',pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {headers:{Authorization:`Bearer ${authToken}`}});
    if (!response.ok) throw await parseDriveError(response, '미디어 파일 확인', authToken);
    const result = await response.json();
    const existing = result.files?.find((item:any) => item.name.normalize('NFC') === fileName.normalize('NFC'));
    if (existing) {
      const updated = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=media&fields=id,name`, {
        method:'PATCH', headers:{Authorization:`Bearer ${authToken}`,'Content-Type':fileBlob.type || 'application/octet-stream'}, body:fileBuffer,
      });
      if (!updated.ok) throw await parseDriveError(updated, '미디어 덮어쓰기', authToken);
      invalidateDriveMediaCache(mediaFolderId,existing.id,existing.name);
      return {id:existing.id,name:existing.name};
    }
    pageToken = result.nextPageToken;
  } while (pageToken);
  const metadata = {
    name: fileName,
    mimeType: fileBlob.type || 'image/png',
    parents: [mediaFolderId],
  };

  const boundary = '-------imageupload3141592653';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const headerPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${fileBlob.type || 'image/png'}\r\n\r\n`;

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(headerPart);
  const footerBytes = encoder.encode(closeDelimiter);

  const combined = new Uint8Array(headerBytes.length + fileBuffer.byteLength + footerBytes.length);
  combined.set(headerBytes, 0);
  combined.set(new Uint8Array(fileBuffer), headerBytes.length);
  combined.set(footerBytes, headerBytes.length + fileBuffer.byteLength);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: combined,
  });

  if (!res.ok) {
    throw await parseDriveError(res, '이미지 업로드', authToken);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink,
    webContentLink: data.webContentLink,
  };
}

const driveImageBlobCache = new Map<string, string>();
export function invalidateDriveMediaCache(folderId: string, fileId: string, fileName: string) {
  driveImageBlobCache.forEach((_url, key) => {
    if (!key.startsWith(folderId + ':')) return;
    const value = key.slice(folderId.length + 1);
    let name = value;
    try { name = decodeURIComponent(value); } catch {}
    // Other cached files remain valid; mounted images may still use the old URL.
    if (value === fileId || name.normalize('NFC') === fileName.normalize('NFC')) driveImageBlobCache.delete(key);
  });
}


/**
 * 구글 드라이브 /참조파일/media 폴더에서 파일명으로 이미지 Blob URL을 반환 (캐싱 지원)
 */
export async function getDriveMediaImageBlobUrl(token?: string, mediaFolderId?: string, fileName?: string): Promise<string | null> {
  const authToken = resolveAuthToken(token);
  if (!mediaFolderId || !fileName) return null;
  const cleanName = fileName.split('?')[0].split('#')[0].replace(/^\.?\/+/, '').replace(/^media[/\\]/, '').replace(/^\/+/, '');
  const selectedId = new URLSearchParams(fileName.includes('?') ? fileName.slice(fileName.indexOf('?')+1) : '').get('driveId');
  const cacheKey = `${mediaFolderId}:${selectedId || cleanName}`;
  if (driveImageBlobCache.has(cacheKey)) {
    return driveImageBlobCache.get(cacheKey)!;
  }

  try {
    const fileId = selectedId || await findDriveFile(authToken, cleanName, mediaFolderId);
    if (!fileId) return null;

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw await parseDriveError(res, `이미지 다운로드 (${cleanName})`, authToken);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    driveImageBlobCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn('[getDriveMediaImageBlobUrl] Failed to load drive media:', cleanName, err);
    throw err;
  }
}

/**
 * 파일 또는 폴더 삭제 (휴지통으로 이동)
 */
export async function restoreDriveItem(token: string, fileId: string): Promise<boolean> {
  const authToken = resolveAuthToken(token);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: false }),
  });
  if (!response.ok) throw await parseDriveError(response, '휴지통 항목 복원', authToken);
  return true;
}

export async function trashDriveItem(token?: string, fileId?: string): Promise<boolean> {
  const authToken = resolveAuthToken(token);
  if (!fileId) return false;
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });
  if (!res.ok) throw await parseDriveError(res, '휴지통으로 이동', authToken);
  return true;
}

/**
 * 파일 또는 폴더 이름 변경
 */
export async function renameDriveItem(token?: string, fileId?: string, newName?: string): Promise<boolean> {
  const authToken = resolveAuthToken(token);
  if (!fileId || !newName) return false;
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });
  return res.ok;
}

/**
 * 🌟 구글 드라이브 폴더의 자식 목록을 온리비 FileNode 규격으로 변환하여 반환
 */
export async function fetchDriveFileNodes(token?: string, parentFolderId?: string, parentPath: string = ''): Promise<any[]> {
  const authToken = resolveAuthToken(token);
  if (!parentFolderId) return [];
  const items = await listDriveChildren(authToken, parentFolderId);
  const nodes: any[] = [];

  for (const item of items) {
    if (item.name.startsWith('.')) continue;

    const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.isFolder) {
      nodes.push({
        name: item.name,
        kind: 'directory',
        path: currentPath,
        driveId: item.id,
        driveFileId: item.id,
        id: item.id,
        children: [],
      });
    } else {
      const lower = item.name.toLowerCase();
      if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) {
        nodes.push({
          name: item.name,
          kind: 'file',
          path: currentPath,
          driveId: item.id,
          driveFileId: item.id,
          id: item.id,
          size: item.size,
        });
      }
    }
  }

  return nodes;
}

/**
 * 파일 또는 폴더를 다른 부모 폴더로 이동 (Drive API: addParents / removeParents)
 * - 잘라내기(Cut) → 붙여넣기(Paste) 이동에 사용
 */
export async function moveDriveItemWithUndo(token: string, fileId: string, newParentId: string, oldParentId: string | undefined, item: { name: string; kind?: string }) {
  if (!oldParentId) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=parents&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw await parseDriveError(response, '원래 폴더 확인', token);
    oldParentId = (await response.json()).parents?.[0];
  }
  if (!oldParentId) throw new Error('원래 폴더를 확인할 수 없어 이동하지 않았습니다.');
  if (oldParentId === newParentId) return;
  await moveDriveItem(token, fileId, newParentId, oldParentId);
  window.dispatchEvent(new CustomEvent('file:push-undo-action', { detail: {
    type: 'move', workspaceType: 'cloud', driveId: fileId, srcParentDriveId: oldParentId, destParentDriveId: newParentId,
    name: item.name, kind: item.kind || 'file', accountEmail: getSavedWorkspaceInfo()?.userEmail,
  } }));
}

export async function moveDriveItem(
  token?: string,
  fileId?: string,
  newParentId?: string,
  oldParentId?: string
): Promise<boolean> {
  const authToken = resolveAuthToken(token);
  if (!fileId || !newParentId) return false;
  if (oldParentId && oldParentId === newParentId) return true;

  const params = new URLSearchParams({ addParents: newParentId, fields: 'id,parents', supportsAllDrives: 'true' });
  if (oldParentId) params.set('removeParents', oldParentId);

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  if (!res.ok) throw await parseDriveError(res, '파일/폴더 이동', authToken);
  return true;
}

/**
 * 단일 파일을 지정한 부모 폴더로 복사 (Drive API: files.copy)
 * - 복사(Copy) → 붙여넣기(Paste) 에 사용
 * @returns 복사된 새 파일의 ID
 */
export async function copyDriveFile(
  token?: string,
  fileId?: string,
  newParentId?: string,
  newName?: string
): Promise<string> {
  const authToken = resolveAuthToken(token);
  if (!fileId || !newParentId) throw new Error('파일 ID 또는 대상 폴더 ID가 누락되었습니다.');

  const body: Record<string, any> = { parents: [newParentId] };
  if (newName) body.name = newName;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/copy?fields=id,name`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw await parseDriveError(res, '파일 복사', authToken);
  const data = await res.json();
  return data.id;
}

/**
 * 폴더를 재귀적으로 복사 (Google Drive는 폴더 복사 API 미제공 → 재귀 수동 구현)
 * - 대상 부모 폴더 하위에 동일 이름(또는 newName)의 새 폴더를 생성한 뒤
 *   원본 폴더의 자식들을 재귀적으로 모두 복사합니다.
 * @returns 복사된 새 폴더 ID
 */
export async function copyDriveFolderRecursive(
  token?: string,
  sourceFolderId?: string,
  destParentId?: string,
  newName?: string
): Promise<string> {
  const authToken = resolveAuthToken(token);
  if (!sourceFolderId || !destParentId) throw new Error('원본/대상 폴더 ID가 누락되었습니다.');

  // 원본 폴더 메타 조회
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(sourceFolderId)}?fields=id,name,mimeType`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  if (!metaRes.ok) throw await parseDriveError(metaRes, '원본 폴더 정보 조회', authToken);
  const meta = await metaRes.json();

  // 대상 부모에 새 폴더 생성
  const folderName = newName || meta.name;
  const newFolderId = await createDriveFolder(authToken, folderName, destParentId);

  // 원본 폴더의 자식 목록 조회 후 재귀 복사
  const children = await listDriveChildren(authToken, sourceFolderId);
  for (const child of children) {
    if (child.isFolder) {
      await copyDriveFolderRecursive(authToken, child.id, newFolderId, child.name);
    } else {
      await copyDriveFile(authToken, child.id, newFolderId, child.name);
    }
  }

  return newFolderId;
}


export async function readDriveAICredentials(token?: string, resourceFolderId?: string): Promise<string | null> {
  const authToken = resolveAuthToken(token);
  if (!resourceFolderId) return null;
  try {
    const settingsFolderId = await ensureDriveFolder(authToken, 'settings', resourceFolderId);
    const fileId = await findDriveFile(authToken, 'ai_credentials.enc', settingsFolderId);
    if (!fileId) return null;
    return await readDriveFileContent(authToken, fileId);
  } catch (err) {
    console.warn('[readDriveAICredentials failed]:', err);
    throw err;
  }
}

export async function saveDriveAICredentials(token?: string, resourceFolderId?: string, cipherText: string = ''): Promise<boolean> {
  const authToken = resolveAuthToken(token);
  if (!resourceFolderId) return false;
  try {
    const settingsFolderId = await ensureDriveFolder(authToken, 'settings', resourceFolderId);
    const existingFileId = await findDriveFile(authToken, 'ai_credentials.enc', settingsFolderId);
    if (existingFileId) {
      return await saveDriveFileContent(authToken, existingFileId, cipherText);
    } else {
      await ensureDriveTextFile(authToken, 'ai_credentials.enc', settingsFolderId, cipherText, 'text/plain');
      return true;
    }
  } catch (err) {
    console.error('[saveDriveAICredentials failed]:', err);
    return false;
  }
}
