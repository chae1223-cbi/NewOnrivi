// 🚨 @PATCH : **2026-11-04** — [오류 진단 로깅 0단계]: R2 클라이언트 로그 적재 조건을 ENABLE_R2_LOGS === 'true' (기본 false)로 명확화
// 🚨 @PATCH : **2026-11-04** — [클라이언트 전달 source_file / source_function 우선 반영]: 실제 에러 발생 파일 및 함수명 자동 적재
// 🚨 @PATCH : **2026-11-04** — [KST(한국표준시 UTC+9) 기준 일자 파티셔닝 적용]: UTC 자정 시차(00~09시)로 인한 날짜 불일치 해결
// 🚨 @PATCH : **2026-11-04** — [R2 클라이언트 로그 적재 환경변수 스위치(ENABLE_R2_LOGS) 적용]: 기본 적재 비활성화(false) 및 console.warn 콘솔 출력 후 204 응답
// 🚨 @PATCH : **2026-11-03** — [클라이언트 로그 target 전달 및 자동 파싱 지원]: input.target 또는 본문 [대상: xxx]에서 target 자동 추출하여 R2 적재
// 🚨 @PATCH : **2026-11-03** — [프로덕션/미리보기 로그 분리]: hostname 기반 prod/preview 환경 분기 및 R2 저장 경로 분리 (_system-logs/{prod|preview}/YYYY-MM-DD/)
const sourceLocations = {
  "LOGIN": {
    "file": "frontend/src/app/login/page.tsx",
    "function": "handleLoginSubmit / handleGoogleLogin"
  },
  "LOGIN_NOTICE": {
    "file": "frontend/src/app/login/page.tsx",
    "function": "handleLoginSubmit / handleGoogleLogin → showToast"
  },
  "DOCUMENT_SAVE": {
    "file": "frontend/src/hooks/useEditorHandlers.ts",
    "function": "save / saveAs"
  },
  "DRIVE_CONNECT": {
    "file": "frontend/src/hooks/useFileExplorer.ts",
    "function": "connectGoogleDrive"
  },
  "PLAN_SELECT": {
    "file": "frontend/src/app/dashboard/page.tsx",
    "function": "handleSelectPlan"
  },
  "PLAN_CHANGE": {
    "file": "frontend/src/app/dashboard/page.tsx",
    "function": "handleSelectPlan"
  },
  "USER_NOTICE": {
    "file": "frontend/src/utils/toast.ts",
    "function": "showToast"
  },
  "BROWSER_ERROR": {
    "file": "frontend/src/components/ToastProvider.tsx",
    "function": "onError"
  },
  "UNHANDLED_REJECTION": {
    "file": "frontend/src/components/ToastProvider.tsx",
    "function": "onRejection"
  },
  "APP_ERROR": {
    "file": "frontend/src/lib/errorDiagnostics.ts",
    "function": "logError / logWarn"
  }
};
// Browser-reported events are untrusted and distinct from server failures.
const counts = new Map();
export async function onRequestPost({request, env}) {
  const origin = request.headers.get('origin');
  const isLocalDev = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
  if (origin && !isLocalDev && origin !== new URL(request.url).origin) return new Response(null, {status:403});
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  for (const [key, value] of counts) if (now-value.start > 60000) counts.delete(key);
  const counter = counts.get(ip) || {start:now,count:0};
  if (counter.count >= 20 || counts.size >= 10000) return new Response(null,{status:429});
  counter.count++; counts.set(ip,counter);
  if (!env.R2_BUCKET) return new Response(null,{status:503});
  const reader=request.body?.getReader();
  if (!reader) return new Response(null,{status:400});
  let text=''; let size=0;
  try {
    const decoder=new TextDecoder();
    while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){void reader.cancel();return new Response(null,{status:413});}text+=decoder.decode(value,{stream:true});}
    text+=decoder.decode();
    const input=JSON.parse(text);
    if (!['INFO','WARN','ERROR'].includes(input.level) || typeof input.message !== 'string') return new Response(null,{status:400});
    const message=input.message.slice(0,1000).replace(/Bearer\s+[^\s]+/gi,'[토큰 가림]').replace(/((?:password|token|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi,'$1[가림]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[이메일 가림]').replace(/https?:\/\/[^\s]+/gi,'[URL 가림]');
    const action=['BROWSER_ERROR','UNHANDLED_REJECTION','APP_ERROR','LOGIN_NOTICE','USER_NOTICE','LOGIN','DOCUMENT_SAVE','DRIVE_CONNECT','PLAN_SELECT','PLAN_CHANGE'].includes(input.action)?input.action:'USER_NOTICE';
    const hostname = new URL(request.url).hostname;
    const isProd = hostname === 'onrivi.com' || hostname === 'www.onrivi.com';
    const envType = isProd ? 'prod' : 'preview';
    let target = typeof input.target === 'string' && input.target.trim() && input.target !== '-'
      ? input.target.slice(0, 200)
      : '-';
    if (target === '-') {
      const match = message.match(/\[대상:\s*([^\]]+)\]/);
      if (match) target = match[1].trim();
    }
    const id=crypto.randomUUID(), timestamp=new Date().toISOString();
    const entry={id,timestamp,environment:envType.toUpperCase(),hostname,level:input.level,module:'CLIENT',action,message,actor:'BROWSER',target,operation:({LOGIN:'로그인',DOCUMENT_SAVE:'문서 저장',DRIVE_CONNECT:'웹드라이브 연결',PLAN_SELECT:'요금제 선택',PLAN_CHANGE:'요금제 변경'})[action] || (action==='LOGIN_NOTICE'?'로그인 안내·실패':action==='USER_NOTICE'?'사용자 작업 경고·오류':'브라우저 실행 오류'),source:'browser-reported', source_file: typeof input.source_file === 'string' && input.source_file.trim() ? input.source_file.slice(0, 150) : (sourceLocations[action]?.file || 'unknown'), source_function: typeof input.source_function === 'string' && input.source_function.trim() ? input.source_function.slice(0, 100) : (sourceLocations[action]?.function || 'unknown'), event_code:`CLIENT_${action}_${input.level}`};
    // Cloudflare Pages 실시간 로그(Realtime Logs) 콘솔에는 항상 출력
    console.warn(`[ClientLog] [${envType.toUpperCase()}] ${input.level} · ${action} · 대상: ${target} · ${message}`);

    // R2 저장은 ENABLE_R2_LOGS === 'true' 일 때만 수행 (기본값 false: R2 적재 중단)
    if (env.ENABLE_R2_LOGS === 'true' && env.R2_BUCKET) {
      const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
      await env.R2_BUCKET.put(`_system-logs/${envType}/${kstDate}/${timestamp}_${id}.json`,JSON.stringify(entry));
    }
    return new Response(null,{status:204});
  } catch {return new Response(null,{status:400});}
}
