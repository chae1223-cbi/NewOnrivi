// 🚨 @PATCH : 2026-11-04 — [관리자 권한 해제 반영] 비활성 관리자 인증 거부
/** 🚨 @PATCH : 2026-11-02 — 로그인 직후 MFA 이전 관리자 권한 사전 확인(allowPreMfa) 파라미터 지원 */
/** 🚨 @PATCH : 2026-11-02 — Supabase Auth 토큰 검증은 유지하고 관리자 역할 조회만 PostgreSQL로 통일한다. */
import { supabaseAdmin } from './supabaseAdmin';
import { sql } from './db';
import { SYSTEM_MESSAGES } from '@/constants/messages';
import { DB_CODES } from '@/constants/dbCodes';

export function hasVerifiedAdminMfa(token: string, userId: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.sub === userId && payload.aal === 'aal2';
  } catch {
    return false;
  }
}

export async function verifyAdmin(request: Request, requireSuper: boolean = false, allowPreMfa: boolean = false) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return { user: null, error: 'Unauthorized (No token)' };

    const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return { user: null, error: 'Unauthorized (Invalid bearer token)' };
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return { user: null, error: 'Unauthorized (Invalid token)' };
    }
    if (!allowPreMfa && !hasVerifiedAdminMfa(token, user.id)) {
      return { user: null, error: 'Forbidden (MFA required)' };
    }

    const adminRows = await sql`SELECT admin_role, is_active FROM public.admins WHERE user_id = ${user.id}::uuid LIMIT 1`;
    const adminUser = adminRows[0];
    if (!adminUser || !adminUser.is_active || ![DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT].includes(adminUser.admin_role)) {
      return { user: null, error: 'Forbidden (Not an admin)' };
    }

    if (requireSuper && adminUser.admin_role !== DB_CODES.ADMIN_ROLE.SUPER) {
      return { user: null, error: 'Forbidden (SUPER role required)' };
    }

    return { user, adminRole: adminUser.admin_role, error: null };
  } catch {
    return { user: null, error: SYSTEM_MESSAGES.DATABASE_ERROR.text };
  }
}
