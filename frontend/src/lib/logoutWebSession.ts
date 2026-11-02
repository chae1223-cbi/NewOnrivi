// ====================================================================
// 📊 [OMD-LIB-logoutWebSession-0001] logoutWebSession ➔ logoutCurrentWebSession
// 🎯 @KICK  : 현재 브라우저 탭의 기기 세션(onrivi_tab_session_id)을 서버에서 안전하게 해제
// 🛡️ @GUARD : 탭 세션 ID가 없는 일반 탭이나 이미 세션이 없는 경우 에러를 던지지 않고 0을 반환하여 사용자의 Supabase 로그아웃을 차단하지 않음
// 🚨 @PATCH : **2026-09-30** — [탭 세션 ID 누락 시 로그아웃 차단 버그 수정]:
//             1. sessionStorage에 onrivi_tab_session_id가 없더라도 throw 대신 return 0으로 안전 종료
//             2. 메인 페이지(/) 등 대시보드 미진입 탭에서 로그아웃 클릭 시 '현재 탭의 세션 정보를 찾을 수 없습니다' 에러 발생 원천 차단
//             3. 네트워크나 서버 에러 발생 시에도 경고 로깅 후 로컬 로그아웃이 완료되도록 방어
// 🔗 @CALLS : supabase.auth.getSession, /api/device/logout-session
// ====================================================================
import { supabase } from '@/lib/supabaseClient';

export async function logoutCurrentWebSession(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return 0;

  const deviceUuid = sessionStorage.getItem('onrivi_tab_session_id');
  // 💡 대시보드가 아닌 일반 페이지에서 로그아웃하거나 탭 세션이 아직 발급되지 않은 경우,
  // 해제할 서버 세션이 없으므로 에러를 던지지 않고 0을 반환하여 정상적인 로그아웃 흐름을 보장한다.
  if (!deviceUuid) return 0;

  try {
    const response = await fetch('/api/device/logout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ device_uuid: deviceUuid }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      console.warn('[logoutCurrentWebSession] 웹 세션 서버 해제 경고:', result?.message);
      return 0;
    }
    return result.deleted || 0;
  } catch (err) {
    console.warn('[logoutCurrentWebSession] 서버 통신 실패 (로컬 로그아웃 계속 진행):', err);
    return 0;
  }
}
