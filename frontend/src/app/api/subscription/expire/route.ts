// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) verifyUser로 사용자 인증 및 소유권(user_id) 검증
//             2) FOR UPDATE 행 잠금 및 구독 만료 -> 기기 세션 비활성화 -> READER 요금제 발급 원트랜잭션 일원화
//             3) Cloudflare Functions(functions/api/subscription/expire.js)와 계약 및 비즈니스 룰 100% 동기화
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyUser } from '@/lib/authVerify';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { p_subscription_id, p_user_id } = body;

    if (!p_subscription_id || !UUID.test(p_subscription_id)) {
      return NextResponse.json({ success: false, code: 'INVALID_PARAMS', message: '유효한 구독 식별자(ID)가 필요합니다.' }, { status: 400 });
    }

    const { user, error: authError } = await verifyUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, code: 'UNAUTHORIZED', message: '인증이 필요하거나 세션이 만료되었습니다.' }, { status: 401 });
    }

    const userId = (p_user_id && UUID.test(p_user_id)) ? p_user_id : user.id;
    if (userId !== user.id) {
      return NextResponse.json({ success: false, code: 'FORBIDDEN', message: '본인의 구독만 만료 처리할 수 있습니다.' }, { status: 403 });
    }

    const result = await sql.begin(async (tx) => {
      // 1. 기존 구독 정보 확인 및 행 잠금
      const oldSub = await tx`
        SELECT id, user_id, current_period_end, plan_status, is_active
        FROM public.subscriptions
        WHERE id = ${p_subscription_id} AND user_id = ${userId}
        FOR UPDATE
      `;

      if (oldSub.length === 0) {
        return { success: false, code: 'NOT_FOUND', message: '만료 처리할 구독을 찾을 수 없습니다.' };
      }

      // 2. 구독 상태를 EXPIRED 및 is_active = false로 변경
      await tx`
        UPDATE public.subscriptions
        SET plan_status = 'EXPIRED',
            is_active = false,
            canceled_at = now(),
            updated_at = now(),
            updated_by = ${userId}
        WHERE id = ${p_subscription_id}
          AND plan_status <> 'EXPIRED'
      `;

      // 3. 해당 구독의 기기 세션을 is_active = false (제한사용자)로 강등 업데이트
      await tx`
        UPDATE public.license_activations
        SET is_active = false,
            updated_at = now(),
            updated_by = ${userId}
        WHERE subscription_id = ${p_subscription_id}
          AND is_active = true
      `;

      // 4. 사용자의 다른 활성 유료 요금제 존재 여부 확인
      const activeSubs = await tx`
        SELECT id, payment_no, plan_name
        FROM public.subscriptions
        WHERE user_id = ${userId} AND is_active = true AND plan_status IN ('ACTIVE', 'FREE')
        ORDER BY created_at DESC LIMIT 1
      `;

      let newSubId = null;
      let newPaymentNo = null;

      if (activeSubs.length > 0) {
        newSubId = activeSubs[0].id;
        newPaymentNo = activeSubs[0].payment_no;
      } else {
        // 5. 유료 요금제가 없는 경우 평생 무료 읽기 전용(READER) 플랜 자동 신규 생성 및 발급
        const readerPaymentNo = `READER-${Date.now()}`;
        const readerLicenseKey = `READER-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
        const readerVerifyKey = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
        const newReaderId = crypto.randomUUID();

        const newReader = await tx`
          INSERT INTO public.subscriptions (
            id, user_id, plan_name, plan_status, billing_cycle, is_active,
            max_devices, price_amount, current_period_start, current_period_end,
            payment_no, license_key, verify_key, created_at, updated_at,
            created_by, updated_by
          ) VALUES (
            ${newReaderId}, ${userId}, 'READER', 'ACTIVE', 'FREE', true,
            1, 0, now(), '9999-12-31T23:59:59.000Z',
            ${readerPaymentNo}, ${readerLicenseKey}, ${readerVerifyKey}, now(), now(),
            ${userId}, ${userId}
          )
          RETURNING id, payment_no
        `;

        newSubId = newReader[0].id;
        newPaymentNo = newReader[0].payment_no;
      }

      return {
        success: true,
        code: 'SUCCESS',
        message: '구독 만료 처리 및 READER 요금제 자동 전환이 완료되었습니다.',
        new_subscription_id: newSubId,
        new_payment_no: newPaymentNo,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[/api/subscription/expire] Transaction failed:', error);
    return NextResponse.json({
      success: false,
      code: 'DATABASE_ERROR',
      message: '구독 만료 처리 중 일시적인 시스템 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
