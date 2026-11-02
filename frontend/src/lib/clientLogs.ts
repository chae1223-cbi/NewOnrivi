// ========================================================================================
// 전송 제한(Rate Limiting) 관리용 전역 변수
// ========================================================================================

let sent = 0;                           /** 1분(60초) 주기 내에 서버로 전송된 로그 누적 카운트 */
let windowStart = 0;                    /** 전송 제한 주기를 측정하기 위한 시작 시각 (타임스탬프 ms) */

/**
 * ========================================================================================
 * reportClientLog
 * ----------------------------------------------------------------------------------------
 * 🎯 목적:
 *   클라이언트(브라우저)에서 발생한 중요 사용자 알림, 경고, 오류 로그를 수집하여 서버로 전송합니다.
 *   서버 과부하 방지(1분당 10건 제한) 및 개인정보/민감정보(토큰, 비번, 이메일 등) 자동 마스킹 처리를 보장합니다.
 * 
 * 📥 매개변수:
 *   - @param {string} message - 기록할 로그 본문 메시지
 *   - @param {'INFO' | 'WARN' | 'ERROR'} level - 로그 중요도 레벨 ('INFO', 'WARN', 'ERROR')
 *   - @param {string} [action='USER_NOTICE'] - 발생한 동작/이벤트 식별 코드 (기본값: 'USER_NOTICE')
 * 
 * 📤 반환값:
 *   - @returns {void} 반환값 없음 (Fire-and-forget 방식 비동기 처리)
 * 
 * ⚠️ 주의사항:
 *   - 서버사이드 렌더링(SSR) 환경 또는 http/https 프로토콜이 아닌 경우 전송을 자동 중단합니다.
 *   - 1분당 최대 10건을 초과하는 로그는 서버 보호를 위해 자동으로 드롭(무시)됩니다.
 * ----------------------------------------------------------------------------------------
 * 💡 사용 예시:
 *   reportClientLog('사용자 로그인 성공', 'INFO', 'LOGIN');
 *   reportClientLog('구글 드라이브 동기화 실패: 네트워크 오류', 'ERROR', 'GDRIVE_SYNC');
 * ========================================================================================
 */
export function reportClientLog(
  message: string,
  level: 'INFO' | 'WARN' | 'ERROR',
  action = 'USER_NOTICE'
) {
  // 1. [환경 방어] Node.js 서버 환경(SSR)이거나 http/https 프로토콜이 아닌 환경(file:// 등)에서는 전송 중단
  if (typeof window === 'undefined' || !/^https?:$/.test(location.protocol)) return;

  // 2. [주기 리셋] 마지막 시작 시각으로부터 1분(60,000ms)이 경과했다면 전송 카운트를 0으로 초기화하고 기준 시각 갱신
  if (Date.now() - windowStart > 60000) {
    sent = 0;
    windowStart = Date.now();
  }

  // 3. [폭주 방어] 1분 내에 이미 10건 이상 전송했으면 서버 과부하 및 로그 폭주 방지를 위해 추가 전송 중단
  if (sent++ >= 10) return;

  // 4. [보안 마스킹] 최대 1,000자로 제한하고, 유출 위험이 있는 4대 민감정보(토큰, 비밀번호, 이메일, URL)를 자동 마스킹
  const safe = message
    .slice(0, 1000) // 1,000자 초과 본문 잘라내기 (페이로드 용량 제한)
    .replace(/Bearer\s+[^\s]+/gi, '[토큰 가림]') // 인증 헤더(Bearer 토큰값) 마스킹
    .replace(/((?:password|token|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1[가림]') // 비밀번호 및 API 키 마스킹
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[이메일 가림]') // 개인정보(이메일 주소) 마스킹
    .replace(/https?:\/\/[^\s]+/gi, '[URL 가림]'); // 쿼리스트링에 토큰이 묻어있을 수 있는 외부 URL 마스킹

  // 5. [서버 비동기 전송] 서버의 /api/client-log 엔드포인트로 JSON 전송 (keepalive로 창이 닫혀도 전송 보장, 에러는 무시)
  void fetch('/api/client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: safe, level, action }),
    keepalive: true // 사용자가 브라우저 창을 즉시 닫아도 백그라운드에서 끝까지 전송 완료 보장
  }).catch(() => { }); // 로그 전송 실패가 앱 동작을 방해하지 않도록 에러 무시
}