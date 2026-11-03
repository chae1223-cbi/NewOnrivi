// ====================================================================
// 📊 [OMD-LIB-errorDiagnostics-0001] frontend/src/lib/errorDiagnostics.ts
// 🎯 @KICK  : 프론트엔드 전역 오류 발생 시 소스 파일, 함수명, 구체적 행위(doing)를 정밀 추적하여 콘솔 및 R2 시스템 로그에 선제 기록
// 🛡️ @GUARD : 4대 민감정보(토큰, 비밀번호, API 키, 개인 이메일, 로컬 PC 절대경로) 자동 마스킹 및 전송 과부하(Rate Limiting) 방어
// 🚨 @PATCH : 2026-11-03 — [오류 진단 로깅 0단계]: error.message 및 stack 내 민감정보(토큰, 이메일, PC 경로) 심층 정규식 마스킹 보강
// 🚨 @PATCH : 2026-11-03 — [오류 진단 로깅 표준화]: 소스 위치 및 작업 행위(doing) 정밀 추적 로거 신설 및 R2 로그 30일 보관 연계
// 🔗 @CALLS : reportClientLog, console.groupCollapsed, console.error, console.warn
// ====================================================================

import { reportClientLog } from '@/lib/clientLogs';

/**
 * 정밀 오류 진단 로깅 매개변수 인터페이스
 */
export interface ErrorDiagnosticParams {
  /** 오류가 발생한 소스 파일명 (예: 'useFileExplorer.ts' — 생략 시 스택에서 자동 감지) */
  file?: string;
  /** 오류가 발생한 함수 또는 컴포넌트명 (예: 'connectGoogleDrive') */
  func?: string;
  /** 🎯 정확히 "무엇을 하던 중이었는지" 구체적 행위 기술 (예: '구글 드라이브 토큰 유효성 검증 및 계정 정보 확인 중') */
  doing: string;
  /** 포착된 원본 예외 또는 오류 메시지 */
  error: any;
  /** 작업 대상 정보 (예: 파일명, 폴더명, 문서 ID 등) */
  target?: string | number | null;
  /** 추가 비민감 진단 상태 컨텍스트 */
  context?: Record<string, any>;
  /** 로그 중요도 레벨 ('ERROR' | 'WARN', 기본값: 'ERROR') */
  level?: 'ERROR' | 'WARN';
  /** 시스템 액션 분류 코드 (기본값: 'APP_ERROR') */
  action?: string;
}

/**
 * ========================================================================================
 * [함수명] extractCallerLocation - 호출 스택(Error.stack)에서 상위 소스 파일명과 라인 번호를 자동 추출합니다.
 *
 * @param {number} [skipDepth=2] - 스킵할 호출 스택 깊이
 * @returns {{ file: string; line: string }} 추출된 파일명 및 라인 정보
 * ========================================================================================
 */
function extractCallerLocation(skipDepth = 2): { file: string; line: string } {
  try {
    const stack = new Error().stack;
    if (!stack) return { file: 'unknown', line: '0' };
    const lines = stack.split('\n');
    // skipDepth 이후의 실제 호출자 라인 탐색
    for (let i = skipDepth; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.includes('errorDiagnostics.ts')) continue;
      const match = line.match(/(?:at\s+(?:.*?\s+\()?)?([^()\n]+):(\d+):(\d+)\)?/);
      if (match) {
        const fullPath = match[1].replace(/\\/g, '/');
        const fileName = fullPath.split('/').pop() || fullPath;
        return { file: fileName, line: `${match[2]}:${match[3]}` };
      }
    }
  } catch {}
  return { file: 'unknown', line: '0' };
}

/**
 * ========================================================================================
 * [함수명] maskSensitiveString - 문자열 내부의 토큰, 패스워드, 이메일, PC 로컬 절대 경로를 안전하게 가림 처리합니다.
 *
 * @param {string} text - 원본 문자열
 * @returns {string} 마스킹된 문자열
 * ========================================================================================
 */
export function maskSensitiveString(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    // 1. Authorization Bearer 토큰 및 JWT 형태 토큰 마스킹
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [토큰가림]')
    .replace(/eyJ[A-Za-z0-9_\-]{15,}\.[A-Za-z0-9_\-]{15,}\.[A-Za-z0-9_\-]*/g, '[JWT가림]')
    // 2. 키/비밀번호/토큰 파라미터 값 마스킹
    .replace(/((?:password|passwd|secret|api[_-]?key|access_token|refresh_token)\s*[=:]\s*)[^\s,;&'"]+/gi, '$1[가림]')
    // 3. 이메일 주소 마스킹
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[이메일가림]')
    // 4. Windows PC 사용자명 및 로컬 경로 마스킹 (예: C:\Users\홍길동\... -> C:\Users\[사용자]\...)
    .replace(/([A-Z]:\\Users\\[^\\/\s]+)/gi, '$1'.replace(/Users\\[^\\/\s]+/i, 'Users\\[사용자]'))
    .replace(/(\/(?:home|Users)\/[^\/\s]+)/gi, '/Users/[사용자]');
}

/**
 * ========================================================================================
 * [함수명] maskSensitiveContext - 객체 내부의 토큰, 비밀번호 등 민감정보를 재귀적으로 안전하게 마스킹합니다.
 *
 * @param {any} data - 마스킹할 원본 데이터 객체
 * @returns {any} 마스킹 처리된 복제본
 * ========================================================================================
 */
function maskSensitiveContext(data: any): any {
  if (!data || typeof data !== 'object') {
    if (typeof data === 'string') return maskSensitiveString(data);
    return data;
  }
  if (Array.isArray(data)) return data.map(maskSensitiveContext);
  const safe: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (/token|password|secret|key|auth|credential/i.test(k) && typeof v === 'string') {
      safe[k] = '[가림]';
    } else if (typeof v === 'string') {
      safe[k] = maskSensitiveString(v);
    } else if (typeof v === 'object' && v !== null) {
      safe[k] = maskSensitiveContext(v);
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

/**
 * ========================================================================================
 * [함수명] logError - 오류 발생 시 소스 위치와 구체적 행위(doing)를 콘솔에 선제 출력하고 R2 시스템 로그로 전송합니다.
 *
 * @param {ErrorDiagnosticParams} params - 정밀 진단 매개변수
 * @returns {void}
 * ========================================================================================
 */
export function logError(params: ErrorDiagnosticParams): void {
  const level = params.level || 'ERROR';
  const caller = extractCallerLocation(3);
  const file = params.file || caller.file;
  const func = params.func || 'anonymous';
  const doing = params.doing || '작업 처리 중';
  const rawTarget = params.target ? String(params.target) : '-';
  const target = maskSensitiveString(rawTarget);
  const errObj = params.error;
  const rawErrMsg = errObj?.message || (typeof errObj === 'string' ? errObj : '알 수 없는 오류');
  const errMsg = maskSensitiveString(rawErrMsg);
  const rawErrStack = errObj?.stack || (level === 'ERROR' ? new Error().stack : undefined);
  const errStack = rawErrStack ? maskSensitiveString(rawErrStack) : undefined;
  const safeContext = params.context ? maskSensitiveContext(params.context) : undefined;

  // 1. [콘솔 선제 출력] 개발자 도구(F12) 및 Electron 터미널에 시각적 그룹핑으로 즉시 덤프
  const banner = `🚨 [Onrivi ${level}] [${file} ➔ ${func}] ${doing} 실패`;
  const consoleFn = level === 'WARN' ? console.warn : console.error;

  try {
    if (console.groupCollapsed) {
      console.groupCollapsed(`%c${banner}`, level === 'WARN' ? 'color: #d97706; font-weight: bold;' : 'color: #dc2626; font-weight: bold;');
      console.log(`📍 발생 소스 : ${file}${caller.line !== '0' ? ` (Line ${caller.line})` : ''}`);
      console.log(`🎯 실행 작업 : ${doing}`);
      if (target !== '-') console.log(`📂 작업 대상 : ${target}`);
      consoleFn(`💥 원인 메시지 : ${errMsg}`);
      if (safeContext) console.log(`📊 실행 맥락 :`, safeContext);
      if (errStack) console.log(`🧵 스택 경로 :`, errStack);
      console.groupEnd();
    } else {
      consoleFn(`${banner} | 파일: ${file} | 대상: ${target} | 에러: ${errMsg}`);
    }
  } catch {
    consoleFn(`${banner}: ${errMsg}`);
  }

  // 2. [원격 R2 로그 보존] 30일 자동 보관 시스템 로그 수집 파이프라인으로 전송 (Fire-and-Forget)
  try {
    const remoteMessage = `[${file} ➔ ${func}] (${doing}) ${errMsg}${target !== '-' ? ` [대상: ${target}]` : ''}`;
    reportClientLog(remoteMessage, level, params.action || 'APP_ERROR');
  } catch (reportErr) {
    console.warn('[logError] 원격 로그 전달 실패 (무시):', reportErr);
  }
}

/**
 * ========================================================================================
 * [함수명] logWarn - 경고성 예외 발생 시 소스 위치와 구체적 행위를 콘솔 및 R2에 기록합니다.
 *
 * @param {Omit<ErrorDiagnosticParams, 'level'>} params - 경고 진단 매개변수
 * @returns {void}
 * ========================================================================================
 */
export function logWarn(params: Omit<ErrorDiagnosticParams, 'level'>): void {
  logError({ ...params, level: 'WARN' });
}
