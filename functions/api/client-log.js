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
  }
};
// Browser-reported events are untrusted and distinct from server failures.
const counts = new Map();
export async function onRequestPost({request, env}) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, {status:403});
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
    const action=['BROWSER_ERROR','UNHANDLED_REJECTION','LOGIN_NOTICE','USER_NOTICE','LOGIN','DOCUMENT_SAVE','DRIVE_CONNECT','PLAN_SELECT','PLAN_CHANGE'].includes(input.action)?input.action:'USER_NOTICE';
    const id=crypto.randomUUID(), timestamp=new Date().toISOString();
    const entry={id,timestamp,level:input.level,module:'CLIENT',action,message,actor:'BROWSER',target:'-',operation:({LOGIN:'로그인',DOCUMENT_SAVE:'문서 저장',DRIVE_CONNECT:'웹드라이브 연결',PLAN_SELECT:'요금제 선택',PLAN_CHANGE:'요금제 변경'})[action] || (action==='LOGIN_NOTICE'?'로그인 안내·실패':action==='USER_NOTICE'?'사용자 작업 경고·오류':'브라우저 실행 오류'),source:'browser-reported', source_file:sourceLocations[action].file, source_function:sourceLocations[action].function, event_code:`CLIENT_${action}_${input.level}`};
    await env.R2_BUCKET.put(`_system-logs/${timestamp.slice(0,10)}/${timestamp}_${id}.json`,JSON.stringify(entry));
    return new Response(null,{status:204});
  } catch {return new Response(null,{status:400});}
}
