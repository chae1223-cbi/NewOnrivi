/**
 * 🚨 @PATCH (2026-07-22): users 회원 기본 원장 연동 및 nick_name(활동명/별명) 칼럼 데이터 저장 수용 보강
 */
export const upsertUserQuery = async (db: any, id: string, email: string, provider: string, nickName?: string | null) => {
  const upperProvider = (provider || 'EMAIL').toUpperCase();
  const cleanEmail = email.trim().toLowerCase();
  const cleanNickName = nickName ? nickName.trim() : null;

  return db`
    INSERT INTO users (
      id,
      created_by,
      created_at,
      updated_by,
      updated_at,
      email,
      provider,
      is_deleted,
      deleted_at,
      nick_name
    )
    VALUES (
      ${id},
      ${id},
      now(),
      ${id},
      now(),
      ${cleanEmail},
      ${upperProvider},
      false,
      null,
      ${cleanNickName}
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      provider = EXCLUDED.provider,
      updated_by = EXCLUDED.id,
      updated_at = now(),
      is_deleted = false,
      deleted_at = null,
      nick_name = COALESCE(EXCLUDED.nick_name, users.nick_name)
  `;
};

export const deleteUserAccountQuery = async (db: any, userId: string) => {
  return db.begin(async (tx: any) => {
    // 모든 기기 접속 세션 삭제
    await tx`
      DELETE FROM license_activations
      WHERE subscription_id IN (
        SELECT id FROM subscriptions WHERE user_id = ${userId}
      )
    `;
    // users 레코드 소프트 딜리트
    await tx`
      UPDATE users SET is_deleted = true, deleted_at = now(), updated_at = now() WHERE id = ${userId}
    `;
  });
};

export const checkUserByEmailQuery = async (db: any, email: string) => {
  const cleanEmail = email.trim().toLowerCase();
  const result = await db`
    SELECT id, is_deleted, nick_name FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1
  `;
  if (result.length === 0) {
    return { exists: false, is_deleted: false };
  }
  return {
    exists: true,
    id: result[0].id,
    is_deleted: result[0].is_deleted,
    nick_name: result[0].nick_name
  };
};
