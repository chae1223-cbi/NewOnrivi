let sent = 0;
let windowStart = 0;
export function reportClientLog(message: string, level: 'INFO' | 'WARN' | 'ERROR', action = 'USER_NOTICE') {
  if (typeof window === 'undefined' || !/^https?:$/.test(location.protocol)) return;
  if (Date.now() - windowStart > 60000) { sent = 0; windowStart = Date.now(); }
  if (sent++ >= 10) return;
  const safe = message.slice(0, 1000).replace(/Bearer\s+[^\s]+/gi, '[토큰 가림]').replace(/((?:password|token|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1[가림]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[이메일 가림]').replace(/https?:\/\/[^\s]+/gi, '[URL 가림]');
  void fetch('/api/client-log', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message:safe,level,action}), keepalive:true}).catch(() => {});
}
