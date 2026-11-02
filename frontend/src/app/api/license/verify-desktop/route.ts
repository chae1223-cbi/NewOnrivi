// ====================================================================
// 📊 [OMD-AUTH-verify-desktop-0002 ✅ FIXED] /api/license/verify-desktop
// 🎯 @KICK  : 데스크탑 앱 실행 시 이메일 기반 라이선스 인증 및 Desktop 기기 세션 안전 등록
// 🛡️ @GUARD : 데스크탑 1대 한도 검사 및 활성 구독(ELITEPRO / DESKTOP) 검증 가드
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) supabaseAdmin 다중 호출을 PostgreSQL 원자적 트랜잭션(sql.begin) 및 행 잠금(FOR UPDATE)으로 전환
//             2) 데스크탑 동시접속 1대 한도 경쟁상태(Race Condition) 원천 차단
//             3) forceTakeover 및 기존 세션 갱신/신규 등록 원자적 일괄 처리
// 🚨 @PATCH : **2026-09-16** — [데스크톱 1대 엄격 제한 및 타 기기 사용 시 재인증 차단]: 기존 동일 기기 세션이 있더라도 비활성 상태이고 다른 데스크탑이 활성화되어 있으면 forceTakeover 없이 재인증 시 ERR_MAX_DEVICES_EXCEEDED 반환하여 1대 초과 방어
// 🚨 @PATCH : **2026-09-13** — [데스크톱 라이선스 인증 식별자 다중 지원]: p_email에 이메일 또는 users.id(UUID) 유입 시 모두 정상 조회되도록 듀얼 쿼리 지원으로 NOT_FOUND 오인식 및 제한사용자 오강등 영구 차단
//             **2026-09-05** — 제거된 PostgreSQL RPC(verify_desktop_license) 의존성 완전 탈피 및 서버사이드 직접 조회/등록 로직 전환
// 🔗 @CALLS : sql.begin (users, subscriptions, license_activations, common_codes)
// ====================================================================
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { p_email, p_device_uuid, p_force_takeover } = body;

    if (!p_email || !p_device_uuid) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_PARAMS',
        message: '필수 파라미터가 누락되었습니다.'
      }, { status: 400 });
    }

    const cleanInput = String(p_email).trim();
    const cleanDeviceUuid = String(p_device_uuid).trim();
    const isForceTakeover = Boolean(p_force_takeover);

    const result = await sql.begin(async (tx) => {
      // 1. 사용자 조회 (이메일 또는 UUID 동시 지원)
      let userRows;
      if (UUID.test(cleanInput)) {
        userRows = await tx`
          SELECT id, email FROM public.users WHERE id = ${cleanInput} LIMIT 1
        `;
      } else {
        userRows = await tx`
          SELECT id, email FROM public.users WHERE LOWER(email) = LOWER(${cleanInput}) LIMIT 1
        `;
      }

      if (!userRows || userRows.length === 0) {
        return {
          status: 200,
          payload: { success: false, code: 'NOT_FOUND', message: '등록되지 않은 사용자입니다.' }
        };
      }

      const userId = userRows[0].id;

      // 2. 데스크탑 사용 가능한 활성 구독 조회 (ELITEPRO 또는 DESKTOP) 및 동시성 잠금
      const subRows = await tx`
        SELECT id, user_id, plan_name, plan_status, is_active, license_key, verify_key, payment_no, current_period_end
        FROM public.subscriptions
        WHERE user_id = ${userId}
          AND is_active = true
          AND plan_status IN ('ACTIVE', 'FREE')
          AND (UPPER(plan_name) LIKE '%ELITE%' OR UPPER(plan_name) LIKE '%DESKTOP%')
        ORDER BY current_period_end DESC
        FOR UPDATE
      `;

      if (!subRows || subRows.length === 0) {
        return {
          status: 200,
          payload: { success: false, code: 'NO_PLAN', message: '데스크탑을 지원하는 요금제(ELITEPRO) 구독이 없습니다.' }
        };
      }

      const desktopSub = subRows[0];

      if (!desktopSub.license_key) {
        return {
          status: 200,
          payload: { success: false, code: 'NO_LICENSE', message: '라이선스 키가 발급되지 않았습니다.' }
        };
      }

      // 2-1. 공통코드에서 plan_name 명칭(code_name) 조회
      let displayPlanName = desktopSub.plan_name || 'ELITEPRO';
      const ccRows = await tx`
        SELECT code_name FROM public.common_codes WHERE group_code = 'PLAN_NAME' AND code_value = ${desktopSub.plan_name} LIMIT 1
      `;
      if (ccRows && ccRows.length > 0 && ccRows[0].code_name) {
        displayPlanName = ccRows[0].code_name;
      }

      // 3. 기존 동일 기기 세션 확인 (동시 접근 방어를 위한 행 잠금)
      const existingRows = await tx`
        SELECT id, subscription_id, device_uuid, device_name, is_active
        FROM public.license_activations
        WHERE subscription_id = ${desktopSub.id} AND LOWER(device_uuid) = LOWER(${cleanDeviceUuid})
        LIMIT 1
        FOR UPDATE
      `;
      const existingAct = existingRows.length > 0 ? existingRows[0] : null;

      // 4. 제어권 인수(forceTakeover) 요청 시 타 활성 데스크탑 세션 비활성화
      if (isForceTakeover) {
        await tx`
          UPDATE public.license_activations
          SET is_active = false, updated_at = NOW()
          WHERE subscription_id = ${desktopSub.id}
            AND LOWER(device_uuid) != LOWER(${cleanDeviceUuid})
            AND device_name ILIKE '%desktop%'
            AND is_active = true
        `;
      }

      // 5. 타 활성 데스크탑 세션 검사 (데스크탑 1대 한도)
      const otherActiveRows = await tx`
        SELECT id
        FROM public.license_activations
        WHERE subscription_id = ${desktopSub.id}
          AND LOWER(device_uuid) != LOWER(${cleanDeviceUuid})
          AND is_active = true
          AND device_name ILIKE '%desktop%'
      `;
      const hasOtherActive = otherActiveRows.length >= 1;

      // 이미 다른 데스크탑이 활성화되어 있고, 제어권 인수가 아니며, 현재 기기가 비활성(또는 신규)인 경우 차단
      if (hasOtherActive && !isForceTakeover && (!existingAct || !existingAct.is_active)) {
        return {
          status: 200,
          payload: {
            success: false,
            code: 'ERR_MAX_DEVICES_EXCEEDED',
            message: '데스크탑 동시 접속 허용 대수(1대)를 초과했습니다. 다른 데스크탑에서 사용 중입니다.',
            max_devices: 1,
            verify_key: desktopSub.verify_key || '',
            payment_no: desktopSub.payment_no || '',
            license_key: desktopSub.license_key || '',
            plan_name: displayPlanName,
            next_payment_date: desktopSub.current_period_end
          }
        };
      }

      // 6. 기존 세션 갱신 (Desktop App 명칭 보장)
      if (existingAct) {
        await tx`
          UPDATE public.license_activations
          SET updated_at = NOW(),
              activated_at = NOW(),
              is_active = true,
              device_name = 'Desktop App'
          WHERE id = ${existingAct.id}
        `;

        return {
          status: 200,
          payload: {
            success: true,
            code: 'SUCCESS',
            message: '데스크탑 기기가 확인되었습니다.',
            verify_key: desktopSub.verify_key || '',
            payment_no: desktopSub.payment_no || '',
            license_key: desktopSub.license_key || '',
            plan_name: displayPlanName,
            next_payment_date: desktopSub.current_period_end
          }
        };
      }

      // 7. 신규 기기 등록 시 타 활성 데스크탑 기기 존재 여부 확인 방어
      if (hasOtherActive && !isForceTakeover) {
        return {
          status: 200,
          payload: {
            success: false,
            code: 'ERR_MAX_DEVICES_EXCEEDED',
            message: '데스크탑 동시 접속 허용 대수(1대)를 초과했습니다. 웹 대시보드에서 기존 데스크탑 기기를 해제해 주세요.',
            max_devices: 1,
            verify_key: desktopSub.verify_key || '',
            payment_no: desktopSub.payment_no || '',
            license_key: desktopSub.license_key || '',
            plan_name: displayPlanName,
            next_payment_date: desktopSub.current_period_end
          }
        };
      }

      // 8. 신규 데스크탑 세션 등록
      await tx`
        INSERT INTO public.license_activations (
          subscription_id, device_uuid, device_name, is_active, created_by, updated_by, activated_at, updated_at
        ) VALUES (
          ${desktopSub.id}, ${cleanDeviceUuid}, 'Desktop App', true, ${userId}, ${userId}, NOW(), NOW()
        )
      `;

      return {
        status: 200,
        payload: {
          success: true,
          code: 'SUCCESS',
          message: '데스크탑 기기가 성공적으로 등록되었습니다.',
          verify_key: desktopSub.verify_key || '',
          payment_no: desktopSub.payment_no || '',
          license_key: desktopSub.license_key || '',
          plan_name: displayPlanName,
          next_payment_date: desktopSub.current_period_end
        }
      };
    });

    return NextResponse.json(result.payload, { status: result.status });
  } catch (error: any) {
    console.error('[/api/license/verify-desktop] Error:', error);
    return NextResponse.json({
      success: false,
      code: 'DATABASE_ERROR',
      message: '데스크탑 라이선스 세션 확인 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
