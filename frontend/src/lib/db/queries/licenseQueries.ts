// ====================================================================
// 📊 [OMD-DB-licenseQueries-0001 ✅ FIXED] src/lib/db/queries/licenseQueries.ts
// 🎯 @KICK  : Postgres 트랜잭션 기반 라이선스 기기 세션 활성화 및 원자적 제한 판정
// 🛡️ @GUARD : Rule 1, Rule 2, Rule 7 (원트랜잭션 무결성), 사용자당 웹 편집 세션 1개
// 🚨 @PATCH : **2026-10-03** — [세션 제어권 인수(Takeover) 시 타 세션 제한사용자(미리보기 전용) 전환 보장]: 편집 권한 획득 시 타 세션을 DB에서 DELETE(강제 로그아웃)하지 않고 is_active = false로 안전하게 업데이트하여, 타 세션이 세션아웃 없이 제한사용자(미리보기 전용) 모드로 유지되도록 개편
// 웹 세션만 계정당 1개로 제한하고 데스크톱 지정 장치는 별도 검증 경로에 맡긴다.
// ====================================================================
export const insertLicenseActivationQuery = async (
  db: any, 
  licenseId: string, 
  deviceUuid: string, 
  deviceName: string, 
  userId: string | null = null, 
  isExpired: boolean = false,
  forceTakeover: boolean = false
) => {
  return db.begin(async (tx: any) => {
    // 1. 해당 구독(subscriptions) 정보 조회
    const licenseInfo = await tx`
      SELECT plan_name, plan_status, is_active, current_period_end, user_id
      FROM subscriptions
      WHERE id = ${licenseId}
    `;

    if (licenseInfo.length === 0) {
      throw new Error('구독/라이선스 정보를 찾을 수 없습니다.');
    }

    const { plan_name, plan_status, is_active, current_period_end, user_id: subOwnerId } = licenseInfo[0];
    // 같은 사용자의 두 등록 요청이 동시에 한 자리를 차지하지 못하게 잠근다.
    const owner = await tx`SELECT id FROM users WHERE id = ${subOwnerId} FOR UPDATE`;
    if (!owner.length) throw new Error('사용자를 찾을 수 없습니다.');
    const effectiveUserId = subOwnerId; // 감사 주체는 요청 본문이 아닌 구독 소유자를 사용한다.

    const isDesktopReq = deviceName?.toLowerCase().includes('desktop');
    const status = String(plan_status).toUpperCase();
    const canEdit = !isExpired && plan_name?.toUpperCase() !== 'READER' &&
      (isDesktopReq || String(plan_name).toUpperCase() !== 'DESKTOP_ONLY') &&
      ['ACTIVE', 'FREE'].includes(status) && (is_active === true || status === 'FREE') &&
      (!current_period_end || new Date(current_period_end).getTime() > Date.now());

    // 🧹 [좀비 세션 자동 정리 가드]: 5분 이상 활동(Heartbeat)이 중단된 웹 세션은 자동 비활성화하여 오탐지 방지
    await tx`
      UPDATE license_activations
      SET is_active = false, updated_at = now()
      WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id = ${subOwnerId})
        AND is_active = true
        AND lower(trim(coalesce(device_name, ''))) IN ('web saas', 'web browser')
        AND coalesce(updated_at, activated_at) < (now() - interval '5 minutes')
    `;

    // 💡 [웹 제어권 인수]: 다른 웹 세션을 강제 삭제(로그아웃)하지 않고, is_active = false로 변경하여 세션아웃 없이 '제한사용자(미리보기 전용)'로 안전하게 전환한다.
    if (forceTakeover && canEdit && !isDesktopReq) {
      await tx`
        UPDATE license_activations
        SET is_active = false, updated_at = now()
        WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id = ${subOwnerId})
          AND NOT (subscription_id = ${licenseId} AND device_uuid = ${deviceUuid})
          AND lower(trim(coalesce(device_name, ''))) IN ('web saas', 'web browser')
      `;
    }

    const checkLimits = async () => {
      if (isDesktopReq) return true; // 데스크톱은 지정 장치 검증 경로에서 따로 보호한다.
      const activeSessions = await tx`
        SELECT activation.id
        FROM license_activations AS activation
        JOIN subscriptions AS subscription ON subscription.id = activation.subscription_id
        WHERE subscription.user_id = ${subOwnerId}
          AND activation.is_active = true
          AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
          AND NOT (activation.subscription_id = ${licenseId} AND activation.device_uuid = ${deviceUuid})
      `;
      return activeSessions.length < 1;
    };

    // 2. 기존 동일 기기 세션 확인
    const currentDeviceRes = await tx`
      SELECT id, is_active
      FROM license_activations
      WHERE subscription_id = ${licenseId} AND device_uuid = ${deviceUuid}
    `;
    
    let newIsActive = true;
    let activationId: string | null = null;

    // 1차 필터: READER 요금제이거나 명시적 만료 상태면 무조건 제한 사용자(is_active = false)
    if (!canEdit) {
      newIsActive = false;
    }

    if (currentDeviceRes.length > 0) {
      activationId = currentDeviceRes[0].id;
      
      // 웹 좌석 1개 제한은 기존 세션에도 동일하게 적용한다.
      if (newIsActive) {
        newIsActive = await checkLimits();
      }

      // 기존 기록 UPDATE (DELETE 후 INSERT 하면 Supabase Realtime DELETE 이벤트가 발생해 다른 탭이 강제 로그아웃됨)
      if (effectiveUserId) {
        await tx`
          UPDATE license_activations
          SET activated_at = now(), updated_at = now(), is_active = ${newIsActive}, device_name = ${deviceName}, updated_by = ${effectiveUserId}
          WHERE subscription_id = ${licenseId} AND device_uuid = ${deviceUuid}
        `;
      } else {
        await tx`
          UPDATE license_activations
          SET activated_at = now(), updated_at = now(), is_active = ${newIsActive}, device_name = ${deviceName}
          WHERE subscription_id = ${licenseId} AND device_uuid = ${deviceUuid}
        `;
      }
    } else {
      // 신규 웹 세션에도 같은 좌석 제한을 적용한다.
      if (newIsActive) {
        newIsActive = await checkLimits();
      }

      // 4. 신규 세션 등록
      if (effectiveUserId) {
        const ins = await tx`
          INSERT INTO license_activations (subscription_id, device_uuid, device_name, activated_at, created_by, updated_by, is_active)
          VALUES (${licenseId}, ${deviceUuid}, ${deviceName}, now(), ${effectiveUserId}, ${effectiveUserId}, ${newIsActive})
          RETURNING id
        `;
        if (ins && ins.length > 0) activationId = ins[0].id;
      } else {
        const ins = await tx`
          INSERT INTO license_activations (subscription_id, device_uuid, device_name, activated_at, is_active)
          VALUES (${licenseId}, ${deviceUuid}, ${deviceName}, now(), ${newIsActive})
          RETURNING id
        `;
        if (ins && ins.length > 0) activationId = ins[0].id;
      }
    }

    if (!newIsActive) {
      return { success: false, code: canEdit ? 'EXCEED_MAX_DEVICES' : 'RESTRICTED_PLAN', message: canEdit ? '다른 웹 브라우저에서 이미 편집 중입니다.' : '현재 요금제는 웹 편집을 사용할 수 없습니다.', max_devices: canEdit ? 1 : 0, activation_id: activationId };
    }

    return { success: true, code: 'SUCCESS', message: '기기가 활성화되었습니다.', max_devices: 1, activation_id: activationId };
  });
};
