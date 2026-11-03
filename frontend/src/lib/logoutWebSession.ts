// ========================================================================================
// 📊 [OMD-LIB-logoutWebSession-0001] logoutWebSession ➔ logoutCurrentWebSession
// ----------------------------------------------------------------------------------------
// 🎯 목적:
//   현재 브라우저 탭에 부여된 기기 세션 ID(onrivi_tab_session_id)를 서버(/api/device/logout-session)에
//   전송하여, 서버 데이터베이스(DB)에 등록된 활성 동시 접속 기기 목록에서 안전하게 삭제·해제합니다.
// 
// 🛡️ 방어 원칙 (@GUARD):
//   1. 토큰이 없거나 탭 세션 ID가 없는 일반 탭인 경우, 에러를 던지지 않고 0을 반환하여 정상 로그아웃 보장
//   2. 서버 점검이나 네트워크 장애가 발생해도 빨간 에러창을 띄우지 않고 로컬 로그아웃이 끝까지 완료되도록 방어
// 
// 🚨 @PATCH : **2026-09-30** — [탭 세션 ID 누락 시 로그아웃 차단 결함 수정]:
//             1. sessionStorage에 onrivi_tab_session_id가 없더라도 throw 대신 return 0으로 안전 종료
//             2. 메인 페이지(/) 등 대시보드 미진입 탭에서 로그아웃 클릭 시 '세션 정보 없음' 에러 방지
//             3. 네트워크/서버 에러 발생 시에도 경고만 남기고 로컬 브라우저 로그아웃이 완료되도록 방어
// 🔗 @CALLS : supabase.auth.getSession, fetch(/api/device/logout-session)
// ========================================================================================
import { supabase } from '@/lib/supabaseClient';

/**
 * ========================================================================================
 * logoutCurrentWebSession
 * ----------------------------------------------------------------------------------------
 * 🎯 서버에 접속 중으로 등록된 현재 브라우저 탭의 세션 레코드를 삭제 요청
 * 📤 @returns {Promise<number>} 서버에서 실제 삭제된 세션 레코드 수 (실패 또는 세션 없으면 0)
 * ========================================================================================
 */
export async function logoutCurrentWebSession(): Promise<number> {
  // 1. [로그인 토큰 확인] 현재 브라우저에 Supabase 로그인 인증 토큰이 존재하는지 확인
  const { data: { session } } = await supabase.auth.getSession();
  
  // 로그인이 이미 안 되어 있거나 토큰이 없으면 서버에 요청할 필요 없이 0 반환하고 종료
  if (!session?.access_token) return 0;

  // 2. [탭 세션 ID 조회] 현재 탭에 발급된 고유 장비/세션 식별자(UUID)를 세션 스토리지에서 꺼냄
  const deviceUuid = sessionStorage.getItem('onrivi_tab_session_id');

  // 💡 [방어 가드] 대시보드에 들어가지 않은 메인 페이지 등에서는 탭 세션 ID가 없을 수 있습니다.
  // 이때 에러를 내면 로그아웃이 안 되므로, 조용히 0을 반환하여 다음 로그아웃 단계로 넘겨줍니다.
  if (!deviceUuid) return 0;

  try {
    // 3. [서버 세션 해제 API 호출] 서버의 /api/device/logout-session 으로 세션 삭제 요청 전송
    const response = await fetch('/api/device/logout-session', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${session.access_token}` // 로그인 토큰을 헤더에 동봉
      },
      body: JSON.stringify({ device_uuid: deviceUuid }), // 삭제할 기기 세션 UUID 전달
    });

    // 4. [서버 응답 파싱]
    const result = await response.json().catch(() => null);

    // 5. [서버 응답 검증] 서버에서 정상적으로 지워지지 않았더라도 경고만 찍고 로컬 로그아웃은 계속 진행
    if (!response.ok || !result?.success) {
      console.warn('[logoutCurrentWebSession] 웹 세션 서버 해제 경고:', result?.message);
      return 0;
    }

    // 6. 정상 삭제된 세션 건수 반환 (예: 1건 삭제 성공)
    return result.deleted || 0;

  } catch (err) {
    // 7. [통신 장애 방어] 와이파이가 끊겼거나 서버가 죽어 있어도 사용자가 로그아웃은 할 수 있어야 하므로 에러 무시
    console.warn('[logoutCurrentWebSession] 서버 통신 실패 (로컬 로그아웃 계속 진행):', err);
    return 0;
  }
}