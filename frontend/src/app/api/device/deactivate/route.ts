// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) Supabase REST 클라이언트를 Next PostgreSQL 직접 연결(sql.begin)로 전환
//             2) 사용자 세션 소유권(created_by / sub_owner_id) 교차 검증 및 FOR UPDATE 잠금
//             3) Cloudflare Functions(functions/api/device/deactivate.js)와 응답 규격 및 에러 코드 100% 동기화
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyUser } from '@/lib/authVerify';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const { user } = await verifyUser(request);
    const body = await request.json().catch(() => ({}));
    const { p_activation_id, p_payment_no, p_device_uuid, p_user_id } = body;

    const targetUserId = (p_user_id && UUID.test(p_user_id))
      ? p_user_id
      : (user?.id || null);

    const result = await sql.begin(async (tx) => {
      // 1. Activation ID로 바로 삭제하는 경우 (대시보드 기기 해제)
      if (p_activation_id) {
        if (!UUID.test(p_activation_id)) {
          return { success: false, code: 'INVALID_PARAMS', message: '유효한 기기 식별자가 아닙니다.' };
        }

        if (targetUserId) {
          const actRows = await tx`
            SELECT a.id, a.created_by, s.user_id as sub_owner_id
            FROM public.license_activations a
            LEFT JOIN public.subscriptions s ON s.id = a.subscription_id
            WHERE a.id = ${p_activation_id}
            FOR UPDATE OF a
          `;

          if (actRows.length === 0) {
            return { success: false, code: 'NOT_FOUND', message: '해당 기기 접속 정보를 찾을 수 없습니다.' };
          }

          const isOwner = actRows[0].created_by === targetUserId || actRows[0].sub_owner_id === targetUserId;
          if (!isOwner) {
            return { success: false, code: 'FORBIDDEN', message: '본인의 기기 접속 세션만 해제할 수 있습니다.' };
          }
        }

        const delResult = await tx`
          DELETE FROM public.license_activations
          WHERE id = ${p_activation_id}
          RETURNING id
        `;

        if (delResult.length === 0) {
          return { success: false, code: 'NOT_FOUND', message: '해당 기기 접속 정보를 찾을 수 없습니다.' };
        }

        return { success: true, code: 'SUCCESS', message: '기기가 해제되었습니다.' };
      }

      // 2. 결제번호 + 디바이스 UUID로 삭제하는 경우 (에디터 로그아웃)
      if (p_payment_no && p_device_uuid) {
        let licenses;
        if (targetUserId) {
          licenses = await tx`
            SELECT id FROM public.subscriptions
            WHERE payment_no = ${p_payment_no} AND user_id = ${targetUserId}
            LIMIT 1
          `;
        } else {
          licenses = await tx`
            SELECT id FROM public.subscriptions
            WHERE payment_no = ${p_payment_no}
            LIMIT 1
          `;
        }

        if (licenses.length === 0) {
          return { success: false, code: 'NOT_FOUND', message: '해당 결제번호의 구독 정보를 찾을 수 없습니다.' };
        }

        const v_license_id = licenses[0].id;
        const delResult = await tx`
          DELETE FROM public.license_activations
          WHERE subscription_id = ${v_license_id} AND device_uuid = ${p_device_uuid}
          RETURNING id
        `;

        if (delResult.length === 0) {
          return { success: false, code: 'NOT_FOUND', message: '해당 세션을 찾을 수 없습니다.' };
        }

        return { success: true, code: 'SUCCESS', message: '세션이 해제되었습니다.' };
      }

      return { success: false, code: 'INVALID_PARAMS', message: '필수 파라미터가 누락되었습니다.' };
    });

    const status = result.code === 'FORBIDDEN' ? 403 : result.code === 'INVALID_PARAMS' ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[/api/device/deactivate] Transaction failed:', error);
    return NextResponse.json({
      success: false,
      code: 'DATABASE_ERROR',
      message: '기기 해제 처리 중 일시적인 시스템 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
