import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context: {
  request: Request;
  env: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  };
}) {
  try {
    const { request, env } = context;
    const { token, password } = await request.json() as any;

    if (!token || !password) {
      return new Response(JSON.stringify({ error: '인증 토큰과 신규 비밀번호는 필수 입력 사항입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://niyvcgvayofdqbebmche.supabase.co';
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY가 환경변수에 존재하지 않습니다.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. 토큰 조회 및 유효성/만료 검증
    const { data: resetReq, error: selectError } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (selectError || !resetReq) {
      return new Response(JSON.stringify({ error: '유효하지 않거나 이미 사용된 인증 토큰입니다. 다시 요청해 주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const expiresAt = new Date(resetReq.expires_at);
    if (now > expiresAt) {
      return new Response(JSON.stringify({ error: '만료된 비밀번호 재설정 토큰입니다. 다시 재설정을 요청해 주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. auth.users 리스트에서 이메일 매치 유저 식별
    const { data: usersData, error: userListError } = await supabaseAdmin.auth.admin.listUsers();
    if (userListError) {
      throw new Error(`사용자 식별 실패: ${userListError.message}`);
    }

    const targetUser = usersData.users.find(u => u.email && u.email.toLowerCase() === resetReq.email.toLowerCase());
    if (!targetUser) {
      return new Response(JSON.stringify({ error: '연관된 회원 정보를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 대상 유저의 패스워드 직접 강제 갱신
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: password }
    );

    if (updateError) {
      throw new Error(`비밀번호 변경 처리 실패: ${updateError.message}`);
    }

    // 4. 보안 토큰 사용 완료(used = true) 처리
    await supabaseAdmin
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetReq.id);

    return new Response(JSON.stringify({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Password reset confirmation failed:', err);
    return new Response(JSON.stringify({ error: err.message || '비밀번호 변경 처리에 실패했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
