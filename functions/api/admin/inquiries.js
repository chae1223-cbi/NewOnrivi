// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 문의 조회·답변 상태 저장을 PostgreSQL로 통일하고 공통 오류 추적을 적용한다.
import { jsonResponse, handleOptions, checkAdminAuth, adminServerError } from './_shared.js';
import { withDbTransaction } from '../_db.js';
import { DB_CODES } from '../_db-codes.js';

export const onRequestOptions = handleOptions;

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    
    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, authResult.status);
    }

    const { inquiries, codes } = await withDbTransaction(env, async db => {
      const inquiries = await db.query('SELECT * FROM public.support_inquiries ORDER BY created_at DESC');
      const codes = await db.query('SELECT group_code, code_value, code_name FROM public.common_codes');
      return { inquiries: inquiries.rows, codes: codes.rows };
    });

    const enrichedInquiries = (inquiries || []).map(inquiry => {
      const typeInfo = codes.find(c => c.group_code === DB_CODES.CODE_GROUP.INQUIRY_TYPE && c.code_value === inquiry.type);
      const statusInfo = codes.find(c => c.group_code === DB_CODES.CODE_GROUP.INQUIRY_STATUS && c.code_value === inquiry.status);

      return {
        ...inquiry,
        type_name: typeInfo ? typeInfo.code_name : inquiry.type,
        status_name: statusInfo ? statusInfo.code_name : inquiry.status
      };
    });

    return jsonResponse(enrichedInquiries);
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/inquiries.js', 'list_inquiries');
  }
}

export async function onRequestPatch(context) {
  try {
    const { request, env } = context;
    
    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error === 'Forbidden' ? '권한이 없습니다.' : authResult.error }, authResult.status);
    }

    const body = await request.json();
    const { id, status, answer_content, send_email, answer_attachment_urls, reply_subject, reply_greeting, reply_closing } = body;

    if (!id) return jsonResponse({ error: 'ID is required' }, 400);

    const inquiryRows = await withDbTransaction(env, db => db.query(
      'SELECT email, title, content FROM public.support_inquiries WHERE id = $1 LIMIT 1', [id]
    ));
    const inquiryData = inquiryRows.rows[0] || null;
    
    if (!inquiryData) {
      return jsonResponse({ error: 'Inquiry not found' }, 404);
    }

    let emailSent = false;
    if (send_email && inquiryData.email && answer_content) {
      const emailSubject = reply_subject || `[답변] ${inquiryData.title} 문의에 대한 답변입니다.`;
      const greetingText = reply_greeting || `문의하신 내용에 대한 답변입니다.`;
      const closingText = reply_closing || `답변 드린 내용 외에 추가로 궁금하신 점이나 확인이 필요한 사항이 있으시면 언제든 편하게 말씀해 주시기 바랍니다.`;
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #111827; margin-bottom: 24px;">${greetingText}</h2>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; color: #4b5563; font-size: 14px; font-weight: bold;">[접수된 문의내용]</p>
            <p style="margin: 8px 0 0 0; color: #374151; white-space: pre-wrap;">${inquiryData.content}</p>
          </div>

          <div style="padding: 16px; border-radius: 6px; border: 1px solid #d1d5db;">
            <p style="margin: 0; color: #1f2937; font-size: 14px; font-weight: bold;">[답변 내용]</p>
            <p style="margin: 8px 0 0 0; color: #111827; white-space: pre-wrap;">${answer_content}</p>
          </div>
          
          <p style="margin-top: 24px; font-size: 14px; color: #374151; line-height: 1.5;">
            ${closingText}
          </p>
          
          <p style="margin-top: 32px; font-size: 13px; color: #6b7280; text-align: center;">
            본 메일은 발신 전용 메일입니다. 추가 문의사항이 있으시면 웹사이트를 이용해 주세요.
          </p>
        </div>
      `;

      // Send mail via Brevo
      const brevoApiKey = env.BREVO_API_KEY;
      if (!brevoApiKey) {
        throw new Error("BREVO_API_KEY is missing in environment variables.");
      }

      const senderEmail = env.SMTP_FROM || env.SMTP_USER || 'noreply@onrivi.com';
      const senderName = env.SMTP_FROM_NAME || 'Onrivi 고객지원';

      let brevoAttachments;
      if (answer_attachment_urls && answer_attachment_urls.length > 0) {
        brevoAttachments = answer_attachment_urls.map(url => {
          const nameMatch = url.match(/name=([^&]+)/);
          const name = nameMatch ? decodeURIComponent(nameMatch[1]) : url.split('/').pop() || 'attachment';
          return { url, name };
        });
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName },
          to: [{ email: inquiryData.email }],
          subject: emailSubject,
          htmlContent: emailHtml,
          ...(brevoAttachments && { attachment: brevoAttachments })
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Brevo API Error: ${response.status} ${errorData}`);
      }
      emailSent = true;
    }

    const updateData = {
      status,
      updated_by: authResult.user.id,
      updated_at: new Date().toISOString()
    };

    if (answer_content !== undefined) {
      updateData.answer_content = answer_content;
      updateData.answered_at = new Date().toISOString();
      updateData.answered_by = authResult.user.id;
      if (answer_attachment_urls !== undefined) {
        updateData.answer_attachment_urls = answer_attachment_urls;
      }
    }

    const fields = ['status', 'updated_by', 'updated_at', 'answer_content', 'answered_at',
      'answered_by', 'answer_attachment_urls'].filter(field => updateData[field] !== undefined);
    const updatedDataRows = await withDbTransaction(env, db => db.query(
      `UPDATE public.support_inquiries SET ${fields.map((field, i) => `${field} = $${i + 1}`).join(', ')} WHERE id = $${fields.length + 1} RETURNING *`,
      [...fields.map(field => updateData[field]), id]
    ));
    const updatedInquiry = updatedDataRows.rows[0] || null;

    return jsonResponse({ ...updatedInquiry, emailSent });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/inquiries.js', 'update_inquiry');
  }
}
