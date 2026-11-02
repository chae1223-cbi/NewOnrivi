// ====================================================================
// 📊 [OMD-API-userUpsert-0001] functions/api/user/upsert.js ➔ onRequestPost
// 🎯 @KICK  : 로그인된 사용자 정보를 users 테이블에 등록/갱신(UPSERT)하고, 최초 가입자에게 14일 무료체험(APPRENTICE) 구독권을 원자적(All-or-Nothing)으로 자동 발급
// 🛡️ @GUARD : 본인 토큰 일치 검증(403 차단), 비밀번호 직접 변경 차단(400 거절), PostgreSQL 단일 트랜잭션(withDbTransaction) 적용
// 🚨 @PATCH : **2026-11-02** — [소스 주석 표준화] 표준 OMD 블록 주석 및 UPSERT & 14일 무료체험 자동 발급 라인별 상세 해설 주석 추가
// 🚨 @PATCH : 2026-11-02 — [3순위 DB 처리 표준화] Supabase REST 종속을 제거하고 공통 _db.js의 withDbTransaction(PostgreSQL 직접 연결) 적용
// 🔗 @CALLS : getAuthUser, withDbTransaction (PostgreSQL public.users, public.subscriptions), Supabase Auth Admin API
// ====================================================================

import { getAuthUser, withDbTransaction } from '../_db.js';

// ========================================================================================
// 🌐 CORS 및 보안 응답 헤더 설정
// ========================================================================================
const headers = {
  'Access-Control-Allow-Origin': '*',                              // 모든 오리진 허용 (CORS 지원)
  'Access-Control-Allow-Methods': 'POST, OPTIONS',                 // 허용할 HTTP 메서드 (등록/갱신 POST, 사전 요청 OPTIONS)
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',   // JWT Bearer 토큰 및 JSON 본문 수신 허용
  'Content-Type': 'application/json',                              // 응답 본문 JSON 형식 명시
  'Cache-Control': 'no-store',                                     // 민감 회원 정보 캐싱 방지
};

/**
 * 표준 JSON HTTP Response 객체를 생성하는 헬퍼 함수
 * @param {object} body - 응답 본문 JSON 객체
 * @param {number} [status=200] - HTTP 상태 코드 (기본값: 200 OK)
 * @returns {Response}
 */
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

/**
 * 암호학적으로 안전한 랜덤 대문자 16진수 문자열을 생성하는 헬퍼 함수 (라이선스 키, 결제번호 등에 사용)
 * @param {number} size - 생성할 바이트 크기 (예: 8바이트 = 16자리 16진수)
 * @returns {string} 대문자 16진수 문자열 (예: 'A1B2C3D4E5F67890')
 */
const randomHex = size => Array.from(crypto.getRandomValues(new Uint8Array(size)), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

/**
 * ========================================================================================
 * onRequestOptions
 * ----------------------------------------------------------------------------------------
 * 🎯 목적:
 *   브라우저의 CORS Preflight(사전 요청) OPTIONS 호출에 대해 200 빈 응답을 반환하여 본 요청을 허용합니다.
 * 📤 @returns {Response} 200 OK 빈 응답
 * ========================================================================================
 */
export async function onRequestOptions() {
  return new Response(null, { headers });
}

/**
 * ========================================================================================
 * onRequestPost
 * ----------------------------------------------------------------------------------------
 * 🎯 목적:
 *   1. JWT 인증 토큰으로 요청자가 본인인지 검증 (타인 정보 변조 방어)
 *   2. PostgreSQL public.users 테이블에 회원 정보 UPSERT (기존 회원이면 닉네임/최근접속일 갱신, 신규면 등록)
 *   3. 기존 구독 이력이 전혀 없는 신규 가입자인 경우, 14일 무료 체험(APPRENTICE) 구독권을 원자적으로 자동 발급
 *   4. 필요 시 Supabase Auth의 유저 메타데이터에도 닉네임을 백그라운드 동기화
 * 
 * 📥 매개변수:
 *   - @param {object} context
 *   - @param {Request} context.request - 클라이언트의 HTTP 요청 (Headers: Authorization Bearer, Body: { p_id, p_email, p_provider, p_nick_name })
 *   - @param {object} context.env - Cloudflare 환경변수 (DB 연결 정보 및 Supabase 키)
 * 
 * 📤 반환값:
 *   - @returns {Promise<Response>} 
 *     - 성공 시: { success: true, code: 'SUCCESS', message: '사용자 정보가 저장되었습니다.' }
 *     - 권한 없음: 401 Unauthorized / 403 Forbidden
 *     - 잘못된 파라미터: 400 Bad Request
 *     - DB 장애: 500 Internal Server Error
 * ========================================================================================
 */
export async function onRequestPost({ request, env }) {
  try {
    // 1. [요청 본문 파싱] 클라이언트가 보낸 회원 정보 추출
    const { p_id, p_email, p_provider, p_nick_name, p_password } = await request.json();

    // 2. [보안 가드 1: 비밀번호 직접 변경 차단]
    // 비밀번호는 이 API를 통해 직접 바꿀 수 없으며, 반드시 인증 서비스의 정식 비밀번호 재설정 절차를 거쳐야 함
    if (p_password !== undefined) {
      return reply({ success: false, code: 'INVALID_PARAMS', message: '비밀번호는 인증 서비스의 재설정 절차로 변경해 주세요.' }, 400);
    }

    // 3. [보안 가드 2: JWT 토큰 유효성 검증]
    // Authorization 헤더의 Bearer 토큰을 검증하여 현재 로그인된 진짜 사용자 객체를 가져옴
    const user = await getAuthUser(request, env);
    if (!user?.id) {
      return reply({ success: false, code: 'UNAUTHORIZED', message: '다시 로그인해 주세요.' }, 401);
    }

    // 4. [보안 가드 3: 본인 확인 (타인 계정 조작 원천 차단)]
    // 토큰의 실제 유저 ID와 요청 본문의 p_id, p_email이 100% 일치해야만 허용 (ID 스푸핑 방어)
    const email = typeof p_email === 'string' ? p_email.trim().toLowerCase() : '';
    if (user.id !== p_id || !email || user.email?.toLowerCase() !== email) {
      return reply({ success: false, code: 'FORBIDDEN', message: '본인 계정만 저장할 수 있습니다.' }, 403);
    }

    // 5. [가입 경로 및 닉네임 정규화]
    const provider = String(p_provider || user.app_metadata?.provider || 'EMAIL').trim().toUpperCase();
    const nickName = typeof p_nick_name === 'string' ? p_nick_name.trim() : null;

    // 6. [PostgreSQL 단일 원자적 트랜잭션 실행 (withDbTransaction)]
    // 유저 UPSERT와 무료 체험권 발급이 둘 다 완벽히 성공해야만 커밋(All-or-Nothing)
    await withDbTransaction(env, async (db) => {
      // ── A. users 테이블 UPSERT (삽입 또는 갱신) ───────────────────────────────────
      // 이미 존재하는 ID면 이메일/닉네임/최근수정일을 갱신하고, 탈퇴 상태(is_deleted)를 해제함
      await db.query(`
        INSERT INTO public.users
          (id, created_by, created_at, updated_by, updated_at, email, provider, is_deleted, deleted_at, nick_name)
        VALUES ($1, $1, now(), $1, now(), $2, $3, false, null, $4)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email, provider = EXCLUDED.provider,
          updated_by = EXCLUDED.id, updated_at = now(),
          is_deleted = false, deleted_at = null,
          nick_name = COALESCE(EXCLUDED.nick_name, users.nick_name)`,
        [user.id, email, provider, nickName]);

      // ── B. 신규 가입자 14일 무료 체험(APPRENTICE) 자동 발급 ─────────────────────────
      // 해당 사용자의 기존 구독 이력이 단 하나도 없는 경우에만 원자적으로 14일 무료 라이선스 생성
      const subExists = await db.query(
        'SELECT id FROM public.subscriptions WHERE user_id = $1 LIMIT 1',
        [user.id]
      );

      if (!subExists.rows.length) {
        const subId = crypto.randomUUID();                                                             // 고유 구독 ID (UUID)
        const licenseKey = randomHex(8);                                                               // 라이선스 키 (16자리 16진수)
        const verifyKey = randomHex(8);                                                                // 위변조 검증 키 (16자리 16진수)
        const paymentNo = `TRIAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex(4)}`; // 결제번호 (예: TRIAL-20261102-A1B2)

        await db.query(`
          INSERT INTO public.subscriptions
            (id, user_id, created_by, updated_by, plan_name, plan_status, billing_cycle,
             license_key, verify_key, payment_no, max_devices, price_amount,
             current_period_start, current_period_end, is_active, created_at, updated_at)
          VALUES ($1, $2, $2, $2, 'APPRENTICE', 'ACTIVE', 'TRIAL',
                  $3, $4, $5, 1, 0,
                  now(), now() + interval '14 days', true, now(), now())`,
          [subId, user.id, licenseKey, verifyKey, paymentNo]
        );
      }
    });

    // 7. [외부 서비스 비동기 동기화: Supabase Auth 메타데이터 갱신]
    // Auth 프로필은 DB 트랜잭션 밖의 외부 HTTP 서비스이므로, 만약 통신이 실패하더라도 이미 DB에 쓰인 회원 정보는 롤백하지 않고 유지
    if (nickName !== null && env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const profile = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_metadata: { ...user.user_metadata, nick_name: nickName, name: nickName } }),
        });
        if (!profile.ok) console.warn('[/api/user/upsert] Auth metadata sync failed', profile.status);
      } catch (error) {
        console.warn('[/api/user/upsert] Auth metadata sync failed', error);
      }
    }

    // 8. [최종 성공 응답 반환]
    return reply({ success: true, code: 'SUCCESS', message: '사용자 정보가 저장되었습니다.' });

  } catch (error) {
    // 9. [서버 장애 예외 처리]
    console.error('[/api/user/upsert] failed', error);
    return reply({ success: false, code: 'DB_ERROR', message: '사용자 정보를 저장할 수 없습니다.' }, 500);
  }
}
