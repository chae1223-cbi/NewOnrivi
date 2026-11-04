// ====================================================================
// 📊 [OMD-SUB-get-0002 ✅ FIXED] frontend/functions/api/subscription/get.js
// 🎯 @KICK  : 사용자 구독 정보, 라이선스 키, 기기 세션 및 구독 이력 조회 (만료 자동 처리 및 기본 플랜 발급)
// 🛡️ @GUARD : 만료 구독 자동 EXPIRED, 신규 유저 APPRENTICE(14일) 자동 발급, 만료자 READER 자동 발급 및 단일 원자적 트랜잭션 보장
// 🚨 @PATCH : 2026-11-04 — [오류 진단 로깅 4단계 완성] 4xx 클라이언트 경고 pre-logging 추가 및 catch target 식별자 참조 안전화
// 🚨 @PATCH : 2026-11-03 — [오류 진단 로깅 4단계]: serverError에 doing, target 명시로 정밀 진단 연계
// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction으로 교체
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) 다중 Supabase REST API 호출을 PostgreSQL 단일 원자적 트랜잭션(withDbTransaction)으로 전환
//             2) 유저 단위 행 잠금(FOR UPDATE)으로 신규 무료체험 및 READER 플랜 중복 생성 레이스 컨디션 차단
//             3) 만료일 경과 구독 일괄 EXPIRED 및 기기 세션 정리 원자적 처리
//             4) 공통 코드(PLAN_NAME, BILLING_CYCLE, PLAN_STATUS) 매핑 및 serverError 연동
// 🔗 @CALLS : PostgreSQL withDbTransaction (users, subscriptions, license_activations, common_codes)
// ====================================================================
import { withDbTransaction } from '../_db.js';
import { serverError } from '../_server-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let targetUserIdentifier = 'USER';

  try {
    const body = await request.json().catch(() => ({}));
    let { user_id: userId } = body;
    if (userId) targetUserIdentifier = String(userId).slice(0, 50);

    if (!userId) {
      console.warn(`[ClientWarn] HTTP 400 · INVALID_PARAMS · user_id 파라미터가 필요합니다. [경로: /api/subscription/get]`);
      return new Response(JSON.stringify({
        success: false,
        code: 'INVALID_PARAMS',
        message: 'user_id 파라미터가 필요합니다.'
      }), { status: 400, headers: corsHeaders });
    }

    const cleanInput = String(userId).trim();

    const outcome = await withDbTransaction(env, async db => {
      // 0. UUID 검증 및 Email -> UUID 변환 (유저 식별 및 행 잠금으로 동시 발급 방어)
      let userRes;
      if (UUID.test(cleanInput)) {
        userRes = await db.query(
          `SELECT id, email FROM public.users WHERE id = $1 FOR UPDATE`,
          [cleanInput]
        );
      } else {
        userRes = await db.query(
          `SELECT id, email FROM public.users WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
          [cleanInput]
        );
      }

      if (!userRes.rows.length) {
        return {
          status: 404,
          body: { success: false, code: 'NOT_FOUND', message: '해당 이메일의 사용자를 찾을 수 없습니다.' }
        };
      }

      const targetUserId = userRes.rows[0].id;

      // 1. 만료된 구독 자동 EXPIRED 처리
      await db.query(
        `UPDATE public.subscriptions
         SET plan_status = 'EXPIRED', is_active = false, updated_at = NOW()
         WHERE user_id = $1
           AND current_period_end < NOW()
           AND plan_status != 'EXPIRED'`,
        [targetUserId]
      );

      // 2. Fetch subscriptions & common_codes
      const [subRes, codeRes] = await Promise.all([
        db.query(
          `SELECT id, user_id, plan_name, plan_status, billing_cycle, is_active, max_devices,
                  price_amount, current_period_start, current_period_end, payment_no,
                  license_key, verify_key, created_at, updated_at
           FROM public.subscriptions
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [targetUserId]
        ),
        db.query(
          `SELECT group_code, code_value, code_name
           FROM public.common_codes
           WHERE group_code IN ('PLAN_NAME', 'BILLING_CYCLE', 'PLAN_STATUS')`
        )
      ]);

      let rawSubs = subRes.rows;
      const codes = codeRes.rows;

      // 3. 신규 유저(구독 없음) 자동 14일 무료 체험(APPRENTICE) 발급
      if (rawSubs.length === 0) {
        const trialPaymentNo = 'TRIAL-' + Date.now();
        const trialLicenseKey = 'TRIAL-' + Math.random().toString(36).substring(2, 15).toUpperCase();
        const trialVerifyKey = Math.random().toString(36).substring(2, 15).toUpperCase();

        const insertTrialRes = await db.query(
          `INSERT INTO public.subscriptions (
             user_id, plan_name, plan_status, billing_cycle, is_active, max_devices,
             price_amount, current_period_start, current_period_end, payment_no, license_key, verify_key,
             created_at, updated_at
           ) VALUES (
             $1, 'APPRENTICE', 'ACTIVE', 'TRIAL', true, 1,
             0, NOW(), NOW() + INTERVAL '14 days', $2, $3, $4,
             NOW(), NOW()
           )
           RETURNING *`,
          [targetUserId, trialPaymentNo, trialLicenseKey, trialVerifyKey]
        );

        rawSubs = insertTrialRes.rows;
      } else {
        const hasApprenticeHistory = rawSubs.some(s => (s.plan_name || '').toUpperCase() === 'APPRENTICE');
        const hasActiveSub = rawSubs.some(s => s.is_active && ['ACTIVE', 'FREE'].includes((s.plan_status || '').toUpperCase()));

        // 4. 기존 단독 READER 계정 중 Apprentice 미경험자는 14일 체험 승급
        if (!hasApprenticeHistory && rawSubs.length === 1 && rawSubs[0].plan_name === 'READER') {
          const trialPaymentNo = 'TRIAL-' + Date.now();
          const trialLicenseKey = 'TRIAL-' + Math.random().toString(36).substring(2, 15).toUpperCase();
          const trialVerifyKey = Math.random().toString(36).substring(2, 15).toUpperCase();

          const updateTrialRes = await db.query(
            `UPDATE public.subscriptions
             SET plan_name = 'APPRENTICE',
                 plan_status = 'ACTIVE',
                 billing_cycle = 'TRIAL',
                 is_active = true,
                 price_amount = 0,
                 current_period_start = NOW(),
                 current_period_end = NOW() + INTERVAL '14 days',
                 payment_no = $2,
                 license_key = $3,
                 verify_key = $4,
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [rawSubs[0].id, trialPaymentNo, trialLicenseKey, trialVerifyKey]
          );

          if (updateTrialRes.rows.length) {
            rawSubs[0] = updateTrialRes.rows[0];
          }
        } else if (!hasActiveSub) {
          // 5. 14일 무료 체험(Apprentice) 또는 유료 구독 만료 후 활성 구독이 없는 경우 자동으로 READER 등급 발급
          const readerPaymentNo = 'READER-' + Date.now();
          const readerLicenseKey = 'READER-' + Math.random().toString(36).substring(2, 15).toUpperCase();
          const readerVerifyKey = Math.random().toString(36).substring(2, 15).toUpperCase();

          const insertReaderRes = await db.query(
            `INSERT INTO public.subscriptions (
               user_id, plan_name, plan_status, billing_cycle, is_active, max_devices,
               price_amount, current_period_start, current_period_end, payment_no, license_key, verify_key,
               created_at, updated_at
             ) VALUES (
               $1, 'READER', 'ACTIVE', 'FREE', true, 1,
               0, NOW(), '9999-12-31 23:59:59+00', $2, $3, $4,
               NOW(), NOW()
             )
             RETURNING *`,
            [targetUserId, readerPaymentNo, readerLicenseKey, readerVerifyKey]
          );

          if (insertReaderRes.rows.length) {
            rawSubs.unshift(insertReaderRes.rows[0]);
          }

          // 만료된 구독들의 활성 기기 세션 비활성화 정리
          const expiredSubIds = rawSubs
            .filter(s => (s.plan_status || '').toUpperCase() === 'EXPIRED')
            .map(s => s.id);

          if (expiredSubIds.length > 0) {
            await db.query(
              `UPDATE public.license_activations
               SET is_active = false, updated_at = NOW()
               WHERE subscription_id = ANY($1) AND is_active = true`,
              [expiredSubIds]
            );
          }
        }
      }

      // 6. 공통 코드 매핑
      const getCodeName = (groupCode, codeValue, fallback) => {
        if (!codes || !Array.isArray(codes)) return fallback;
        const match = codes.find(c => c.group_code === groupCode && (c.code_value || '').toUpperCase() === (codeValue || '').toUpperCase());
        return match ? match.code_name : fallback;
      };

      const allSubs = rawSubs.map(s => ({
        ...s,
        plan_name_kr: getCodeName('PLAN_NAME', s.plan_name, s.plan_name),
        billing_cycle_kr: getCodeName('BILLING_CYCLE', s.billing_cycle, s.billing_cycle),
        plan_status_kr: getCodeName('PLAN_STATUS', s.plan_status, s.plan_status)
      }));

      // 7. 활성 구독 및 최근 구독 확인
      const activeSub = allSubs.find(s => (s.is_active && (s.plan_status || '').toUpperCase() === 'ACTIVE') || (s.plan_status || '').toUpperCase() === 'FREE');
      const latestSub = activeSub || allSubs[0];

      // 8. 기기 세션(license_activations) 조회
      const activeSubIds = allSubs
        .filter(s => (s.plan_status || '').toUpperCase() === 'ACTIVE' || (s.plan_status || '').toUpperCase() === 'FREE')
        .map(s => s.id);
      const validSubIds = activeSubIds.length > 0 ? activeSubIds : (latestSub ? [latestSub.id] : []);

      let activations = [];
      if (validSubIds.length > 0) {
        const actRes = await db.query(
          `SELECT id, subscription_id, device_uuid, device_name, activated_at, updated_at, is_active
           FROM public.license_activations
           WHERE subscription_id = ANY($1)
           ORDER BY activated_at DESC`,
          [validSubIds]
        );
        activations = actRes.rows.map(a => ({
          ...a,
          license_id: a.subscription_id
        }));
      }

      const mappedDevices = activations.map(device => {
        const matchedSub = allSubs.find(s => s.id === device.license_id);
        return {
          ...device,
          payment_no: matchedSub ? matchedSub.payment_no : '',
          is_active_license: latestSub ? matchedSub?.id === latestSub.id : false
        };
      });

      return {
        status: 200,
        body: {
          success: true,
          subscription: latestSub ? {
            ...latestSub,
            active_device_count: mappedDevices.filter(device =>
              device.is_active === true &&
              ['web saas', 'web browser'].includes((device.device_name || '').trim().toLowerCase()) &&
              Date.now() - new Date(device.updated_at || device.activated_at).getTime() < 2 * 60 * 1000
            ).length
          } : null,
          historyList: allSubs,
          license: latestSub ? {
            id: latestSub.id,
            license_key: latestSub.license_key || '',
            verify_key: latestSub.verify_key || '',
            payment_no: latestSub.payment_no || ''
          } : null,
          devices: mappedDevices
        }
      };
    });

    if (outcome.status >= 400 && outcome.status < 500) {
      console.warn(`[ClientWarn] HTTP ${outcome.status} · ${outcome.body?.code} · ${outcome.body?.message} [경로: /api/subscription/get]`);
    }

    return new Response(JSON.stringify(outcome.body), {
      status: outcome.status,
      headers: corsHeaders,
    });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/subscription/get.js',
      stage: 'subscription-get',
      doing: '사용자 구독/라이선스/기기 목록 조회 중',
      target: targetUserIdentifier,
      message: '구독 정보를 불러오는 중 오류가 발생했습니다.'
    });
  }
}
