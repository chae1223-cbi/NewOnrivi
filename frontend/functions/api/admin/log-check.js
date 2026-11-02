import { checkAdminAuth } from './_shared.js';
export async function onRequestGet({request, env}) {
  const auth = await checkAdminAuth(request, env, ['SUPER']);
  if (auth.error) return Response.json({success:false,error:auth.error},{status:auth.status || 403});
  return Response.json({success:true,message:'로그 저장 연결 확인 요청입니다. 실제 오류는 발생시키지 않았습니다.'});
}
