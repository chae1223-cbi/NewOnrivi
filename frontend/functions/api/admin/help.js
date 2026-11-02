import { checkAdminAuth } from './_shared.js';
import { prefix, listHelp, json } from '../_helpStore.js';
export async function onRequest({request,env}) {
 const auth=await checkAdminAuth(request,env,['SUPER']);
 if(auth.error)return json({error:auth.error},auth.status||403);
 if(!env.R2_BUCKET)return json({error:'도움말 저장소가 연결되지 않았습니다.'},503);
 try {
  if(request.method==='GET')return json({drafts:await listHelp(env.R2_BUCKET,'draft'),published:await listHelp(env.R2_BUCKET,'published')});
  if(request.method!=='POST')return json({error:'지원하지 않는 요청입니다.'},405);
  const reader=request.body?.getReader();if(!reader)return json({error:'본문이 없습니다.'},400);
  let raw='',bytes=0;const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>600000){void reader.cancel();return json({error:'문서 크기 한도를 초과했습니다.'},400);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
  if(raw.length>200000)return json({error:'문서는 20만 자 이하로 작성해 주세요.'},400);
  const input=JSON.parse(raw);
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(input.id)||!['save','publish','unpublish'].includes(input.action))return json({error:'문서 정보가 올바르지 않습니다.'},400);
  if(input.action==='unpublish'){await env.R2_BUCKET.delete(prefix+'published/'+input.id+'.json');return json({success:true});}
  if(typeof input.title!=='string'||!input.title.trim()||input.title.length>200||typeof input.content!=='string'||!input.content.trim()||input.content.length>180000)return json({error:'제목과 본문을 확인해 주세요.'},400);
  const doc={id:input.id,title:input.title.trim(),content:input.content,order:Number.isFinite(input.order)?Math.max(0,Math.min(9999,input.order)):0,updated_at:new Date().toISOString()};
  await env.R2_BUCKET.put(prefix+'draft/'+doc.id+'.json',JSON.stringify(doc));
  if(input.action==='publish')await env.R2_BUCKET.put(prefix+'published/'+doc.id+'.json',JSON.stringify(doc));
  return json({success:true,doc});
 }catch {return json({error:'도움말을 처리하지 못했습니다.'},500);}
}
