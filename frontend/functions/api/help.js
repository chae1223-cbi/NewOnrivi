import { listHelp, json } from './_helpStore.js';
export async function onRequestGet({env}) {
 if(!env.R2_BUCKET)return json({error:'도움말 저장소가 연결되지 않았습니다.'},503);
 try{return json({documents:await listHelp(env.R2_BUCKET,'published')});}catch{return json({error:'도움말 조회 실패'},500);}
}
