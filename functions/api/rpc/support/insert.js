// ====================================================================
// 📊 [OMD-SUPPORT-insert-0002 ✅ FIXED] functions/api/rpc/support/insert.js
// 🎯 @KICK  : 고객지원 문의 등록 및 관리자 Brevo 알림 이메일 발송
// 🛡️ @GUARD : 이메일 기준 사용자 식별, support_inquiries 단일 원자적 트랜잭션 적재, 외부 이메일 I/O 격리
// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction으로 교체
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) Supabase REST 호출을 PostgreSQL 단일 원자적 트랜잭션(withDbTransaction)으로 전환
//             2) 대문자 코드 규격(INQUIRY_STATUS.PENDING, INQUIRY_TYPE) 적용
//             3) serverError 연동으로 오류 발생 시 표준화된 에러 응답 및 추적성 제공
// 🔗 @CALLS : PostgreSQL withDbTransaction (users, support_inquiries), Brevo API
// ====================================================================
import { withDbTransaction } from '../../_db.js';
import { serverError } from '../../_server-error.js';

export async function onRequestOptions() {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
  return new Response(null, { headers: corsHeaders });
}

function getTypeName(type) {
  const normType = (type || '').toLowerCase();
  switch (normType) {
    case 'general': return '일반 문의 / 기타';
    case 'billing': return '요금제 / 결제 / 환불 문의';
    case 'tech': return '기술 지원 / 오류 제보';
    case 'suggestion': return '서비스 건의 / 파트너 제휴';
    default: return '일반 문의';
  }
}

function decodeFilename(url) {
  try {
    const rawFilename = url.split('/').pop() || '';
    let decoded = decodeURIComponent(rawFilename);
    const match = decoded.match(/^[0-9]+_[a-z0-9]+_(.*)$/i);
    if (match) {
      return match[1];
    }
    return decoded;
  } catch (e) {
    return url;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Content-Type': 'application/json; charset=utf-8'
  };

  try {
    const body = await request.json().catch(() => ({}));
    const { p_name, p_email, p_type, p_title, p_content, p_user_id, p_attachment_urls } = body;

    if (!p_name || !p_email || !p_title || !p_content) {
      return new Response(JSON.stringify({
        success: false,
        code: 'INVALID_PARAMS',
        message: '필수 인자가 누락되었습니다.'
      }), { status: 400, headers: corsHeaders });
    }

    const attachmentUrls = Array.isArray(p_attachment_urls) ? p_attachment_urls : [];
    const upperType = (p_type || 'GENERAL').toUpperCase();
    const cleanEmail = String(p_email).trim().toLowerCase();
    const brevoApiKey = env.BREVO_API_KEY || '';

    // 1. 단일 원자적 DB 트랜잭션 (유저 식별 및 support_inquiries 적재)
    const outcome = await withDbTransaction(env, async db => {
      let resolvedUserId = p_user_id || null;

      if (!resolvedUserId && cleanEmail) {
        const userRes = await db.query(
          `SELECT id FROM public.users WHERE LOWER(email) = LOWER($1) AND is_deleted = false LIMIT 1`,
          [cleanEmail]
        );
        if (userRes.rows.length > 0) {
          resolvedUserId = userRes.rows[0].id;
        }
      }

      const insertRes = await db.query(
        `INSERT INTO public.support_inquiries (
           created_by, created_at, updated_by, updated_at, user_id,
           name, email, type, title, content, attachment_urls, status
         ) VALUES (
           $1, NOW(), $1, NOW(), $1,
           $2, $3, $4, $5, $6, $7, 'PENDING'
         ) RETURNING id`,
        [resolvedUserId, p_name, p_email, upperType, p_title, p_content, attachmentUrls]
      );

      return {
        success: true,
        inquiryId: insertRes.rows[0]?.id || null
      };
    });

    const inquiryId = outcome.inquiryId;

    // 2. 외부 알림 이메일 발송 (DB 완료 후 독립 실행)
    if (brevoApiKey) {
      const typeLabel = getTypeName(p_type);
      let attachmentsHtml = '';
      if (attachmentUrls.length > 0) {
        attachmentsHtml = `
          <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #eff6ff, #f0f9ff); border: 1px solid #bae6fd; border-radius: 12px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #0369a1; display: flex; align-items: center; gap: 6px;">📎 첨부 파일 다운로드</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        `;
        attachmentUrls.forEach((url) => {
          const cleanFilename = decodeFilename(url);
          const fullUrl = url.startsWith('/') ? `https://onrivi.com${url}` : url;
          attachmentsHtml += `
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #e0f2fe;">
              <a href="${fullUrl}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                📄 ${cleanFilename} 다운로드
              </a>
            </td></tr>
          `;
        });
        attachmentsHtml += `</table></div>`;
      }

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://onrivi.com/icon.png" alt="Onrivi" style="width: 48px; height: 48px; border-radius: 12px;" />
            <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px;">온리비 문의가 접수되었습니다</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 접수</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; background: #f8fafc; border-radius: 12px; padding: 16px;">
            <tr><td style="padding: 10px 16px; font-weight: 600; color: #475569; width: 100px; white-space: nowrap;">👤 이름</td><td style="padding: 10px 16px; color: #0f172a;">${p_name}</td></tr>
            <tr><td style="padding: 10px 16px; font-weight: 600; color: #475569;">📧 이메일</td><td style="padding: 10px 16px; color: #0f172a;"><a href="mailto:${p_email}" style="color: #2563eb;">${p_email}</a></td></tr>
            <tr><td style="padding: 10px 16px; font-weight: 600; color: #475569;">📂 유형</td><td style="padding: 10px 16px; color: #0f172a;"><span style="background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;">${typeLabel}</span></td></tr>
            <tr><td style="padding: 10px 16px; font-weight: 600; color: #475569;">📌 제목</td><td style="padding: 10px 16px; color: #0f172a; font-weight: 700;">${p_title}</td></tr>
          </table>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">📝 문의 내용</h4>
            <div style="font-size: 14px; color: #0f172a; line-height: 1.7; white-space: pre-wrap;">${p_content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
          ${attachmentsHtml}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
            이 메일은 onrivi.com 문의하기를 통해 자동 발송되었습니다.<br>
            답장하시려면 이 메일의 [Reply] 버튼을 클릭하거나 <a href="mailto:${p_email}" style="color: #2563eb;">${p_email}</a>로 직접 회신해 주세요.
          </div>
        </div>
      `;

      const payload = {
        sender: { name: 'Onrivi Author', email: 'support@onrivi.com' },
        to: [{ email: 'firstonrivi@onrivi.com', name: 'Onrivi Author 관리자' }],
        replyTo: { email: p_email, name: p_name },
        subject: `[온리비 문의] ${typeLabel} — ${p_title}`,
        htmlContent
      };

      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': brevoApiKey
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Brevo email send error:', err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      code: 'SUCCESS',
      message: '문의가 접수되었습니다.',
      inquiry_id: inquiryId
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/rpc/support/insert.js',
      stage: 'support-insert',
      message: '문의 접수 중 오류가 발생했습니다.'
    });
  }
}
