// ====================================================================
// 📊 [OMD-CORE-knowledgeError-0001] knowledgeError.ts ➔ Local SQLite Error Standards
// 🎯 @KICK  : 로컬 SQLite(지식 베이스) 공통 오류 분류, 안전한 한국어 메시지 변환 및 진단 ID 발급
// 🛡️ @GUARD : 예외 원문/SQL/실제 디스크 경로 사용자 노출 원천 차단, 고유 진단 ID(requestId) 부여
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] skills/onrivi-error-handling 준수 공통 에러 모듈 신설
// ====================================================================

import { NextResponse } from 'next/server';

export const KNOWLEDGE_ERROR_CODES = {
  SQLITE_NOT_AVAILABLE: 'SQLITE_NOT_AVAILABLE',
  DATABASE_LOCKED: 'DATABASE_LOCKED',
  DATABASE_CORRUPT: 'DATABASE_CORRUPT',
  INVALID_BACKUP_FILE: 'INVALID_BACKUP_FILE',
  RESOURCE_FOLDER_NOT_SET: 'RESOURCE_FOLDER_NOT_SET',
  RESOURCE_FOLDER_NOT_FOUND: 'RESOURCE_FOLDER_NOT_FOUND',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INDEXING_FAILED: 'INDEXING_FAILED',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type KnowledgeErrorCode = typeof KNOWLEDGE_ERROR_CODES[keyof typeof KNOWLEDGE_ERROR_CODES];

export const KNOWLEDGE_SAFE_MESSAGES: Record<KnowledgeErrorCode, string> = {
  SQLITE_NOT_AVAILABLE: '지식 데이터베이스 엔진(node:sqlite)을 현재 환경에서 실행할 수 없습니다.',
  DATABASE_LOCKED: '지식 데이터베이스가 다른 작업에 의해 사용 중입니다. 잠시 후 다시 시도해 주세요.',
  DATABASE_CORRUPT: '지식 데이터베이스 파일이 손상되었거나 형식이 올바르지 않습니다. 복구 또는 백업 원복이 필요합니다.',
  INVALID_BACKUP_FILE: '지식 데이터베이스 백업 파일이 올바르지 않거나 손상되었습니다.',
  RESOURCE_FOLDER_NOT_SET: '공통 자원(리소스) 폴더가 설정되지 않았습니다. 환경설정에서 리소스 폴더를 먼저 지정해 주세요.',
  RESOURCE_FOLDER_NOT_FOUND: '환경설정에 지정된 리소스 폴더를 찾을 수 없습니다. 경로를 다시 확인해 주세요.',
  TRANSACTION_FAILED: '지식 데이터베이스 작업 처리 중 오류가 발생하여 안전하게 취소(롤백)되었습니다.',
  INDEXING_FAILED: '지식 문서 분석 및 색인 처리에 실패했습니다.',
  DOCUMENT_NOT_FOUND: '해당 지식 문서를 찾을 수 없습니다.',
  INVALID_PARAMS: '요청 정보가 올바르지 않습니다.',
  UNKNOWN_ERROR: '지식 데이터베이스 작업 중 예기치 않은 오류가 발생했습니다.',
};

export interface KnowledgeErrorContext {
  source: string;
  stage: string;
  status?: number;
  customMessage?: string;
}

export interface StandardKnowledgeError {
  ok: false;
  code: KnowledgeErrorCode;
  message: string;
  diagnosticId: string;
  stage: string;
}

/**
 * 고유 진단 ID(Diagnostic ID)를 생성합니다.
 */
export function generateDiagnosticId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `diag_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    }
  } catch {}
  return `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 예외 객체로부터 표준 에러 코드를 안전하게 분류합니다.
 */
export function classifyKnowledgeError(err: any): KnowledgeErrorCode {
  if (!err) return KNOWLEDGE_ERROR_CODES.UNKNOWN_ERROR;

  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  const errcode = err?.errcode;

  if (msg.includes('resource_folder_not_set') || msg.includes('리소스 폴더가 설정되지 않았습니다')) {
    return KNOWLEDGE_ERROR_CODES.RESOURCE_FOLDER_NOT_SET;
  }
  if (msg.includes('리소스 폴더를 찾을 수 없습니다')) {
    return KNOWLEDGE_ERROR_CODES.RESOURCE_FOLDER_NOT_FOUND;
  }
  if (
    errcode === 5 ||
    errcode === 6 ||
    msg.includes('database is locked') ||
    msg.includes('busy') ||
    msg.includes('ebusy') ||
    code.includes('busy') ||
    code.includes('locked')
  ) {
    return KNOWLEDGE_ERROR_CODES.DATABASE_LOCKED;
  }
  if (
    msg.includes('malformed') ||
    msg.includes('disk image') ||
    msg.includes('corrupt') ||
    msg.includes('database disk image is malformed')
  ) {
    return KNOWLEDGE_ERROR_CODES.DATABASE_CORRUPT;
  }
  if (msg.includes('sqlite_not_available') || msg.includes('node:sqlite')) {
    return KNOWLEDGE_ERROR_CODES.SQLITE_NOT_AVAILABLE;
  }
  if (msg.includes('invalid_backup') || msg.includes('백업 파일')) {
    return KNOWLEDGE_ERROR_CODES.INVALID_BACKUP_FILE;
  }
  if (msg.includes('transaction') || msg.includes('rollback')) {
    return KNOWLEDGE_ERROR_CODES.TRANSACTION_FAILED;
  }
  if (msg.includes('not found') || msg.includes('문서를 찾을 수 없습니다')) {
    return KNOWLEDGE_ERROR_CODES.DOCUMENT_NOT_FOUND;
  }
  if (msg.includes('invalid') || msg.includes('파라미터') || msg.includes('경로가 전달되지 않았습니다')) {
    return KNOWLEDGE_ERROR_CODES.INVALID_PARAMS;
  }

  return KNOWLEDGE_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * 예외를 안전한 표준 에러 구조체로 변환하고 진단 로그를 기록합니다.
 */
export function toKnowledgeError(err: any, context: KnowledgeErrorContext): StandardKnowledgeError {
  const code = classifyKnowledgeError(err);
  const diagnosticId = generateDiagnosticId();
  const message = context.customMessage || KNOWLEDGE_SAFE_MESSAGES[code];

  // 안전한 진단 로그: 문서 본문, 실제 파일 절대경로, SQL문 등 민감 정보를 제외하고 메타데이터만 기록
  console.error(
    `[Knowledge Error] [${diagnosticId}] ${context.source}#${context.stage} — Code: ${code} (Raw: ${err?.message || 'None'})`
  );

  return {
    ok: false,
    code,
    message,
    diagnosticId,
    stage: context.stage,
  };
}

/**
 * Next.js API 라우트 전용 에러 Response 생성 헬퍼
 */
export function knowledgeErrorResponse(err: any, context: KnowledgeErrorContext): NextResponse {
  const errorObj = toKnowledgeError(err, context);
  const status = context.status || (
    errorObj.code === KNOWLEDGE_ERROR_CODES.INVALID_PARAMS ||
    errorObj.code === KNOWLEDGE_ERROR_CODES.RESOURCE_FOLDER_NOT_SET
      ? 400
      : errorObj.code === KNOWLEDGE_ERROR_CODES.DOCUMENT_NOT_FOUND
      ? 404
      : errorObj.code === KNOWLEDGE_ERROR_CODES.DATABASE_LOCKED
      ? 503
      : 500
  );

  return NextResponse.json(
    {
      ok: false,
      code: errorObj.code,
      message: errorObj.message,
      diagnosticId: errorObj.diagnosticId,
      stage: errorObj.stage,
    },
    {
      status,
      headers: {
        'X-Diagnostic-ID': errorObj.diagnosticId,
      },
    }
  );
}
