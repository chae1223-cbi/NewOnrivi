// ====================================================================
// 📊 [OMD-SUB-get-route-0002 ✅ FIXED] /api/subscription/get
// 🎯 @KICK  : 사용자 구독 정보, 라이선스 키, 기기 세션 및 구독 이력 조회 (Next.js App Router)
// 🛡️ @GUARD : 만료 구독 자동 EXPIRED, 신규 유저 APPRENTICE(14일) 자동 발급, 만료자 READER 자동 발급 및 단일 원자적 트랜잭션 보장
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) supabaseAdmin 다중 호출을 PostgreSQL 원자적 트랜잭션(sql.begin)으로 전환
//             2) 유저 단위 행 잠금(FOR UPDATE)으로 신규 무료체험 및 READER 플랜 중복 생성 레이스 컨디션 차단
//             3) 만료일 경과 구독 일괄 EXPIRED 및 기기 세션 정리 원자적 처리
//             4) 공통 코드(PLAN_NAME, BILLING_CYCLE, PLAN_STATUS) 매핑 및 안전한 에러 처리
// 🔗 @CALLS : sql.begin (users, subscriptions, license_activations, common_codes)
// ====================================================================
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { user_id: userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_PARAMS',
        message: 'user_id 파라미터가 필요합니다.'
      }, { status: 400 });
    }

    const cleanInput = String(userId).trim();

    const result = await sql.begin(async (tx) => {
      // 0. UUID 검증 및 Email -> UUID 변환 (유저 식별 및 행 잠금)
      let userRows;
      if (UUID.test(cleanInput)) {
        userRows = await tx`
          SELECT id, email FROM public.users WHERE id = ${cleanInput} FOR UPDATE
        `;
      } else {
        userRows = await tx`
          SELECT id, email FROM public.users WHERE LOWER(email) = LOWER(${cleanInput}) FOR UPDATE
        `;
      }

      if (!userRows || userRows.length === 0) {
        return {
          status: 404,
          payload: { success: false, code: 'NOT_FOUND', message: '해당 이메일의 사용자를 찾을 수 없습니다.' }
        };
      }

      const targetUserId = userRows[0].id;

      // 1. 만료된 구독 자동 EXPIRED 처리
      await tx`
        UPDATE public.subscriptions
        SET plan_status = 'EXPIRED', is_active = false, updated_at = NOW()
        WHERE user_id = ${targetUserId}
          AND current_period_end < NOW()
          AND plan_status != 'EXPIRED'
      `;

      // 2. 구독 이력 및 공통 코드 조회
      const subRows = await tx`
        SELECT id, user_id, plan_name, plan_status, billing_cycle, is_active, max_devices,
               price_amount, current_period_start, current_period_end, payment_no,
               license_key, verify_key, created_at, updated_at
        FROM public.subscriptions
        WHERE user_id = ${targetUserId}
        ORDER BY created_at DESC
      `;

      const codeRows = await tx`
        SELECT group_code, code_value, code_name
        FROM public.common_codes
        WHERE group_code IN ('PLAN_NAME', 'BILLING_CYCLE', 'PLAN_STATUS')
      `;

      let rawSubs: any[] = [...subRows];

      // 3. 신규 유저(구독 없음) 자동 14일 무료 체험(APPRENTICE) 발급
      if (rawSubs.length === 0) {
        const trialPaymentNo = 'TRIAL-' + Date.now();
        const trialLicenseKey = 'TRIAL-' + Math.random().toString(36).substring(2, 15).toUpperCase();
        const trialVerifyKey = Math.random().toString(36).substring(2, 15).toUpperCase();

        const insertedTrial = await tx`
          INSERT INTO public.subscriptions (
            user_id, plan_name, plan_status, billing_cycle, is_active, max_devices,
            price_amount, current_period_start, current_period_end, payment_no, license_key, verify_key,
            created_at, updated_at
          ) VALUES (
            ${targetUserId}, 'APPRENTICE', 'ACTIVE', 'TRIAL', true, 1,
            0, NOW(), NOW() + INTERVAL '14 days', ${trialPaymentNo}, ${trialLicenseKey}, ${trialVerifyKey},
            NOW(), NOW()
          )
          RETURNING *
        `;

        rawSubs = [...insertedTrial];
      } else {
        const hasApprenticeHistory = rawSubs.some((s: any) => (s.plan_name || '').toUpperCase() === 'APPRENTICE');
        const hasActiveSub = rawSubs.some((s: any) => s.is_active && ['ACTIVE', 'FREE'].includes((s.plan_status || '').toUpperCase()));

        // 4. 기존 단독 READER 계정 중 Apprentice 미경험자는 14일 체험 승급
        if (!hasApprenticeHistory && rawSubs.length === 1 && rawSubs[0].plan_name === 'READER') {
          const trialPaymentNo = 'TRIAL-' + Date.now();
          const trialLicenseKey = 'TRIAL-' + Math.random().toString(36).substring(2, 15).toUpperCase();
          const trialVerifyKey = Math.random().toString(36).substring(2, 15).toUpperCase();

          const updatedTrial = await tx`
            UPDATE public.subscriptions
            SET plan_name = 'APPRENTICE',
                plan_status = 'ACTIVE',
                billing_cycle = 'TRIAL',
                is_active = true,
                price_amount = 0,
                current_period_start = NOW(),
                current_period_end = NOW() + INTERVAL '14 days',
                payment_no = ${trialPaymentNo},
                license_key = ${trialLicenseKey},
                verify_key = ${trialVerifyKey},
                updated_at = NOW()
            WHERE id = ${rawSubs[0].id}
            RETURNING *
          `;

          if (updatedTrial.length > 0) {
            rawSubs[0] = updatedTrial[0];
          }
        } else if (!hasActiveSub) {
          // 5. 14일 무료 체험(Apprentice) 또는 유료 구독 만료 후 활성 구독이 없는 경우 자동으로 READER 등급 발급
          const readerPaymentNo = 'READER-' + Date.now();
          const readerLicenseKey = 'READER-' + Math.random().toString(36).substring(2, 15).toUpperCase();
          const readerVerifyKey = Math.random().toString(36).substring(2, 15).toUpperCase();

          const insertedReader = await tx`
            INSERT INTO public.subscriptions (
              user_id, plan_name, plan_status, billing_cycle, is_active, max_devices,
              price_amount, current_period_start, current_period_end, payment_no, license_key, verify_key,
              created_at, updated_at
            ) VALUES (
              ${targetUserId}, 'READER', 'ACTIVE', 'FREE', true, 1,
              0, NOW(), '9999-12-31 23:59:59+00', ${readerPaymentNo}, ${readerLicenseKey}, ${readerVerifyKey},
              NOW(), NOW()
            )
            RETURNING *
          `;

          if (insertedReader.length > 0) {
            rawSubs.unshift(insertedReader[0]);
          }

          // 만료된 구독들의 활성 기기 세션 비활성화 정리
          const expiredSubIds = rawSubs
            .filter((s: any) => (s.plan_status || '').toUpperCase() === 'EXPIRED')
            .map((s: any) => s.id);

          if (expiredSubIds.length > 0) {
            await tx`
              UPDATE public.license_activations
              SET is_active = false, updated_at = NOW()
              WHERE subscription_id = ANY(${expiredSubIds}) AND is_active = true
            `;
          }
        }
      }

      // 6. 공통 코드 매핑
      const getCodeName = (groupCode: string, codeValue: string, fallback: string) => {
        if (!codeRows || !Array.isArray(codeRows)) return fallback;
        const match = codeRows.find((c: any) => c.group_code === groupCode && (c.code_value || '').toUpperCase() === (codeValue || '').toUpperCase());
        return match ? match.code_name : fallback;
      };

      const allSubs = rawSubs.map((s: any) => ({
        ...s,
        plan_name_kr: getCodeName('PLAN_NAME', s.plan_name, s.plan_name),
        billing_cycle_kr: getCodeName('BILLING_CYCLE', s.billing_cycle, s.billing_cycle),
        plan_status_kr: getCodeName('PLAN_STATUS', s.plan_status, s.plan_status)
      }));

      // 7. 활성 구독 및 최근 구독 확인
      const activeSub = allSubs.find((s: any) => (s.is_active && (s.plan_status || '').toUpperCase() === 'ACTIVE') || (s.plan_status || '').toUpperCase() === 'FREE');
      const latestSub = activeSub || allSubs[0];

      // 8. 기기 세션(license_activations) 조회
      const activeSubIds = allSubs
        .filter((s: any) => (s.plan_status || '').toUpperCase() === 'ACTIVE' || (s.plan_status || '').toUpperCase() === 'FREE')
        .map((s: any) => s.id);
      const validSubIds = activeSubIds.length > 0 ? activeSubIds : (latestSub ? [latestSub.id] : []);

      let activations: any[] = [];
      if (validSubIds.length > 0) {
        const actRows = await tx`
          SELECT id, subscription_id, device_uuid, device_name, activated_at, updated_at, is_active
          FROM public.license_activations
          WHERE subscription_id = ANY(${validSubIds})
          ORDER BY activated_at DESC
        `;
        activations = actRows.map((a: any) => ({
          ...a,
          license_id: a.subscription_id
        }));
      }

      const mappedDevices = activations.map((device: any) => {
        const matchedSub = allSubs.find((s: any) => s.id === device.license_id);
        return {
          ...device,
          payment_no: matchedSub ? matchedSub.payment_no : '',
          is_active_license: latestSub ? matchedSub?.id === latestSub.id : false
        };
      });

      return {
        status: 200,
        payload: {
          success: true,
          subscription: latestSub ? {
            ...latestSub,
            active_device_count: mappedDevices.filter((device: any) =>
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

    return NextResponse.json(result.payload, { status: result.status });
  } catch (error: any) {
    console.error('[/api/subscription/get] Error:', error);
    return NextResponse.json({
      success: false,
      code: 'DATABASE_ERROR',
      message: '구독 정보를 불러오는 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
