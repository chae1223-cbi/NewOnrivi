const PREFIX = '[Onrivi Author]';

type Level = 'info' | 'success' | 'warn' | 'error';

// ====================================================================
// 📊 [OMD-IO-systemMessages-0001] systemMessages.ts ➔ format
// 🎯 @KICK  : 로그 메시지를 [Onrivi Author] 프리픽스 + 레벨 포맷
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function format(level: Level, message: string): string {
  return `${PREFIX} ${message}`;
}

// ====================================================================
// 📊 [OMD-IO-systemMessages-0002] systemMessages.ts ➔ msg
// 🎯 @KICK  : [Onrivi Author] 프리픽스 기반 통합 로깅 객체 (info/success/warn/error)
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : format
// ====================================================================
export const msg = {
  info: (message: string) => console.log(format('info', message)),
  success: (message: string) => console.log(format('success', message)),
  warn: (message: string, ...args: any[]) => console.warn(format('warn', message), ...args),
  error: (message: string, ...args: any[]) => console.error(format('error', message), ...args),
};
