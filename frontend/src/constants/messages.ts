/**
 * 프로그램명 : OnriviAuthor
 * 파일명     : frontend/src/constants/messages.ts
 * 🚨 @PATCH : **2026-11-01** — [시스템 전역 메시지 상수화 및 3-Tier 표준화]:
 *             1) 구독/결제, 기기/라이선스, 인증/권한, 서버/DB, 지식 베이스 등 전 시스템 알림을 SYSTEM_MESSAGES 상수로 전면 통합
 *             2) SystemMessage 인터페이스를 상황 요약(text) + 행동 가이드(actionGuide) + 표준 코드(code)의 3-Tier 구조로 확장
 *             3) DESIGN.md Modern Technical Editorial 4대 기능 색상 토큰(Emerald, Cobalt, Amber, Crimson) 상수 탑재
 * 🚨 @PATCH : **2026-06-17** — 최초 시스템 전역 메시지 커널 생성
 */

import type { ToastType } from '../utils/toast';

/**
 * 🎨 Modern Technical Editorial 4대 기능 색상 토큰 (DESIGN.md Section 3 준수)
 */
export const MESSAGE_COLORS = {
  success: {
    accent: '#059669', // Emerald 600
    bgLight: '#ecfdf5',
    bgDark: 'rgba(5, 150, 105, 0.12)',
    borderLight: '#a7f3d0',
    borderDark: '#065f46',
    textLight: '#065f46',
    textDark: '#6ee7b7',
  },
  info: {
    accent: '#1d4ed8', // Cobalt Authority
    bgLight: '#eff6ff',
    bgDark: 'rgba(29, 78, 216, 0.10)',
    borderLight: '#bfdbfe',
    borderDark: '#1e3a8a',
    textLight: '#1e40af',
    textDark: '#93c5fd',
  },
  warning: {
    accent: '#d97706', // Amber 600
    bgLight: '#fffbeb',
    bgDark: 'rgba(217, 119, 6, 0.12)',
    borderLight: '#fde68a',
    borderDark: '#78350f',
    textLight: '#92400e',
    textDark: '#fcd34d',
  },
  error: {
    accent: '#dc2626', // Crimson Red
    bgLight: '#fef2f2',
    bgDark: 'rgba(220, 38, 38, 0.12)',
    borderLight: '#fecaca',
    borderDark: '#7f1d1d',
    textLight: '#991b1b',
    textDark: '#fca5a5',
  },
} as const;

/**
 * 📊 시스템 메시지 데이터 모델 (3-Tier 구조)
 */
export interface SystemMessage {
  type: ToastType;
  text: string;
  actionGuide?: string;
  code?: string;
}

/**
 * 🛡️ 시스템 전역 메시지 단일 소스 (SSoT)
 */
export const SYSTEM_MESSAGES = {
  // ─── 1. 에디터 / 모나코 ───────────────────────────────────────────────
  MONACO_LOAD_ERROR: {
    type: 'warning',
    text: '에디터 로드 실패. 오프라인 모드로 안전 복구합니다.',
    actionGuide: '네트워크 연결 상태를 확인하거나 페이지를 새로고침해 주세요.',
    code: 'ERR_MONACO_LOAD',
  },
  UNMAPPED_COMMAND: {
    type: 'warning',
    text: '알 수 없는 명령어가 수신되었습니다.',
    code: 'ERR_UNMAPPED_CMD',
  },

  // ─── 2. 파일 I/O & 워크스페이스 ───────────────────────────────────────
  FILE_SAVE_SUCCESS: {
    type: 'success',
    text: '저장되었습니다.',
    code: 'FILE_SAVE_OK',
  },
  FILE_SAVE_ERROR: {
    type: 'error',
    text: '파일 저장 중 오류가 발생했습니다.',
    actionGuide: '폴더 쓰기 권한이 있는지 확인해 주세요.',
    code: 'ERR_FILE_SAVE',
  },
  FILE_OPEN_ERROR: {
    type: 'error',
    text: '파일을 여는데 실패했습니다.',
    actionGuide: '파일이 다른 프로그램에서 사용 중인지 확인해 주세요.',
    code: 'ERR_FILE_OPEN',
  },
  FILE_READ_ERROR: {
    type: 'error',
    text: '파일 읽기에 실패했습니다.',
    code: 'ERR_FILE_READ',
  },
  FILE_NEW: {
    type: 'info',
    text: '새 문서를 시작합니다.',
  },
  FILE_OPENED: {
    type: 'info',
    text: '파일을 열었습니다.',
  },
  WORKSPACE_CONNECTED: {
    type: 'success',
    text: '워크스페이스가 연결되었습니다.',
    code: 'WORKSPACE_OK',
  },
  WORKSPACE_ERROR: {
    type: 'error',
    text: '워크스페이스 선택 중 오류가 발생했습니다.',
    actionGuide: '유효한 작업 디렉토리를 선택해 주세요.',
    code: 'ERR_WORKSPACE',
  },
  WORKSPACE_CANCELED: {
    type: 'info',
    text: '폴더 선택이 취소되었습니다.',
  },
  WORKSPACE_UNSUPPORTED: {
    type: 'warning',
    text: '데스크톱 모드(또는 최신 Chrome)에서만 지원됩니다.',
    actionGuide: '웹 브라우저 파일 시스템 접근 허용이 필요합니다.',
    code: 'ERR_WORKSPACE_UNSUPPORTED',
  },
  FILELIST_ERROR: {
    type: 'error',
    text: '파일 목록을 불러오는 중 오류가 발생했습니다.',
    code: 'ERR_FILELIST_LOAD',
  },

  // ─── 3. 클립보드 & 편집 ──────────────────────────────────────────────
  PASTE_IMAGE_ERROR: {
    type: 'error',
    text: '클립보드 이미지 업로드에 실패했습니다.',
    actionGuide: '이미지 파일 형식 및 용량을 확인해 주세요.',
    code: 'ERR_PASTE_IMAGE',
  },
  PASTE_TABLE_SUCCESS: {
    type: 'success',
    text: '웹 표 데이터가 마크다운으로 변환되었습니다.',
    code: 'PASTE_TABLE_OK',
  },
  PASTE_TEXT_SUCCESS: {
    type: 'success',
    text: '붙여넣은 텍스트가 자동으로 정제되었습니다.',
    code: 'PASTE_TEXT_OK',
  },
  COPY_SUCCESS: {
    type: 'success',
    text: '미리보기 내용이 클립보드에 복사되었습니다.',
    code: 'COPY_OK',
  },
  DOC_CLEAN_SUCCESS: {
    type: 'success',
    text: '문서 내 서식이 일괄 정리되었습니다.',
    code: 'DOC_CLEAN_OK',
  },

  // ─── 4. 구독 및 결제 도메인 ──────────────────────────────────────────
  SUB_CANCEL_SUCCESS: {
    type: 'success',
    text: '구독 해지가 정상적으로 접수되었습니다.',
    actionGuide: '남은 결제 기간까지는 현재 요금제 혜택이 정상 유지됩니다.',
    code: 'SUB_CANCEL_OK',
  },
  SUB_NOT_FOUND: {
    type: 'warning',
    text: '해지할 수 있는 활성 구독을 찾을 수 없습니다.',
    actionGuide: '이미 해지되었거나 현재 이용 중인 유료 요금제가 없습니다.',
    code: 'ERR_SUB_NOT_FOUND',
  },
  SUB_EXPIRED: {
    type: 'info',
    text: '이용 중인 요금제 기간이 만료되었습니다.',
    actionGuide: '무료 Reader 기능으로 자동 전환되었습니다.',
    code: 'SUB_EXPIRED_NOTICE',
  },
  TRIAL_ALREADY_USED: {
    type: 'warning',
    text: '무료 체험은 계정당 1회만 신청 가능합니다.',
    actionGuide: '지속적인 편집 이용을 원하시면 정기 구독 요금제를 선택해 주세요.',
    code: 'ERR_TRIAL_ALREADY_USED',
  },
  PAYMENT_FAILED: {
    type: 'error',
    text: '결제 승인 처리 중 오류가 발생했습니다.',
    actionGuide: '카드 한도 및 유효기간을 확인하시거나 결제 수단을 변경해 주세요.',
    code: 'ERR_PAYMENT_FAILED',
  },

  // ─── 5. 기기 인증 및 라이선스 ─────────────────────────────────────────
  MAX_DEVICES_EXCEEDED: {
    type: 'warning',
    text: '동시 접속 허용 대수(1대)를 초과했습니다.',
    actionGuide: '웹 대시보드의 [접속 기기 관리]에서 기존 기기를 해제한 후 다시 시도해 주세요.',
    code: 'ERR_MAX_DEVICES_EXCEEDED',
  },
  DEVICE_DEACTIVATE_SUCCESS: {
    type: 'success',
    text: '기기 연결이 안전하게 해제되었습니다.',
    actionGuide: '이제 다른 기기에서 새롭게 로그인하실 수 있습니다.',
    code: 'DEVICE_DEACTIVATE_OK',
  },
  NO_DESKTOP_PLAN: {
    type: 'warning',
    text: '데스크톱 앱을 지원하지 않는 요금제입니다.',
    actionGuide: '독립 설치형 데스크톱 실행을 위해 Elite Pro 요금제로 업그레이드해 주세요.',
    code: 'ERR_NO_DESKTOP_PLAN',
  },
  NO_LICENSE_KEY: {
    type: 'error',
    text: '유효한 라이선스 키가 확인되지 않습니다.',
    actionGuide: '대시보드에서 라이선스 발급 상태를 확인하거나 지원팀에 문의해 주세요.',
    code: 'ERR_NO_LICENSE',
  },

  // ─── 6. 인증 및 권한 ──────────────────────────────────────────────────
  SESSION_EXPIRED: {
    type: 'warning',
    text: '로그인 세션이 만료되었습니다.',
    actionGuide: '개인정보 보호를 위해 다시 로그인해 주세요.',
    code: 'ERR_SESSION_EXPIRED',
  },
  FORBIDDEN_ROLE: {
    type: 'error',
    text: '해당 기능을 실행할 관리자 권한이 없습니다.',
    actionGuide: '최고 관리자(SUPER)에게 권한 부여를 요청해 주세요.',
    code: 'ERR_FORBIDDEN_ROLE',
  },
  INVALID_PARAMETERS: {
    type: 'warning',
    text: '필수 입력 항목이 누락되었습니다.',
    actionGuide: '입력 내용을 확인하신 후 다시 시도해 주세요.',
    code: 'ERR_INVALID_PARAMS',
  },

  // ─── 7. 서버 및 데이터베이스 ──────────────────────────────────────────
  DATABASE_ERROR: {
    type: 'error',
    text: '일시적인 시스템 오류로 요청을 처리하지 못했습니다.',
    actionGuide: '데이터가 안전하게 보호되었습니다. 잠시 후 다시 시도해 주세요.',
    code: 'ERR_DATABASE',
  },
  NETWORK_ERROR: {
    type: 'error',
    text: '서버와의 통신 연결이 원활하지 않습니다.',
    actionGuide: '네트워크 상태를 확인하신 후 다시 시도해 주세요.',
    code: 'ERR_NETWORK',
  },

  // ─── 8. 로컬 SQLite 지식 베이스 ──────────────────────────────────────
  SQLITE_BUSY: {
    type: 'warning',
    text: '지식 데이터베이스가 다른 작업에 의해 사용 중입니다.',
    actionGuide: '백그라운드 작업이 완료되면 자동으로 다시 시도됩니다.',
    code: 'ERR_SQLITE_BUSY',
  },
  RESOURCE_FOLDER_NOT_SET: {
    type: 'warning',
    text: '공통 자원(리소스) 폴더가 설정되지 않았습니다.',
    actionGuide: '[환경설정 > 공통 리소스 폴더]에서 작업 폴더를 먼저 지정해 주세요.',
    code: 'ERR_RESOURCE_FOLDER_NOT_SET',
  },
  DATABASE_CORRUPT: {
    type: 'error',
    text: '지식 데이터베이스 파일이 손상되었거나 유효하지 않습니다.',
    actionGuide: '[지식 관리자 > 백업 복원]을 통해 이전 백업 시점으로 복원해 주세요.',
    code: 'ERR_DATABASE_CORRUPT',
  },
  RESTORE_SUCCESS: {
    type: 'success',
    text: '지식 베이스 복원이 성공적으로 완료되었습니다.',
    code: 'RESTORE_OK',
  },
  INVALID_BACKUP_FILE: {
    type: 'error',
    text: '올바른 온리비 지식 백업 파일이 아닙니다.',
    actionGuide: '정상적인 .db 스냅샷 파일을 선택해 주세요.',
    code: 'ERR_INVALID_BACKUP',
  },
} as const;

export type SystemMessageKey = keyof typeof SYSTEM_MESSAGES;
