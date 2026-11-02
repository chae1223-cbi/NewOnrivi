/**
 * Onrivi Author API URL 헬퍼 함수
 * 1. 개발 모드(Next.js dev server - port 3000~3999)일 때는 고정된 백엔드 주소(http://localhost:4000)를 사용합니다.
 * 2. 일렉트론 및 프로덕션 모드(Express 포트 서빙)일 때는 포트 충돌 방지용 동적 포트를 지원하기 위해
 *    현재 브라우저 창의 도메인/포트를 기준으로 하는 상대 경로를 사용합니다.
 */
// [ONR-IO-004] 백엔드 Axios/Fetch API 기본 URL 계산 헬퍼: 현재 앱이 실행 중인 포트와 프로토콜(Electron, Extension, Next Dev 등)을 자율 감지하여 올바른 API 서버 엔드포인트 도메인을 빌드해 리턴합니다.
// ====================================================================
// 📊 [OMD-IO-apiUrlBuilder-0001] apiUrlBuilder.ts ➔ getApiUrl
// 🎯 @KICK  : 환경(Next.js dev/Electron/Extension)에 맞게 API URL 동적 계산
// 🛡️ @GUARD : window 존재 여부, 포트 범위(3000~3999), 프로토콜(chrome-extension/file) 감지
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export const getApiUrl = (path: string): string => {
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'app:') {
      // 데스크탑 프로덕션 앱 (app:// 프로토콜)에서는 실서버 API를 강제로 호출합니다.
      return `https://onrivi.com${path}`;
    }
    if (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'file:') {
      return `http://localhost:4000${path}`;
    }
    const port = parseInt(window.location.port, 10);
    const isNextDev = port >= 3000 && port < 4000;
    const base = isNextDev ? '' : ''; 
    return `${base}${path}`;
  }
  return path;
};
