// ====================================================================
// 📊 [OMD-AI-Server-0001] src/lib/ai/server.mjs
// 🎯 @KICK  : Next.js API /api/ai/request 서버 핸들러 및 스트리밍 안전 프록시
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 인증 토큰 및 민감 키 유출 차단, 에러 투명화
// 🚨 @PATCH : **2026-10-20** — [safeError 에러 투명화 및 민감 파라미터 안전 마스킹]:
//             1) URL(https://) 포함 에러 메시지 차단 결함 수정: 도움말 링크가 포함된 AI 공식 에러 메시지 정상 전달
//             2) key= 및 Bearer 토큰만 정확히 ***로 마스킹하여 보안성과 오류 원인 가시성을 동시에 확보
// ====================================================================
import {generate,listModels,validateConnection} from './wire.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function handleAIRequest(request,env,fetcher=fetch){
  if(request.method!=='POST')return json({error:'POST 요청만 지원합니다.'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
  const token=request.headers.get('authorization');
  const authUrl=env.NEXT_PUBLIC_SUPABASE_URL,anon=env.NEXT_PUBLIC_SUPABASE_ANON_KEY||env.SUPABASE_ANON_KEY;
  if(!authUrl||!anon)return json({error:'서버 AI 인증 설정이 필요합니다.'},503);
  if(!token?.startsWith('Bearer '))return json({error:'로그인이 필요합니다.'},401);
  try{
    const auth=await fetcher(new URL('/auth/v1/user',authUrl),{headers:{Authorization:token,apikey:anon},signal:request.signal});
    if(!auth.ok)return json({error:'로그인을 다시 확인해 주세요.'},401);
    const user=await auth.json();if(!user.id)return json({error:'로그인이 필요합니다.'},401);
    // Read a bounded body, including requests without Content-Length.
    const reader=request.body?.getReader();if(!reader)return json({error:'요청이 비어 있습니다.'},400);
    let size=0;const chunks=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>30_000_000){await reader.cancel();return json({error:'첨부 용량을 줄여 주세요.'},413);}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const data=JSON.parse(new TextDecoder().decode(bytes));validateConnection(data.provider,data.key);
    const controller=new AbortController(),abort=()=>controller.abort();request.signal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,120000);
    const cleanup=()=>{clearTimeout(timer);request.signal.removeEventListener('abort',abort);};
    if(data.action==='models'){
      try{return json({models:await listModels(data.provider,data.key,controller.signal,fetcher)});}finally{cleanup();}
    }
    if(data.action!=='generate'){cleanup();return json({error:'지원하지 않는 작업입니다.'},400);}
    const iterator=generate(data.provider,data.key,data.input,controller.signal,fetcher);
    const encoder=new TextEncoder();
    return new Response(new ReadableStream({
      async pull(stream){try{const next=await iterator.next();if(next.done){cleanup();stream.close();}else stream.enqueue(encoder.encode(JSON.stringify(next.value)+'\n'));}catch(error){cleanup();stream.enqueue(encoder.encode(JSON.stringify({type:'error',message:controller.signal.aborted?'AI 요청이 중지되거나 시간이 초과되었습니다.':safeError(error)})+'\n'));stream.close();}},
      async cancel(){abort();cleanup();await iterator.return();}
    }),{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch(error){
    console.error('[handleAIRequest error]', error);
    return json({error:safeError(error)},400);
  }
}
export function safeError(error){
  let message=String(error?.message||'');
  message = message.replace(/([?&]key=)[^&\s]+/gi, '$1***').replace(/(Bearer\s+)[^\s]+/gi, '$1***');
  if (/^(AI |모델 |첨부 |지원하지 |선택한 |환경설정|API)/.test(message)) return message;
  return message && !/(Bearer\s+|[?&]key=)/i.test(message) ? message : 'AI 요청을 처리하지 못했습니다. 연결과 파일을 확인해 주세요.';
}
