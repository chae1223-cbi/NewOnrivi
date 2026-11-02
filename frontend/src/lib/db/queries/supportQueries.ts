/**
 * 🚨 @PATCH (2026-07-22): 검증 완료에 따라 상용 타겟 테이블을 support_inquiries로 최종 전환 및 소스 반영
 */
export const insertSupportInquiryQuery = async (
  db: any,
  name: string,
  email: string,
  type: string,
  title: string,
  content: string,
  userId: string | null,
  attachmentUrls: string[]
) => {
  const upperType = (type || 'GENERAL').toUpperCase();
  const safeUrls = Array.isArray(attachmentUrls) ? attachmentUrls : [];
  const arrayParam = typeof db.array === 'function' ? db.array(safeUrls) : safeUrls;

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const matched = await db`
        SELECT id FROM users WHERE LOWER(email) = ${cleanEmail} AND COALESCE(is_deleted, false) = false LIMIT 1
      `;
      if (matched && matched.length > 0) {
        resolvedUserId = matched[0].id;
      } else {
        const legacyMatched = await db`
          SELECT id FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1
        `;
        if (legacyMatched && legacyMatched.length > 0) {
          resolvedUserId = legacyMatched[0].id;
        }
      }
    } catch (e) {
      console.warn('[insertSupportInquiryQuery] 이메일 기반 회원 조회 예외:', e);
    }
  }

  const result = await db`
    INSERT INTO support_inquiries (
      created_by,
      created_at,
      updated_by,
      updated_at,
      user_id,
      name,
      email,
      type,
      title,
      content,
      attachment_urls,
      status
    )

    VALUES (
      ${resolvedUserId},
      now(),
      ${resolvedUserId},
      now(),
      ${resolvedUserId},
      ${name},
      ${email},
      ${upperType},
      ${title},
      ${content},
      ${arrayParam},
      'PENDING'
    )
    RETURNING id
  `;

  return result[0].id;
};




