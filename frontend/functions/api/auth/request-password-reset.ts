import { createClient } from '@supabase/supabase-js';

// Brevo API 키 및 발신 정보 설정 (보안 푸시 보호를 위해 환경변수 분리 완료)
const SENDER_EMAIL = 'firstonrivi@onrivi.com';
const SENDER_NAME = 'Onrivi Author';

async function sendResetMail(toEmail: string, resetLink: string, brevoApiKey: string) {
  const data = JSON.stringify({
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    },
    to: [{ email: toEmail }],
    subject: '[Onrivi] 온리비 어서 비밀번호 재설정 안내',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            padding: 40px;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo-text {
            font-size: 24px;
            font-weight: 700;
            color: #6366f1;
            letter-spacing: -0.025em;
          }
          .content {
            margin-bottom: 32px;
          }
          h1 {
            font-size: 20px;
            font-weight: 600;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            margin-top: 0;
            margin-bottom: 16px;
            color: #475569;
          }
          .btn-container {
            text-align: center;
            margin: 32px 0;
          }
          .btn {
            display: inline-block;
            background-color: #6366f1;
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 32px;
            font-weight: 500;
            font-size: 16px;
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 24px;
          }
          .warning-text {
            font-size: 13px;
            color: #94a3b8;
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">Onrivi Author</span>
          </div>
          <div class="content">
            <h1>비밀번호 재설정 요청</h1>
            <p>안녕하세요, 온리비 어서(Onrivi Author) 서비스입니다.</p>
            <p>본 메일은 계정의 비밀번호 재설정 요청에 의해 발송되었습니다. 아래 버튼을 클릭하여 비밀번호 재설정 절차를 진행해 주세요.</p>
            <div class="btn-container">
              <a href="${resetLink}" class="btn" target="_blank">비밀번호 재설정하기</a>
            </div>
            <p>만약 본인이 비밀번호 재설정을 요청하지 않으셨다면 이 메일을 무시하셔도 안전합니다. 기존 비밀번호는 그대로 유지됩니다.</p>
            <div class="warning-text">
              이메일 클라이언트에 따라 버튼 링크가 작동하지 않는 경우, 아래의 전체 주소를 복사하여 브라우저 주소창에 직접 입력해 주세요:<br>
              <a href="${resetLink}" style="color: #6366f1; word-break: break-all;">${resetLink}</a>
            </div>
          </div>
          <div class="footer">
            본 메일은 발신 전용 메일입니다.<br>
            &copy; 2026 Onrivi Inc. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  });

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': brevoApiKey,
      'content-type': 'application/json',
    },
    body: data
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API Error: ${errorText}`);
  }
}

export async function onRequestPost(context: {
  request: Request;
  env: {
    BREVO_API_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  };
}) {
  try {
    const { request, env } = context;
    const { email, redirectUrl } = await request.json() as any;

    if (!email) {
      return new Response(JSON.stringify({ error: '이메일 주소는 필수입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const emailTrim = email.trim().toLowerCase();
    
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://niyvcgvayofdqbebmche.supabase.co';
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const brevoApiKey = env.BREVO_API_KEY || '';

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY가 환경변수에 존재하지 않습니다.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. auth.users 에 실제 가입된 회원인지 대조
    const { data: usersData, error: userListError } = await supabaseAdmin.auth.admin.listUsers();
    if (userListError) {
      throw new Error(`사용자 조회 실패: ${userListError.message}`);
    }

    const targetUser = usersData.users.find(u => u.email && u.email.toLowerCase() === emailTrim);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: '등록되지 않은 이메일 주소입니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 일회성 복구 토큰 생성 및 1시간 유효기간 설정 (Web Crypto API 기반)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간

    // 3. public.password_resets 에 기록
    const { error: insertError } = await supabaseAdmin
      .from('password_resets')
      .insert({
        email: emailTrim,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      throw new Error(`보안 토큰 생성 중 에러 발생: ${insertError.message}`);
    }

    // 4. 복구 링크 조립 및 발송
    const finalRedirect = redirectUrl || 'http://localhost:3100/reset-password';
    const resetLink = `${finalRedirect}?token=${token}`;

    await sendResetMail(emailTrim, resetLink, brevoApiKey);

    return new Response(JSON.stringify({ success: true, message: '이메일이 성공적으로 발송되었습니다.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Password reset handler error:', err);
    return new Response(JSON.stringify({ error: err.message || '이메일 전송에 실패했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
