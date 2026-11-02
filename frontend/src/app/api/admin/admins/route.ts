// ====================================================================
// 📊 [OMD-ADMIN-ADMINS-ROUTE-0002] frontend/src/app/api/admin/admins/route.ts
// 🎯 @KICK  : 관리자 계정 목록 조회, 신규 관리자 초대, 권한 변경 및 권한 회수 (Next.js App Router API)
// 🛡️ @GUARD : SUPER 관리자 권한 검증, ROOT_ADMIN 보호, 본인 권한 회수 방어(Self-Lockout), FOR UPDATE 행 잠금 및 sql.begin 단일 트랜잭션 무결성 보장
// 🚨 @PATCH : 2026-11-02 — [주석 표준화] OnriviAuthor 표준 양식 준수: 전 핸들러 문서 주석(구분선, 📌 식별자, TSDoc) 및 라인별 해설 주석 전면 동기화
// 🚨 @PATCH : 2026-11-02 — [정책 표준화] "선 가입 후 권한 승격" 정책 확정: 외부 Auth 생성 제거 및 사전 가입 회원만 관리자 임명
// 🚨 @PATCH : 2026-11-02 — [보안 리팩토링] ROOT_ADMIN_EMAIL 환경변수 연동 및 목록 조회 시 is_root 플래그 동적 주입
// 🚨 @PATCH : 2026-11-02 — [외부 Auth MFA REST 루프 제거 및 DB 원트랜잭션 통합]:
//             1) 비원자적 외부 Auth REST 호출(/auth/v1/admin/users/:id/factors) 및 DELETE fetch 루프 완전 제거
//             2) admins 권한 삭제 + auth.mfa_factors 초기화 + user_audit_logs 적재를 단일 원자적 PostgreSQL 트랜잭션으로 통합
// 🔗 @CALLS : verifyAdmin, sql.begin, isRootAdmin
// ====================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';
import { isRootAdmin } from '@/constants/admin';
import { SYSTEM_MESSAGES } from '@/constants/messages';

/**
 * Supabase 서비스 롤 클라이언트 환경 설정
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Supabase 관리자 권한 클라이언트 인스턴스 (서버 사이드 전용)
 */
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * ========================================================================================
 * 📌 [함수명] GET
 * [GET] 등록된 전체 관리자 목록을 최신순으로 조회하고, ROOT_ADMIN 여부(is_root)를 주입하여 반환합니다.
 *
 * @param {Request} req - 인입된 HTTP GET 요청 객체 (Authorization Bearer 토큰 포함)
 * @returns {Promise<NextResponse>} 관리자 목록 배열이 포함된 표준 JSON 응답 객체
 * @throws 401(인증 실패), 403(관리자 권한 미달), 500(DB 조회 오류)
 *
 * @example
 * // GET /api/admin/admins
 * // Headers: { Authorization: "Bearer <JWT>" }
 * ========================================================================================
 */
export async function GET(req: Request) {
  try {
    // 1. 관리자 세션 및 접근 권한 검증 (SUPER / SUPPORT)
    const { user, error: authErr } = await verifyAdmin(req);
    if (authErr || !user) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // 2. 전체 관리자 목록 조회 (생성일시 기준 내림차순 정렬)
    const admins = await sql`
      SELECT id, user_id, email, admin_role, is_active, created_at, updated_at
      FROM public.admins
      ORDER BY created_at DESC
    `;

    // 3. 환경변수 기반 최상위 관리자 여부(is_root) 동적 주입 (클라이언트 하드코딩 방어)
    const adminsWithRoot = (admins as any[]).map(row => ({
      ...row,
      is_root: isRootAdmin(row.email),
    }));

    return NextResponse.json({ success: true, data: adminsWithRoot });
  } catch (error: any) {
    console.error('[Admin API] Error fetching admins:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

/**
 * ========================================================================================
 * 📌 [함수명] POST
 * [POST] 사전 가입된 온리비 일반 회원을 관리자로 신규 임명(승격)하고 감사 로그를 기록합니다.
 * "선 가입 원칙"에 따라 public.users에 사전 등록되지 않은 회원은 관리자로 임명할 수 없습니다.
 *
 * @param {Request} req - 인입된 HTTP POST 요청 객체 (Body: { email, role })
 * @returns {Promise<NextResponse>} 관리자 임명 성공 메시지가 포함된 JSON 응답 객체
 * @throws 400(파라미터 누락, 이미 등록된 관리자), 403(SUPER 권한 미보유), 404(미가입 회원), 500(DB 트랜잭션 오류)
 *
 * @example
 * // POST /api/admin/admins
 * // Body: { "email": "admin@example.com", "role": "SUPPORT" }
 * ========================================================================================
 */
export async function POST(req: Request) {
  try {
    // 1. 최고 관리자(SUPER) 권한 엄격 검증
    const { user, adminRole, error: authErr } = await verifyAdmin(req, true);
    if (authErr || !user || adminRole !== 'SUPER') {
      return NextResponse.json({ success: false, error: 'SUPER 권한이 필요합니다.' }, { status: 403 });
    }

    // 2. 요청 본문 파싱 및 필수 파라미터 추출
    const body = await req.json().catch(() => ({}));
    const { email, role } = body;
    const adminId = user.id;

    // 파라미터 필수값 검증
    if (!email || !role) {
      return NextResponse.json({ success: false, error: '이메일과 권한(Role)은 필수입니다.' }, { status: 400 });
    }

    // 3. 파라미터 대소문자 및 공백 정규화
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim().toUpperCase();

    // 4. 단일 원자적 DB 트랜잭션 (선 가입 확인 + 관리자 중복 검사 + admins 등록 + 감사로그 적재)
    const result = await sql.begin(async (tx) => {
      // 4-1. [선 가입 원칙] 온리비 서비스에 정상 등록된 활성 회원인지 사전 조회
      const userCheck = await tx`
        SELECT id, email FROM public.users WHERE LOWER(email) = ${normalizedEmail} AND is_deleted = false LIMIT 1
      `;

      if (userCheck.length === 0) {
        return { success: false, error: '가입되지 않은 회원입니다. 먼저 온리비에 회원가입을 진행해 주세요.', status: 404 };
      }

      const targetUserId = userCheck[0].id;

      // 4-2. 관리자 권한 테이블 중복 등록 여부 확인
      const existing = await tx`
        SELECT id FROM public.admins WHERE user_id = ${targetUserId}::uuid OR LOWER(email) = ${normalizedEmail} LIMIT 1
      `;
      if (existing.length > 0) {
        return { success: false, error: '이미 등록된 관리자입니다.', status: 400 };
      }

      // 4-3. 관리자 테이블에 권한 레코드 등록 (일반 회원 ➔ 관리자 권한 승격)
      await tx`
        INSERT INTO public.admins (user_id, email, admin_role, created_at, updated_at)
        VALUES (${targetUserId}::uuid, ${normalizedEmail}, ${normalizedRole}, NOW(), NOW())
      `;

      // 4-4. 관리자 초대 감사 로그 적재
      await tx`
        INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES (${targetUserId}::uuid, ${adminId || null}::uuid, 'ADMIN_INVITE', ${'Promoted to admin as ' + normalizedRole})
      `;

      return { success: true };
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, message: '관리자가 성공적으로 등록되었습니다.' });

  } catch (error: any) {
    console.error('[Admin API] Error inviting admin:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

/**
 * ========================================================================================
 * 📌 [함수명] PATCH
 * [PATCH] 대상 관리자의 권한 등급(SUPER/SUPPORT)을 변경하고 감사 로그를 기록합니다.
 * 대상 레코드 비관적 행 잠금(FOR UPDATE) 및 ROOT_ADMIN 보호 가드가 적용됩니다.
 *
 * @param {Request} req - 인입된 HTTP PATCH 요청 객체 (Body: { adminTargetId, newRole })
 * @returns {Promise<NextResponse>} 권한 변경 완료 결과 JSON 응답 객체
 * @throws 400(파라미터 누락, 유효하지 않은 권한 코드), 403(SUPER 권한 미보유, 최상위 관리자 변경 시도), 404(대상 관리자 없음), 500(DB 트랜잭션 오류)
 *
 * @example
 * // PATCH /api/admin/admins
 * // Body: { "adminTargetId": "adm-123", "newRole": "SUPPORT" }
 * ========================================================================================
 */
export async function PATCH(req: Request) {
  try {
    // 1. 최고 관리자(SUPER) 권한 엄격 검증
    const { user, adminRole, error: authErr } = await verifyAdmin(req, true);
    if (authErr || !user || adminRole !== 'SUPER') {
      return NextResponse.json({ success: false, error: 'SUPER 권한이 필요합니다.' }, { status: 403 });
    }

    // 2. 요청 본문 파싱 및 파라미터 유효성 검증
    const body = await req.json().catch(() => ({}));
    const { adminTargetId, newRole } = body;
    const adminId = user.id;

    if (!adminTargetId || !newRole) {
      return NextResponse.json({ success: false, error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const normalizedRole = String(newRole).trim().toUpperCase();
    if (!['SUPER', 'SUPPORT'].includes(normalizedRole)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 관리자 권한입니다.' }, { status: 400 });
    }

    // 3. 단일 트랜잭션: FOR UPDATE 잠금 ➔ ROOT_ADMIN 검증 ➔ 권한 수정 ➔ 감사로그 적재
    const result = await sql.begin(async (tx) => {
      const selected = await tx`
        SELECT id, user_id, email, admin_role
        FROM public.admins
        WHERE id = ${adminTargetId}::uuid
        FOR UPDATE
      `;

      if (selected.length === 0) {
        return { success: false, error: '해당 관리자를 찾을 수 없습니다.', status: 404 };
      }

      const targetAdmin = selected[0];

      // 클라이언트 파라미터가 아닌 DB 레코드의 실제 이메일로 최상위 관리자 보호
      if (isRootAdmin(targetAdmin.email)) {
        return { success: false, error: '최상위 관리자의 권한은 변경할 수 없습니다.', status: 403 };
      }

      // 관리자 등급 변경 반영
      await tx`
        UPDATE public.admins
        SET admin_role = ${normalizedRole}, updated_at = NOW()
        WHERE id = ${adminTargetId}::uuid
      `;

      // 권한 변경 감사 로그 적재
      await tx`
        INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES (${targetAdmin.user_id}::uuid, ${adminId || null}::uuid, 'ADMIN_ROLE_CHANGE', ${'Changed role of ' + targetAdmin.email + ' to ' + normalizedRole})
      `;

      return { success: true };
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, message: '관리자 권한이 성공적으로 변경되었습니다.' });

  } catch (error: any) {
    console.error('[Admin API] Error updating admin role:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

/**
 * ========================================================================================
 * 📌 [함수명] DELETE
 * [DELETE] 관리자 권한을 영구 회수하고 등록된 OTP(MFA) 요인을 단일 트랜잭션으로 초기화합니다.
 * 최상위 관리자 보호 및 본인 계정 권한 회수(Self-Lockout) 방어 로직이 적용되어 있습니다.
 *
 * @param {Request} req - 인입된 HTTP DELETE 요청 객체 (Query: ?adminTargetId=UUID)
 * @returns {Promise<NextResponse>} 권한 회수 및 MFA 초기화 결과 JSON 응답 객체
 * @throws 400(파라미터 누락, 본인 계정 회수 시도), 403(SUPER 권한 미보유, 최상위 관리자 회수 시도), 404(대상 관리자 없음), 500(DB 트랜잭션 오류)
 *
 * @example
 * // DELETE /api/admin/admins?adminTargetId=adm-123
 * ========================================================================================
 */
export async function DELETE(req: Request) {
  try {
    // 1. 최고 관리자(SUPER) 권한 엄격 검증
    const { user, adminRole, error: authErr } = await verifyAdmin(req, true);
    if (authErr || !user || adminRole !== 'SUPER') {
      return NextResponse.json({ success: false, error: 'SUPER 권한이 필요합니다.' }, { status: 403 });
    }

    // 2. URL 쿼리 파라미터 추출 및 유효성 검사
    const { searchParams } = new URL(req.url);
    const adminTargetId = searchParams.get('adminTargetId');
    const adminId = user.id;

    if (!adminTargetId) {
      return NextResponse.json({ success: false, error: 'adminTargetId 파라미터가 필요합니다.' }, { status: 400 });
    }

    // 3. 단일 원자적 DB 트랜잭션: FOR UPDATE 잠금 ➔ 회수 검증 ➔ admins 삭제 ➔ MFA 초기화 ➔ 감사로그 적재
    const result = await sql.begin(async (tx) => {
      const selected = await tx`
        SELECT id, user_id, email, admin_role
        FROM public.admins
        WHERE id = ${adminTargetId}::uuid
        FOR UPDATE
      `;

      if (selected.length === 0) {
        return { success: false, error: '회수할 관리자를 찾을 수 없습니다.', status: 404 };
      }

      const targetAdmin = selected[0];

      // 클라이언트 파라미터가 아닌 DB 레코드의 실제 이메일로 최상위 관리자 보호
      if (isRootAdmin(targetAdmin.email)) {
        return { success: false, error: '최상위 관리자는 비활성화(회수)할 수 없습니다.', status: 403 };
      }

      // 본인 계정 권한 회수 방어 (Self-Lockout 방지)
      if (targetAdmin.user_id === adminId) {
        return { success: false, error: '본인 계정의 관리자 권한은 직접 회수할 수 없습니다.', status: 400 };
      }

      // [원자적 작업 1] 관리자 권한 테이블에서 레코드 삭제
      await tx`
        DELETE FROM public.admins
        WHERE id = ${adminTargetId}::uuid
      `;

      // [원자적 작업 2] PostgreSQL 내부 트랜잭션으로 대상 회원의 2차 인증(TOTP MFA) 요인 즉시 초기화
      if (targetAdmin.user_id) {
        await tx`
          DELETE FROM auth.mfa_challenges
          WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = ${targetAdmin.user_id}::uuid)
        `;
        await tx`
          DELETE FROM auth.mfa_factors
          WHERE user_id = ${targetAdmin.user_id}::uuid
        `;
      }

      // [원자적 작업 3] 관리자 권한 회수 감사 로그 적재
      await tx`
        INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES (${targetAdmin.user_id || null}::uuid, ${adminId || null}::uuid, 'ADMIN_REVOKE', ${'Revoked admin access and reset MFA for ' + targetAdmin.email})
      `;

      return { success: true };
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, message: '관리자 권한이 즉시 회수되었으며, OTP 재등록이 초기화되었습니다.' });

  } catch (error: any) {
    console.error('[Admin API] Error revoking admin:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}