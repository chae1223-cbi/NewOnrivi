// ====================================================================
// 📊 [OMD-AUTH-verify-desktop-0003 ✅ FIXED] frontend/functions/api/license/verify-desktop.js
// 🎯 @KICK  : Cloudflare Pages 데스크탑 앱 라이선스 인증 및 세션 검증
// 🛡️ @GUARD : is_active=true 활성 세션만 집계, 데스크탑 전용 기기 필터링 및 동시접속 1대 가드
// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction으로 교체
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) 다중 REST 호출로 인한 데스크탑 동시접속 레이스 컨디션을 PostgreSQL 단일 원자적 트랜잭션(withDbTransaction) 및 행 잠금(FOR UPDATE)으로 방어
//             2) 데스크탑 지원 활성 구독(ELITEPRO/DESKTOP) 행 잠금 및 타 데스크탑 기기 활성화 상태 엄격 검증
//             3) forceTakeover 및 기존 세션 갱신/신규 등록 원자적 일괄 처리
//             4) serverError 연동으로 오류 추적성 및 한국어 에러 메시지 표준화
// 🚨 @PATCH : **2026-09-16** — [데스크톱 세션 검증 is_active=true 필터링 및 데스크톱 기기 구분 집계]: 과거 비활성화(is_active=false)된 이전 세션이 기기 수에 누적 합산되어 발생하던 ERR_MAX_DEVICES_EXCEEDED 차단 오류 해결, 데스크탑(Desktop App) 기기만 한도(1대)로 독립 집계
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

  try {
    const body = await request.json().catch(() => ({}));
    const { p_email, p_device_uuid, p_force_takeover } = body;

    if (!p_email || !p_device_uuid) {
      return new Response(JSON.stringify({
        success: false,
        code: 'MISSING_PARAM',
        message: '필수 파라미터가 누락되었습니다.'
      }), { status: 400, headers: corsHeaders });
    }

    const cleanInput = String(p_email).trim();
    const cleanDeviceUuid = String(p_device_uuid).trim();
    const isForceTakeover = Boolean(p_force_takeover);

    const outcome = await withDbTransaction(env, async db => {
      // 1. 유저 확인 (이메일 또는 UUID 동시 지원)
      let userRes;
      if (UUID.test(cleanInput)) {
        userRes = await db.query(
          `SELECT id, email FROM public.users WHERE id = $1 LIMIT 1`,
          [cleanInput]
        );
      } else {
        userRes = await db.query(
          `SELECT id, email FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [cleanInput]
        );
      }

      if (!userRes.rows.length) {
        return {
          status: 200,
          body: { success: false, code: 'NOT_FOUND', message: '등록되지 않은 사용자입니다.' }
        };
      }

      const userId = userRes.rows[0].id;

      // 2. 데스크탑 활성 구독 확인 (ELITEPRO 또는 DESKTOP 요금제) 및 동시성 방어 행 잠금
      const subRes = await db.query(
        `SELECT id, user_id, plan_name, plan_status, is_active, license_key, verify_key, payment_no, current_period_end
         FROM public.subscriptions
         WHERE user_id = $1
           AND is_active = true
           AND plan_status IN ('ACTIVE', 'FREE')
           AND (UPPER(plan_name) LIKE '%ELITE%' OR UPPER(plan_name) LIKE '%DESKTOP%')
         ORDER BY current_period_end DESC
         FOR UPDATE`,
        [userId]
      );

      if (!subRes.rows.length) {
        return {
          status: 200,
          body: { success: false, code: 'NO_PLAN', message: '데스크탑을 지원하는 요금제 구독이 없습니다.' }
        };
      }

      const sub = subRes.rows[0];

      if (!sub.license_key) {
        return {
          status: 200,
          body: { success: false, code: 'NO_LICENSE', message: '라이선스 키가 발급되지 않았습니다.' }
        };
      }

      // 2-1. 공통코드에서 plan_name 명칭(code_name) 조회
      let displayPlanName = sub.plan_name;
      const ccRes = await db.query(
        `SELECT code_name FROM public.common_codes WHERE group_code = 'PLAN_NAME' AND code_value = $1 LIMIT 1`,
        [sub.plan_name]
      );
      if (ccRes.rows.length && ccRes.rows[0].code_name) {
        displayPlanName = ccRes.rows[0].code_name;
      }

      // 3. 기존 동일 기기 세션 확인 (동시 접근 방어를 위한 행 잠금)
      const deviceRes = await db.query(
        `SELECT id, subscription_id, device_uuid, device_name, is_active
         FROM public.license_activations
         WHERE subscription_id = $1 AND LOWER(device_uuid) = LOWER($2)
         LIMIT 1
         FOR UPDATE`,
        [sub.id, cleanDeviceUuid]
      );
      const existingDevice = deviceRes.rows[0] || null;

      // 4. 제어권 인수(forceTakeover) 요청 시 타 활성 데스크탑 세션 비활성화
      if (isForceTakeover) {
        await db.query(
          `UPDATE public.license_activations
           SET is_active = false, updated_at = NOW()
           WHERE subscription_id = $1
             AND LOWER(device_uuid) != LOWER($2)
             AND device_name ILIKE '%desktop%'
             AND is_active = true`,
          [sub.id, cleanDeviceUuid]
        );
      }

      // 5. 타 활성 데스크탑 세션 수 카운트 (데스크탑 1대 한도 체크)
      const otherActiveRes = await db.query(
        `SELECT id
         FROM public.license_activations
         WHERE subscription_id = $1
           AND LOWER(device_uuid) != LOWER($2)
           AND is_active = true
           AND device_name ILIKE '%desktop%'`,
        [sub.id, cleanDeviceUuid]
      );
      const hasOtherActive = otherActiveRes.rows.length >= 1;

      // 이미 다른 데스크탑이 활성화되어 있고, 제어권 인수가 아니며, 현재 기기가 비활성(또는 신규)인 경우 차단
      if (hasOtherActive && !isForceTakeover && (!existingDevice || !existingDevice.is_active)) {
        return {
          status: 200,
          body: {
            success: false,
            code: 'ERR_MAX_DEVICES_EXCEEDED',
            message: '데스크탑 동시 접속 허용 대수(1대)를 초과했습니다. 다른 데스크탑에서 사용 중입니다.',
            max_devices: 1,
            current_devices: otherActiveRes.rows.length,
            verify_key: sub.verify_key || '',
            payment_no: sub.payment_no || '',
            license_key: sub.license_key || '',
            plan_name: displayPlanName,
            next_payment_date: sub.current_period_end,
            rank: 1
          }
        };
      }

      // 6. 기존 세션 활성화 및 갱신
      if (existingDevice) {
        await db.query(
          `UPDATE public.license_activations
           SET updated_at = NOW(),
               activated_at = NOW(),
               is_active = true,
               device_name = 'Desktop App'
           WHERE id = $1`,
          [existingDevice.id]
        );

        return {
          status: 200,
          body: {
            success: true,
            code: 'SUCCESS',
            message: '데스크탑 기기가 확인되었습니다.',
            subscription_id: sub.id,
            license_id: sub.id,
            device_uuid: cleanDeviceUuid,
            max_devices: 1,
            verify_key: sub.verify_key || '',
            payment_no: sub.payment_no || '',
            license_key: sub.license_key || '',
            plan_name: displayPlanName,
            next_payment_date: sub.current_period_end,
            rank: 1
          }
        };
      }

      // 7. 신규 기기 등록 시 타 활성 데스크탑 기기 존재 여부 확인 방어
      if (hasOtherActive && !isForceTakeover) {
        return {
          status: 200,
          body: {
            success: false,
            code: 'ERR_MAX_DEVICES_EXCEEDED',
            message: '데스크탑 동시 접속 허용 대수(1대)를 초과했습니다. 웹 대시보드에서 기존 데스크탑 기기를 해제해 주세요.',
            max_devices: 1,
            verify_key: sub.verify_key || '',
            payment_no: sub.payment_no || '',
            license_key: sub.license_key || '',
            plan_name: displayPlanName,
            next_payment_date: sub.current_period_end,
            rank: 1
          }
        };
      }

      // 8. 신규 데스크탑 기기 추가
      await db.query(
        `INSERT INTO public.license_activations (
           subscription_id, device_uuid, device_name, is_active, created_by, updated_by, activated_at, updated_at
         ) VALUES ($1, $2, 'Desktop App', true, $3, $3, NOW(), NOW())`,
        [sub.id, cleanDeviceUuid, userId]
      );

      return {
        status: 200,
        body: {
          success: true,
          code: 'SUCCESS',
          message: '데스크탑 기기가 성공적으로 등록되었습니다.',
          subscription_id: sub.id,
          license_id: sub.id,
          device_uuid: cleanDeviceUuid,
          max_devices: 1,
          verify_key: sub.verify_key || '',
          payment_no: sub.payment_no || '',
          license_key: sub.license_key || '',
          plan_name: displayPlanName,
          next_payment_date: sub.current_period_end,
          rank: 1
        }
      };
    });

    return new Response(JSON.stringify(outcome.body), {
      status: outcome.status,
      headers: corsHeaders,
    });
  } catch (err) {
    return serverError(request, err, {
      source: 'functions/api/license/verify-desktop.js',
      stage: 'verify-desktop',
      message: '데스크탑 라이선스 세션 확인 중 오류가 발생했습니다.'
    });
  }
}
