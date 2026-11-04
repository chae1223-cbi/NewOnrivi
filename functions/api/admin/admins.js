// ====================================================================
// 📊 [OMD-ADMIN-admins-0003] functions/api/admin/admins.js
// 🎯 @KICK  : 관리자 계정 목록 조회, 가입 회원 대상 관리자 임명, 권한 변경 및 권한 회수(OTP 초기화)
// 🛡️ @GUARD : checkAdminAuth(MFA/Role) 통합 검증, ROOT_ADMIN 환경변수 보호, All-or-Nothing 단일 DB 트랜잭션
// 🚨 @PATCH : 2026-11-04 — [관리자 권한 해제·삭제 분리] is_active로 접근을 차단하고 삭제는 관리자 레코드만 제거
// 🚨 @PATCH : **2026-11-04** — [PostgreSQL 42703 undefined_column 오류 해결]: public.admins 테이블에 미존재하는 is_active, updated_at 컬럼 쿼리 제거
// 🚨 @PATCH : 2026-11-02 — [주석 표준화] onrivi-source-comments 규격 준수: 전 함수 문서 주석(JSDoc) 및 라인별 해설 주석 전면 복원
// 🚨 @PATCH : 2026-11-02 — [정책 표준화] "선 가입 후 권한 승격" 정책 확정: 외부 Auth 생성 제거 및 사전 가입된 회원(public.users)만 관리자로 임명
// 🚨 @PATCH : 2026-11-02 — [보안 리팩토링] ROOT_ADMIN_EMAIL 환경변수 연동 및 목록 조회 시 is_root 플래그 동적 주입
// 🚨 @PATCH : 2026-11-02 — [외부 Auth MFA REST 루프 제거 및 DB 원트랜잭션 통합]:
//             1) 비원자적 외부 Auth REST 호출(/auth/v1/admin/users/:id/factors) 및 DELETE fetch 루프 완전 제거
//             2) admins 권한 삭제 + auth.mfa_factors 초기화 + user_audit_logs 적재를 단일 원자적 PostgreSQL 트랜잭션으로 통합
// 🔗 @CALLS : checkAdminAuth, withDbTransaction, isRootAdmin, jsonResponse, adminServerError
// ====================================================================
import { handleOptions, checkAdminAuth, jsonResponse, adminServerError, isRootAdmin } from './_shared.js';
import { withDbTransaction } from '../_db.js';
import { DB_CODES } from '../_db-codes.js';
import { API_MESSAGES } from '../_messages.js';

/**
 * ========================================================================================
 * [함수명] onRequestOptions - 관리자 계정 관리 API 엔드포인트의 CORS Preflight 사전 요청을 처리합니다.
 *
 * @param {object} context - Cloudflare Pages Functions 실행 컨텍스트
 * @param {Request} context.request - HTTP OPTIONS 사전 요청 객체
 * @returns {Promise<Response>} 200 OK 상태 코드 및 브라우저 허용 CORS 헤더 응답
 *
 * @example
 * // OPTIONS /api/admin/admins
 * ==========================================================================================
 */
export const onRequestOptions = handleOptions;

/**
 * ========================================================================================
 * [함수명] onRequestGet - 등록된 관리자 계정 목록을 조회하고 ROOT_ADMIN 여부를 동적으로 판별하여 반환합니다.
 *
 * @param {object} context - Cloudflare Pages Functions 실행 컨텍스트
 * @param {Request} context.request - 인입된 Fetch API Request 객체 (Authorization Bearer 토큰 포함)
 * @param {object} context.env - 환경 변수 및 Cloudflare 바인딩 객체 (ROOT_ADMIN_EMAIL 등)
 * @returns {Promise<Response>} 관리자 목록 배열이 포함된 표준 JSON Response
 * @throws 401(미인증 토큰), 403(권한 부족 또는 MFA 미통과), 500(DB 조회 오류)
 *
 * @example
 * // GET /api/admin/admins
 * // Headers: { Authorization: "Bearer <JWT>" }
 * ==========================================================================================
 */
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // 1. 관리자 권한 및 MFA 2차 인증(aal2) 엄격 검증 (SUPER 또는 SUPPORT 권한 허용)
    const auth = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (auth.error) {
      // 인증 또는 권한 검증 실패 시 즉시 에러 응답 반환
      return jsonResponse({ success: false, error: auth.error }, auth.status);
    }

    // 2. PostgreSQL 데이터베이스에서 전체 관리자 목록 조회 (생성일시 역순 정렬)
    const result = await withDbTransaction(env, db => db.query(
      'SELECT id, user_id, email, admin_role, is_active, created_at FROM public.admins ORDER BY created_at DESC'
    ));

    // 3. 환경변수(ROOT_ADMIN_EMAIL)와 대조하여 최상위 관리자 여부(is_root) 플래그를 동적으로 주입
    // (클라이언트에 최고 관리자 이메일을 하드코딩하지 않고, UI에서 보호 배지 및 권한 수정/삭제 버튼 비활성화를 지원)
    const admins = result.rows.map(row => ({
      ...row,
      is_root: isRootAdmin(row.email, env),
    }));

    // 4. 관리자 목록 조회 결과 반환
    return jsonResponse({ success: true, data: admins });
  } catch (error) {
    // 예외 발생 시 표준 500 에러 포맷 및 진단 로그 생성
    return adminServerError(context.request, error, 'functions/api/admin/admins.js', 'list_admins');
  }
}

/**
 * ========================================================================================
 * [함수명] onRequestPost - 사전 가입된 일반 회원을 관리자로 신규 임명(권한 부여)합니다.
 * 온리비의 "선 가입 후 권한 승격" 정책에 따라 public.users에 존재하지 않는 계정은 임명할 수 없습니다.
 *
 * @param {object} context - Cloudflare Pages Functions 실행 컨텍스트
 * @param {Request} context.request - 인입된 HTTP POST Request 객체 (Body: { email, role })
 * @param {object} context.env - 환경 변수 및 Cloudflare 바인딩 객체
 * @returns {Promise<Response>} 관리자 임명 성공 메시지가 포함된 JSON 응답
 * @throws 400(파라미터 누락, 유효하지 않은 권한 코드, 이미 등록된 관리자), 401(미인증), 403(권한 없음), 404(가입되지 않은 회원), 500(DB 트랜잭션 오류)
 *
 * @example
 * // POST /api/admin/admins
 * // Headers: { Authorization: "Bearer <SUPER_ADMIN_JWT>" }
 * // Body: { "email": "manager@example.com", "role": "SUPPORT" }
 * ==========================================================================================
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // 1. 최고 관리자(SUPER) 권한 및 MFA 2차 인증(aal2) 엄격 검증
    const auth = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER]);
    if (auth.error) {
      // SUPER 권한이 아니거나 MFA 미인증인 경우 즉시 에러 반환
      return jsonResponse({ success: false, error: auth.error }, auth.status);
    }
    const adminId = auth.user.id; // 임명 작업을 수행한 최고 관리자의 고유 UUID (감사 로그용)

    // 2. 요청 본문(JSON) 파싱
    const body = await request.json().catch(() => ({}));
    const { email, role } = body;

    // 3. 필수 입력값 존재 여부 검증 (이메일 및 권한 필수)
    if (!email || !role) {
      return jsonResponse({ success: false, error: API_MESSAGES.INVALID_PARAMS.message }, 400);
    }

    // 4. 입력값 표준 정규화 (이메일은 소문자 트림, 권한 코드는 대문자 트림)
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim().toUpperCase();

    // 5. 관리자 권한 코드 유효성 검증 (SUPER 또는 SUPPORT 만 허용)
    if (![DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT].includes(normalizedRole)) {
      return jsonResponse({ success: false, error: API_MESSAGES.ADMIN_INVALID_ROLE.message }, 400);
    }

    // 6. 단일 원자적 DB 트랜잭션 실행 (All-or-Nothing 무결성 보장)
    const result = await withDbTransaction(env, async db => {
      // 6-1. [선 가입 원칙 검증] 온리비 서비스에 먼저 정상 가입된 회원(탈퇴 제외)인지 확인
      const userCheck = await db.query(
        'SELECT id, email FROM public.users WHERE LOWER(email) = $1 AND is_deleted = false LIMIT 1',
        [normalizedEmail]
      );

      // 회원가입 이력이 없는 경우 404 에러 반환 (사전 가입 필수 정책 준수)
      if (userCheck.rows.length === 0) {
        return {
          success: false,
          error: API_MESSAGES.USER_NOT_FOUND.message,
          status: 404,
        };
      }

      const targetUserId = userCheck.rows[0].id; // 임명 대상 사용자의 고유 UUID

      // 6-2. 이미 관리자(admins) 테이블에 등록되어 있는지 중복 여부 확인
      const checkRes = await db.query(
        'SELECT id FROM public.admins WHERE user_id = $1 OR LOWER(email) = $2 LIMIT 1',
        [targetUserId, normalizedEmail]
      );
      if (checkRes.rows.length > 0) {
        return {
          success: false,
          error: API_MESSAGES.ADMIN_ALREADY_EXISTS.message,
          status: 400,
        };
      }

      // 6-3. 관리자 권한 테이블(public.admins)에 레코드 등록 (일반 회원 -> 관리자 권한 부여)
      await db.query(
        `INSERT INTO public.admins (user_id, email, admin_role, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [targetUserId, normalizedEmail, normalizedRole]
      );

      // 6-4. 관리자 초대/임명 감사 로그(public.user_audit_logs) 적재
      await db.query(
        `INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
         VALUES ($1, $2, 'ADMIN_INVITE', $3)`,
        [targetUserId, adminId, 'Promoted to admin as ' + normalizedRole]
      );

      return { success: true };
    });

    // 트랜잭션 내부 비즈니스 로직 오류 발생 시 해당 상태 코드 및 에러 메시지 반환
    if (!result.success) {
      return jsonResponse({ success: false, error: result.error }, result.status || 400);
    }

    // 7. 관리자 임명 성공 응답 반환
    return jsonResponse({ success: true, message: API_MESSAGES.ADMIN_INVITE_SUCCESS.message });
  } catch (error) {
    // 시스템 예외 발생 시 표준 500 에러 응답 생성
    return adminServerError(context.request, error, 'functions/api/admin/admins.js', 'invite_admin');
  }
}

/**
 * ========================================================================================
 * [함수명] onRequestPatch - 기존 관리자의 권한 등급 또는 활성 상태를 변경합니다.
 * 대상 레코드 비관적 행 잠금(FOR UPDATE) 및 ROOT_ADMIN 보호 검증을 포함합니다.
 *
 * @param {object} context - Cloudflare Pages Functions 실행 컨텍스트
 * @param {Request} context.request - 인입된 HTTP PATCH Request 객체 (Body: { adminTargetId, newRole } 또는 { adminTargetId, isActive })
 * @param {object} context.env - 환경 변수 및 Cloudflare 바인딩 객체 (ROOT_ADMIN_EMAIL 등)
 * @returns {Promise<Response>} 권한 변경 성공 메시지가 포함된 JSON 응답
 * @throws 400(파라미터 누락, 유효하지 않은 권한 코드), 401(미인증), 403(권한 없음, 최상위 관리자 권한 변경 차단), 404(관리자 미존재), 500(DB 트랜잭션 오류)
 *
 * @example
 * // PATCH /api/admin/admins
 * // Headers: { Authorization: "Bearer <SUPER_ADMIN_JWT>" }
 * // Body: { "adminTargetId": "adm-uuid-1234", "newRole": "SUPPORT" }
 * ==========================================================================================
 */
export async function onRequestPatch(context) {
  try {
    const { request, env } = context;

    // 1. 최고 관리자(SUPER) 권한 및 MFA 2차 인증(aal2) 엄격 검증
    const auth = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER]);
    if (auth.error) {
      return jsonResponse({ success: false, error: auth.error }, auth.status);
    }
    const adminId = auth.user.id; // 권한 변경 작업을 수행한 최고 관리자 UUID

    // 2. 요청 본문(JSON) 파싱 및 변경 파라미터 추출
    const body = await request.json().catch(() => ({}));
    const { adminTargetId, newRole, isActive } = body;

    // 3. 필수 입력값 검증 (변경 대상 관리자 식별자와 신규 역할 코드 필수)
    if (!adminTargetId || (typeof isActive !== 'boolean' && !newRole)) {
      return jsonResponse({ success: false, error: API_MESSAGES.INVALID_PARAMS.message }, 400);
    }

    // 4. 신규 역할 코드 표준 정규화 및 유효성 검증
    const normalizedRole = typeof isActive === 'boolean' ? null : String(newRole).trim().toUpperCase();
    if (normalizedRole && ![DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT].includes(normalizedRole)) {
      return jsonResponse({ success: false, error: API_MESSAGES.ADMIN_INVALID_ROLE.message }, 400);
    }

    // 5. 단일 원자적 DB 트랜잭션 실행 (대상 행 잠금 -> ROOT 관리자 보호 -> admins 갱신 -> 감사로그 적재)
    const result = await withDbTransaction(env, async db => {
      // 5-1. 변경 대상 관리자 레코드 조회 및 동시성 제어를 위한 비관적 행 잠금(FOR UPDATE)
      const selectRes = await db.query(
        `SELECT id, user_id, email, admin_role
         FROM public.admins
         WHERE id = $1
         FOR UPDATE`,
        [adminTargetId]
      );

      // 대상 관리자가 존재하지 않는 경우 404 에러 반환
      if (!selectRes.rows.length) {
        return { success: false, error: API_MESSAGES.ADMIN_NOT_FOUND.message, status: 404 };
      }

      const targetAdmin = selectRes.rows[0];

      // 5-2. 최상위 관리자(ROOT_ADMIN) 보호 검증 (클라이언트 조작 방어: DB 실제 이메일과 환경변수 대조)
      if (isRootAdmin(targetAdmin.email, env)) {
        return { success: false, error: API_MESSAGES.ROOT_ADMIN_PROTECTED.message, status: 403 };
      }

      // 5-3. 권한 해제/재부여 또는 등급 변경. 일반 회원 계정과 MFA 요인은 유지한다.
      if (typeof isActive === 'boolean') {
        if (!isActive && targetAdmin.user_id === adminId) {
          return { success: false, error: API_MESSAGES.SELF_REVOKE_PROHIBITED.message, status: 400 };
        }
        await db.query('UPDATE public.admins SET is_active = $1 WHERE id = $2', [isActive, adminTargetId]);
      } else {
        await db.query('UPDATE public.admins SET admin_role = $1 WHERE id = $2', [normalizedRole, adminTargetId]);
      }

      // 5-4. 기존 감사 액션 코드로 관리자 변경 내역을 기록한다.
      await db.query(
        `INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
         VALUES ($1, $2, $3, $4)`,
        [targetAdmin.user_id || null, adminId, typeof isActive === 'boolean' && !isActive ? DB_CODES.AUDIT_ACTION.ADMIN_REVOKE : DB_CODES.AUDIT_ACTION.ADMIN_ROLE_CHANGE,
          typeof isActive === 'boolean' ? `Admin access ${isActive ? 'enabled' : 'disabled'} for ${targetAdmin.email}` : `Changed role of ${targetAdmin.email} to ${normalizedRole}`]
      );

      return { success: true };
    });

    // 트랜잭션 내부 비즈니스 로직 오류 발생 시 해당 상태 코드 및 에러 메시지 반환
    if (!result.success) {
      return jsonResponse({ success: false, error: result.error }, result.status || 400);
    }

    // 6. 권한 변경 성공 응답 반환
    return jsonResponse({ success: true, message: typeof isActive === 'boolean' ? (isActive ? API_MESSAGES.ADMIN_ROLE_CHANGE_SUCCESS.message : API_MESSAGES.ADMIN_ACCESS_DISABLED_SUCCESS.message) : API_MESSAGES.ADMIN_ROLE_CHANGE_SUCCESS.message });
  } catch (error) {
    // 시스템 예외 발생 시 표준 500 에러 응답 생성
    return adminServerError(context.request, error, 'functions/api/admin/admins.js', 'update_admin_role');
  }
}

/**
 * ========================================================================================
 * [함수명] onRequestDelete - 관리자 등록 레코드만 삭제하고 일반 회원 계정과 OTP(MFA)는 유지합니다.
 * 최상위 관리자(ROOT_ADMIN) 보호 및 본인 계정 권한 회수(Self-Lockout) 방어 로직이 적용되어 있습니다.
 *
 * @param {object} context - Cloudflare Pages Functions 실행 컨텍스트
 * @param {Request} context.request - 인입된 HTTP DELETE Request 객체 (Query: ?adminTargetId=xxx)
 * @param {object} context.env - 환경 변수 및 Cloudflare 바인딩 객체 (ROOT_ADMIN_EMAIL 등)
 * @returns {Promise<Response>} 관리자 등록 삭제 성공 메시지가 포함된 JSON 응답
 * @throws 400(파라미터 누락, 본인 권한 회수 시도), 401(미인증), 403(권한 없음, 최상위 관리자 회수 시도), 404(관리자 미존재), 500(DB 트랜잭션 오류)
 *
 * @example
 * // DELETE /api/admin/admins?adminTargetId=adm-uuid-1234
 * // Headers: { Authorization: "Bearer <SUPER_ADMIN_JWT>" }
 * ==========================================================================================
 */
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;

    // 1. 최고 관리자(SUPER) 권한 및 MFA 2차 인증(aal2) 엄격 검증
    const auth = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER]);
    if (auth.error) {
      return jsonResponse({ success: false, error: auth.error }, auth.status);
    }
    const adminId = auth.user.id; // 회수 작업을 수행하는 최고 관리자 UUID

    // 2. URL 쿼리 파라미터에서 회수 대상 관리자 고유 ID(adminTargetId) 추출
    const url = new URL(request.url);
    const adminTargetId = url.searchParams.get('adminTargetId');

    // 3. 대상 관리자 ID 파라미터 유효성 검증
    if (!adminTargetId) {
      return jsonResponse({ success: false, error: API_MESSAGES.INVALID_PARAMS.message }, 400);
    }

    // 4. 단일 원자적 DB 트랜잭션 실행 (대상 행 잠금 -> ROOT 관리자 보호 -> 본인 방어 -> 관리자 등록 삭제 -> 감사로그 적재)
    const result = await withDbTransaction(env, async db => {
      // 4-1. 회수 대상 관리자 레코드 조회 및 동시성 제어를 위한 비관적 행 잠금(FOR UPDATE)
      const selectRes = await db.query(
        `SELECT id, user_id, email, admin_role
         FROM public.admins
         WHERE id = $1
         FOR UPDATE`,
        [adminTargetId]
      );

      // 대상 관리자가 존재하지 않는 경우 404 에러 반환
      if (!selectRes.rows.length) {
        return { success: false, error: API_MESSAGES.ADMIN_NOT_FOUND.message, status: 404 };
      }

      const targetAdmin = selectRes.rows[0];

      // 4-2. 최상위 관리자(ROOT_ADMIN) 보호 검증 (환경변수와 대조하여 최상위 관리자 권한 회수 원천 차단)
      if (isRootAdmin(targetAdmin.email, env)) {
        return { success: false, error: API_MESSAGES.ROOT_ADMIN_PROTECTED.message, status: 403 };
      }

      // 4-3. 현재 로그인한 최고 관리자 본인 계정의 권한 회수 방어 (Self-Lockout 방지)
      if (targetAdmin.user_id === adminId) {
        return { success: false, error: API_MESSAGES.SELF_REVOKE_PROHIBITED.message, status: 400 };
      }

      // 4-4. 관리자 테이블(public.admins)에서 권한 레코드 영구 삭제
      const deleted = await db.query('DELETE FROM public.admins WHERE id = $1', [adminTargetId]);
      if (deleted.rowCount !== 1) throw new Error('Admin delete affected an unexpected number of rows');

      // 4-5. 관리자 등록 삭제 감사 로그(public.user_audit_logs) 적재
      await db.query(
        `INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
         VALUES ($1, $2, 'ADMIN_REVOKE', $3)`,
        [targetAdmin.user_id || null, adminId, `Removed admin registration for ${targetAdmin.email}`]
      );

      return { success: true };
    });

    // 트랜잭션 내부 비즈니스 로직 오류 발생 시 해당 상태 코드 및 에러 메시지 반환
    if (!result.success) {
      return jsonResponse({ success: false, error: result.error }, result.status || 400);
    }

    // 5. 관리자 등록 삭제 성공 응답 반환
    return jsonResponse({ success: true, message: API_MESSAGES.ADMIN_DELETE_SUCCESS.message });
  } catch (error) {
    // 시스템 예외 발생 시 표준 500 에러 응답 생성
    return adminServerError(context.request, error, 'functions/api/admin/admins.js', 'delete_admin_registration');
  }
}
