/**
 * 프로그램명 : 고객 문의 관리 API (Admin Inquiries API)
 * 버전 정보 : 1.0.0
 * 프로그램 ID : oaar-api-inquiries-001
 * -----------------------------------------------------------------------
 * 변경내역
 * -----------------------------------------------------------------------
 * <2026.05.29> 최초작성
 * 🚨 @PATCH : 2026-11-02 — 문의 조회·답변 상태 저장을 PostgreSQL로 통일한다.
// 🚨 @PATCH : **2026-09-30** — [고객 문의 답변 이메일 HTML 템플릿 Modern Technical Editorial 디자인 고도화]:
//             1. 브랜드 헤더(ONRIVI AUTHOR SUPPORT) 및 코발트 블루 포인트 적용
//             2. 접수된 원본 문의 박스(Q. 문의제목 및 본문)와 공식 답변 박스(좌측 포인트 바) 시각적 분리
//             3. Pretendard 및 시스템 폰트 기반 높은 가독성과 반응형 카드 섀도우 적용
//             **2026-08-12** — API 인증(401 Unauthorized) 실패 시 구체적인 Supabase Auth 에러 로그를 서버 콘솔에 출력하도록 console.error 디버깅 로그 추가
 * -----------------------------------------------------------------------
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';
import { sendMail } from '@/lib/mail';
import { DB_CODES } from '@/constants/dbCodes';
import { SYSTEM_MESSAGES } from '@/constants/messages';

export async function GET(request: Request) {
  try {
    const verified = await verifyAdmin(request);
    if (!verified.user) return NextResponse.json({ error: verified.error }, { status: 403 });
    // 1. 전체 문의 조회 (최신순)
    const inquiries = await sql`SELECT * FROM public.support_inquiries ORDER BY created_at DESC`;

    // 2. 공통코드에서 표시명 가져오기
    const codes = await sql`SELECT group_code, code_value, code_name FROM public.common_codes`;

    // 3. 데이터 매핑
    const enrichedInquiries = (inquiries || []).map((inquiry: any) => {
      const typeInfo = codes.find((c: any) => c.group_code === DB_CODES.CODE_GROUP.INQUIRY_TYPE && c.code_value === inquiry.type);
      const statusInfo = codes.find((c: any) => c.group_code === DB_CODES.CODE_GROUP.INQUIRY_STATUS && c.code_value === inquiry.status);

      return {
        ...inquiry,
        type_name: typeInfo ? typeInfo.code_name : inquiry.type,
        status_name: statusInfo ? statusInfo.code_name : inquiry.status
      };
    });

    return NextResponse.json(enrichedInquiries);
  } catch (error: any) {
    console.error('Admin inquiries GET error:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const verified = await verifyAdmin(request);
    if (!verified.user) return NextResponse.json({ error: verified.error }, { status: 403 });
    const user = verified.user;

    const body = await request.json();
    const { id, status, answer_content, send_email, answer_attachment_urls, reply_subject, reply_greeting, reply_closing } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // 1. 기존 문의내역 정보 가져오기 (이메일 발송을 위해)
    const inquiryRows = await sql`SELECT email, title, content FROM public.support_inquiries WHERE id = ${id} LIMIT 1`;
    const inquiryData = inquiryRows[0];
    if (!inquiryData) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // 2. 이메일 발송 처리 (실패 시 DB 업데이트 중단)
    let emailSent = false;
    if (send_email && inquiryData.email && answer_content) {
      const emailSubject = reply_subject || `[답변] ${inquiryData.title} 문의에 대한 답변입니다.`;
      const greetingText = reply_greeting || `문의하신 내용에 대한 답변입니다.`;
      const closingText = reply_closing || `답변 드린 내용 외에 추가로 궁금하신 점이나 확인이 필요한 사항이 있으시면 언제든 편하게 말씀해 주시기 바랍니다.`;
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2563eb;">
            <div style="font-size: 11px; font-weight: 800; color: #2563eb; letter-spacing: 0.8px; text-transform: uppercase;">ONRIVI AUTHOR SUPPORT</div>
            <h2 style="color: #0f172a; margin: 8px 0 0 0; font-size: 18px; font-weight: 700; line-height: 1.4;">${greetingText}</h2>
          </div>
          
          <div style="background-color: #f8fafc; padding: 16px 18px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px; font-weight: 700;">[접수된 문의내용] Q. ${inquiryData.title}</p>
            <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${inquiryData.content}</p>
          </div>

          <div style="padding: 18px; border-radius: 10px; border-left: 4px solid #2563eb; background-color: #eff6ff; border-top: 1px solid #dbeafe; border-right: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 13px; font-weight: 700;">[온리비 어서 공식 답변]</p>
            <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${answer_content}</p>
          </div>
          
          <p style="margin: 22px 0 0 0; font-size: 14px; color: #334155; line-height: 1.6;">
            ${closingText}
          </p>
          
          <div style="margin-top: 32px; padding-top: 18px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              본 메일은 발신 전용 메일입니다. 추가 문의사항이 있으시면 공식 웹사이트를 이용해 주세요.
            </p>
            <p style="margin: 6px 0 0 0; font-size: 11px; color: #cbd5e1;">
              © Onrivi Author Support Team. All rights reserved.
            </p>
          </div>
        </div>
      `;

      const mailResult = await sendMail(inquiryData.email, emailSubject, emailHtml, answer_attachment_urls);
      
      // 이메일 발송 실패 시, 에러를 던져 DB 업데이트(트랜잭션)를 중단시킴
      if (!mailResult.success) {
        throw new Error('이메일 발송에 실패했습니다: ' + ((mailResult.error as any)?.message || '알 수 없는 오류'));
      }
      emailSent = true;
    }

    // 3. 문의내역 업데이트 (이메일 발송 성공 시에만 실행됨)
    const updateData: any = {
      status,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    if (answer_content !== undefined) {
      updateData.answer_content = answer_content;
      updateData.answered_at = new Date().toISOString();
      updateData.answered_by = user.id;
      if (answer_attachment_urls !== undefined) {
        updateData.answer_attachment_urls = answer_attachment_urls;
      }
    }

    const values = Object.fromEntries(Object.entries(updateData).filter(([, value]) => value !== undefined));
    const updatedRows = await sql`UPDATE public.support_inquiries SET ${sql(values)} WHERE id = ${id} RETURNING *`;
    const updatedInquiry = updatedRows[0];
    if (!updatedInquiry) throw new Error('Inquiry not found');

    return NextResponse.json({ ...updatedInquiry, emailSent });
  } catch (error: any) {
    console.error('Admin inquiries PATCH error:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
